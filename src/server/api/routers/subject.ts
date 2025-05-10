import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const subjectRouter = createTRPCRouter({
  // Get all subjects
  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
      }).optional(),
    )
    .query(async ({ ctx, input = {} }) => {
      const limit = input.limit ?? 50;
      const { cursor } = input;

      const items = await ctx.db.subject.findMany({
        take: limit + 1,
        where: {
          ...(input.search ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { code: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
            ],
          } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          name: "asc",
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get a single subject by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subject = await ctx.db.subject.findUnique({
        where: { id: input.id },
        include: {
          classes: {
            include: {
              class: true,
            },
          },
        },
      });

      if (!subject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject not found",
        });
      }

      return subject;
    }),

  // Create a new subject
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Subject name is required"),
        code: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
        classIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { classIds, ...data } = input;

      // Check if subject with same name already exists
      const existingSubject = await ctx.db.subject.findFirst({
        where: { name: { equals: data.name, mode: "insensitive" } },
      });

      if (existingSubject) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A subject with this name already exists",
        });
      }

      // Create subject with class connections if provided
      const subject = await ctx.db.subject.create({
        data: {
          ...data,
          ...(classIds && classIds.length > 0
            ? {
                classes: {
                  create: classIds.map((classId) => ({
                    classId,
                  })),
                },
              }
            : {}),
        },
        include: {
          classes: {
            include: {
              class: true,
            },
          },
        },
      });

      return subject;
    }),

  // Update a subject
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Subject name is required").optional(),
        code: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        classIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, classIds, ...data } = input;

      // Check if subject exists
      const subject = await ctx.db.subject.findUnique({
        where: { id },
      });

      if (!subject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject not found",
        });
      }

      // Check if updated name conflicts with existing subject
      if (data.name) {
        const existingSubject = await ctx.db.subject.findFirst({
          where: {
            name: { equals: data.name, mode: "insensitive" },
            id: { not: id },
          },
        });

        if (existingSubject) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A subject with this name already exists",
          });
        }
      }

      // Update subject data
      const updatedSubject = await ctx.db.subject.update({
        where: { id },
        data,
      });

      // Update class connections if provided
      if (classIds) {
        // First, remove all existing connections
        await ctx.db.classSubject.deleteMany({
          where: { subjectId: id },
        });

        // Then add new connections
        if (classIds.length > 0) {
          await Promise.all(
            classIds.map((classId) =>
              ctx.db.classSubject.create({
                data: {
                  classId,
                  subjectId: id,
                },
              }),
            ),
          );
        }
      }

      return updatedSubject;
    }),

  // Delete a subject
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if subject exists
      const subject = await ctx.db.subject.findUnique({
        where: { id: input.id },
      });

      if (!subject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject not found",
        });
      }

      // Delete the subject (relations will cascade due to onDelete: Cascade)
      const deletedSubject = await ctx.db.subject.delete({
        where: { id: input.id },
      });

      return deletedSubject;
    }),

  // Toggle subject active status
  toggleStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if subject exists
      const subject = await ctx.db.subject.findUnique({
        where: { id: input.id },
      });

      if (!subject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject not found",
        });
      }

      // Update subject status
      return ctx.db.subject.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  // Get subjects for a specific class
  getByClassId: publicProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const classSubjects = await ctx.db.classSubject.findMany({
        where: { classId: input.classId },
        include: {
          subject: true,
        },
      });

      return classSubjects.map((cs) => cs.subject);
    }),

  // Get subjects for a specific student
  getByStudentId: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const studentSubjects = await ctx.db.studentSubject.findMany({
        where: { studentId: input.studentId },
        include: {
          subject: true,
        },
      });

      return studentSubjects.map((ss) => ss.subject);
    }),

  // Assign subjects to a student
  assignToStudent: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        subjectIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { studentId, subjectIds } = input;

      // Check if student exists
      const student = await ctx.db.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // First, remove all existing subject assignments
      await ctx.db.studentSubject.deleteMany({
        where: { studentId },
      });

      // Then add new assignments
      if (subjectIds.length > 0) {
        await Promise.all(
          subjectIds.map((subjectId) =>
            ctx.db.studentSubject.create({
              data: {
                studentId,
                subjectId,
              },
            }),
          ),
        );
      }

      return { success: true };
    }),

  // Assign subjects to a class
  assignToClass: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        subjectIds: z.array(z.string()),
      }),
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

      // First, remove all existing subject assignments
      await ctx.db.classSubject.deleteMany({
        where: { classId },
      });

      // Then add new assignments
      if (subjectIds.length > 0) {
        await Promise.all(
          subjectIds.map((subjectId) =>
            ctx.db.classSubject.create({
              data: {
                classId,
                subjectId,
              },
            }),
          ),
        );
      }

      return { success: true };
    }),
}); 