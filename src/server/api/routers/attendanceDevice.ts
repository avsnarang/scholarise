import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Input schema for creating a new attendance device
const createDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  locationId: z.string().optional(),
  isActive: z.boolean().default(true),
  branchId: z.string(),
});

// Input schema for updating an attendance device
const updateDeviceSchema = createDeviceSchema.partial().extend({
  id: z.string(),
});

export const attendanceDeviceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createDeviceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.attendanceDevice.create({
          data: {
            name: input.name,
            deviceId: input.deviceId,
            locationId: input.locationId,
            isActive: input.isActive,
            branchId: input.branchId,
          },
        });
      } catch (error) {
        console.error("Error creating device:", error);
        throw error;
      }
    }),

  update: protectedProcedure
    .input(updateDeviceSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      try {
        return await ctx.db.attendanceDevice.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.deviceId !== undefined ? { deviceId: data.deviceId } : {}),
            ...(data.locationId !== undefined ? { locationId: data.locationId } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            ...(data.branchId ? { branchId: data.branchId } : {}),
          },
        });
      } catch (error) {
        console.error("Error updating device:", error);
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.attendanceDevice.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete device. It may be in use or no longer exists."
        });
      }
    }),

  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.attendanceDevice.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  getAll: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      locationId: z.string().optional(),
      includeInactive: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const { branchId, locationId, includeInactive } = input;

      const whereClause = {
        ...(branchId ? { branchId } : {}),
        ...(locationId ? { locationId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      };

      return ctx.db.attendanceDevice.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        include: {
          location: true,
        }
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const device = await ctx.db.attendanceDevice.findUnique({
        where: { id: input.id },
        include: {
          location: true,
        }
      });

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found",
        });
      }

      return device;
    }),
}); 