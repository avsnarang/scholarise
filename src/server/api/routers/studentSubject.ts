import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const studentSubjectRouter = createTRPCRouter({
  // Get student subject mappings by student ID
  getByStudent: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const studentSubjects = await ctx.db.studentSubject.findMany({
        where: { studentId: input.studentId },
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

      return studentSubjects;
    }),

  // Get students with their subject mappings by class/section
  getByClassWithMappings: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        classId: z.string().optional(),
        sectionId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.classId) {
        return [];
      }

      // Get students with their optional subject mappings
      const students = await ctx.db.student.findMany({
        where: {
          ...(input.branchId ? { branchId: input.branchId } : {}),
          isActive: true,
          ...(input.sectionId 
            ? { sectionId: input.sectionId }
            : input.classId 
            ? { section: { classId: input.classId } }
            : {}
          ),
        },
        include: {
          section: {
            select: {
              id: true,
              name: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          StudentSubject: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  isOptional: true,
                },
              },
            },
            orderBy: {
              subject: {
                name: "asc",
              },
            },
          },
        },
        orderBy: [
          { rollNumber: "asc" },
          { firstName: "asc" },
        ],
      });

      // Get class-level compulsory subjects
      const classSubjects = await ctx.db.classSubject.findMany({
        where: { classId: input.classId },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              isOptional: true,
            },
          },
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
      });

      // Transform students to include both compulsory and optional subjects
      const studentsWithAllSubjects = students.map((student) => {
        // Add class compulsory subjects to each student
        const compulsorySubjects = classSubjects
          .filter((cs) => !cs.subject.isOptional) // Only non-optional subjects
          .map((cs) => ({
            id: `class-${cs.id}`, // Prefix to distinguish from individual mappings
            subjectId: cs.subject.id,
            subject: cs.subject,
            isFromClass: true, // Flag to identify class-level subjects
          }));

        // Keep existing optional subjects from StudentSubject
        const optionalSubjects = student.StudentSubject || [];

        return {
          ...student,
          StudentSubject: optionalSubjects,
          ClassSubjects: compulsorySubjects, // Add class subjects separately
        };
      });

      return studentsWithAllSubjects;
    }),

  // Create a new student subject mapping
  create: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        subjectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { studentId, subjectId } = input;

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
      const existingMapping = await ctx.db.studentSubject.findUnique({
        where: {
          studentId_subjectId: {
            studentId,
            subjectId,
          },
        },
      });

      if (existingMapping) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Subject is already mapped to this student",
        });
      }

      // Create the mapping
      const mapping = await ctx.db.studentSubject.create({
        data: {
          studentId,
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
        },
      });

      return mapping;
    }),

  // Delete a student subject mapping
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if mapping exists
      const mapping = await ctx.db.studentSubject.findUnique({
        where: { id: input.id },
      });

      if (!mapping) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student subject mapping not found",
        });
      }

      // Delete the mapping
      await ctx.db.studentSubject.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Bulk assign subjects to a student (replaces all existing mappings)
  bulkAssign: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        subjectIds: z.array(z.string()),
      })
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

      // Remove all existing mappings for this student
      await ctx.db.studentSubject.deleteMany({
        where: { studentId },
      });

      // Create new mappings
      if (subjectIds.length > 0) {
        await ctx.db.studentSubject.createMany({
          data: subjectIds.map((subjectId) => ({
            studentId,
            subjectId,
          })),
        });
      }

      return { success: true };
    }),

  // Get subject mapping statistics for a class/section
  getClassStats: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        sessionId: z.string().optional(),
        classId: z.string(),
        sectionId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const students = await ctx.db.student.findMany({
        where: {
          ...(input.branchId ? { branchId: input.branchId } : {}),
          isActive: true,
          ...(input.sectionId 
            ? { sectionId: input.sectionId }
            : { section: { classId: input.classId } }
          ),
        },
        include: {
          _count: {
            select: {
              StudentSubject: true,
            },
          },
        },
      });

      const totalStudents = students.length;
      const studentsWithMappings = students.filter(s => s._count.StudentSubject > 0).length;
      const studentsWithoutMappings = totalStudents - studentsWithMappings;
      const totalMappings = students.reduce((sum, s) => sum + s._count.StudentSubject, 0);
      const averageSubjectsPerStudent = totalStudents > 0 ? totalMappings / totalStudents : 0;

      return {
        totalStudents,
        studentsWithMappings,
        studentsWithoutMappings,
        totalMappings,
        averageSubjectsPerStudent,
      };
    }),

  // Update optional subject for a student
  updateOptionalSubject: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        optionalSubjectId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { studentId, optionalSubjectId } = input;

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

      // Remove any existing optional subject mappings for this student
      await ctx.db.studentSubject.deleteMany({
        where: {
          studentId,
          subject: {
            isOptional: true,
          },
        },
      });

      // If a new optional subject is selected, create the mapping
      if (optionalSubjectId) {
        // Check if subject exists and is optional
        const subject = await ctx.db.subject.findUnique({
          where: { id: optionalSubjectId },
        });

        if (!subject) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subject not found",
          });
        }

        if (!subject.isOptional) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Subject must be optional",
          });
        }

        // Create the new mapping
        await ctx.db.studentSubject.create({
          data: {
            studentId,
            subjectId: optionalSubjectId,
          },
        });
      }

      return { success: true };
    }),
}); 