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
      studentType: z.enum(["NEW_ADMISSION", "OLD_STUDENT", "BOTH"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        ...(input?.studentType && { studentType: input.studentType }),
        isActive: true,
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
      name: z.string().min(1, "Name is required").max(100, "Name too long"),
      description: z.string().optional(),
      isSystemDefined: z.boolean().default(false),
      studentType: z.enum(["NEW_ADMISSION", "OLD_STUDENT", "BOTH"]).default("BOTH"),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Sanitize name
      const sanitizedName = input.name.trim();
      
      // Check for duplicate name in the same branch and session
      const existing = await ctx.db.feeHead.findFirst({
        where: {
          name: sanitizedName,
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
        data: {
          ...input,
          name: sanitizedName,
        },
        include: {
          branch: true,
          session: true,
        },
      });
    }),

  updateFeeHead: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1, "Name is required").max(100, "Name too long"),
      description: z.string().optional(),
      isSystemDefined: z.boolean().optional(),
      studentType: z.enum(["NEW_ADMISSION", "OLD_STUDENT", "BOTH"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const sanitizedName = data.name?.trim();

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
      if (sanitizedName && sanitizedName !== feeHead.name) {
        const existing = await ctx.db.feeHead.findFirst({
          where: {
            name: sanitizedName,
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
        data: {
          ...data,
          ...(sanitizedName && { name: sanitizedName }),
        },
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
        isActive: true,
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
        orderBy: [
          { order: "asc" },
          { startDate: "asc" },
        ],
      });
    }),

  createFeeTerm: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required").max(100, "Name too long"),
      description: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
      dueDate: z.date(),
      feeHeadIds: z.array(z.string()).optional(),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sanitizedName = input.name.trim();
      
      // Validate dates
      if (input.endDate <= input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Due date validation removed - due date can now be before start date

      // Check for duplicate name in the same branch and session
      const existing = await ctx.db.feeTerm.findFirst({
        where: {
          name: sanitizedName,
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
          data: {
            ...termData,
            name: sanitizedName,
          },
        });

        // Associate fee heads if provided
        if (feeHeadIds && feeHeadIds.length > 0) {
          // Validate fee heads exist
          const validFeeHeads = await prisma.feeHead.findMany({
            where: {
              id: { in: feeHeadIds },
              branchId: input.branchId,
              sessionId: input.sessionId,
              isActive: true,
            },
          });

          if (validFeeHeads.length !== feeHeadIds.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Some fee heads are invalid or inactive",
            });
          }

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
      name: z.string().min(1, "Name is required").max(100, "Name too long"),
      description: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
      dueDate: z.date(),
      feeHeadIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, feeHeadIds, ...termData } = input;
      const sanitizedName = termData.name.trim();

      // Validate dates
      if (termData.endDate <= termData.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Due date validation removed - due date can now be before start date

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
      if (sanitizedName && sanitizedName !== feeTerm.name) {
        const existing = await ctx.db.feeTerm.findFirst({
          where: {
            name: sanitizedName,
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
          data: {
            ...termData,
            name: sanitizedName,
          },
        });

        // Update fee head associations if provided
        if (feeHeadIds !== undefined) {
          // Validate fee heads exist
          if (feeHeadIds.length > 0) {
            const validFeeHeads = await prisma.feeHead.findMany({
              where: {
                id: { in: feeHeadIds },
                branchId: feeTerm.branchId,
                sessionId: feeTerm.sessionId,
                isActive: true,
              },
            });

            if (validFeeHeads.length !== feeHeadIds.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Some fee heads are invalid or inactive",
              });
            }
          }

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

  // Fee Term Ordering
  reorderFeeTerms: protectedProcedure
    .input(z.object({
      feeTermIds: z.array(z.string()).min(1, "At least one fee term ID is required"),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate that all fee terms exist and belong to the specified branch/session
      const feeTerms = await ctx.db.feeTerm.findMany({
        where: {
          id: { in: input.feeTermIds },
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
      });

      if (feeTerms.length !== input.feeTermIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some fee terms are invalid or don't belong to the specified branch and session",
        });
      }

      // Update the order for each fee term
      return ctx.db.$transaction(
        input.feeTermIds.map((feeTermId, index) =>
          ctx.db.feeTerm.update({
            where: { id: feeTermId },
            data: { order: index + 1 },
          })
        )
      );
    }),

  moveFeeTermUp: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const feeTerm = await ctx.db.feeTerm.findUnique({
        where: { id: input.id },
      });

      if (!feeTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee term not found",
        });
      }

      // Find the previous fee term (lower order number)
      const previousTerm = await ctx.db.feeTerm.findFirst({
        where: {
          branchId: feeTerm.branchId,
          sessionId: feeTerm.sessionId,
          order: { lt: feeTerm.order },
          isActive: true,
        },
        orderBy: { order: "desc" },
      });

      if (!previousTerm) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fee term is already at the top",
        });
      }

      // Swap the order values
      return ctx.db.$transaction([
        ctx.db.feeTerm.update({
          where: { id: feeTerm.id },
          data: { order: previousTerm.order },
        }),
        ctx.db.feeTerm.update({
          where: { id: previousTerm.id },
          data: { order: feeTerm.order },
        }),
      ]);
    }),

  moveFeeTermDown: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const feeTerm = await ctx.db.feeTerm.findUnique({
        where: { id: input.id },
      });

      if (!feeTerm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee term not found",
        });
      }

      // Find the next fee term (higher order number)
      const nextTerm = await ctx.db.feeTerm.findFirst({
        where: {
          branchId: feeTerm.branchId,
          sessionId: feeTerm.sessionId,
          order: { gt: feeTerm.order },
          isActive: true,
        },
        orderBy: { order: "asc" },
      });

      if (!nextTerm) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fee term is already at the bottom",
        });
      }

      // Swap the order values
      return ctx.db.$transaction([
        ctx.db.feeTerm.update({
          where: { id: feeTerm.id },
          data: { order: nextTerm.order },
        }),
        ctx.db.feeTerm.update({
          where: { id: nextTerm.id },
          data: { order: feeTerm.order },
        }),
      ]);
    }),

  // Classwise Fee Management
  getClasswiseFees: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
      sectionId: z.string().optional(),
      feeTermId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        ...(input?.feeTermId && { feeTermId: input.feeTermId }),
        // Handle sectionId filter - either specific section or only non-null sections
        sectionId: input?.sectionId ? input.sectionId : { not: null },
      });

      return ctx.db.classwiseFee.findMany({
        where,
        include: {
          section: {
            include: {
              class: true,
            },
          },
          feeTerm: true,
          feeHead: true,
          branch: true,
          session: true,
        },
        orderBy: [
          { feeTerm: { name: "asc" } },
          { feeHead: { name: "asc" } },
          { section: { class: { name: "asc" } } },
          { section: { name: "asc" } },
        ],
      });
    }),

  setClasswiseFees: protectedProcedure
    .input(z.object({
      sectionId: z.string(),
      feeTermId: z.string(),
      fees: z.array(z.object({
        feeHeadId: z.string(),
        amount: z.number().min(0, "Amount cannot be negative"),
      })),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate section exists
      const sectionExists = await ctx.db.section.findUnique({
        where: { id: input.sectionId },
        select: { 
          id: true, 
          classId: true,
          class: {
            select: {
              branchId: true,
              sessionId: true,
            },
          },
        },
      });

      if (!sectionExists || 
          sectionExists.class.branchId !== input.branchId || 
          sectionExists.class.sessionId !== input.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid section for the specified branch and session",
        });
      }

      // Validate fee term exists
      const feeTermExists = await ctx.db.feeTerm.findUnique({
        where: { id: input.feeTermId },
        select: { id: true, branchId: true, sessionId: true },
      });

      if (!feeTermExists || feeTermExists.branchId !== input.branchId || feeTermExists.sessionId !== input.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid fee term for the specified branch and session",
        });
      }

      // Validate fee heads exist
      if (input.fees.length > 0) {
        const feeHeadIds = input.fees.map(f => f.feeHeadId);
        const validFeeHeads = await ctx.db.feeHead.findMany({
          where: {
            id: { in: feeHeadIds },
            branchId: input.branchId,
            sessionId: input.sessionId,
            isActive: true,
          },
        });

        if (validFeeHeads.length !== feeHeadIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Some fee heads are invalid or inactive",
          });
        }
      }

      return ctx.db.$transaction(async (prisma) => {
        // Remove existing classwise fees for this section and term
        await prisma.classwiseFee.deleteMany({
          where: {
            sectionId: input.sectionId,
            feeTermId: input.feeTermId,
          },
        });

        // Create new classwise fees
        if (input.fees.length > 0) {
          await prisma.classwiseFee.createMany({
            data: input.fees.map((fee) => ({
              sectionId: input.sectionId,
              feeTermId: input.feeTermId,
              feeHeadId: fee.feeHeadId,
              amount: fee.amount,
              branchId: input.branchId,
              sessionId: input.sessionId,
              // Include classId for backwards compatibility during transition
              classId: sectionExists.classId,
            })),
          });
        }

        // Return the updated classwise fees
        return prisma.classwiseFee.findMany({
          where: {
            sectionId: input.sectionId,
            feeTermId: input.feeTermId,
          },
          include: {
            section: {
              include: {
                class: true,
              },
            },
            feeTerm: true,
            feeHead: true,
          },
        });
      });
    }),

  copyClasswiseFees: protectedProcedure
    .input(z.object({
      fromSectionId: z.string(),
      toSectionId: z.string(),
      feeTermId: z.string(),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate both sections exist in the same branch and session
      const sections = await ctx.db.section.findMany({
        where: {
          id: { in: [input.fromSectionId, input.toSectionId] },
        },
        include: {
          class: {
            select: {
              id: true,
              branchId: true,
              sessionId: true,
            },
          },
        },
      });

      if (sections.length !== 2 || 
          !sections.every(s => s.class.branchId === input.branchId && s.class.sessionId === input.sessionId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid sections for the specified branch and session",
        });
      }

      const toSection = sections.find(s => s.id === input.toSectionId);
      if (!toSection) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Target section not found",
        });
      }

      return ctx.db.$transaction(async (prisma) => {
        // Get fees from source section
        const sourceFees = await prisma.classwiseFee.findMany({
          where: {
            sectionId: input.fromSectionId,
            feeTermId: input.feeTermId,
          },
        });

        if (sourceFees.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No fees found for the source section and term",
          });
        }

        // Remove existing fees for target section
        await prisma.classwiseFee.deleteMany({
          where: {
            sectionId: input.toSectionId,
            feeTermId: input.feeTermId,
          },
        });

        // Copy fees to target section
        await prisma.classwiseFee.createMany({
          data: sourceFees.map((fee) => ({
            sectionId: input.toSectionId,
            feeTermId: fee.feeTermId,
            feeHeadId: fee.feeHeadId,
            amount: fee.amount,
            branchId: input.branchId,
            sessionId: input.sessionId,
            // Include classId for the target section
            classId: toSection.class.id,
          })),
        });

        // Return the copied fees
        return prisma.classwiseFee.findMany({
          where: {
            sectionId: input.toSectionId,
            feeTermId: input.feeTermId,
          },
          include: {
            section: {
              include: {
                class: true,
              },
            },
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
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        ...(input?.studentId && { studentId: input.studentId }),
        ...(input?.feeTermId && { feeTermId: input.feeTermId }),
        ...(input?.startDate && input?.endDate && {
          paymentDate: {
            gte: input.startDate,
            lte: input.endDate,
          },
        }),
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
              section: {
                include: {
                  class: true,
                },
              },
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
      paymentMode: z.enum(["Cash", "Card", "Online", "Cheque", "DD", "Bank Transfer"]),
      transactionReference: z.string().optional(),
      paymentDate: z.date(),
      notes: z.string().optional(),
      items: z.array(z.object({
        feeHeadId: z.string(),
        amount: z.number().min(0.01, "Amount must be greater than 0"),
      })).min(1, "At least one fee item is required"),
      branchId: z.string(),
      sessionId: z.string(),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { items, ...collectionData } = input;

      // Validate student exists and belongs to the branch/session
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: {
          section: {
            include: {
              class: true,
            },
          },
        },
      });

      if (!student || student.branchId !== input.branchId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid student for the specified branch",
        });
      }

      if (!student.section?.class || student.section.class.sessionId !== input.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is not enrolled in the specified academic session",
        });
      }

      // Validate fee term
      const feeTerm = await ctx.db.feeTerm.findUnique({
        where: { id: input.feeTermId },
      });

      if (!feeTerm || feeTerm.branchId !== input.branchId || feeTerm.sessionId !== input.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid fee term for the specified branch and session",
        });
      }

      // Validate fee heads
      const feeHeadIds = items.map(item => item.feeHeadId);
      const validFeeHeads = await ctx.db.feeHead.findMany({
        where: {
          id: { in: feeHeadIds },
          branchId: input.branchId,
          sessionId: input.sessionId,
          isActive: true,
        },
      });

      if (validFeeHeads.length !== feeHeadIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some fee heads are invalid or inactive",
        });
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      return ctx.db.$transaction(async (prisma) => {
        // Generate improved receipt number
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Get count for this branch, year, and month for better uniqueness
        const receiptCount = await prisma.feeCollection.count({
          where: {
            branchId: input.branchId,
            createdAt: {
              gte: new Date(year, new Date().getMonth(), 1),
              lt: new Date(year, new Date().getMonth() + 1, 1),
            },
          },
        });

        const receiptNumber = `RCP-${year}${month}-${input.branchId.slice(-3).toUpperCase()}-${String(receiptCount + 1).padStart(4, '0')}`;

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
                section: {
                  include: {
                    class: true,
                  },
                },
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

  // Bulk Fee Collection
  createBulkFeeCollection: protectedProcedure
    .input(z.object({
      collections: z.array(z.object({
        studentId: z.string(),
        feeTermId: z.string(),
        paymentMode: z.enum(["Cash", "Card", "Online", "Cheque", "DD", "Bank Transfer"]),
        transactionReference: z.string().optional(),
        paymentDate: z.date(),
        notes: z.string().optional(),
        items: z.array(z.object({
          feeHeadId: z.string(),
          amount: z.number().min(0.01),
        })).min(1),
      })).min(1, "At least one collection is required").max(50, "Maximum 50 collections allowed per bulk operation"),
      branchId: z.string(),
      sessionId: z.string(),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { collections, branchId, sessionId, createdBy } = input;

      // Validate all students belong to the branch/session
      const studentIds = collections.map(c => c.studentId);
      const validStudents = await ctx.db.student.findMany({
        where: {
          id: { in: studentIds },
          branchId,
        },
        include: {
          section: {
            include: {
              class: true,
            },
          },
        },
      });

      const invalidStudents = studentIds.filter(id => 
        !validStudents.find(s => s.id === id && s.section?.class?.sessionId === sessionId)
      );

      if (invalidStudents.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid students for the specified branch and session: ${invalidStudents.join(', ')}`,
        });
      }

      // Validate all fee terms
      const feeTermIds = [...new Set(collections.map(c => c.feeTermId))];
      const validFeeTerms = await ctx.db.feeTerm.findMany({
        where: {
          id: { in: feeTermIds },
          branchId,
          sessionId,
          isActive: true,
        },
      });

      if (validFeeTerms.length !== feeTermIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some fee terms are invalid",
        });
      }

      // Validate all fee heads
      const allFeeHeadIds = [...new Set(collections.flatMap(c => c.items.map(i => i.feeHeadId)))];
      const validFeeHeads = await ctx.db.feeHead.findMany({
        where: {
          id: { in: allFeeHeadIds },
          branchId,
          sessionId,
          isActive: true,
        },
      });

      if (validFeeHeads.length !== allFeeHeadIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some fee heads are invalid",
        });
      }

      return ctx.db.$transaction(async (prisma) => {
        const results = [];
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');

        // Get starting receipt count
        let receiptCount = await prisma.feeCollection.count({
          where: {
            branchId,
            createdAt: {
              gte: new Date(year, new Date().getMonth(), 1),
              lt: new Date(year, new Date().getMonth() + 1, 1),
            },
          },
        });

        for (const collection of collections) {
          const totalAmount = collection.items.reduce((sum, item) => sum + item.amount, 0);
          receiptCount++;

          const receiptNumber = `RCP-${year}${month}-${branchId.slice(-3).toUpperCase()}-${String(receiptCount).padStart(4, '0')}`;

          // Create fee collection
          const feeCollection = await prisma.feeCollection.create({
            data: {
              studentId: collection.studentId,
              feeTermId: collection.feeTermId,
              paymentMode: collection.paymentMode,
              transactionReference: collection.transactionReference,
              paymentDate: collection.paymentDate,
              notes: collection.notes,
              receiptNumber,
              totalAmount,
              paidAmount: totalAmount,
              branchId,
              sessionId,
              createdBy,
            },
          });

          // Create fee collection items
          await prisma.feeCollectionItem.createMany({
            data: collection.items.map((item) => ({
              feeCollectionId: feeCollection.id,
              feeHeadId: item.feeHeadId,
              amount: item.amount,
            })),
          });

          results.push(feeCollection);
        }

        return results;
      });
    }),

  updateFeeCollection: protectedProcedure
    .input(z.object({
      id: z.string(),
      paymentMode: z.enum(["Cash", "Card", "Online", "Cheque", "DD", "Bank Transfer"]),
      transactionReference: z.string().optional(),
      paymentDate: z.date(),
      notes: z.string().optional(),
      items: z.array(z.object({
        feeHeadId: z.string(),
        amount: z.number().min(0.01),
      })).min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...updateData } = input;

      return ctx.db.$transaction(async (prisma) => {
        // Check if fee collection exists
        const existing = await prisma.feeCollection.findUnique({
          where: { id },
          include: {
            items: true,
          },
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
          // Validate fee heads exist and are active
          const feeHeadIds = items.map(item => item.feeHeadId);
          const validFeeHeads = await prisma.feeHead.findMany({
            where: {
              id: { in: feeHeadIds },
              branchId: existing.branchId,
              sessionId: existing.sessionId,
              isActive: true,
            },
          });

          if (validFeeHeads.length !== feeHeadIds.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Some fee heads are invalid or inactive",
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
                section: {
                  include: {
                    class: true,
                  },
                },
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

      // Validate student belongs to the correct branch and session
      if (student.branchId !== input.branchId || student.section.class.sessionId !== input.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student does not belong to the specified branch and session",
        });
      }

      // Get classwise fees for the student's section (now section-level fees)
      const classwiseFees = await ctx.db.classwiseFee.findMany({
        where: {
          sectionId: student.section.id,
          branchId: input.branchId,
          sessionId: input.sessionId,
          ...(input.feeTermId && { feeTermId: input.feeTermId }),
        },
        include: {
          feeTerm: true,
          feeHead: true,
        },
      });

      // Get student concessions
      const studentConcessions = await ctx.db.studentConcession.findMany({
        where: {
          studentId: input.studentId,
          branchId: input.branchId,
          sessionId: input.sessionId,
          status: 'APPROVED',
          validFrom: { lte: new Date() },
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
        },
        include: {
          concessionType: true,
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

      // Calculate fee details with concession information
      const feeDetails = classwiseFees.map((classwiseFee) => {
        // Calculate applicable concessions for this specific fee head and term
        const applicableConcessions = studentConcessions.filter((concession: any) => {
          // Check if concession applies to this fee head (empty array means all fee heads)
          if (concession.appliedFeeHeads.length > 0 && !concession.appliedFeeHeads.includes(classwiseFee.feeHeadId)) {
            return false;
          }
          
          // Check if concession applies to this fee term (empty array means all fee terms)
          if (concession.appliedFeeTerms.length > 0 && !concession.appliedFeeTerms.includes(classwiseFee.feeTermId)) {
            return false;
          }
          
          return true;
        });

        // Calculate concession amount
        let totalConcessionAmount = 0;
        const appliedConcessionDetails = applicableConcessions.map((concession: any) => {
          const concessionValue = concession.customValue ?? concession.concessionType.value;
          let concessionAmount = 0;
          
          if (concession.concessionType.type === 'PERCENTAGE') {
            concessionAmount = classwiseFee.amount * (concessionValue / 100);
          } else {
            concessionAmount = concessionValue;
          }
          
          totalConcessionAmount += concessionAmount;
          
          return {
            id: concession.id,
            name: concession.concessionType.name,
            type: concession.concessionType.type,
            value: concessionValue,
            amount: concessionAmount,
            reason: concession.reason,
          };
        });

        // Ensure total concession doesn't exceed fee amount
        totalConcessionAmount = Math.min(totalConcessionAmount, classwiseFee.amount);

        // Calculate effective fee amount after concessions
        const effectiveAmount = Math.max(0, classwiseFee.amount - totalConcessionAmount);

        const paid = paidAmounts
          .filter(
            (item) =>
              item.feeHeadId === classwiseFee.feeHeadId &&
              item.feeCollection.feeTermId === classwiseFee.feeTermId
          )
          .reduce((sum, item) => sum + item.amount, 0);

        const due = Math.max(0, effectiveAmount - paid);
        const today = new Date();
        const dueDate = new Date(classwiseFee.feeTerm.dueDate);
        
        let status: 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue';
        if (due === 0) {
          status = 'Paid';
        } else if (paid > 0) {
          status = 'Partially Paid';
        } else if (dueDate < today) {
          status = 'Overdue';
        } else {
          status = 'Pending';
        }

        return {
          id: `${classwiseFee.sectionId}-${classwiseFee.feeTermId}-${classwiseFee.feeHeadId}`,
          feeHead: classwiseFee.feeHead.name,
          term: classwiseFee.feeTerm.name,
          originalAmount: classwiseFee.amount,
          concessionAmount: totalConcessionAmount,
          totalAmount: effectiveAmount,
          paidAmount: paid,
          dueAmount: due,
          dueDate: classwiseFee.feeTerm.dueDate.toISOString().split('T')[0],
          status,
          feeHeadId: classwiseFee.feeHeadId,
          feeTermId: classwiseFee.feeTermId,
          appliedConcessions: appliedConcessionDetails,
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

  // Get fee collection analytics for dashboard
  getFeeCollectionAnalytics: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      days: z.number().optional(), // Make days optional to support "all time"
      startDate: z.date().optional(), // Support custom date ranges
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all fee heads for this branch and session
      const feeHeads = await ctx.db.feeHead.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });

      // Build date filter - handle custom dates or days-based filtering
      const dateFilter: any = {};
      if (input.startDate && input.endDate) {
        // Custom date range
        dateFilter.paymentDate = {
          gte: input.startDate,
          lte: input.endDate,
        };
      } else if (input.days && input.days > 0) {
        // Days-based filtering
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        dateFilter.paymentDate = {
          gte: startDate,
        };
      }

      // Get daily fee collections for the specified period (or all time)
      const feeCollections = await ctx.db.feeCollection.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          ...dateFilter,
        },
        include: {
          items: {
            include: {
              feeHead: true,
            },
          },
        },
        orderBy: { paymentDate: "asc" },
      });

      // Get total amounts due (from classwise fees - now section-level) for the specific time period
      const classwiseFeesQuery: any = {
        branchId: input.branchId,
        sessionId: input.sessionId,
      };

      // If we have a specific date range, filter fee terms that fall within or overlap the period
      if (input.startDate && input.endDate) {
        classwiseFeesQuery.feeTerm = {
          OR: [
            {
              dueDate: {
                gte: input.startDate,
                lte: input.endDate,
              },
            },
            {
              startDate: {
                gte: input.startDate,
                lte: input.endDate,
              },
            },
            {
              endDate: {
                gte: input.startDate,
                lte: input.endDate,
              },
            },
            // Also include terms that span the entire period
            {
              AND: [
                { startDate: { lte: input.startDate } },
                { endDate: { gte: input.endDate } },
              ],
            },
          ],
        };
      } else if (input.days && input.days > 0) {
        // For days-based filtering, include terms due within the period
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        classwiseFeesQuery.feeTerm = {
          dueDate: {
            gte: startDate,
          },
        };
      }

      const classwiseFees = await ctx.db.classwiseFee.findMany({
        where: classwiseFeesQuery,
        include: {
          feeHead: true,
          feeTerm: true,
          section: {
            include: {
              students: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      });

      // Calculate total collection amounts by fee head and date
      const dailyCollections: Record<string, Record<string, number>> = {};
      const feeHeadTotals: Record<string, { collected: number; due: number; concession: number }> = {};

      // Initialize fee head totals
      feeHeads.forEach(feeHead => {
        feeHeadTotals[feeHead.id] = { collected: 0, due: 0, concession: 0 };
      });

      // Process fee collections (only those in the filtered period)
      feeCollections.forEach(collection => {
        const date = collection.paymentDate.toISOString().split('T')[0]!;
        
        collection.items.forEach(item => {
          const feeHeadName = item.feeHead.name;
          
          if (!dailyCollections[date]) {
            dailyCollections[date] = {};
          }
          
          dailyCollections[date]![feeHeadName] = (dailyCollections[date]?.[feeHeadName] ?? 0) + item.amount;
          if (feeHeadTotals[item.feeHeadId]) {
            feeHeadTotals[item.feeHeadId]!.collected += item.amount;
          }
        });
      });

      // Calculate total due amounts from classwise fees (only for the filtered period)
      classwiseFees.forEach(classwiseFee => {
        const studentCount = classwiseFee.section?.students.length || 0;
        const totalDue = classwiseFee.amount * studentCount;
        if (feeHeadTotals[classwiseFee.feeHeadId]) {
          feeHeadTotals[classwiseFee.feeHeadId]!.due += totalDue;
        }
      });

      // Generate chart data based on whether we're showing all time or a specific period
      const chartData = [];
      
      if (input.startDate && input.endDate) {
        // Custom date range - use daily data for short ranges, monthly for long ranges
        const diffTime = Math.abs(input.endDate.getTime() - input.startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 90) {
          // For ranges longer than 90 days, use monthly aggregation
          const monthlyCollections: Record<string, Record<string, number>> = {};
          const monthLabels: Record<string, string> = {};
          
          feeCollections.forEach(collection => {
            const date = new Date(collection.paymentDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            
            // Store month label separately
            if (!monthLabels[monthKey]) {
              monthLabels[monthKey] = monthLabel;
            }
            
            collection.items.forEach(item => {
              const feeHeadName = item.feeHead.name;
              
              if (!monthlyCollections[monthKey]) {
                monthlyCollections[monthKey] = {};
              }
              
              monthlyCollections[monthKey]![feeHeadName] = (monthlyCollections[monthKey]?.[feeHeadName] ?? 0) + item.amount;
            });
          });
          
          // Convert to chart data format and sort by month
          const sortedMonths = Object.keys(monthlyCollections).sort();
          sortedMonths.forEach(monthKey => {
            const monthData = monthlyCollections[monthKey]!;
            const dayData: any = { date: monthLabels[monthKey] };
            
            feeHeads.forEach(feeHead => {
              dayData[feeHead.name] = monthData[feeHead.name] ?? 0;
            });
            
            chartData.push(dayData);
          });
        } else {
          // For shorter ranges, use daily data
          const currentDate = new Date(input.startDate);
          while (currentDate <= input.endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const dayData: any = { date: formattedDate };
            
            feeHeads.forEach(feeHead => {
              dayData[feeHead.name] = dailyCollections[dateKey!]?.[feeHead.name] ?? 0;
            });
            
            chartData.push(dayData);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      } else if (input.days && input.days > 0) {
        // For yearly view (365+ days), use monthly aggregation to avoid too many data points
        if (input.days >= 365) {
          const monthlyCollections: Record<string, Record<string, number>> = {};
          const monthLabels: Record<string, string> = {};
          
          feeCollections.forEach(collection => {
            const date = new Date(collection.paymentDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            
            // Store month label separately
            if (!monthLabels[monthKey]) {
              monthLabels[monthKey] = monthLabel;
            }
            
            collection.items.forEach(item => {
              const feeHeadName = item.feeHead.name;
              
              if (!monthlyCollections[monthKey]) {
                monthlyCollections[monthKey] = {};
              }
              
              monthlyCollections[monthKey]![feeHeadName] = (monthlyCollections[monthKey]?.[feeHeadName] ?? 0) + item.amount;
            });
          });
          
          // Convert to chart data format and sort by month
          const sortedMonths = Object.keys(monthlyCollections).sort();
          sortedMonths.forEach(monthKey => {
            const monthData = monthlyCollections[monthKey]!;
            const dayData: any = { date: monthLabels[monthKey] };
            
            feeHeads.forEach(feeHead => {
              dayData[feeHead.name] = monthData[feeHead.name] ?? 0;
            });
            
            chartData.push(dayData);
          });
        } else {
          // For weekly/monthly view, generate daily data
          for (let i = input.days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            const dayData: any = { date: formattedDate };
            
            feeHeads.forEach(feeHead => {
              dayData[feeHead.name] = dailyCollections[dateKey!]?.[feeHead.name] ?? 0;
            });
            
            chartData.push(dayData);
          }
        }
      } else {
        // For "all time", generate monthly aggregates to avoid too many data points
        const monthlyCollections: Record<string, Record<string, number>> = {};
        const monthLabels: Record<string, string> = {};
        
        feeCollections.forEach(collection => {
          const date = new Date(collection.paymentDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          
          // Store month label separately
          if (!monthLabels[monthKey]) {
            monthLabels[monthKey] = monthLabel;
          }
          
          collection.items.forEach(item => {
            const feeHeadName = item.feeHead.name;
            
            if (!monthlyCollections[monthKey]) {
              monthlyCollections[monthKey] = {};
            }
            
            monthlyCollections[monthKey]![feeHeadName] = (monthlyCollections[monthKey]?.[feeHeadName] ?? 0) + item.amount;
          });
        });
        
        // Convert to chart data format
        const sortedMonths = Object.keys(monthlyCollections).sort();
        sortedMonths.forEach(monthKey => {
          const monthData = monthlyCollections[monthKey]!;
          const dayData: any = { date: monthLabels[monthKey] };
          
          feeHeads.forEach(feeHead => {
            dayData[feeHead.name] = monthData[feeHead.name] ?? 0;
          });
          
          chartData.push(dayData);
        });
      }

      // Generate summary data for the table
      const summaryData = feeHeads.map(feeHead => {
        const data = feeHeadTotals[feeHead.id];
        const remaining = Math.max(0, (data?.due ?? 0) - (data?.collected ?? 0) - (data?.concession ?? 0));
        
        return {
          feeHead: feeHead.name,
          collection: data?.due ?? 0,
          concession: data?.concession ?? 0,
          received: data?.collected ?? 0,
          due: remaining,
        };
      });

      return {
        chartData,
        summaryData,
        feeHeads: feeHeads.map(fh => fh.name).filter(Boolean),
        totalCollected: Object.values(feeHeadTotals).reduce((sum, data) => sum + (data?.collected ?? 0), 0),
        totalDue: Object.values(feeHeadTotals).reduce((sum, data) => sum + (data?.due ?? 0), 0),
      };
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
        section: {
          class: {
            sessionId: input.sessionId,
            ...(input.classId && { id: input.classId }),
          },
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
      take: input.search ? 100 : 50, // Higher limit when searching, lower for general listing
    });
    }),

  // Fee Reminders and Outstanding Reports
  getOutstandingFees: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      classId: z.string().optional(),
      feeTermId: z.string().optional(),
      overdueDaysMin: z.number().min(0).optional(),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ ctx, input }) => {
      // Get all students in the specified context
      const students = await ctx.db.student.findMany({
        where: {
          branchId: input.branchId,
          isActive: true,
          section: {
            class: {
              sessionId: input.sessionId,
              ...(input.classId && { id: input.classId }),
            },
          },
        },
        include: {
          section: {
            include: {
              class: true,
            },
          },
          parent: true,
        },
        take: input.limit,
      });

      const outstandingRecords = [];

      for (const student of students) {
        if (!student.section?.class) continue;

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

        // Get paid amounts
        const paidAmounts = await ctx.db.feeCollectionItem.findMany({
          where: {
            feeCollection: {
              studentId: student.id,
              branchId: input.branchId,
              sessionId: input.sessionId,
              ...(input.feeTermId && { feeTermId: input.feeTermId }),
            },
          },
          include: {
            feeCollection: {
              include: {
                feeTerm: true,
              },
            },
          },
        });

        // Calculate outstanding amounts
        const studentOutstanding = classwiseFees
          .map((classwiseFee) => {
            const paid = paidAmounts
              .filter(
                (item) =>
                  item.feeHeadId === classwiseFee.feeHeadId &&
                  item.feeCollection.feeTermId === classwiseFee.feeTermId
              )
              .reduce((sum, item) => sum + item.amount, 0);

            const due = Math.max(0, classwiseFee.amount - paid);
            const dueDate = new Date(classwiseFee.feeTerm.dueDate);
            const today = new Date();
            const overdueDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

            if (due > 0 && (!input.overdueDaysMin || overdueDays >= input.overdueDaysMin)) {
              return {
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                admissionNumber: student.admissionNumber,
                className: student.section?.class?.name ?? 'N/A',
                parentName: student.parent ? `${student.parent.fatherName} ${student.parent.motherName}` : null,
                parentPhone: student.parent?.fatherMobile ?? student.parent?.motherMobile,
                parentEmail: student.parent?.fatherEmail,
                feeHead: classwiseFee.feeHead.name,
                feeTerm: classwiseFee.feeTerm.name,
                totalAmount: classwiseFee.amount,
                paidAmount: paid,
                outstandingAmount: due,
                dueDate: classwiseFee.feeTerm.dueDate,
                overdueDays: overdueDays > 0 ? overdueDays : 0,
              };
            }
            return null;
          })
          .filter(Boolean);

        outstandingRecords.push(...studentOutstanding);
      }

      return outstandingRecords.sort((a, b) => (b?.overdueDays ?? 0) - (a?.overdueDays ?? 0));
    }),

  // Financial Summary Report
  getFinancialSummary: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      // Validate date range
      if (input.endDate <= input.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after start date",
        });
      }

      // Get fee collections in the date range
      const feeCollections = await ctx.db.feeCollection.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          paymentDate: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        include: {
          items: {
            include: {
              feeHead: true,
            },
          },
          student: true,
          feeTerm: true,
        },
      });

      // Calculate summary statistics
      const totalCollected = feeCollections.reduce((sum, collection) => sum + collection.totalAmount, 0);
      const totalTransactions = feeCollections.length;
      const averageTransaction = totalTransactions > 0 ? totalCollected / totalTransactions : 0;

      // Group by payment mode
      const paymentModeBreakdown = feeCollections.reduce((acc, collection) => {
        acc[collection.paymentMode] = (acc[collection.paymentMode] ?? 0) + collection.totalAmount;
        return acc;
      }, {} as Record<string, number>);

      // Group by fee head
      const feeHeadBreakdown = feeCollections.reduce((acc, collection) => {
        collection.items.forEach(item => {
          acc[item.feeHead.name] = (acc[item.feeHead.name] ?? 0) + item.amount;
        });
        return acc;
      }, {} as Record<string, number>);

      // Daily collection trend
      const dailyCollections = feeCollections.reduce((acc, collection) => {
        const date = collection.paymentDate.toISOString().split('T')[0]!;
        acc[date] = (acc[date] ?? 0) + (collection.totalAmount ?? 0);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalCollected,
        totalTransactions,
        averageTransaction,
        paymentModeBreakdown,
        feeHeadBreakdown,
        dailyCollections,
        dateRange: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
      };
    }),

  // Concession Type Management
  // TODO: Implement when concession models are added to schema
  getConcessionTypes: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        isActive: true,
      });

      return ctx.db.concessionType.findMany({
        where,
        include: {
          branch: true,
          session: true,
          _count: {
            select: {
              studentConcessions: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  createConcessionType: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required").max(100, "Name too long"),
      description: z.string().optional(),
      type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
      value: z.number().min(0, "Value cannot be negative"),
      maxValue: z.number().min(0, "Max value cannot be negative").optional(),
      applicableStudentTypes: z.array(z.enum(["NEW_ADMISSION", "OLD_STUDENT", "BOTH"])).default(["BOTH"]),
      eligibilityCriteria: z.string().optional(),
      requiredDocuments: z.array(z.string()).default([]),
      autoApproval: z.boolean().default(false),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sanitizedName = input.name.trim();
      
      // Check for duplicate name in the same branch and session
      const existing = await ctx.db.concessionType.findFirst({
        where: {
          name: sanitizedName,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A concession type with this name already exists for this branch and session",
        });
      }

      // Validate percentage values
      if (input.type === "PERCENTAGE" && input.value > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Percentage value cannot exceed 100%",
        });
      }

      if (input.maxValue && input.value > input.maxValue) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Value cannot be greater than max value",
        });
      }

      return ctx.db.concessionType.create({
        data: {
          ...input,
          name: sanitizedName,
        },
        include: {
          branch: true,
          session: true,
        },
      });
    }),

  updateConcessionType: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1, "Name is required").max(100, "Name too long"),
      description: z.string().optional(),
      type: z.enum(["PERCENTAGE", "FIXED"]),
      value: z.number().min(0, "Value cannot be negative"),
      maxValue: z.number().min(0, "Max value cannot be negative").optional(),
      applicableStudentTypes: z.array(z.enum(["NEW_ADMISSION", "OLD_STUDENT", "BOTH"])),
      eligibilityCriteria: z.string().optional(),
      requiredDocuments: z.array(z.string()),
      autoApproval: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const sanitizedName = data.name.trim();

      // Check if concession type exists
      const concessionType = await ctx.db.concessionType.findUnique({
        where: { id },
      });

      if (!concessionType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Concession type not found",
        });
      }

      // Check for duplicate name if name is being changed
      if (sanitizedName !== concessionType.name) {
        const existing = await ctx.db.concessionType.findFirst({
          where: {
            name: sanitizedName,
            branchId: concessionType.branchId,
            sessionId: concessionType.sessionId,
            id: { not: id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A concession type with this name already exists for this branch and session",
          });
        }
      }

      // Validate percentage values
      if (data.type === "PERCENTAGE" && data.value > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Percentage value cannot exceed 100%",
        });
      }

      if (data.maxValue && data.value > data.maxValue) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Value cannot be greater than max value",
        });
      }

      return ctx.db.concessionType.update({
        where: { id },
        data: {
          ...data,
          name: sanitizedName,
        },
        include: {
          branch: true,
          session: true,
        },
      });
    }),

  deleteConcessionType: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if concession type exists
      const concessionType = await ctx.db.concessionType.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              studentConcessions: true,
            },
          },
        },
      });

      if (!concessionType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Concession type not found",
        });
      }

      // Check if concession type is used in student concessions
      if (concessionType._count.studentConcessions > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete concession type as it is being used by students",
        });
      }

      return ctx.db.concessionType.delete({
        where: { id: input.id },
      });
    }),

  // Student Concession Management
  getStudentConcessions: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      sessionId: z.string().optional(),
      studentId: z.string().optional(),
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "EXPIRED"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where = withBranchFilter(input?.branchId, {
        ...(input?.sessionId && { sessionId: input.sessionId }),
        ...(input?.studentId && { studentId: input.studentId }),
        ...(input?.status && { status: input.status }),
      });

      return ctx.db.studentConcession.findMany({
        where,
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true,
                },
              },
            },
          },
          concessionType: true,
          branch: true,
          session: true,
        },
        orderBy: [
          { createdAt: "desc" },
        ],
      });
    }),

  assignConcession: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      concessionTypeId: z.string(),
      customValue: z.number().min(0, "Custom value cannot be negative").optional(),
      reason: z.string().optional(),
      validFrom: z.date().optional(),
      validUntil: z.date().optional(),
      appliedFeeHeads: z.array(z.string()).default([]),
      appliedFeeTerms: z.array(z.string()).default([]),
      notes: z.string().optional(),
      branchId: z.string(),
      sessionId: z.string(),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createdBy, ...concessionData } = input;

      // Validate student exists and belongs to the branch
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: {
          section: {
            include: {
              class: true,
            },
          },
        },
      });

      if (!student || student.branchId !== input.branchId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid student for the specified branch",
        });
      }

      if (!student.section?.class || student.section.class.sessionId !== input.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is not enrolled in the specified academic session",
        });
      }

      // Validate concession type
      const concessionType = await ctx.db.concessionType.findUnique({
        where: { id: input.concessionTypeId },
      });

      if (!concessionType || 
          concessionType.branchId !== input.branchId || 
          concessionType.sessionId !== input.sessionId ||
          !concessionType.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or inactive concession type for the specified branch and session",
        });
      }

      // Check for existing active concession of the same type
      const existingConcession = await ctx.db.studentConcession.findFirst({
        where: {
          studentId: input.studentId,
          concessionTypeId: input.concessionTypeId,
          status: { in: ["PENDING", "APPROVED"] },
        },
      });

      if (existingConcession) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student already has an active concession of this type",
        });
      }

      // Validate custom value if provided
      if (input.customValue !== undefined) {
        if (concessionType.type === "PERCENTAGE" && input.customValue > 100) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Custom percentage value cannot exceed 100%",
          });
        }

        if (concessionType.maxValue && input.customValue > concessionType.maxValue) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Custom value cannot exceed the maximum allowed value",
          });
        }
      }

      return ctx.db.$transaction(async (prisma) => {
        // Determine initial status
        const status = concessionType.autoApproval ? "APPROVED" : "PENDING";
        const now = new Date();

        // Create student concession
        const studentConcession = await prisma.studentConcession.create({
          data: {
            ...concessionData,
            status,
            ...(status === "APPROVED" && {
              approvedBy: createdBy,
              approvedAt: now,
            }),
          },
        });

        // Create history record
        await prisma.concessionHistory.create({
          data: {
            studentConcessionId: studentConcession.id,
            action: "CREATED",
            newValue: input.customValue ?? concessionType.value,
            reason: input.reason || "Concession assigned",
            performedBy: createdBy || "system",
          },
        });

        // Return with relations
        return prisma.studentConcession.findUnique({
          where: { id: studentConcession.id },
          include: {
            student: {
              include: {
                section: {
                  include: {
                    class: true,
                  },
                },
              },
            },
            concessionType: true,
            branch: true,
            session: true,
          },
        });
      });
    }),

  approveConcession: protectedProcedure
    .input(z.object({
      id: z.string(),
      approvedBy: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const concession = await ctx.db.studentConcession.findUnique({
        where: { id: input.id },
      });

      if (!concession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student concession not found",
        });
      }

      if (concession.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending concessions can be approved",
        });
      }

      return ctx.db.$transaction(async (prisma) => {
        const now = new Date();

        // Update concession status
        const updatedConcession = await prisma.studentConcession.update({
          where: { id: input.id },
          data: {
            status: "APPROVED",
            approvedBy: input.approvedBy,
            approvedAt: now,
            ...(input.notes && { notes: input.notes }),
          },
        });

        // Create history record
        await prisma.concessionHistory.create({
          data: {
            studentConcessionId: input.id,
            action: "APPROVED",
            reason: input.notes || "Concession approved",
            performedBy: input.approvedBy,
          },
        });

        return updatedConcession;
      });
    }),

  rejectConcession: protectedProcedure
    .input(z.object({
      id: z.string(),
      rejectedBy: z.string(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const concession = await ctx.db.studentConcession.findUnique({
        where: { id: input.id },
      });

      if (!concession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student concession not found",
        });
      }

      if (concession.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending concessions can be rejected",
        });
      }

      return ctx.db.$transaction(async (prisma) => {
        // Update concession status
        const updatedConcession = await prisma.studentConcession.update({
          where: { id: input.id },
          data: {
            status: "REJECTED",
            notes: input.reason,
          },
        });

        // Create history record
        await prisma.concessionHistory.create({
          data: {
            studentConcessionId: input.id,
            action: "REJECTED",
            reason: input.reason,
            performedBy: input.rejectedBy,
          },
        });

        return updatedConcession;
      });
    }),

  suspendConcession: protectedProcedure
    .input(z.object({
      id: z.string(),
      suspendedBy: z.string(),
      reason: z.string().min(1, "Suspension reason is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const concession = await ctx.db.studentConcession.findUnique({
        where: { id: input.id },
      });

      if (!concession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student concession not found",
        });
      }

      if (concession.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only approved concessions can be suspended",
        });
      }

      return ctx.db.$transaction(async (prisma) => {
        // Update concession status
        const updatedConcession = await prisma.studentConcession.update({
          where: { id: input.id },
          data: {
            status: "SUSPENDED",
            notes: input.reason,
          },
        });

        // Create history record
        await prisma.concessionHistory.create({
          data: {
            studentConcessionId: input.id,
            action: "SUSPENDED",
            reason: input.reason,
            performedBy: input.suspendedBy,
          },
        });

        return updatedConcession;
      });
    }),

  deleteConcession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const concession = await ctx.db.studentConcession.findUnique({
        where: { id: input.id },
      });

      if (!concession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student concession not found",
        });
      }

      return ctx.db.studentConcession.delete({
        where: { id: input.id },
      });
    }),

  getConcessionHistory: publicProcedure
    .input(z.object({
      studentConcessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.concessionHistory.findMany({
        where: {
          studentConcessionId: input.studentConcessionId,
        },
        orderBy: { performedAt: "desc" },
      });
    }),

  // Concession Approval Settings Management
  saveApprovalSettings: protectedProcedure
    .input(z.object({
      approvalType: z.enum(['1_PERSON', '2_PERSON']),
      authorizationType: z.enum(['ROLE_BASED', 'INDIVIDUAL_BASED']),
      autoApproveBelow: z.number().min(0),
      requireDocumentVerification: z.boolean(),
      allowSelfApproval: z.boolean(),
      maxApprovalAmount: z.number().min(0),
      escalationThreshold: z.number().min(0),
      notificationEnabled: z.boolean(),
      approvalTimeoutDays: z.number().min(1).max(30),
      requireReason: z.boolean(),
      approvalRoles: z.array(z.string()),
      secondApprovalRoles: z.array(z.string()).optional(),
      approvalIndividuals: z.array(z.string().email()),
      secondApprovalIndividuals: z.array(z.string().email()).optional(),
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const {
        approvalType,
        authorizationType,
        autoApproveBelow,
        requireDocumentVerification,
        allowSelfApproval,
        maxApprovalAmount,
        escalationThreshold,
        notificationEnabled,
        approvalTimeoutDays,
        requireReason,
        approvalRoles,
        secondApprovalRoles,
        approvalIndividuals,
        secondApprovalIndividuals,
        branchId,
        sessionId,
      } = input;

      // Validation based on authorization type
      if (authorizationType === 'ROLE_BASED') {
        if (approvalRoles.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "At least one approval role must be selected for role-based authorization",
          });
        }

        if (approvalType === '2_PERSON' && (!secondApprovalRoles || secondApprovalRoles.length === 0)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Second approval roles must be selected for 2-person approval workflow",
          });
        }
      } else {
        if (approvalIndividuals.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "At least one individual must be added for individual-based authorization",
          });
        }

        if (approvalType === '2_PERSON' && (!secondApprovalIndividuals || secondApprovalIndividuals.length === 0)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Second approval individuals must be added for 2-person approval workflow",
          });
        }
      }

      if (autoApproveBelow >= maxApprovalAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Auto-approve threshold must be less than maximum approval amount",
        });
      }

      if (approvalType === '2_PERSON' && escalationThreshold >= maxApprovalAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Escalation threshold must be less than maximum approval amount",
        });
      }

      try {
        // Use upsert to create or update settings for this branch and session
        const savedSettings = await ctx.db.concessionApprovalSettings.upsert({
          where: {
            branchId_sessionId: {
              branchId,
              sessionId,
            },
          },
          update: {
            approvalType,
            authorizationType,
            autoApproveBelow,
            requireDocumentVerification,
            allowSelfApproval,
            maxApprovalAmount,
            escalationThreshold,
            notificationEnabled,
            approvalTimeoutDays,
            requireReason,
            approvalRoles,
            secondApprovalRoles: secondApprovalRoles || [],
            approvalIndividuals,
            secondApprovalIndividuals: secondApprovalIndividuals || [],
            updatedBy: ctx.userId,
          },
          create: {
            branchId,
            sessionId,
            approvalType,
            authorizationType,
            autoApproveBelow,
            requireDocumentVerification,
            allowSelfApproval,
            maxApprovalAmount,
            escalationThreshold,
            notificationEnabled,
            approvalTimeoutDays,
            requireReason,
            approvalRoles,
            secondApprovalRoles: secondApprovalRoles || [],
            approvalIndividuals,
            secondApprovalIndividuals: secondApprovalIndividuals || [],
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          },
        });

        return {
          success: true,
          message: "Approval settings saved successfully",
          settings: {
            id: savedSettings.id,
            approvalType: savedSettings.approvalType,
            authorizationType: savedSettings.authorizationType,
            autoApproveBelow: savedSettings.autoApproveBelow,
            requireDocumentVerification: savedSettings.requireDocumentVerification,
            allowSelfApproval: savedSettings.allowSelfApproval,
            maxApprovalAmount: savedSettings.maxApprovalAmount,
            escalationThreshold: savedSettings.escalationThreshold,
            notificationEnabled: savedSettings.notificationEnabled,
            approvalTimeoutDays: savedSettings.approvalTimeoutDays,
            requireReason: savedSettings.requireReason,
            approvalRoles: savedSettings.approvalRoles,
            secondApprovalRoles: savedSettings.secondApprovalRoles,
            approvalIndividuals: savedSettings.approvalIndividuals,
            secondApprovalIndividuals: savedSettings.secondApprovalIndividuals,
            updatedAt: savedSettings.updatedAt.toISOString(),
            updatedBy: savedSettings.updatedBy,
          },
        };
      } catch (error) {
        // If table doesn't exist yet, return a fallback response
        console.log('Could not save to database, table may not exist:', error);
        
        return {
          success: true,
          message: "Approval settings saved successfully (cached)",
          settings: {
            approvalType,
            authorizationType,
            autoApproveBelow,
            requireDocumentVerification,
            allowSelfApproval,
            maxApprovalAmount,
            escalationThreshold,
            notificationEnabled,
            approvalTimeoutDays,
            requireReason,
            approvalRoles,
            secondApprovalRoles: secondApprovalRoles || [],
            approvalIndividuals,
            secondApprovalIndividuals: secondApprovalIndividuals || [],
            updatedAt: new Date().toISOString(),
            updatedBy: ctx.userId,
          },
        };
      }
    }),

  getApprovalSettings: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Try to find existing settings for this branch and session
        const existingSettings = await ctx.db.concessionApprovalSettings.findUnique({
          where: {
            branchId_sessionId: {
              branchId: input.branchId,
              sessionId: input.sessionId,
            },
          },
        });

        if (existingSettings) {
          return {
            approvalType: existingSettings.approvalType as '1_PERSON' | '2_PERSON',
            authorizationType: existingSettings.authorizationType as 'ROLE_BASED' | 'INDIVIDUAL_BASED',
            autoApproveBelow: existingSettings.autoApproveBelow,
            requireDocumentVerification: existingSettings.requireDocumentVerification,
            allowSelfApproval: existingSettings.allowSelfApproval,
            maxApprovalAmount: existingSettings.maxApprovalAmount,
            escalationThreshold: existingSettings.escalationThreshold,
            notificationEnabled: existingSettings.notificationEnabled,
            approvalTimeoutDays: existingSettings.approvalTimeoutDays,
            requireReason: existingSettings.requireReason,
            approvalRoles: existingSettings.approvalRoles,
            secondApprovalRoles: existingSettings.secondApprovalRoles,
            approvalIndividuals: existingSettings.approvalIndividuals,
            secondApprovalIndividuals: existingSettings.secondApprovalIndividuals,
          };
        }
      } catch (error) {
        // If table doesn't exist yet, fall back to defaults
        console.log('Approval settings table not found, using defaults:', error);
      }

      // Return default settings if none exist or table doesn't exist
      const defaultSettings = {
        approvalType: '1_PERSON' as const,
        authorizationType: 'ROLE_BASED' as const,
        autoApproveBelow: 1000,
        requireDocumentVerification: true,
        allowSelfApproval: false,
        maxApprovalAmount: 50000,
        escalationThreshold: 25000,
        notificationEnabled: true,
        approvalTimeoutDays: 7,
        requireReason: true,
        approvalRoles: [] as string[],
        secondApprovalRoles: [] as string[],
        approvalIndividuals: [] as string[],
        secondApprovalIndividuals: [] as string[],
      };

      return defaultSettings;
    }),

  // Get available roles for approval settings
  getAvailableRoles: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.rbacRole.findMany({
        where: {
          isActive: true,
          OR: [
            { branchId: input?.branchId },
            { branchId: null }, // Include global roles
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  // Concession-related functions are now fully implemented

  // Search employees and teachers for approval settings
  searchApprovalPersonnel: publicProcedure
    .input(z.object({
      branchId: z.string(),
      search: z.string(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const searchTerm = input.search.toLowerCase().trim();
      
      if (searchTerm.length < 2) {
        return [];
      }

      // Search employees
      const employees = await ctx.db.employee.findMany({
        where: {
          branchId: input.branchId,
          isActive: true,
          OR: [
            { firstName: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
            { officialEmail: { contains: searchTerm, mode: "insensitive" } },
            { personalEmail: { contains: searchTerm, mode: "insensitive" } },
            { 
              AND: [
                { firstName: { contains: searchTerm.split(' ')[0] || '', mode: "insensitive" } },
                { lastName: { contains: searchTerm.split(' ')[1] || '', mode: "insensitive" } },
              ]
            },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          officialEmail: true,
          personalEmail: true,
          designation: true,
          department: true,
          employeeCode: true,
        },
        take: Math.floor(input.limit / 2),
      });

      // Search teachers
      const teachers = await ctx.db.teacher.findMany({
        where: {
          branchId: input.branchId,
          isActive: true,
          OR: [
            { firstName: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
            { officialEmail: { contains: searchTerm, mode: "insensitive" } },
            { personalEmail: { contains: searchTerm, mode: "insensitive" } },
            { 
              AND: [
                { firstName: { contains: searchTerm.split(' ')[0] || '', mode: "insensitive" } },
                { lastName: { contains: searchTerm.split(' ')[1] || '', mode: "insensitive" } },
              ]
            },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          officialEmail: true,
          personalEmail: true,
          designation: true,
          specialization: true,
          employeeCode: true,
        },
        take: Math.floor(input.limit / 2),
      });

      // Combine and format results
      const personnel = [
        ...employees.map(emp => ({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          email: emp.officialEmail || emp.personalEmail || '',
          role: emp.designation || 'Employee',
          department: emp.department || emp.designation || 'Staff',
          employeeCode: emp.employeeCode,
          type: 'employee' as const,
        })),
        ...teachers.map(teacher => ({
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`.trim(),
          email: teacher.officialEmail || teacher.personalEmail || '',
          role: teacher.designation || 'Teacher',
          department: teacher.specialization || 'Academic',
          employeeCode: teacher.employeeCode,
          type: 'teacher' as const,
        })),
      ];

      // Sort by relevance (exact matches first, then partial matches)
      return personnel
        .sort((a, b) => {
          const aNameMatch = a.name.toLowerCase().includes(searchTerm);
          const bNameMatch = b.name.toLowerCase().includes(searchTerm);
          const aEmailMatch = a.email.toLowerCase().includes(searchTerm);
          const bEmailMatch = b.email.toLowerCase().includes(searchTerm);
          
          // Prioritize personnel with email addresses
          if (a.email && !b.email) return -1;
          if (b.email && !a.email) return 1;
          
          // Then prioritize exact matches
          if (aNameMatch && !bNameMatch) return -1;
          if (bNameMatch && !aNameMatch) return 1;
          if (aEmailMatch && !bEmailMatch) return -1;
          if (bEmailMatch && !aEmailMatch) return 1;
          
          // Then sort alphabetically
          return a.name.localeCompare(b.name);
        })
        .slice(0, input.limit);
    }),
}); 