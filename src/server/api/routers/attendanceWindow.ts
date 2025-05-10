import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Input schema for creating a new attendance window
const createWindowSchema = z.object({
  name: z.string().min(1, "Window name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isMon: z.boolean().default(true),
  isTue: z.boolean().default(true),
  isWed: z.boolean().default(true),
  isThu: z.boolean().default(true),
  isFri: z.boolean().default(true),
  isSat: z.boolean().default(false),
  isSun: z.boolean().default(false),
  allowLateMarking: z.boolean().default(false),
  lateMarkingGracePeriod: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  branchId: z.string(),
  locationTypeId: z.string(),
});

// Input schema for updating an attendance window
const updateWindowSchema = createWindowSchema.partial().extend({
  id: z.string(),
});

export const attendanceWindowRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createWindowSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.attendanceWindow.create({
          data: input,
        });
      } catch (error) {
        console.error("Error creating attendance window:", error);
        throw error;
      }
    }),

  update: protectedProcedure
    .input(updateWindowSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      console.log("Server received update request for window ID:", id);
      console.log("Update data:", data);
      
      try {
        // First check if the window exists
        const existingWindow = await ctx.db.attendanceWindow.findUnique({
          where: { id },
        });
        
        if (!existingWindow) {
          console.error("Window not found with ID:", id);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Attendance window not found",
          });
        }
        
        console.log("Found existing window:", existingWindow);
        
        // Proceed with update
        const result = await ctx.db.attendanceWindow.update({
          where: { id },
          data,
        });
        
        console.log("Update successful, updated window:", result);
        return result;
      } catch (error) {
        console.error("Error updating attendance window:", error);
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.attendanceWindow.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete attendance window. It may no longer exist."
        });
      }
    }),

  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.attendanceWindow.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  getAll: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      locationTypeId: z.string().optional(),
      includeInactive: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const { branchId, locationTypeId, includeInactive } = input;

      const whereClause = {
        ...(branchId ? { branchId } : {}),
        ...(locationTypeId ? { locationTypeId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      };

      return ctx.db.attendanceWindow.findMany({
        where: whereClause,
        include: {
          locationType: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const window = await ctx.db.attendanceWindow.findUnique({
        where: { id: input.id },
        include: {
          locationType: true,
        }
      });

      if (!window) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance window not found",
        });
      }

      return window;
    }),
}); 