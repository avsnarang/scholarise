import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const transferCertificateRouter = createTRPCRouter({
  // Get all transfer certificates with filtering
  getAll: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, branchId } = input;

      const where = {
        ...(branchId && {
          student: {
            branchId: branchId,
          },
        }),
        ...(search && {
          OR: [
            {
              student: {
                firstName: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              student: {
                lastName: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              student: {
                admissionNumber: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              tcNumber: { contains: search, mode: "insensitive" as const },
            },
          ],
        }),
      };

      const transferCertificates = await ctx.db.transferCertificate.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where,
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true
                }
              },
              parent: true,
              branch: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (transferCertificates.length > limit) {
        const nextItem = transferCertificates.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: transferCertificates,
        nextCursor,
      };
    }),

  // Get transfer certificate by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const transferCertificate = await ctx.db.transferCertificate.findUnique({
        where: { id: input.id },
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true
                }
              },
              parent: true,
              branch: true,
              academicRecords: {
                include: {
                  session: true,
                },
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
          },
        },
      });

      if (!transferCertificate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer certificate not found.",
        });
      }

      return transferCertificate;
    }),

  // Create new transfer certificate
  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        reason: z.string().optional(),
        remarks: z.string().optional(),
        tcNumber: z.string().optional(), // Manual TC number
        isAutomatic: z.boolean().default(false), // Whether to auto-generate TC number
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if student exists and is active
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },

      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found.",
        });
      }

      if (!student.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create transfer certificate for inactive student.",
        });
      }

      // Check if student already has an active transfer certificate
      const existingTC = await ctx.db.transferCertificate.findFirst({
        where: { studentId: input.studentId }
      });
      if (existingTC) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student already has a transfer certificate.",
        });
      }

      let tcNumber = input.tcNumber;

      // If manual TC number is provided, validate uniqueness
      if (tcNumber) {
        const existingTCWithNumber = await ctx.db.transferCertificate.findFirst({
          where: { tcNumber: tcNumber },
        });
        
        if (existingTCWithNumber) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "TC number already exists. Please use a different number.",
          });
        }
      } else if (input.isAutomatic || !input.tcNumber) {
        // Generate automatic TC number if requested or no manual number provided
        const year = new Date().getFullYear();
        const tcCount = await ctx.db.transferCertificate.count({
          where: {
            createdAt: {
              gte: new Date(`${year}-01-01`),
              lte: new Date(`${year}-12-31`),
            },
          },
        });
        tcNumber = `TC${year}${String(tcCount + 1).padStart(4, '0')}`;
      }

      if (!tcNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "TC number is required. Please provide a manual TC number or enable automatic generation.",
        });
      }

      // Create transfer certificate and update student status in a transaction
      const result = await ctx.db.$transaction(async (prisma) => {
        // Create transfer certificate
        const transferCertificate = await prisma.transferCertificate.create({
          data: {
            tcNumber,
            studentId: input.studentId,
            reason: input.reason,
            remarks: input.remarks,
            issueDate: new Date(),
          },
          include: {
            student: {
              include: {
                section: {
                  include: {
                    class: true
                  }
                },
                parent: true,
                branch: true,
              },
            },
          },
        });

        // Update student status to withdrawn and inactive
        await prisma.student.update({
          where: { id: input.studentId },
          data: {
            isActive: false,
          },
        });

        return transferCertificate;
      });

      return result;
    }),

  // Revert transfer certificate (restore student) - For admin users only
  revert: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Basic check - in a real app, you'd check user roles/permissions here
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required to revert transfer certificates.",
        });
      }

      const transferCertificate = await ctx.db.transferCertificate.findUnique({
        where: { id: input.id },
        include: {
          student: true,
        },
      });

      if (!transferCertificate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer certificate not found.",
        });
      }

      // Revert in transaction
      const result = await ctx.db.$transaction(async (prisma) => {
        // Delete transfer certificate
        await prisma.transferCertificate.delete({
          where: { id: input.id },
        });

        // Reactivate student
        await prisma.student.update({
          where: { id: transferCertificate.studentId },
          data: {
            isActive: true,
          },
        });

        return { success: true };
      });

      return result;
    }),

  // Search students for TC creation
  searchStudents: protectedProcedure
    .input(
      z.object({
        search: z.string().min(1),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const students = await ctx.db.student.findMany({
        where: {
          AND: [
            {
              isActive: true, // Only active students
            },
            {
              transferCertificate: {
                none: {}, // Students without existing TCs
              },
            },
            ...(input.branchId ? [{ branchId: input.branchId }] : []),
            {
              OR: [
                {
                  firstName: { contains: input.search, mode: "insensitive" as const },
                },
                {
                  lastName: { contains: input.search, mode: "insensitive" as const },
                },
                {
                  admissionNumber: { contains: input.search, mode: "insensitive" as const },
                },
              ],
            },
          ],
        },
        include: {
          section: true,
          parent: true,
        },
        take: 10,
        orderBy: {
          firstName: "asc",
        },
      });

      return students;
    }),
}); 