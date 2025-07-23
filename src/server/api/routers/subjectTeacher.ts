import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

// Schema for creating subject teacher assignments
const subjectTeacherSchema = z.object({
  teacherId: z.string().min(1, "Teacher is required"),
  subjectId: z.string().min(1, "Subject is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().min(1, "Section is required"),
  isActive: z.boolean().default(true),
});

// Schema for getting all assignments (allows null sectionId for backward compatibility)
const getAllSchema = z.object({
  branchId: z.string().optional(),
  teacherId: z.string().optional(),
  subjectId: z.string().optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  includeTeacher: z.boolean().optional().default(true),
  includeSubject: z.boolean().optional().default(true),
  includeClass: z.boolean().optional().default(true),
  includeSection: z.boolean().optional().default(true),
  onlyWithSections: z.boolean().optional().default(false), // New flag to filter only assignments with sections
}).optional();

export const subjectTeacherRouter = createTRPCRouter({
  // Get all subject teacher assignments
  getAll: publicProcedure
    .input(getAllSchema)
    .query(async ({ ctx, input }) => {
      const where: Prisma.SubjectTeacherWhereInput = {
        branchId: input?.branchId,
        teacherId: input?.teacherId,
        subjectId: input?.subjectId,
        classId: input?.classId,
        sectionId: input?.sectionId,
        isActive: input?.isActive,
      };

      // Filter to only include assignments with sections if requested
      if (input?.onlyWithSections) {
        where.sectionId = { not: null };
      }

      // Add search filter if provided
      if (input?.search) {
        where.OR = [
          { teacher: { firstName: { contains: input.search, mode: 'insensitive' } } },
          { teacher: { lastName: { contains: input.search, mode: 'insensitive' } } },
          { subject: { name: { contains: input.search, mode: 'insensitive' } } },
          { class: { name: { contains: input.search, mode: 'insensitive' } } },
          { section: { name: { contains: input.search, mode: 'insensitive' } } },
        ];
      }

      const assignments = await ctx.db.subjectTeacher.findMany({
        where,
        orderBy: [
          { class: { displayOrder: "asc" } },
          { class: { name: "asc" } },
          { section: { displayOrder: "asc" } },
          { section: { name: "asc" } },
          { subject: { name: "asc" } },
          { teacher: { lastName: "asc" } },
        ],
        include: {
          teacher: input?.includeTeacher,
          subject: input?.includeSubject,
          class: input?.includeClass,
          section: input?.includeSection,
        },
      });

      return assignments;
    }),

  // Get assignments for a specific teacher
  getByTeacherId: publicProcedure
    .input(z.object({ teacherId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.subjectTeacher.findMany({
        where: {
          teacherId: input.teacherId,
          isActive: true,
        },
        orderBy: [
          { class: { displayOrder: "asc" } },
          { class: { name: "asc" } },
          { section: { displayOrder: "asc" } },
          { section: { name: "asc" } },
          { subject: { name: "asc" } },
        ],
        include: {
          subject: true,
          class: true,
          section: true,
        },
      });

      return assignments;
    }),

  // Get assignments for a specific class-section-subject combination
  getByClassSubject: publicProcedure
    .input(z.object({
      classId: z.string(),
      subjectId: z.string(),
      sectionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.db.subjectTeacher.findMany({
        where: {
          classId: input.classId,
          subjectId: input.subjectId,
          sectionId: input.sectionId,
          isActive: true,
        },
        include: {
          teacher: true,
          subject: true,
          class: true,
          section: true,
        },
      });

      return assignments;
    }),

  // Create a new subject teacher assignment
  create: protectedProcedure
    .input(subjectTeacherSchema.extend({ branchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Validate teacher exists and is from the same branch
      const teacher = await ctx.db.teacher.findUnique({
        where: { id: input.teacherId },
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      if (teacher.branchId !== input.branchId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Teacher must be from the same branch",
        });
      }

      // Validate subject exists
      const subject = await ctx.db.subject.findUnique({
        where: { id: input.subjectId },
      });

      if (!subject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject not found",
        });
      }

      // Validate class exists and is from the same branch
      const classEntity = await ctx.db.class.findUnique({
        where: { id: input.classId },
      });

      if (!classEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      if (classEntity.branchId !== input.branchId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Class must be from the same branch",
        });
      }

      // Validate section (now required)
      const section = await ctx.db.section.findUnique({
        where: { id: input.sectionId },
        include: { class: true },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      if (section.classId !== input.classId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Section must belong to the specified class",
        });
      }

      // Check for existing assignment (uniqueness)
      const existingAssignment = await ctx.db.subjectTeacher.findFirst({
        where: {
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          classId: input.classId,
          sectionId: input.sectionId,
        },
      });

      if (existingAssignment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This teacher is already assigned to teach this subject for the specified class/section",
        });
      }

      // Create the assignment
      return ctx.db.subjectTeacher.create({
        data: input,
        include: {
          teacher: true,
          subject: true,
          class: true,
          section: true,
        },
      });
    }),

  // Update a subject teacher assignment
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        teacherId: z.string().optional(),
        subjectId: z.string().optional(),
        classId: z.string().optional(),
        sectionId: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if assignment exists
      const assignment = await ctx.db.subjectTeacher.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject teacher assignment not found",
        });
      }

      // Validate updates similar to create
      if (data.teacherId) {
        const teacher = await ctx.db.teacher.findUnique({
          where: { id: data.teacherId },
        });

        if (!teacher || teacher.branchId !== assignment.class.branchId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Teacher must be from the same branch as the class",
          });
        }
      }

      // Update the assignment
      return ctx.db.subjectTeacher.update({
        where: { id },
        data,
        include: {
          teacher: true,
          subject: true,
          class: true,
          section: true,
        },
      });
    }),

  // Delete a subject teacher assignment
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if assignment exists
      const assignment = await ctx.db.subjectTeacher.findUnique({
        where: { id: input.id },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject teacher assignment not found",
        });
      }

      // Delete the assignment
      return ctx.db.subjectTeacher.delete({
        where: { id: input.id },
      });
    }),

  // Bulk assign a teacher to multiple class-section-subject combinations
  bulkAssign: protectedProcedure
    .input(
      z.object({
        teacherId: z.string(),
        assignments: z.array(
          z.object({
            subjectId: z.string(),
            classId: z.string(),
            sectionId: z.string().min(1, "Section is required"),
          })
        ),
        branchId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate teacher
      const teacher = await ctx.db.teacher.findUnique({
        where: { id: input.teacherId },
      });

      if (!teacher || teacher.branchId !== input.branchId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid teacher or branch mismatch",
        });
      }

      // Create all assignments
      const createdAssignments = await Promise.all(
        input.assignments.map(async (assignment) => {
          // Check for existing assignment
          const existing = await ctx.db.subjectTeacher.findFirst({
            where: {
              teacherId: input.teacherId,
              subjectId: assignment.subjectId,
              classId: assignment.classId,
              sectionId: assignment.sectionId,
            },
          });

          if (existing) {
            return existing; // Skip if already exists
          }

          return ctx.db.subjectTeacher.create({
            data: {
              teacherId: input.teacherId,
              subjectId: assignment.subjectId,
              classId: assignment.classId,
              sectionId: assignment.sectionId,
              branchId: input.branchId,
            },
            include: {
              teacher: true,
              subject: true,
              class: true,
              section: true,
            },
          });
        })
      );

      return createdAssignments;
    }),

  // Get statistics for subject teacher assignments
  getStats: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where = {
        branchId: input?.branchId,
      };

      const [
        totalAssignments,
        activeAssignments,
        uniqueTeachers,
        uniqueSubjects,
        uniqueClasses,
      ] = await Promise.all([
        ctx.db.subjectTeacher.count({ where }),
        ctx.db.subjectTeacher.count({ where: { ...where, isActive: true } }),
        ctx.db.subjectTeacher.findMany({
          where,
          select: { teacherId: true },
          distinct: ['teacherId'],
        }),
        ctx.db.subjectTeacher.findMany({
          where,
          select: { subjectId: true },
          distinct: ['subjectId'],
        }),
        ctx.db.subjectTeacher.findMany({
          where,
          select: { classId: true },
          distinct: ['classId'],
        }),
      ]);

      return {
        totalAssignments,
        activeAssignments,
        inactiveAssignments: totalAssignments - activeAssignments,
        uniqueTeachers: uniqueTeachers.length,
        uniqueSubjects: uniqueSubjects.length,
        uniqueClasses: uniqueClasses.length,
      };
    }),
}); 