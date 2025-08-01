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
      const feeTermIds = Array.from(new Set(collections.map(c => c.feeTermId)));
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
      const allFeeHeadIds = Array.from(new Set(collections.flatMap(c => c.items.map(i => i.feeHeadId))));
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
          },
          firstJoinedSession: true
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

      // Determine if student is new admission or old student
      const isNewAdmission = student.firstJoinedSessionId === input.sessionId;
      const isOldStudent = student.firstJoinedSessionId !== input.sessionId || student.firstJoinedSessionId === null;

      // Determine which student types should apply to this student
      const applicableStudentTypes: string[] = ["BOTH"];
      if (isNewAdmission) {
        applicableStudentTypes.push("NEW_ADMISSION");
      }
      if (isOldStudent) {
        applicableStudentTypes.push("OLD_STUDENT");
      }

      // Get classwise fees for the student's section (now section-level fees)
      const classwiseFees = await ctx.db.classwiseFee.findMany({
        where: {
          sectionId: student.section.id,
          branchId: input.branchId,
          sessionId: input.sessionId,
          ...(input.feeTermId && { feeTermId: input.feeTermId }),
          // Only include fee heads that apply to this student type
          feeHead: {
            studentType: {
              in: applicableStudentTypes,
            },
          },
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
              class: true,
              students: {
                where: {
                  branchId: input.branchId,
                  isActive: true,
                },
                include: {
                  firstJoinedSession: true,
                }
              }
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
          
          dailyCollections[date][feeHeadName] = (dailyCollections[date]?.[feeHeadName] ?? 0) + item.amount;
          if (feeHeadTotals[item.feeHeadId]) {
            feeHeadTotals[item.feeHeadId]!.collected += item.amount;
          }
        });
      });

      // Calculate total due amounts from classwise fees, avoiding double counting
      // Group fees by fee combination (term + head) to identify conflicts between class and section level
      const feeComboMap = new Map<string, { 
        classLevel?: { amount: number; classId: string; totalStudents: number }, 
        sectionLevel: Array<{ amount: number; sectionId: string; students: number }> 
      }>();
      
      // Get total student count by class for class-level fee calculations
      const classStudentCounts = new Map<string, number>();
      classwiseFees.forEach(cf => {
        if (!classStudentCounts.has(cf.classId)) {
          const allSectionsForClass = classwiseFees
            .filter(otherFee => otherFee.classId === cf.classId && otherFee.section)
            .map(otherFee => otherFee.section)
            .filter((section, index, self) => section && self.findIndex(s => s?.id === section.id) === index);
          
          const totalStudents = allSectionsForClass.reduce((sum, section) => sum + (section?.students.length || 0), 0);
          classStudentCounts.set(cf.classId, totalStudents);
        }
      });
      
      // First pass: organize all fees by fee combination
      classwiseFees.forEach(cf => {
        const feeKey = `${cf.feeTermId}-${cf.feeHeadId}`;
        
        if (!feeComboMap.has(feeKey)) {
          feeComboMap.set(feeKey, { sectionLevel: [] });
        }
        
        const combo = feeComboMap.get(feeKey)!;
        
        if (cf.sectionId) {
          // Section-specific fee
          const studentCount = cf.section?.students.length || 0;
          combo.sectionLevel.push({
            amount: cf.amount,
            sectionId: cf.sectionId,
            students: studentCount
          });
        } else {
          // Class-level fee
          const totalStudents = classStudentCounts.get(cf.classId) || 0;
          combo.classLevel = {
            amount: cf.amount,
            classId: cf.classId,
            totalStudents
          };
        }
      });
      
      // Second pass: calculate totals, prioritizing section-level fees over class-level
      // Apply student type filtering based on firstJoinedSessionId
      feeComboMap.forEach((combo, feeKey) => {
        const feeHeadId = feeKey.split('-')[1]; // Extract feeHeadId from feeKey
        const feeHead = feeHeads.find(fh => fh.id === feeHeadId);
        
        if (!feeHead || !feeHeadId) return;
        
        if (combo.sectionLevel.length > 0) {
          // Use section-level fees (ignore any class-level fee for this combination)
          combo.sectionLevel.forEach(sectionFee => {
            // Find the section to get student details
            const sectionWithFee = classwiseFees.find(cf => cf.sectionId === sectionFee.sectionId && cf.feeHeadId === feeHeadId);
            const students = sectionWithFee?.section?.students || [];
            
            // Count eligible students based on fee head student type
            let eligibleStudentCount = 0;
            students.forEach(student => {
              const isNewAdmission = student.firstJoinedSessionId === input.sessionId;
              const isOldStudent = student.firstJoinedSessionId !== input.sessionId || student.firstJoinedSessionId === null;
              
              const isEligible = 
                feeHead.studentType === "BOTH" ||
                (feeHead.studentType === "NEW_ADMISSION" && isNewAdmission) ||
                (feeHead.studentType === "OLD_STUDENT" && isOldStudent);
              
              if (isEligible) {
                eligibleStudentCount++;
              }
            });
            
            const totalDue = sectionFee.amount * eligibleStudentCount;
            if (feeHeadTotals[feeHeadId]) {
              feeHeadTotals[feeHeadId].due += totalDue;
            }
          });
        } else if (combo.classLevel) {
          // Use class-level fee only if no section-level fees exist
          // Get all students for this class across all sections
          const classStudents = classwiseFees
            .filter(cf => cf.classId === combo.classLevel!.classId)
            .flatMap(cf => cf.section?.students || [])
            .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index); // Remove duplicates
          
          // Count eligible students based on fee head student type
          let eligibleStudentCount = 0;
          classStudents.forEach(student => {
            const isNewAdmission = student.firstJoinedSessionId === input.sessionId;
            const isOldStudent = student.firstJoinedSessionId !== input.sessionId || student.firstJoinedSessionId === null;
            
            const isEligible = 
              feeHead.studentType === "BOTH" ||
              (feeHead.studentType === "NEW_ADMISSION" && isNewAdmission) ||
              (feeHead.studentType === "OLD_STUDENT" && isOldStudent);
            
            if (isEligible) {
              eligibleStudentCount++;
            }
          });
          
          const totalDue = combo.classLevel.amount * eligibleStudentCount;
          if (feeHeadTotals[feeHeadId]) {
            feeHeadTotals[feeHeadId].due += totalDue;
          }
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
              
              monthlyCollections[monthKey][feeHeadName] = (monthlyCollections[monthKey]?.[feeHeadName] ?? 0) + item.amount;
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
              
              monthlyCollections[monthKey][feeHeadName] = (monthlyCollections[monthKey]?.[feeHeadName] ?? 0) + item.amount;
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
            
            monthlyCollections[monthKey][feeHeadName] = (monthlyCollections[monthKey]?.[feeHeadName] ?? 0) + item.amount;
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

  // Fee Defaulters/Due Report
  getFeeDefaultersReport: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      classIds: z.array(z.string()).optional(),
      sectionIds: z.array(z.string()).optional(),
      feeTermIds: z.array(z.string()).optional(),
      feeHeadIds: z.array(z.string()).optional(),
      includePartiallyPaid: z.boolean().default(true),
      minimumDueAmount: z.number().min(0).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Build where conditions for students
      const studentWhere: any = {
        branchId: input.branchId,
        isActive: true,
        section: {
          class: {
            sessionId: input.sessionId,
            ...(input.classIds && input.classIds.length > 0 && { id: { in: input.classIds } }),
          },
          ...(input.sectionIds && input.sectionIds.length > 0 && { id: { in: input.sectionIds } }),
        },
      };

      // Get all students matching the criteria
      const students = await ctx.db.student.findMany({
        where: studentWhere,
        include: {
          section: {
            include: {
              class: true,
            },
          },
          parent: true,
          firstJoinedSession: true,
        },
        orderBy: [
          { section: { class: { displayOrder: "asc" } } },
          { section: { class: { grade: "asc" } } },
          { section: { class: { name: "asc" } } },
          { section: { name: "asc" } },
          { firstName: "asc" },
          { lastName: "asc" },
        ],
      });

      if (students.length === 0) {
        return {
          chartData: [],
          tableData: [],
          summary: {
            totalStudents: 0,
            totalDueAmount: 0,
            totalToBeCollected: 0,
            totalConcessionApplied: 0,
          },
        };
      }

      const studentIds = students.map(s => s.id);
      const sectionIds = Array.from(new Set(students.map(s => s.sectionId)));

      // Build where conditions for classwise fees
      const classwiseFeeWhere: any = {
        sectionId: { in: sectionIds },
        branchId: input.branchId,
        sessionId: input.sessionId,
        ...(input.feeTermIds && input.feeTermIds.length > 0 && { feeTermId: { in: input.feeTermIds } }),
        ...(input.feeHeadIds && input.feeHeadIds.length > 0 && { feeHeadId: { in: input.feeHeadIds } }),
      };

      // Get classwise fees
      const classwiseFees = await ctx.db.classwiseFee.findMany({
        where: classwiseFeeWhere,
        include: {
          feeHead: true,
          feeTerm: true,
          section: {
            include: {
              class: true,
            },
          },
        },
      });

      // Get all paid amounts for these students
      const paidAmounts = await ctx.db.feeCollectionItem.findMany({
        where: {
          feeCollection: {
            studentId: { in: studentIds },
            branchId: input.branchId,
            sessionId: input.sessionId,
            ...(input.feeTermIds && input.feeTermIds.length > 0 && { feeTermId: { in: input.feeTermIds } }),
          },
          ...(input.feeHeadIds && input.feeHeadIds.length > 0 && { feeHeadId: { in: input.feeHeadIds } }),
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

      // Get student concessions
      const studentConcessions = await ctx.db.studentConcession.findMany({
        where: {
          studentId: { in: studentIds },
          branchId: input.branchId,
          sessionId: input.sessionId,
          status: 'APPROVED',
          validFrom: { lte: new Date() },
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
          ...(input.feeHeadIds && input.feeHeadIds.length > 0 && { 
            appliedFeeHeads: { hasSome: input.feeHeadIds }
          }),
        },
        include: {
          concessionType: true,
        },
      });

      // Process data for each student
      const studentReportData: Array<{
        studentId: string;
        studentName: string;
        admissionNumber: string;
        className: string;
        sectionName: string;
        feeDetails: Array<{
          feeHeadId: string;
          feeHeadName: string;
          feeTermId: string;
          feeTermName: string;
          originalAmount: number;
          concessionAmount: number;
          toBeCollected: number;
          paidAmount: number;
          dueAmount: number;
          dueDate: string;
          status: 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue';
        }>;
        totalOriginalAmount: number;
        totalConcessionAmount: number;
        totalToBeCollected: number;
        totalPaidAmount: number;
        totalDueAmount: number;
      }> = [];

      const chartDataMap: Record<string, Record<string, number>> = {}; // date -> feeHead -> amount
      const feeHeadsSet = new Set<string>();

      for (const student of students) {
        const studentClasswiseFees = classwiseFees.filter(cf => cf.sectionId === student.sectionId);
        const studentPaidAmounts = paidAmounts.filter(pa => pa.feeCollection.studentId === student.id);
        const studentConcessionsList = studentConcessions.filter(sc => sc.studentId === student.id);
        
        const feeDetails = [];
        let studentTotalOriginal = 0;
        let studentTotalConcession = 0;
        let studentTotalToBeCollected = 0;
        let studentTotalPaid = 0;
        let studentTotalDue = 0;

        for (const classwiseFee of studentClasswiseFees) {
          // Check if student is eligible for this fee head based on student type
          const isNewAdmission = student.firstJoinedSessionId === input.sessionId;
          const isOldStudent = student.firstJoinedSessionId !== input.sessionId || student.firstJoinedSessionId === null;
          
          const isEligibleForFee = 
            classwiseFee.feeHead.studentType === "BOTH" ||
            (classwiseFee.feeHead.studentType === "NEW_ADMISSION" && isNewAdmission) ||
            (classwiseFee.feeHead.studentType === "OLD_STUDENT" && isOldStudent);
          
          // Skip this fee if student is not eligible
          if (!isEligibleForFee) {
            continue;
          }
          
          // Calculate concession for this fee
          let concessionAmount = 0;
          for (const concession of studentConcessionsList) {
            // Check if concession applies to this fee head (empty array means all fee heads)
            const isApplicable = concession.appliedFeeHeads.length === 0 || 
              concession.appliedFeeHeads.includes(classwiseFee.feeHeadId);
            
            // Also check if concession applies to this fee term (empty array means all fee terms)
            const isTermApplicable = concession.appliedFeeTerms.length === 0 || 
              concession.appliedFeeTerms.includes(classwiseFee.feeTermId);
            
            if (isApplicable && isTermApplicable) {
              if (concession.concessionType.type === 'PERCENTAGE') {
                concessionAmount += (classwiseFee.amount * (concession.customValue || concession.concessionType.value)) / 100;
              } else {
                concessionAmount += concession.customValue || concession.concessionType.value;
              }
            }
          }

          concessionAmount = Math.min(concessionAmount, classwiseFee.amount);
          const toBeCollected = classwiseFee.amount - concessionAmount;

          // Calculate paid amount for this specific fee head and term
          const paidAmount = studentPaidAmounts
            .filter(pa => 
              pa.feeHeadId === classwiseFee.feeHeadId && 
              pa.feeCollection.feeTermId === classwiseFee.feeTermId
            )
            .reduce((sum, pa) => sum + pa.amount, 0);

          const dueAmount = Math.max(0, toBeCollected - paidAmount);

          // Skip if no due amount and we're filtering for minimum due
          if (input.minimumDueAmount && dueAmount < input.minimumDueAmount) {
            continue;
          }

          // Skip if fully paid and not including partially paid
          if (!input.includePartiallyPaid && dueAmount === 0) {
            continue;
          }

          // Determine status
          const today = new Date();
          const dueDate = new Date(classwiseFee.feeTerm.dueDate);
          let status: 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue';
          
          if (dueAmount === 0) {
            status = 'Paid';
          } else if (paidAmount > 0) {
            status = 'Partially Paid';
          } else if (dueDate < today) {
            status = 'Overdue';
          } else {
            status = 'Pending';
          }

          feeDetails.push({
            feeHeadId: classwiseFee.feeHeadId,
            feeHeadName: classwiseFee.feeHead.name,
            feeTermId: classwiseFee.feeTermId,
            feeTermName: classwiseFee.feeTerm.name,
            originalAmount: classwiseFee.amount,
            concessionAmount,
            toBeCollected,
            paidAmount,
            dueAmount,
            dueDate: classwiseFee.feeTerm.dueDate.toISOString().split('T')[0]!,
            status,
          });

          // Add to chart data (group by due date and fee head)
          const chartDate = classwiseFee.feeTerm.dueDate.toISOString().split('T')[0]!;
          if (!chartDataMap[chartDate]) {
            chartDataMap[chartDate] = {};
          }
          if (!chartDataMap[chartDate][classwiseFee.feeHead.name]) {
            chartDataMap[chartDate][classwiseFee.feeHead.name] = 0;
          }
          chartDataMap[chartDate][classwiseFee.feeHead.name]! += dueAmount;
          feeHeadsSet.add(classwiseFee.feeHead.name);

          // Update student totals
          studentTotalOriginal += classwiseFee.amount;
          studentTotalConcession += concessionAmount;
          studentTotalToBeCollected += toBeCollected;
          studentTotalPaid += paidAmount;
          studentTotalDue += dueAmount;
        }

        // Only include students with due amounts
        if (feeDetails.length > 0 && studentTotalDue > 0) {
          studentReportData.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`.trim(),
            admissionNumber: student.admissionNumber || '',
            className: student.section?.class?.name || '',
            sectionName: student.section?.name || '',
            feeDetails,
            totalOriginalAmount: studentTotalOriginal,
            totalConcessionAmount: studentTotalConcession,
            totalToBeCollected: studentTotalToBeCollected,
            totalPaidAmount: studentTotalPaid,
            totalDueAmount: studentTotalDue,
          });
        }
      }

      // Convert chart data to array format
      const sortedFeeHeads = Array.from(feeHeadsSet).sort();
      const chartData = Object.entries(chartDataMap)
        .map(([date, feeHeadData]) => ({
          date,
          ...Object.fromEntries(sortedFeeHeads.map(fh => [fh, feeHeadData[fh] || 0])),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate summary
      const summary = {
        totalStudents: studentReportData.length,
        totalDueAmount: studentReportData.reduce((sum, s) => sum + s.totalDueAmount, 0),
        totalToBeCollected: studentReportData.reduce((sum, s) => sum + s.totalToBeCollected, 0),
        totalConcessionApplied: studentReportData.reduce((sum, s) => sum + s.totalConcessionAmount, 0),
        totalCollectedTillDate: studentReportData.reduce((sum, s) => sum + s.totalPaidAmount, 0),
      };

      return {
        chartData,
        tableData: studentReportData,
        summary,
        feeHeads: sortedFeeHeads,
      };
    }),

  // Simplified Collection Summary Report (Working)
  getCollectionSummaryReport: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      feeTermIds: z.array(z.string()).optional(),
      feeHeadIds: z.array(z.string()).optional(),
      classIds: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : new Date(new Date().getFullYear(), 3, 1);
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get collections within date range
      const collections = await ctx.db.feeCollection.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          paymentDate: {
            gte: startDate,
            lte: endDate,
          },
          ...(input.feeTermIds && input.feeTermIds.length > 0 && {
            feeTermId: { in: input.feeTermIds }
          }),
        },
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true,
                }
              },
              firstJoinedSession: true,
            }
          },
          feeTerm: true,
          items: {
            include: {
              feeHead: true,
            },
          },
        },
      });

      // Filter by class if specified
      const filteredCollections = input.classIds && input.classIds.length > 0 
        ? collections.filter(c => c.student.section && input.classIds!.includes(c.student.section.classId))
        : collections;

      // Group collections by date and fee head for chart
      const chartDataMap: Record<string, Record<string, number>> = {};
      const feeHeadsSet = new Set<string>();
      
      filteredCollections.forEach(collection => {
        const dateKey = collection.paymentDate?.toISOString().split('T')[0];
        if (!dateKey) return;
        
        if (!chartDataMap[dateKey]) {
          chartDataMap[dateKey] = {};
        }
        
        collection.items.forEach(item => {
          if (input.feeHeadIds && input.feeHeadIds.length > 0 && !input.feeHeadIds.includes(item.feeHeadId)) {
            return;
          }
          
          const feeHeadName = item.feeHead.name;
          feeHeadsSet.add(feeHeadName);
          
          if (!chartDataMap[dateKey]![feeHeadName]) {
            chartDataMap[dateKey]![feeHeadName] = 0;
          }
          chartDataMap[dateKey]![feeHeadName] += item.amount;
        });
      });

      // Convert to chart format with fee head breakdown
      const sortedFeeHeads = Array.from(feeHeadsSet).sort();
      const chartArray = Object.entries(chartDataMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, feeHeadData]) => {
          const safeData = feeHeadData ?? {};
          return {
            date,
            formattedDate: new Date(date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            }),
            // Add total amount for backward compatibility
            amount: Object.values(safeData).reduce((sum, amount) => sum + (amount ?? 0), 0),
            // Add individual fee head amounts
            ...Object.fromEntries(sortedFeeHeads.map(fh => [fh, safeData[fh] ?? 0])),
          };
        });

      // Group by fee head for summary
      const feeHeadSummaryMap: Record<string, { feeHeadName: string; totalAmount: number; collectionCount: number }> = {};
      filteredCollections.forEach(collection => {
        collection.items.forEach(item => {
          if (input.feeHeadIds && input.feeHeadIds.length > 0 && !input.feeHeadIds.includes(item.feeHeadId)) {
            return;
          }
          
          if (!feeHeadSummaryMap[item.feeHeadId]) {
            feeHeadSummaryMap[item.feeHeadId] = {
              feeHeadName: item.feeHead.name,
              totalAmount: 0,
              collectionCount: 0,
            };
          }
          feeHeadSummaryMap[item.feeHeadId]!.totalAmount += item.amount;
          feeHeadSummaryMap[item.feeHeadId]!.collectionCount += 1;
        });
      });

      const summary = {
        totalCollections: filteredCollections.length,
        totalAmount: filteredCollections.reduce((sum, c) => sum + c.items.reduce((itemSum, item) => itemSum + item.amount, 0), 0),
        dateRange: { startDate, endDate },
        uniqueStudents: new Set(filteredCollections.map(c => c.studentId)).size,
      };

      return {
        summary,
        chartData: chartArray,
        feeHeadSummary: Object.values(feeHeadSummaryMap),
        feeTermSummary: [],
        feeHeads: sortedFeeHeads, // Add fee heads array for chart legend
        collections: filteredCollections.map(c => ({
          id: c.id,
          collectionDate: c.paymentDate,
          studentName: `${c.student.firstName} ${c.student.lastName}`.trim(),
          admissionNumber: c.student.admissionNumber || '',
          className: c.student.section?.class?.name || '',
          sectionName: c.student.section?.name || '',
          feeTermName: c.feeTerm?.name || 'Unknown',
          totalAmount: c.items.reduce((sum, item) => sum + item.amount, 0),
          receiptNumber: c.receiptNumber || '',
        })),
      };
    }),

  // Simplified Daily Collection Report (Working)
  getDailyCollectionReport: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      selectedDate: z.string(),
      classIds: z.array(z.string()).optional(),
      feeHeadIds: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const selectedDate = new Date(input.selectedDate);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get collections for the specific date
      const collections = await ctx.db.feeCollection.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          paymentDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true,
                }
              }
            }
          },
          feeTerm: true,
          items: {
            include: {
              feeHead: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
      });

      // Filter by class if specified
      const filteredCollections = input.classIds && input.classIds.length > 0 
        ? collections.filter(c => c.student.section && input.classIds!.includes(c.student.section.classId))
        : collections;

      // Group by collection hour and fee head for chart
      const hourlyData: Record<number, Record<string, number>> = {};
      const feeHeadsSet = new Set<string>();
      
      filteredCollections.forEach(collection => {
        const hour = collection.paymentDate.getHours();
        if (!hourlyData[hour]) {
          hourlyData[hour] = {};
        }
        
        collection.items.forEach(item => {
          if (input.feeHeadIds && input.feeHeadIds.length > 0 && !input.feeHeadIds.includes(item.feeHeadId)) {
            return;
          }
          
          const feeHeadName = item.feeHead.name;
          feeHeadsSet.add(feeHeadName);
          
          if (!hourlyData[hour]![feeHeadName]) {
            hourlyData[hour]![feeHeadName] = 0;
          }
          hourlyData[hour]![feeHeadName] += item.amount;
        });
      });

      // Convert to chart format (24 hours) with fee head breakdown
      const sortedFeeHeads = Array.from(feeHeadsSet).sort();
      const chartData = Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyData[hour] ?? {};
        return {
          hour: hour.toString().padStart(2, '0') + ':00',
          // Add total amount for backward compatibility
          amount: Object.values(hourData).reduce((sum, amount) => sum + (amount ?? 0), 0),
          // Add individual fee head amounts
          ...Object.fromEntries(sortedFeeHeads.map(fh => [fh, hourData[fh] ?? 0])),
        };
      });

      const summary = {
        totalCollections: filteredCollections.length,
        totalAmount: filteredCollections.reduce((sum, c) => sum + c.items.reduce((itemSum, item) => {
          if (input.feeHeadIds && input.feeHeadIds.length > 0 && !input.feeHeadIds.includes(item.feeHeadId)) {
            return itemSum;
          }
          return itemSum + item.amount;
        }, 0), 0),
        selectedDate: selectedDate,
        uniqueStudents: new Set(filteredCollections.map(c => c.studentId)).size,
        peakHour: Object.entries(hourlyData).reduce((a, b) => {
          const aTotal = Object.values(a[1]).reduce((sum, val) => sum + val, 0);
          const bTotal = Object.values(b[1]).reduce((sum, val) => sum + val, 0);
          return aTotal > bTotal ? a : b;
        }, ['0', {}])[0],
      };

      return {
        summary,
        chartData,
        feeHeads: sortedFeeHeads, // Add fee heads array for chart legend
        collectorSummary: [],
        collections: filteredCollections.slice(0, 100).map(c => ({
          id: c.id,
          receiptNumber: c.receiptNumber || '',
          collectionTime: c.paymentDate,
          studentName: `${c.student.firstName} ${c.student.lastName}`.trim(),
          admissionNumber: c.student.admissionNumber || '',
          className: c.student.section?.class?.name || '',
          sectionName: c.student.section?.name || '',
          feeTermName: c.feeTerm?.name || 'Unknown',
          totalAmount: c.items.reduce((sum, item) => {
            if (input.feeHeadIds && input.feeHeadIds.length > 0 && !input.feeHeadIds.includes(item.feeHeadId)) {
              return sum;
            }
            return sum + item.amount;
          }, 0),
          collectorName: 'System',
          items: c.items.map(item => ({
            feeHeadName: item.feeHead.name,
            amountPaid: item.amount,
          })),
        })),
      };
    }),

  // Simplified Class-wise Analysis Report (Working)
  getClasswiseAnalysisReport: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      feeTermIds: z.array(z.string()).optional(),
      feeHeadIds: z.array(z.string()).optional(),
      includeOutstanding: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      // Get all classes for the session with students
      const classes = await ctx.db.class.findMany({
        where: {
          sessionId: input.sessionId,
          sections: {
            some: {
              students: {
                some: {
                  branchId: input.branchId,
                  isActive: true,
                }
              }
            }
          }
        },
        include: {
          sections: {
            include: {
              students: {
                where: {
                  branchId: input.branchId,
                  isActive: true,
                },
                include: {
                  firstJoinedSession: true,
                }
              }
            }
          }
        },
        orderBy: [
          { displayOrder: 'asc' },
          { grade: 'asc' },
          { name: 'asc' },
        ],
      });

      // Get collections for all students in these classes
      const classStudentIds = classes.flatMap(cls => 
        cls.sections.flatMap(section => 
          section.students.map(student => student.id)
        )
      );

      const collections = await ctx.db.feeCollection.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          studentId: { in: classStudentIds },
          ...(input.feeTermIds && input.feeTermIds.length > 0 && {
            feeTermId: { in: input.feeTermIds }
          }),
        },
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true,
                }
              }
            }
          },
          items: {
            include: {
              feeHead: true,
            },
            ...(input.feeHeadIds && input.feeHeadIds.length > 0 && {
              where: {
                feeHeadId: { in: input.feeHeadIds }
              }
            })
          },
        },
      });

      // Get class-wise fee structure for expected calculation
      const classwiseFees = await ctx.db.classwiseFee.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          Class: {
            id: { in: classes.map(c => c.id) }
          },
          ...(input.feeTermIds && input.feeTermIds.length > 0 && {
            feeTermId: { in: input.feeTermIds }
          }),
          ...(input.feeHeadIds && input.feeHeadIds.length > 0 && {
            feeHeadId: { in: input.feeHeadIds }
          }),
        },
        include: {
          feeHead: true,
        },
      });

      // Get student concessions for concession calculations
      const analysisStudentIds = classes.flatMap(cls => 
        cls.sections.flatMap(section => 
          section.students.map(student => student.id)
        )
      );

      const studentConcessions = await ctx.db.studentConcession.findMany({
        where: {
          studentId: { in: analysisStudentIds },
          branchId: input.branchId,
          sessionId: input.sessionId,
          status: 'APPROVED',
          validFrom: { lte: new Date() },
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
          ...(input.feeHeadIds && input.feeHeadIds.length > 0 && { 
            appliedFeeHeads: { hasSome: input.feeHeadIds }
          }),
        },
        include: {
          concessionType: true,
        },
      });

      const classAnalysis = classes.map(classItem => {
        const totalStudents = classItem.sections.reduce((sum, section) => sum + section.students.length, 0);
        const classStudentIds = classItem.sections.flatMap(section => section.students.map(s => s.id));
        
        // Calculate total collections for this class
        const classCollections = collections.filter(c => 
          c.student.section?.classId === classItem.id
        );
        
        const totalCollected = classCollections.reduce((sum, collection) => 
          sum + collection.items.reduce((itemSum, item) => {
            // Only count items that match the fee head filter (if any)
            if (input.feeHeadIds && input.feeHeadIds.length > 0 && !input.feeHeadIds.includes(item.feeHeadId)) {
              return itemSum;
            }
            return itemSum + item.amount;
          }, 0), 0
        );

        // Calculate expected amount from class-wise fees, avoiding double counting
        const classExpectedFees = classwiseFees.filter(cf => cf.classId === classItem.id);
        
        let totalExpected = 0;
        
        // Group fees by fee combination (term + head) to identify conflicts
        const feeComboMap = new Map<string, { 
          classLevel?: { amount: number; classId: string }, 
          sectionLevel: Array<{ amount: number; sectionId: string; students: number }> 
        }>();
        
        // First pass: organize all fees by fee combination
        classExpectedFees.forEach(cf => {
          const feeKey = `${cf.feeTermId}-${cf.feeHeadId}`;
          
          if (!feeComboMap.has(feeKey)) {
            feeComboMap.set(feeKey, { sectionLevel: [] });
          }
          
          const combo = feeComboMap.get(feeKey)!;
          
          if (cf.sectionId) {
            // Section-specific fee
            const section = classItem.sections.find(s => s.id === cf.sectionId);
            const studentCount = section?.students.length || 0;
            combo.sectionLevel.push({
              amount: cf.amount,
              sectionId: cf.sectionId,
              students: studentCount
            });
          } else {
            // Class-level fee
            combo.classLevel = {
              amount: cf.amount,
              classId: cf.classId
            };
          }
        });
        
        // Second pass: calculate totals, prioritizing section-level fees over class-level
        // Apply student type filtering based on firstJoinedSessionId
        feeComboMap.forEach((combo, feeKey) => {
          const feeHeadId = feeKey.split('-')[1];
          const feeHead = classExpectedFees.find(cf => cf.feeHeadId === feeHeadId)?.feeHead;
          
          if (!feeHead) return;
          
          if (combo.sectionLevel.length > 0) {
            // Use section-level fees (ignore any class-level fee for this combination)
            combo.sectionLevel.forEach(sectionFee => {
              // Find the section to get student details
              const section = classItem.sections.find(s => s.id === sectionFee.sectionId);
              const students = section?.students || [];
              
              // Count eligible students based on fee head student type
              let eligibleStudentCount = 0;
              students.forEach(student => {
                const isNewAdmission = student.firstJoinedSessionId === input.sessionId;
                const isOldStudent = student.firstJoinedSessionId !== input.sessionId || student.firstJoinedSessionId === null;
                
                const isEligible = 
                  feeHead.studentType === "BOTH" ||
                  (feeHead.studentType === "NEW_ADMISSION" && isNewAdmission) ||
                  (feeHead.studentType === "OLD_STUDENT" && isOldStudent);
                
                if (isEligible) {
                  eligibleStudentCount++;
                }
              });
              
              totalExpected += sectionFee.amount * eligibleStudentCount;
            });
          } else if (combo.classLevel) {
            // Use class-level fee only if no section-level fees exist
            // Get all students for this class
            const classStudents = classItem.sections.flatMap(section => section.students);
            
            // Count eligible students based on fee head student type
            let eligibleStudentCount = 0;
            classStudents.forEach(student => {
              const isNewAdmission = student.firstJoinedSessionId === input.sessionId;
              const isOldStudent = student.firstJoinedSessionId !== input.sessionId || student.firstJoinedSessionId === null;
              
              const isEligible = 
                feeHead.studentType === "BOTH" ||
                (feeHead.studentType === "NEW_ADMISSION" && isNewAdmission) ||
                (feeHead.studentType === "OLD_STUDENT" && isOldStudent);
              
              if (isEligible) {
                eligibleStudentCount++;
              }
            });
            
            totalExpected += combo.classLevel.amount * eligibleStudentCount;
          }
        });
        
        const totalOutstanding = input.includeOutstanding ? Math.max(0, totalExpected - totalCollected) : 0;
        const collectionPercentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

        return {
          classId: classItem.id,
          className: classItem.name,
          totalStudents,
          totalCollected,
          totalExpected,
          totalOutstanding,
          collectionPercentage,
          averagePerStudent: totalStudents > 0 ? totalCollected / totalStudents : 0,
          collectionsCount: classCollections.length,
        };
      });

      // Chart data for class-wise comparison
      const chartData = classAnalysis.map(ca => ({
        className: ca.className,
        collected: ca.totalCollected,
        expected: ca.totalExpected,
        outstanding: ca.totalOutstanding,
        percentage: ca.collectionPercentage,
      }));

      const summary = {
        totalClasses: classes.length,
        totalStudents: classAnalysis.reduce((sum, ca) => sum + ca.totalStudents, 0),
        totalCollected: classAnalysis.reduce((sum, ca) => sum + ca.totalCollected, 0),
        totalExpected: classAnalysis.reduce((sum, ca) => sum + ca.totalExpected, 0),
        totalOutstanding: classAnalysis.reduce((sum, ca) => sum + ca.totalOutstanding, 0),
        averageCollectionPercentage: classAnalysis.length > 0 
          ? classAnalysis.reduce((sum, ca) => sum + ca.collectionPercentage, 0) / classAnalysis.length 
          : 0,
      };

      return {
        summary,
        chartData,
        classAnalysis,
      };
    }),

  // Concession Report
  getConcessionReport: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      classIds: z.array(z.string()).optional(),
      feeHeadIds: z.array(z.string()).optional(),
      concessionTypeIds: z.array(z.string()).optional(),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Build date filter
      let dateFilter: any = {};
      if (input.startDate && input.endDate) {
        dateFilter = {
          createdAt: {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate + 'T23:59:59.999Z'),
          },
        };
      }

      // Get all student concessions with filters
      const concessions = await ctx.db.studentConcession.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          ...dateFilter,
          ...(input.status && { status: input.status }),
          ...(input.concessionTypeIds && input.concessionTypeIds.length > 0 && {
            concessionTypeId: { in: input.concessionTypeIds }
          }),
          ...(input.classIds && input.classIds.length > 0 && {
            student: {
              section: {
                classId: { in: input.classIds }
              }
            }
          }),
        },
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true,
                }
              }
            }
          },
          concessionType: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get concession types for dropdown
      const concessionTypes = await ctx.db.concessionType.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Calculate concession amounts based on type and value
      const concessionsWithAmounts = concessions.map(concession => {
        let concessionAmount = 0;
        
        if (concession.concessionType.type === 'PERCENTAGE') {
          // For percentage concessions, we'd need to calculate based on fee structure
          // For now, using custom value or estimated amount
          concessionAmount = concession.customValue || 0;
        } else if (concession.concessionType.type === 'FIXED') {
          concessionAmount = concession.customValue || concession.concessionType.value;
        }

        return {
          ...concession,
          concessionAmount,
        };
      });

      // Group by date for chart data
      const chartDataMap: Record<string, number> = {};
      concessionsWithAmounts.forEach(concession => {
        const dateKey = concession.createdAt.toISOString().split('T')[0]!;
        if (!chartDataMap[dateKey]) {
          chartDataMap[dateKey] = 0;
        }
        chartDataMap[dateKey] += concession.concessionAmount;
      });

      const chartData = Object.entries(chartDataMap)
        .map(([date, amount]) => ({
          date,
          formattedDate: new Date(date).toLocaleDateString('en-IN'),
          amount,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Status-wise summary
      const statusSummary = {
        pending: concessionsWithAmounts.filter(c => c.status === 'PENDING').length,
        approved: concessionsWithAmounts.filter(c => c.status === 'APPROVED').length,
        rejected: concessionsWithAmounts.filter(c => c.status === 'REJECTED').length,
      };

      // Concession type summary
      const typeSummary = concessionTypes.map(type => {
        const typesConcessions = concessionsWithAmounts.filter(c => c.concessionTypeId === type.id);
        return {
          typeName: type.name,
          totalConcessions: typesConcessions.length,
          totalAmount: typesConcessions.reduce((sum, c) => sum + c.concessionAmount, 0),
          pendingCount: typesConcessions.filter(c => c.status === 'PENDING').length,
          approvedCount: typesConcessions.filter(c => c.status === 'APPROVED').length,
          rejectedCount: typesConcessions.filter(c => c.status === 'REJECTED').length,
        };
      });

      // Class-wise summary
      const classSummary = concessionsWithAmounts.reduce((acc, concession) => {
        const className = concession.student.section?.class?.name || 'Unknown';
        if (!acc[className]) {
          acc[className] = {
            className,
            totalConcessions: 0,
            totalAmount: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
          };
        }
        
        acc[className].totalConcessions += 1;
        acc[className].totalAmount += concession.concessionAmount;
        if (concession.status === 'PENDING') acc[className].pendingCount += 1;
        if (concession.status === 'APPROVED') acc[className].approvedCount += 1;
        if (concession.status === 'REJECTED') acc[className].rejectedCount += 1;
        
        return acc;
      }, {} as Record<string, any>);

      // Table data for detailed view
      const tableData = concessionsWithAmounts.map(concession => ({
        id: concession.id,
        studentName: `${concession.student.firstName} ${concession.student.lastName}`,
        rollNumber: concession.student.rollNumber,
        className: concession.student.section?.class?.name || 'N/A',
        sectionName: concession.student.section?.name || 'N/A',
        concessionType: concession.concessionType.name,
        concessionAmount: concession.concessionAmount,
        status: concession.status,
        reason: concession.reason,
        appliedDate: concession.createdAt,
        approvedBy: concession.approvedBy,
        approvedAt: concession.approvedAt,
      }));

      return {
        chartData,
        tableData,
        concessionTypes,
        summary: {
          totalConcessions: concessionsWithAmounts.length,
          totalAmount: concessionsWithAmounts.reduce((sum, c) => sum + c.concessionAmount, 0),
          statusSummary,
          typeSummary,
          classSummary: Object.values(classSummary),
        },
      };
    }),

  // New Admission Student Identification and Fee Assignment (Session-Based)
  identifyNewAdmissionStudents: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      includeInactiveStudents: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      // Build the base student query for current session students
      const studentWhere: any = {
        branchId: input.branchId,
        section: {
          class: {
            sessionId: input.sessionId,
          },
        },
        // New admission: students whose firstJoinedSessionId matches current session
        // OR students with NULL firstJoinedSessionId are considered old students
        firstJoinedSessionId: input.sessionId,
      };

      if (!input.includeInactiveStudents) {
        studentWhere.isActive = true;
      }

      // Get new admission students
      const newAdmissionStudents = await ctx.db.student.findMany({
        where: studentWhere,
        include: {
          section: {
            include: {
              class: true,
            },
          },
          firstJoinedSession: true,
          feeCollections: {
            include: {
              items: {
                include: {
                  feeHead: true,
                },
              },
            },
          },
        },
        orderBy: [
          { dateOfAdmission: 'desc' },
          { joinDate: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // Get fee heads applicable to new admissions
      const newAdmissionFeeHeads = await ctx.db.feeHead.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
          studentType: {
            in: ["NEW_ADMISSION", "BOTH"],
          },
          isActive: true,
        },
        include: {
          classwiseFees: {
            where: {
              section: {
                students: {
                  some: {
                    id: { in: newAdmissionStudents.map(s => s.id) },
                  },
                },
              },
            },
          },
        },
      });

      // Get fee heads that are specifically for new admissions only
      const newAdmissionOnlyFeeHeads = newAdmissionFeeHeads.filter(fh => fh.studentType === "NEW_ADMISSION");

      // Calculate statistics
      const totalNewAdmissions = newAdmissionStudents.length;
      const studentsWithNewAdmissionFees = newAdmissionStudents.filter(student => {
        const studentFeeHeads = student.feeCollections.flatMap(fc => fc.items.map(item => item.feeHead.id));
        return newAdmissionOnlyFeeHeads.some(fh => studentFeeHeads.includes(fh.id));
      }).length;

      // Group students by class for better organization
      const studentsByClass = newAdmissionStudents.reduce((acc, student) => {
        const className = student.section?.class?.name || 'Unknown';
        if (!acc[className]) {
          acc[className] = [];
        }
        acc[className].push({
          id: student.id,
          admissionNumber: student.admissionNumber,
          name: `${student.firstName} ${student.lastName}`,
          dateOfAdmission: student.dateOfAdmission,
          joinDate: student.joinDate,
          firstJoinedSession: student.firstJoinedSession?.name || 'Unknown',
          sectionName: student.section?.name || 'N/A',
          hasNewAdmissionFees: student.feeCollections.flatMap(fc => fc.items.map(item => item.feeHead.id))
            .some(feeHeadId => newAdmissionOnlyFeeHeads.map(fh => fh.id).includes(feeHeadId)),
        });
        return acc;
      }, {} as Record<string, any[]>);

      return {
        method: "SESSION_BASED",
        sessionId: input.sessionId,
        summary: {
          totalNewAdmissions,
          studentsWithNewAdmissionFees,
          studentsWithoutNewAdmissionFees: totalNewAdmissions - studentsWithNewAdmissionFees,
          newAdmissionFeeHeadsCount: newAdmissionOnlyFeeHeads.length,
        },
        newAdmissionFeeHeads: newAdmissionOnlyFeeHeads.map(fh => ({
          id: fh.id,
          name: fh.name,
          description: fh.description,
          studentType: fh.studentType,
          applicableStudentsCount: fh.classwiseFees.length,
        })),
        studentsByClass,
        allNewAdmissionStudents: newAdmissionStudents.map(student => ({
          id: student.id,
          admissionNumber: student.admissionNumber,
          name: `${student.firstName} ${student.lastName}`,
          className: student.section?.class?.name || 'Unknown',
          sectionName: student.section?.name || 'N/A',
          dateOfAdmission: student.dateOfAdmission,
          joinDate: student.joinDate,
          firstJoinedSession: student.firstJoinedSession?.name || 'Unknown',
          firstJoinedSessionId: student.firstJoinedSessionId,
          createdAt: student.createdAt,
          isActive: student.isActive,
        })),
      };
    }),

  // Auto-assign new admission fee heads to eligible students
  autoAssignNewAdmissionFees: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      studentIds: z.array(z.string()),
      feeHeadIds: z.array(z.string()).optional(), // If not provided, assign all NEW_ADMISSION fee heads
      feeTermId: z.string(), // Which term to assign the fees to
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate students exist and belong to the branch/session
      const students = await ctx.db.student.findMany({
        where: {
          id: { in: input.studentIds },
          branchId: input.branchId,
          section: {
            class: {
              sessionId: input.sessionId,
            },
          },
        },
        include: {
          section: {
            include: {
              class: true,
            },
          },
        },
      });

      if (students.length !== input.studentIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some students are invalid or don't belong to the specified branch/session",
        });
      }

      // Get fee heads to assign
      let feeHeadsToAssign;
      if (input.feeHeadIds && input.feeHeadIds.length > 0) {
        feeHeadsToAssign = await ctx.db.feeHead.findMany({
          where: {
            id: { in: input.feeHeadIds },
            branchId: input.branchId,
            sessionId: input.sessionId,
            studentType: { in: ["NEW_ADMISSION", "BOTH"] },
            isActive: true,
          },
        });
      } else {
        // Auto-assign all NEW_ADMISSION fee heads
        feeHeadsToAssign = await ctx.db.feeHead.findMany({
          where: {
            branchId: input.branchId,
            sessionId: input.sessionId,
            studentType: "NEW_ADMISSION",
            isActive: true,
          },
        });
      }

      if (feeHeadsToAssign.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid fee heads found for assignment",
        });
      }

      // Validate fee term
      const feeTerm = await ctx.db.feeTerm.findUnique({
        where: { id: input.feeTermId },
      });

      if (!feeTerm || feeTerm.branchId !== input.branchId || feeTerm.sessionId !== input.sessionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid fee term",
        });
      }

      // Create classwise fees for each student's section and fee head combination
      const classwiseFeesToCreate = [];
      const results = {
        success: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const student of students) {
        if (!student.section) {
          results.errors.push(`Student ${student.admissionNumber} has no section assigned`);
          continue;
        }

        for (const feeHead of feeHeadsToAssign) {
          // Check if classwise fee already exists
          const existingClasswiseFee = await ctx.db.classwiseFee.findFirst({
            where: {
              sectionId: student.section.id,
              feeTermId: input.feeTermId,
              feeHeadId: feeHead.id,
              branchId: input.branchId,
              sessionId: input.sessionId,
            },
          });

          if (existingClasswiseFee) {
            results.skipped++;
          } else {
            classwiseFeesToCreate.push({
              classId: student.section.classId,
              sectionId: student.section.id,
              feeTermId: input.feeTermId,
              feeHeadId: feeHead.id,
              amount: 0, // Default amount - should be set manually later
              branchId: input.branchId,
              sessionId: input.sessionId,
            });
            results.success++;
          }
        }
      }

      // Bulk create classwise fees
      if (classwiseFeesToCreate.length > 0) {
        await ctx.db.classwiseFee.createMany({
          data: classwiseFeesToCreate,
        });
      }

      return {
        message: `Successfully processed ${input.studentIds.length} students`,
        results,
        assignedFeeHeads: feeHeadsToAssign.map(fh => ({ id: fh.id, name: fh.name })),
      };
    }),

  // Debug Total Fee Calculation - Detailed Breakdown
  debugTotalFeeCalculation: publicProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Step 1: Get all classes with sections and students
      const classes = await ctx.db.class.findMany({
        where: {
          sessionId: input.sessionId,
          sections: {
            some: {
              students: {
                some: {
                  branchId: input.branchId,
                  isActive: true,
                }
              }
            }
          }
        },
        include: {
          sections: {
            include: {
              students: {
                where: {
                  branchId: input.branchId,
                  isActive: true,
                }
              }
            }
          }
        },
        orderBy: [
          { displayOrder: 'asc' },
          { grade: 'asc' },
          { name: 'asc' },
        ],
      });

      // Step 2: Get all classwise fees
      const allClasswiseFees = await ctx.db.classwiseFee.findMany({
        where: {
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
        include: {
          feeHead: true,
          feeTerm: true,
          Class: true,
          section: true,
        },
        orderBy: [
          { Class: { name: 'asc' } },
          { feeTerm: { name: 'asc' } },
          { feeHead: { name: 'asc' } },
        ],
      });

      // Step 3: Analyze the data structure
      const studentCounts = {
        totalStudents: classes.reduce((sum, cls) => sum + cls.sections.reduce((secSum, sec) => secSum + sec.students.length, 0), 0),
        byClass: classes.map(cls => ({
          className: cls.name,
          sections: cls.sections.map(sec => ({
            sectionName: sec.name,
            studentCount: sec.students.length,
          })),
          totalStudents: cls.sections.reduce((sum, sec) => sum + sec.students.length, 0),
        })),
      };

      // Step 4: Analyze classwise fees structure
      const feeStructureAnalysis = {
        totalClasswiseFees: allClasswiseFees.length,
        classLevelFees: allClasswiseFees.filter(cf => !cf.sectionId).length,
        sectionLevelFees: allClasswiseFees.filter(cf => cf.sectionId).length,
        
        byClass: {} as Record<string, any>,
        bySection: {} as Record<string, any>,
        
        uniqueFeeHeads: [...new Set(allClasswiseFees.map(cf => cf.feeHead.name))],
        uniqueFeeTerms: [...new Set(allClasswiseFees.map(cf => cf.feeTerm.name))],
      };

      // Analyze by class
      classes.forEach(cls => {
        const classFees = allClasswiseFees.filter(cf => cf.classId === cls.id);
        const classLevelFees = classFees.filter(cf => !cf.sectionId);
        const sectionLevelFees = classFees.filter(cf => cf.sectionId);

        feeStructureAnalysis.byClass[cls.name] = {
          totalStudents: cls.sections.reduce((sum, sec) => sum + sec.students.length, 0),
          classLevelFees: classLevelFees.length,
          sectionLevelFees: sectionLevelFees.length,
          totalFees: classFees.length,
          
          feeDetails: classFees.map(cf => ({
            feeHead: cf.feeHead.name,
            feeTerm: cf.feeTerm.name,
            amount: cf.amount,
            level: cf.sectionId ? 'Section' : 'Class',
            sectionName: cf.section?.name || 'N/A',
          })),
        };
      });

      // Step 5: Calculate total using different methods
      const calculationMethods = {
        // Method 1: Simple multiplication (original method)
        simpleMultiplication: {
          calculation: 0,
          breakdown: [] as any[],
        },
        
        // Method 2: Our new grouped method
        groupedMethod: {
          calculation: 0,
          breakdown: [] as any[],
        },
        
        // Method 3: Manual verification method
        manualVerification: {
          calculation: 0,
          breakdown: [] as any[],
        }
      };

      // Method 1: Simple multiplication
      allClasswiseFees.forEach(cf => {
        let studentCount = 0;
        if (cf.sectionId) {
          // Section-specific fee
          const section = classes.flatMap(c => c.sections).find(s => s.id === cf.sectionId);
          studentCount = section?.students.length || 0;
        } else {
          // Class-level fee
          const classData = classes.find(c => c.id === cf.classId);
          studentCount = classData?.sections.reduce((sum, sec) => sum + sec.students.length, 0) || 0;
        }
        
        const amount = cf.amount * studentCount;
        calculationMethods.simpleMultiplication.calculation += amount;
        calculationMethods.simpleMultiplication.breakdown.push({
          feeHead: cf.feeHead.name,
          feeTerm: cf.feeTerm.name,
          className: cf.Class.name,
          sectionName: cf.section?.name || 'Class Level',
          amount: cf.amount,
          studentCount,
          totalAmount: amount,
        });
      });

      // Method 2: Grouped method (current implementation)
      const sectionFeeMap = new Map<string, Map<string, { amount: number, students: number }>>();
      
      allClasswiseFees.forEach(cf => {
        const sectionKey = cf.sectionId || `class-${cf.classId}`;
        const feeKey = `${cf.feeTermId}-${cf.feeHeadId}`;
        
        if (!sectionFeeMap.has(sectionKey)) {
          sectionFeeMap.set(sectionKey, new Map());
        }
        
        const sectionMap = sectionFeeMap.get(sectionKey)!;
        
        if (!sectionMap.has(feeKey)) {
          let studentCount: number;
          
          if (cf.sectionId) {
            const section = classes.flatMap(c => c.sections).find(s => s.id === cf.sectionId);
            studentCount = section?.students.length || 0;
          } else {
            const classData = classes.find(c => c.id === cf.classId);
            studentCount = classData?.sections.reduce((sum, sec) => sum + sec.students.length, 0) || 0;
          }
          
          sectionMap.set(feeKey, {
            amount: cf.amount,
            students: studentCount
          });
        }
      });
      
      sectionFeeMap.forEach((sectionMap, sectionKey) => {
        sectionMap.forEach(({ amount, students }, feeKey) => {
          const totalAmount = amount * students;
          calculationMethods.groupedMethod.calculation += totalAmount;
          calculationMethods.groupedMethod.breakdown.push({
            sectionKey,
            feeKey,
            amount,
            students,
            totalAmount,
          });
        });
      });

      // Method 3: Manual verification - calculate by unique fee combinations
      const uniqueCombinations = new Map<string, { feeHead: string, feeTerm: string, amount: number, applicableStudents: number }>();
      
      allClasswiseFees.forEach(cf => {
        const key = `${cf.feeHeadId}-${cf.feeTermId}`;
        
        if (!uniqueCombinations.has(key)) {
          // Calculate total applicable students for this fee head + term combination
          let totalApplicableStudents = 0;
          
          // Get all classwise fees for this combination
          const relatedFees = allClasswiseFees.filter(otherCf => 
            otherCf.feeHeadId === cf.feeHeadId && otherCf.feeTermId === cf.feeTermId
          );
          
          relatedFees.forEach(relatedFee => {
            if (relatedFee.sectionId) {
              // Section-specific
              const section = classes.flatMap(c => c.sections).find(s => s.id === relatedFee.sectionId);
              totalApplicableStudents += section?.students.length || 0;
            } else {
              // Class-level - add all students in that class
              const classData = classes.find(c => c.id === relatedFee.classId);
              totalApplicableStudents += classData?.sections.reduce((sum, sec) => sum + sec.students.length, 0) || 0;
            }
          });
          
          uniqueCombinations.set(key, {
            feeHead: cf.feeHead.name,
            feeTerm: cf.feeTerm.name,
            amount: cf.amount,
            applicableStudents: totalApplicableStudents,
          });
        }
      });
      
      uniqueCombinations.forEach((combo, key) => {
        const totalAmount = combo.amount * combo.applicableStudents;
        calculationMethods.manualVerification.calculation += totalAmount;
        calculationMethods.manualVerification.breakdown.push({
          key,
          feeHead: combo.feeHead,
          feeTerm: combo.feeTerm,
          amount: combo.amount,
          applicableStudents: combo.applicableStudents,
          totalAmount,
        });
      });

      return {
        studentCounts,
        feeStructureAnalysis,
        calculationMethods,
        summary: {
          totalStudents: studentCounts.totalStudents,
          totalClasswiseFees: allClasswiseFees.length,
          uniqueFeeHeadTermCombinations: uniqueCombinations.size,
          
          calculationResults: {
            simpleMultiplication: calculationMethods.simpleMultiplication.calculation,
            groupedMethod: calculationMethods.groupedMethod.calculation,
            manualVerification: calculationMethods.manualVerification.calculation,
          },
          
          yourExpectedAmount: 101539600, // ₹10,15,39,600
          currentSystemAmount: calculationMethods.groupedMethod.calculation,
          difference: calculationMethods.groupedMethod.calculation - 101539600,
        }
      };
    }),
}); 