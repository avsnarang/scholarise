import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userPreferencesRouter = createTRPCRouter({
  // Get user preferences for a specific module
  getPreferences: protectedProcedure
    .input(z.object({
      module: z.string().min(1, "Module is required"),
    }))
    .query(async ({ ctx, input }) => {
      const { module } = input;
      const userId = ctx.userId;

      const preferences = await ctx.db.userPreferences.findUnique({
        where: {
          userId_module: {
            userId,
            module,
          },
        },
      });

      return preferences?.preferences || null;
    }),

  // Save or update user preferences for a specific module
  savePreferences: protectedProcedure
    .input(z.object({
      module: z.string().min(1, "Module is required"),
      preferences: z.any(), // JSON data for preferences
    }))
    .mutation(async ({ ctx, input }) => {
      const { module, preferences } = input;
      const userId = ctx.userId;

      const result = await ctx.db.userPreferences.upsert({
        where: {
          userId_module: {
            userId,
            module,
          },
        },
        update: {
          preferences,
          updatedAt: new Date(),
        },
        create: {
          userId,
          module,
          preferences,
        },
      });

      return result;
    }),

  // Delete user preferences for a specific module
  deletePreferences: protectedProcedure
    .input(z.object({
      module: z.string().min(1, "Module is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { module } = input;
      const userId = ctx.userId;

      await ctx.db.userPreferences.delete({
        where: {
          userId_module: {
            userId,
            module,
          },
        },
      });

      return { success: true };
    }),

  // Get all user preferences
  getAllPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.userId;

      const preferences = await ctx.db.userPreferences.findMany({
        where: {
          userId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return preferences;
    }),
});