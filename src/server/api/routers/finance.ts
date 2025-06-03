import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { withBranchFilter } from "@/utils/branch-filter";

export const financeRouter = createTRPCRouter({
  // Fee Head Management
  getFeeHeads: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
      });

      return ctx.db.feeHead.findMany({
        where,
        include: {
          branch: true,
          session: true,
          _count: {
            select: {
              feeTerms: true,
              classwiseFees: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  createFeeHead: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      isSystemDefined: z.boolean().default(false),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name in the same branch and session
      const existing = await ctx.db.feeHead.findFirst({
        where: {
          name: input.name,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A fee head with this name already exists for this branch and session",
        });
      }

      return ctx.db.feeHead.create({
        data: input,
        include: {
          branch: true,
          session: true,
        },
      });
    }),

  updateFeeHead: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      isSystemDefined: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if fee head exists
      const feeHead = await ctx.db.feeHead.findUnique({
        where: { id },
      });

      if (!feeHead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee head not found",
        });
      }

      // Check for duplicate name if name is being changed
      if (data.name && data.name !== feeHead.name) {
        const existing = await ctx.db.feeHead.findFirst({
          where: {
            name: data.name,
            branchId: feeHead.branchId,
            sessionId: feeHead.sessionId,
            id: { not: id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A fee head with this name already exists for this branch and session",
          });
        }
      }

      return ctx.db.feeHead.update({
        where: { id },
        data,
        include: {
          branch: true,
          session: true,
        },
      });
    }),

  deleteFeeHead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if fee head exists
      const feeHead = await ctx.db.feeHead.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              feeTerms: true,
              classwiseFees: true,
              feeCollectionItems: true,
            },
          },
        },
      });

      if (!feeHead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee head not found",
        });
      }

      // Prevent deletion of system-defined fee heads
      if (feeHead.isSystemDefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete system-defined fee heads",
        });
      }

      // Check if fee head is used in fee terms, classwise fees, or collections
      const totalUsage = feeHead._count.feeTerms + feeHead._count.classwiseFees + feeHead._count.feeCollectionItems;
      if (totalUsage > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete fee head as it is being used in fee terms, classwise fees, or fee collections",
        });
      }

      return ctx.db.feeHead.delete({
        where: { id: input.id },
      });
    }),

  // Fee Term Management
  getFeeTerms: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
      });

      return ctx.db.feeTerm.findMany({
        where,
        include: {
          branch: true,
          session: true,
          feeHeads: {
            include: {
              feeHead: true,
            },
          },
          _count: {
            select: {
              classwiseFees: true,
              feeCollections: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  createFeeTerm: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
      dueDate: z.date(),
      feeHeadIds: z.array(z.string()).optional(),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate dates
      if (input.endDate <= input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Check for duplicate name in the same branch and session
      const existing = await ctx.db.feeTerm.findFirst({
        where: {
          name: input.name,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A fee term with this name already exists for this branch and session",
        });
      }

      const { feeHeadIds, ...termData } = input;

      return ctx.db.$transaction(async (prisma) => {
        // Create the fee term
        const feeTerm = await prisma.feeTerm.create({
          data: termData,
        });

        // Associate fee heads if provided
        if (feeHeadIds && feeHeadIds.length > 0) {
          await prisma.feeTermFeeHead.createMany({
            data: feeHeadIds.map((feeHeadId) => ({
              feeTermId: feeTerm.id,
              feeHeadId,
            })),
          });
        }

        // Return the created term with relations
        return prisma.feeTerm.findUnique({
          where: { id: feeTerm.id },
          include: {
            branch: true,
            session: true,
            feeHeads: {
              include: {
                feeHead: true,
              },
            },
          },
        });
      });
    }),

  updateFeeTerm: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
      dueDate: z.date(),
      feeHeadIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, feeHeadIds, ...termData } = input;

      // Validate dates
      if (termData.endDate <= termData.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Check if fee term exists
      const feeTerm = await ctx.db.feeTerm.findUnique({
        where: { id },
      });

      if (!feeTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee term not found",
        });
      }

      // Check for duplicate name if name is being changed
      if (termData.name && termData.name !== feeTerm.name) {
        const existing = await ctx.db.feeTerm.findFirst({
          where: {
            name: termData.name,
            branchId: feeTerm.branchId,
            sessionId: feeTerm.sessionId,
            id: { not: id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A fee term with this name already exists for this branch and session",
          });
        }
      }

      return ctx.db.$transaction(async (prisma) => {
        // Update the fee term
        await prisma.feeTerm.update({
          where: { id },
          data: termData,
        });

        // Update fee head associations if provided
        if (feeHeadIds !== undefined) {
          // Remove existing associations
          await prisma.feeTermFeeHead.deleteMany({
            where: { feeTermId: id },
          });

          // Add new associations
          if (feeHeadIds.length > 0) {
            await prisma.feeTermFeeHead.createMany({
              data: feeHeadIds.map((feeHeadId) => ({
                feeTermId: id,
                feeHeadId,
              })),
            });
          }
        }

        // Return the updated term with relations
        return prisma.feeTerm.findUnique({
          where: { id },
          include: {
            branch: true,
            session: true,
            feeHeads: {
              include: {
                feeHead: true,
              },
            },
          },
        });
      });
    }),

  deleteFeeTerm: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if fee term exists and get usage counts
      const feeTerm = await ctx.db.feeTerm.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              classwiseFees: true,
              feeCollections: true,
            },
          },
        },
      });

      if (!feeTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee term not found",
        });
      }

      // Check if fee term is used in classwise fees or collections
      const totalUsage = feeTerm._count.classwiseFees + feeTerm._count.feeCollections;
      if (totalUsage > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete fee term as it is being used in classwise fees or fee collections",
        });
      }

      return ctx.db.feeTerm.delete({
        where: { id: input.id },
      });
    }),

  // Classwise Fee Management
  getClasswiseFees: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
      classId: z.string().optional(),
      feeTermId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        ...(input?.classId && { classId: input.classId }),
        ...(input?.feeTermId && { feeTermId: input.feeTermId }),
      });

      return ctx.db.classwiseFee.findMany({
        where,
        include: {
          class: true,
          feeTerm: true,
          feeHead: true,
          branch: true,
          session: true,
        },
        orderBy: [
          { class: { name: "asc" } },
          { feeTerm: { name: "asc" } },
          { feeHead: { name: "asc" } },
        ],
      });
    }),

  setClasswiseFees: protectedProcedure
    .input(z.object({
      classId: z.string(),
      feeTermId: z.string(),
      fees: z.array(z.object({
        feeHeadId: z.string(),
        amount: z.number().min(0),
      })),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (prisma) => {
        // Remove existing classwise fees for this class and term
        await prisma.classwiseFee.deleteMany({
          where: {
            classId: input.classId,
            feeTermId: input.feeTermId,
          },
        });

        // Create new classwise fees
        if (input.fees.length > 0) {
          await prisma.classwiseFee.createMany({
            data: input.fees.map((fee) => ({
              classId: input.classId,
              feeTermId: input.feeTermId,
              feeHeadId: fee.feeHeadId,
              amount: fee.amount,
              branchId: input.branchId,
              sessionId: input.sessionId,
            })),
          });
        }

        // Return the updated classwise fees
        return prisma.classwiseFee.findMany({
          where: {
            classId: input.classId,
            feeTermId: input.feeTermId,
          },
          include: {
            class: true,
            feeTerm: true,
            feeHead: true,
          },
        });
      });
    }),

  copyClasswiseFees: protectedProcedure
    .input(z.object({
      fromClassId: z.string(),
      toClassId: z.string(),
      feeTermId: z.string(),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (prisma) => {
        // Get fees from source class
        const sourceFees = await prisma.classwiseFee.findMany({
          where: {
            classId: input.fromClassId,
            feeTermId: input.feeTermId,
          },
        });

        if (sourceFees.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No fees found for the source class and term",
          });
        }

        // Remove existing fees for target class
        await prisma.classwiseFee.deleteMany({
          where: {
            classId: input.toClassId,
            feeTermId: input.feeTermId,
          },
        });

        // Copy fees to target class
        await prisma.classwiseFee.createMany({
          data: sourceFees.map((fee) => ({
            classId: input.toClassId,
            feeTermId: fee.feeTermId,
            feeHeadId: fee.feeHeadId,
            amount: fee.amount,
            branchId: input.branchId,
            sessionId: input.sessionId,
          })),
        });

        // Return the copied fees
        return prisma.classwiseFee.findMany({
          where: {
            classId: input.toClassId,
            feeTermId: input.feeTermId,
          },
          include: {
            class: true,
            feeTerm: true,
            feeHead: true,
          },
        });
      });
    }),

  // Fee Collection Management
  getFeeCollections: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
      studentId: z.string().optional(),
      feeTermId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        ...(input?.studentId && { studentId: input.studentId }),
        ...(input?.feeTermId && { feeTermId: input.feeTermId }),
      });

      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;

      const feeCollections = await ctx.db.feeCollection.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where,
        include: {
          student: {
            include: {
              section: true,
            },
          },
          feeTerm: true,
          items: {
            include: {
              feeHead: true,
            },
          },
          branch: true,
          session: true,
        },
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (feeCollections.length > limit) {
        const nextItem = feeCollections.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: feeCollections,
        nextCursor,
      };
    }),

  createFeeCollection: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      feeTermId: z.string(),
      paymentMode: z.string(),
      transactionReference: z.string().optional(),
      paymentDate: z.date(),
      notes: z.string().optional(),
      items: z.array(z.object({
        feeHeadId: z.string(),
        amount: z.number().min(0),
      })),
      branchId: z.string(),
      sessionId: z.string(),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...collectionData } = input;

      if (items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one fee item is required",
        });
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      return ctx.db.$transaction(async (prisma) => {
        // Generate receipt number
        const receiptCount = await prisma.feeCollection.count({
          where: {
            branchId: input.branchId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        });

        const receiptNumber = `RCP-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(6, '0')}`;

        // Create fee collection
        const feeCollection = await prisma.feeCollection.create({
          data: {
            ...collectionData,
            receiptNumber,
            totalAmount,
            paidAmount: totalAmount,
          },
        });

        // Create fee collection items
        await prisma.feeCollectionItem.createMany({
          data: items.map((item) => ({
            feeCollectionId: feeCollection.id,
            feeHeadId: item.feeHeadId,
            amount: item.amount,
          })),
        });

        // Return the complete fee collection
        return prisma.feeCollection.findUnique({
          where: { id: feeCollection.id },
          include: {
            student: {
              include: {
                section: true,
              },
            },
            feeTerm: true,
            items: {
              include: {
                feeHead: true,
              },
            },
            branch: true,
            session: true,
          },
        });
      });
    }),

  updateFeeCollection: protectedProcedure
    .input(z.object({
      id: z.string(),
      paymentMode: z.string(),
      transactionReference: z.string().optional(),
      paymentDate: z.date(),
      notes: z.string().optional(),
      items: z.array(z.object({
        feeHeadId: z.string(),
        amount: z.number().min(0),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...updateData } = input;

      return ctx.db.$transaction(async (prisma) => {
        // Check if fee collection exists
        const existing = await prisma.feeCollection.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fee collection not found",
          });
        }

        let totalAmount = existing.totalAmount;

        // Update items if provided
        if (items !== undefined) {
          if (items.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "At least one fee item is required",
            });
          }

          // Remove existing items
          await prisma.feeCollectionItem.deleteMany({
            where: { feeCollectionId: id },
          });

          // Create new items
          await prisma.feeCollectionItem.createMany({
            data: items.map((item) => ({
              feeCollectionId: id,
              feeHeadId: item.feeHeadId,
              amount: item.amount,
            })),
          });

          totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        }

        // Update fee collection
        await prisma.feeCollection.update({
          where: { id },
          data: {
            ...updateData,
            totalAmount,
            paidAmount: totalAmount,
          },
        });

        // Return the updated fee collection
        return prisma.feeCollection.findUnique({
          where: { id },
          include: {
            student: {
              include: {
                section: true,
              },
            },
            feeTerm: true,
            items: {
              include: {
                feeHead: true,
              },
            },
            branch: true,
            session: true,
          },
        });
      });
    }),

  deleteFeeCollection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeCollection = await ctx.db.feeCollection.findUnique({
        where: { id: input.id },
      });

      if (!feeCollection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee collection not found",
        });
      }

      return ctx.db.feeCollection.delete({
        where: { id: input.id },
      });
    }),

  // Student Fee Details
  getStudentFeeDetails: publicProcedure
    .input(z.object({
      studentId: z.string(),
      feeTermId: z.string().optional(),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get student with section and class
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: { 
          section: {
            include: {
              class: true
            }
          }
        },
      });

      if (!student?.section?.class) {
        return [];
      }

      // Get classwise fees for the student's class
      const classwiseFees = await ctx.db.classwiseFee.findMany({
        where: {
          classId: student.section.class.id,
          branchId: input.branchId,
          sessionId: input.sessionId,
          ...(input.feeTermId && { feeTermId: input.feeTermId }),
        },
        include: {
          feeTerm: true,
          feeHead: true,
        },
      });

      // Get paid amounts for each fee head and term
      const paidAmounts = await ctx.db.feeCollectionItem.findMany({
        where: {
          feeCollection: {
            studentId: input.studentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            ...(input.feeTermId && { feeTermId: input.feeTermId }),
          },
        },
        include: {
          feeHead: true,
          feeCollection: {
            include: {
              feeTerm: true,
            },
          },
        },
      });

      // Calculate fee details
      const feeDetails = classwiseFees.map((classwiseFee) => {
        const paid = paidAmounts
          .filter(
            (item) =>
              item.feeHeadId === classwiseFee.feeHeadId &&
              item.feeCollection.feeTermId === classwiseFee.feeTermId
          )
          .reduce((sum, item) => sum + item.amount, 0);

        const due = Math.max(0, classwiseFee.amount - paid);

        return {
          id: `${classwiseFee.classId}-${classwiseFee.feeTermId}-${classwiseFee.feeHeadId}`,
          feeHead: classwiseFee.feeHead.name,
          term: classwiseFee.feeTerm.name,
          totalAmount: classwiseFee.amount,
          paidAmount: paid,
          dueAmount: due,
          dueDate: classwiseFee.feeTerm.dueDate.toISOString().split('T')[0],
          status: due === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending') as 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue',
          feeHeadId: classwiseFee.feeHeadId,
          feeTermId: classwiseFee.feeTermId,
        };
      });

      return feeDetails;
    }),

  // Get classes for dropdown (filtered by branch and session)
  getClasses: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.class.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          isActive: true,
        },
        orderBy: [
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
        },
      });
    }),

  // Get students for search (filtered by branch and session)
  getStudents: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      search: z.string().optional(),
      classId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        branchId: input.branchId,
        isActive: true,
        class: {
          sessionId: input.sessionId,
          ...(input.classId && { id: input.classId }),
        },
        ...(input.search && {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" as const } },
            { lastName: { contains: input.search, mode: "insensitive" as const } },
            { admissionNumber: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      return ctx.db.student.findMany({
        where,
        include: {
          section: {
            include: {
              class: true
            }
          },
          parent: true,
        },
        orderBy: [
          { firstName: "asc" },
          { lastName: "asc" },
        ],
        take: 50, // Limit results for performance
      });
    }),
}); 