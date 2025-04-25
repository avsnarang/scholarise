import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

// Define the schema for class creation and updates
const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  section: z.string().min(1, "Section is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1").default(30),
  isActive: z.boolean().default(true),
  branchId: z.string().min(1, "Branch is required"),
  sessionId: z.string().min(1, "Academic session is required"),
  teacherId: z.string().optional().nullable(),
});

export const classRouter = createTRPCRouter({
  getStats: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Get total classes
      const totalClasses = await ctx.db.class.count({
        where: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
        },
      });

      // Get active classes
      const activeClasses = await ctx.db.class.count({
        where: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
          isActive: true,
        },
      });

      // Get inactive classes
      const inactiveClasses = await ctx.db.class.count({
        where: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
          isActive: false,
        },
      });

      // Get classes with teachers assigned
      const classesWithTeachers = await ctx.db.class.count({
        where: {
          branchId: input?.branchId,
          sessionId: input?.sessionId,
          teacherId: { not: null },
        },
      });

      // Get total students in all classes
      const totalStudents = await ctx.db.student.count({
        where: {
          branchId: input?.branchId,
          classId: {
            not: null,
          },
          class: input?.sessionId
            ? {
                sessionId: input.sessionId,
              }
            : undefined,
        },
      });

      return {
        totalClasses,
        activeClasses,
        inactiveClasses,
        classesWithTeachers,
        totalStudents,
      };
    }),

  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
        includeTeacher: z.boolean().optional().default(false),
        includeStudentCount: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Build the where clause
      const where: Prisma.ClassWhereInput = {
        branchId: input?.branchId,
        sessionId: input?.sessionId,
        isActive: input?.isActive,
      };

      // Add search filter if provided
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { section: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      // Get classes with optional includes
      const classes = await ctx.db.class.findMany({
        where,
        orderBy: [
          { name: "asc" },
          { section: "asc" },
        ],
        include: {
          teacher: input?.includeTeacher,
          branch: true,
          session: true,
          ...(input?.includeStudentCount ? { _count: { select: { students: true } } } : {}),
        },
      });

      // If student count is requested, transform the result
      if (input?.includeStudentCount) {
        return classes.map(cls => ({
          ...cls,
          studentCount: cls._count?.students || 0,
          _count: undefined,
        }));
      }

      return classes;
    }),

  getById: publicProcedure
    .input(z.object({
      id: z.string(),
      includeStudents: z.boolean().optional().default(false),
      includeTeacher: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const classData = await ctx.db.class.findUnique({
        where: { id: input.id },
        include: {
          students: input.includeStudents,
          teacher: input.includeTeacher,
          branch: true,
          session: true,
        },
      });

      if (!classData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      return classData;
    }),

  create: protectedProcedure
    .input(classSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating class with input:", input);

      // Check if a class with the same name and section already exists for this session and branch
      const existingClass = await ctx.db.class.findFirst({
        where: {
          name: input.name,
          section: input.section,
          branchId: input.branchId,
          sessionId: input.sessionId,
        },
      });

      if (existingClass) {
        console.log("Duplicate class found:", existingClass);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A class with name "${input.name}" and section "${input.section}" already exists for this session and branch.`,
        });
      }

      try {
        // Create the class
        const newClass = await ctx.db.class.create({
          data: input,
        });
        console.log("Class created successfully:", newClass);
        return newClass;
      } catch (error) {
        console.error("Error creating class:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create class: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Class name is required").optional(),
        section: z.string().min(1, "Section is required").optional(),
        capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
        isActive: z.boolean().optional(),
        teacherId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Get the current class
      const currentClass = await ctx.db.class.findUnique({
        where: { id },
      });

      if (!currentClass) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Check if updating name or section would create a duplicate
      if (data.name || data.section) {
        const existingClass = await ctx.db.class.findFirst({
          where: {
            id: { not: id },
            name: data.name || currentClass.name,
            section: data.section || currentClass.section,
            branchId: currentClass.branchId,
            sessionId: currentClass.sessionId,
          },
        });

        if (existingClass) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `A class with name "${data.name || currentClass.name}" and section "${data.section || currentClass.section}" already exists for this session and branch.`,
          });
        }
      }

      // Update the class
      return ctx.db.class.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any students in this class
      const studentCount = await ctx.db.student.count({
        where: { classId: input.id },
      });

      if (studentCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this class because it has ${studentCount} students. Please reassign or remove these students first.`,
        });
      }

      // Delete the class
      return ctx.db.class.delete({
        where: { id: input.id },
      });
    }),

  // Get students in a class
  getStudents: publicProcedure
    .input(z.object({
      classId: z.string(),
      isActive: z.boolean().optional(),
      sessionId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { classId, isActive, sessionId } = input;
      
      // If sessionId is provided, filter students by their academic records
      if (sessionId) {
        const students = await ctx.db.student.findMany({
          where: {
            classId,
            isActive,
            academicRecords: {
              some: {
                sessionId,
                // Can optionally filter by classId in academicRecords too
                // classId,
              }
            }
          },
          orderBy: [
            { firstName: "asc" },
            { lastName: "asc" },
          ],
          include: {
            academicRecords: {
              where: {
                sessionId
              },
              take: 1
            }
          }
        });

        return students;
      }
      
      // If no sessionId provided, return all students in the class
      const students = await ctx.db.student.findMany({
        where: {
          classId,
          isActive,
        },
        orderBy: [
          { firstName: "asc" },
          { lastName: "asc" },
        ],
      });

      return students;
    }),

  // Assign a teacher to a class
  assignTeacher: protectedProcedure
    .input(z.object({
      classId: z.string(),
      teacherId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if the class exists
      const classData = await ctx.db.class.findUnique({
        where: { id: input.classId },
      });

      if (!classData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // If teacherId is provided, check if the teacher exists
      if (input.teacherId) {
        const teacher = await ctx.db.teacher.findUnique({
          where: { id: input.teacherId },
        });

        if (!teacher) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Teacher not found",
          });
        }

        // Check if teacher is from the same branch as the class
        if (teacher.branchId !== classData.branchId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Teacher must be from the same branch as the class",
          });
        }
      }

      // Update the class with the new teacher
      return ctx.db.class.update({
        where: { id: input.classId },
        data: {
          teacherId: input.teacherId,
        },
      });
    }),
});
