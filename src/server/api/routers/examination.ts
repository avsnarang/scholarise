import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";

// Input schemas for validation
const gradeScaleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const gradeRangeSchema = z.object({
  gradeScaleId: z.string().min(1, "Grade scale is required"),
  grade: z.string().min(1, "Grade is required"),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  description: z.string().optional(),
  gradePoint: z.number().optional(),
  order: z.number().default(0),
});

const assessmentMarksSchema = z.object({
  assessmentConfigId: z.string().min(1, "Assessment config ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  marksObtained: z.number().min(0).optional(),
  comments: z.string().optional(),
  branchId: z.string().min(1, "Branch ID is required"),
});

export const examinationRouter = createTRPCRouter({
  // ============ ASSESSMENT MARKS ============
  createAssessmentMarks: protectedProcedure
    .input(assessmentMarksSchema)
    .mutation(async ({ ctx, input }) => {
      const { assessmentConfigId, studentId, marksObtained, comments, branchId } = input;

      // Check if assessment configuration exists
      const assessmentConfig = await ctx.db.assessmentConfiguration.findUnique({
        where: { id: assessmentConfigId },
      });

      if (!assessmentConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment configuration not found",
        });
      }

      // Validate marks don't exceed maximum
      if (marksObtained !== undefined && marksObtained > assessmentConfig.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Marks ${marksObtained} exceed maximum allowed ${assessmentConfig.maxMarks}`,
        });
      }

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

      // Create or update assessment marks
      const existingMarks = await ctx.db.assessmentMarks.findUnique({
        where: {
          assessmentConfigId_studentId: {
            assessmentConfigId,
            studentId,
          },
        },
      });

      let assessmentMarks;

      if (existingMarks) {
        // Update existing marks
        assessmentMarks = await ctx.db.assessmentMarks.update({
          where: { id: existingMarks.id },
          data: {
            marksObtained,
            comments,
            enteredBy: ctx.userId,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new marks record
        assessmentMarks = await ctx.db.assessmentMarks.create({
          data: {
            id: createId(),
            assessmentConfigId,
            studentId,
            marksObtained,
            comments,
            enteredBy: ctx.userId,
            branchId,
            updatedAt: new Date(),
          },
        });
      }

      return assessmentMarks;
    }),

  getAssessmentMarks: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      assessmentConfigId: z.string(),
      studentId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { branchId, assessmentConfigId, studentId } = input;

      const marks = await ctx.db.assessmentMarks.findMany({
        where: {
          branchId,
          assessmentConfigId,
          ...(studentId && { studentId }),
        },
        include: {
          Student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rollNumber: true,
              admissionNumber: true,
            },
          },
          AssessmentConfiguration: {
            select: {
              id: true,
              name: true,
              maxMarks: true,
            },
          },
        },
        orderBy: [
          { Student: { rollNumber: 'asc' } },
          { Student: { firstName: 'asc' } },
        ],
      });

      return marks;
    }),

  updateAssessmentMarks: protectedProcedure
    .input(z.object({
      id: z.string(),
      marksObtained: z.number().min(0).optional(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, marksObtained, comments } = input;

      // Get the existing record to validate marks
      const existingMarks = await ctx.db.assessmentMarks.findUnique({
        where: { id },
        include: {
          AssessmentConfiguration: true,
        },
      });

      if (!existingMarks) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment marks not found",
        });
      }

      // Validate marks don't exceed maximum
      if (marksObtained !== undefined && marksObtained > existingMarks.AssessmentConfiguration.maxMarks) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Marks ${marksObtained} exceed maximum allowed ${existingMarks.AssessmentConfiguration.maxMarks}`,
        });
      }

             return ctx.db.assessmentMarks.update({
         where: { id },
         data: {
           marksObtained,
           comments,
           enteredBy: ctx.userId,
           updatedAt: new Date(),
         },
       });
    }),

  deleteAssessmentMarks: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentMarks.delete({
        where: { id: input.id },
      });
    }),

  // ============ GRADE SCALES ============
  createGradeScale: protectedProcedure
    .input(gradeScaleSchema.extend({
      branchId: z.string().min(1, "Branch ID is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { branchId, ...data } = input;

      // If this is set as default, unset other defaults
      if (data.isDefault) {
        await ctx.db.gradeScale.updateMany({
          where: {
            branchId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return ctx.db.gradeScale.create({
        data: {
          ...data,
          branchId,
        },
      });
    }),

  getGradeScales: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const branchId = input?.branchId;
      if (!branchId) {
        return [];
      }

      return ctx.db.gradeScale.findMany({
        where: {
          branchId,
          isActive: input?.isActive,
        },
        include: {
          gradeRanges: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: [
          { isDefault: "desc" },
          { name: "asc" },
        ],
      });
    }),

  updateGradeScale: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: gradeScaleSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If this is being set as default, unset other defaults
      if (input.data.isDefault) {
        const gradeScale = await ctx.db.gradeScale.findUnique({
          where: { id: input.id },
        });

        if (gradeScale) {
          await ctx.db.gradeScale.updateMany({
            where: {
              branchId: gradeScale.branchId,
              isDefault: true,
              id: { not: input.id },
            },
            data: {
              isDefault: false,
            },
          });
        }
      }

      return ctx.db.gradeScale.update({
        where: { id: input.id },
        data: input.data,
        include: {
          gradeRanges: {
            orderBy: { order: "asc" },
          },
        },
      });
    }),

  deleteGradeScale: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeScale.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ============ GRADE RANGES ============
  createGradeRange: protectedProcedure
    .input(gradeRangeSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate percentage range
      if (input.minPercentage >= input.maxPercentage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum percentage must be less than maximum percentage",
        });
      }

      return ctx.db.gradeRange.create({
        data: input,
      });
    }),

  getGradeRanges: protectedProcedure
    .input(z.object({
      gradeScaleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.gradeRange.findMany({
        where: {
          gradeScaleId: input.gradeScaleId,
        },
        orderBy: { order: "asc" },
      });
    }),

  updateGradeRange: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: gradeRangeSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeRange.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteGradeRange: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeRange.delete({
        where: { id: input.id },
      });
    }),
}); 