import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Input schema for creating a new attendance location
const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().int().min(10, "Radius must be at least 10 meters").max(1000, "Radius must be at most 1000 meters"),
  branchId: z.string(),
  isActive: z.boolean().default(true),
  locationTypeId: z.string().optional(),
});

// Input schema for updating an attendance location
const updateLocationSchema = createLocationSchema.partial().extend({
  id: z.string(),
});

// Create a new schema for LocationType
const createLocationTypeSchema = z.object({
  name: z.string().min(1, "Location type name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  branchId: z.string(),
});

// Update schema for LocationType
const updateLocationTypeSchema = createLocationTypeSchema.partial().extend({
  id: z.string(),
});

export const attendanceLocationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createLocationSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Creating location with input:", input);
      try {
        const result = await ctx.db.attendanceLocation.create({
          data: {
            name: input.name,
            latitude: input.latitude,
            longitude: input.longitude,
            radius: input.radius,
            isActive: input.isActive,
            branchId: input.branchId,
            locationTypeId: input.locationTypeId,
          },
        });
        console.log("Location created successfully:", result);
        return result;
      } catch (error) {
        console.error("Error creating location:", error);
        throw error;
      }
    }),

  update: protectedProcedure
    .input(updateLocationSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Updating location with input:", input);
      const { id, ...data } = input;
      try {
        const result = await ctx.db.attendanceLocation.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
            ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
            ...(data.radius !== undefined ? { radius: data.radius } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            ...(data.branchId ? { branchId: data.branchId } : {}),
            ...(data.locationTypeId !== undefined ? { locationTypeId: data.locationTypeId } : {}),
          },
        });
        console.log("Location updated successfully:", result);
        return result;
      } catch (error) {
        console.error("Error updating location:", error);
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any attendance records using this location
      const attendanceCount = await ctx.db.staffAttendance.count({
        where: { locationId: input.id },
      });

      if (attendanceCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this location because it has ${attendanceCount} attendance records. Please consider setting it to inactive instead.`,
        });
      }

      return ctx.db.attendanceLocation.delete({
        where: { id: input.id },
      });
    }),

  toggleStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.attendanceLocation.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  getAll: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      includeInactive: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const { branchId, includeInactive } = input;

      const whereClause = {
        ...(branchId ? { branchId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      };

      return ctx.db.attendanceLocation.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        include: {
          locationType: true,
          _count: {
            select: {
              devices: true
            }
          }
        }
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const location = await ctx.db.attendanceLocation.findUnique({
        where: { id: input.id },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      return location;
    }),

  // LocationType endpoints
  createLocationType: protectedProcedure
    .input(createLocationTypeSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // If this is set as default, unset all other defaults for this branch
        if (input.isDefault) {
          await ctx.db.locationType.updateMany({
            where: { 
              branchId: input.branchId,
              isDefault: true
            },
            data: { isDefault: false }
          });
        }

        const result = await ctx.db.locationType.create({
          data: input
        });
        return result;
      } catch (error) {
        console.error("Error creating location type:", error);
        throw error;
      }
    }),

  updateLocationType: protectedProcedure
    .input(updateLocationTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // If being set as default, unset all other defaults for this branch
      if (data.isDefault) {
        await ctx.db.locationType.updateMany({
          where: { 
            branchId: data.branchId || "",
            isDefault: true,
            id: { not: id }
          },
          data: { isDefault: false }
        });
      }

      return ctx.db.locationType.update({
        where: { id },
        data
      });
    }),

  deleteLocationType: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any locations using this type
      const locationCount = await ctx.db.attendanceLocation.count({
        where: { locationTypeId: input.id }
      });

      // Check if there are any attendance windows using this type
      const windowCount = await ctx.db.attendanceWindow.count({
        where: { locationTypeId: input.id }
      });

      if (locationCount > 0 || windowCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete this location type because it is in use by ${locationCount} locations and ${windowCount} attendance windows.`
        });
      }

      return ctx.db.locationType.delete({
        where: { id: input.id }
      });
    }),

  getLocationTypes: publicProcedure
    .input(z.object({
      branchId: z.string().optional(),
      includeInactive: z.boolean().optional().default(false)
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.locationType.findMany({
        where: {
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.includeInactive ? {} : { isActive: true })
        },
        include: {
          _count: {
            select: {
              locations: true,
              attendanceWindows: true
            }
          }
        },
        orderBy: { name: "asc" }
      });
    }),

  getLocationTypeById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const locationType = await ctx.db.locationType.findUnique({
        where: { id: input.id }
      });

      if (!locationType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location type not found"
        });
      }

      return locationType;
    }),
}); 