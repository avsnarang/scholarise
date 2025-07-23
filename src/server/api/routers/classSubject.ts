import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const classSubjectRouter = createTRPCRouter({
  // Get class subject mappings by class ID
  getByClass: publicProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const classSubjects = await ctx.db.classSubject.findMany({
        where: { classId: input.classId },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
      });

      return classSubjects;
    }),

  // Get all class subject mappings with statistics
  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const classSubjects = await ctx.db.classSubject.findMany({
        where: {
          class: {
            ...(input.branchId ? { branchId: input.branchId } : {}),
            ...(input.sessionId ? { sessionId: input.sessionId } : {}),
            isActive: true,
          },
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
            },
          },
        },
        orderBy: [
          { class: { name: "asc" } },
          { subject: { name: "asc" } },
        ],
      });

      return classSubjects;
    }),

  // Create a new class subject mapping
  create: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        subjectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { classId, subjectId } = input;

      // Check if class exists
      const classEntity = await ctx.db.class.findUnique({
        where: { id: classId },
      });

      if (!classEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Check if subject exists
      const subject = await ctx.db.subject.findUnique({
        where: { id: subjectId },
      });

      if (!subject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject not found",
        });
      }

      // Check if mapping already exists
      const existingMapping = await ctx.db.classSubject.findUnique({
        where: {
          classId_subjectId: {
            classId,
            subjectId,
          },
        },
      });

      if (existingMapping) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Subject is already assigned to this class",
        });
      }

      // Create the mapping
      const mapping = await ctx.db.classSubject.create({
        data: {
          classId,
          subjectId,
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      return mapping;
    }),

  // Delete a class subject mapping
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if mapping exists
      const mapping = await ctx.db.classSubject.findUnique({
        where: { id: input.id },
      });

      if (!mapping) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class subject mapping not found",
        });
      }

      // Delete the mapping
      await ctx.db.classSubject.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Bulk assign subjects to a class (replaces all existing mappings)
  bulkAssign: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        subjectIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { classId, subjectIds } = input;

      // Check if class exists
      const classEntity = await ctx.db.class.findUnique({
        where: { id: classId },
      });

      if (!classEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Validate all subjects exist
      if (subjectIds.length > 0) {
        const subjects = await ctx.db.subject.findMany({
          where: {
            id: { in: subjectIds },
          },
        });

        if (subjects.length !== subjectIds.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "One or more subjects not found",
          });
        }
      }

      // Remove all existing mappings for this class
      await ctx.db.classSubject.deleteMany({
        where: { classId },
      });

      // Create new mappings
      if (subjectIds.length > 0) {
        await ctx.db.classSubject.createMany({
          data: subjectIds.map((subjectId) => ({
            classId,
            subjectId,
          })),
        });
      }

      return { success: true };
    }),

  // Get class subject mapping statistics
  getStats: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all classes for the branch/session
      const classes = await ctx.db.class.findMany({
        where: {
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          isActive: true,
        },
        include: {
          _count: {
            select: {
              subjects: true,
            },
          },
        },
      });

      // Get all class subject mappings
      const mappings = await ctx.db.classSubject.findMany({
        where: {
          class: {
            ...(input.branchId ? { branchId: input.branchId } : {}),
            ...(input.sessionId ? { sessionId: input.sessionId } : {}),
            isActive: true,
          },
        },
      });

      const totalClasses = classes.length;
      const classesWithMappings = classes.filter(c => c._count.subjects > 0).length;
      const classesWithoutMappings = totalClasses - classesWithMappings;
      const totalMappings = mappings.length;
      const averageSubjectsPerClass = totalClasses > 0 ? totalMappings / totalClasses : 0;

      // Get unique subjects count
      const uniqueSubjects = new Set(mappings.map(m => m.subjectId)).size;

      return {
        totalClasses,
        classesWithMappings,
        classesWithoutMappings,
        totalMappings,
        averageSubjectsPerClass,
        uniqueSubjects,
      };
    }),
}); 