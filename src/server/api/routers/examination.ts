import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

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

export const examinationRouter = createTRPCRouter({
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