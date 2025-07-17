import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const permissionRouter = createTRPCRouter({
  // Get all permissions
  getAll: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        includeSystem: z.boolean().default(true),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.category) {
        whereConditions.category = input.category;
      }
      
      if (!input.includeSystem) {
        whereConditions.isSystem = false;
      }
      
      if (!input.includeInactive) {
        whereConditions.isActive = true;
      }

      return ctx.db.permission.findMany({
        where: whereConditions,
        include: {
          rolePermissions: {
            include: {
              role: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [
          { category: "asc" },
          { name: "asc" },
        ],
      });
    }),

  // Get permission by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const permission = await ctx.db.permission.findUnique({
        where: { id: input.id },
        include: {
          rolePermissions: {
            include: {
              role: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      return permission;
    }),

  // Get permissions by category
  getByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.permission.findMany({
        where: {
          category: input.category,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  // Get all categories
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.permission.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: {
        category: true,
      },
      orderBy: {
        category: "asc",
      },
    });

    return result.map((item) => ({
      name: item.category,
      count: item._count.category,
    }));
  }),

  // Create new permission
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Permission name is required"),
        description: z.string().optional(),
        category: z.string().min(1, "Category is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if permission name already exists
      const existingPermission = await ctx.db.permission.findUnique({
        where: { name: input.name },
      });

      if (existingPermission) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Permission with this name already exists",
        });
      }

      return ctx.db.permission.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          isSystem: false,
        },
      });
    }),

  // Update permission
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Permission name is required").optional(),
        description: z.string().optional(),
        category: z.string().min(1, "Category is required").optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if permission exists and is not a system permission
      const existingPermission = await ctx.db.permission.findUnique({
        where: { id },
      });

      if (!existingPermission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      if (existingPermission.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify system permissions",
        });
      }

      // Check if new name conflicts with existing permissions
      if (updateData.name && updateData.name !== existingPermission.name) {
        const nameConflict = await ctx.db.permission.findUnique({
          where: { name: updateData.name },
        });

        if (nameConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Permission with this name already exists",
          });
        }
      }

      return ctx.db.permission.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete permission
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if permission exists and is not a system permission
      const existingPermission = await ctx.db.permission.findUnique({
        where: { id: input.id },
        include: {
          rolePermissions: true,
        },
      });

      if (!existingPermission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      if (existingPermission.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system permissions",
        });
      }

      if (existingPermission.rolePermissions.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete permission that is assigned to roles",
        });
      }

      // Delete permission
      return ctx.db.permission.delete({
        where: { id: input.id },
      });
    }),

  // Get permissions for a specific role
  getByRole: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rolePermissions = await ctx.db.rolePermission.findMany({
        where: { roleId: input.roleId },
        include: {
          permission: true,
        },
      });

      return rolePermissions.map((rp) => rp.permission);
    }),

  // Bulk create permissions
  bulkCreate: protectedProcedure
    .input(
      z.object({
        permissions: z.array(
          z.object({
            name: z.string().min(1, "Permission name is required"),
            description: z.string().optional(),
            category: z.string().min(1, "Category is required"),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate names within the input
      const names = input.permissions.map((p) => p.name);
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate permission names in input",
        });
      }

      // Check for existing permissions
      const existingPermissions = await ctx.db.permission.findMany({
        where: {
          name: { in: names },
        },
      });

      if (existingPermissions.length > 0) {
        const existingNames = existingPermissions.map((p) => p.name);
        throw new TRPCError({
          code: "CONFLICT",
          message: `Permissions already exist: ${existingNames.join(", ")}`,
        });
      }

      // Create permissions
      return ctx.db.permission.createMany({
        data: input.permissions.map((permission) => ({
          ...permission,
          isSystem: false,
        })),
      });
    }),
}); 