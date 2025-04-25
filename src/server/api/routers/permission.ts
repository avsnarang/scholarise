import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const permissionRouter = createTRPCRouter({
  getForResource: protectedProcedure
    .input(
      z.object({
        resourceType: z.string(),
        resourceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // In a real application, we would have a more sophisticated way to map
      // resourceType and resourceId to the actual permissions in the database
      // For now, we'll assume resourceType is "page" and resourceId is the page ID

      if (input.resourceType !== "page") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported resource type",
        });
      }

      // Get all permissions for this page
      const page = await ctx.db.page.findUnique({
        where: { id: input.resourceId },
        include: {
          permissions: {
            include: {
              userPermissions: {
                include: {
                  user: true,
                },
              },
              rolePermissions: {
                include: {
                  role: true,
                },
              },
              groupPermissions: {
                include: {
                  group: true,
                },
              },
            },
          },
        },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      // Transform the data to a more usable format
      const permissions = [];

      // Add user permissions
      for (const permission of page.permissions) {
        for (const userPermission of permission.userPermissions) {
          permissions.push({
            id: userPermission.id,
            targetType: "user",
            targetId: userPermission.user.id,
            targetName: userPermission.user.name || userPermission.user.email || "Unknown User",
            canView: permission.canView,
            canCreate: permission.canCreate,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
          });
        }

        // Add role permissions
        for (const rolePermission of permission.rolePermissions) {
          permissions.push({
            id: rolePermission.id,
            targetType: "role",
            targetId: rolePermission.role.id,
            targetName: rolePermission.role.name,
            canView: permission.canView,
            canCreate: permission.canCreate,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
          });
        }

        // Add group permissions
        for (const groupPermission of permission.groupPermissions) {
          permissions.push({
            id: groupPermission.id,
            targetType: "group",
            targetId: groupPermission.group.id,
            targetName: groupPermission.group.name,
            canView: permission.canView,
            canCreate: permission.canCreate,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
          });
        }
      }

      return permissions;
    }),

  addPermission: protectedProcedure
    .input(
      z.object({
        resourceType: z.string(),
        resourceId: z.string(),
        targetType: z.enum(["user", "role", "group"]),
        targetId: z.string(),
        canView: z.boolean().default(true),
        canCreate: z.boolean().default(false),
        canEdit: z.boolean().default(false),
        canDelete: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In a real application, we would have a more sophisticated way to map
      // resourceType and resourceId to the actual permissions in the database
      // For now, we'll assume resourceType is "page" and resourceId is the page ID

      if (input.resourceType !== "page") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported resource type",
        });
      }

      // Check if the page exists
      const page = await ctx.db.page.findUnique({
        where: { id: input.resourceId },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      // Create or update the permission
      const permission = await ctx.db.permission.create({
        data: {
          pageId: input.resourceId,
          canView: input.canView,
          canCreate: input.canCreate,
          canEdit: input.canEdit,
          canDelete: input.canDelete,
        },
      });

      // Link the permission to the target (user, role, or group)
      if (input.targetType === "user") {
        await ctx.db.userPermission.create({
          data: {
            userId: input.targetId,
            permissionId: permission.id,
          },
        });
      } else if (input.targetType === "role") {
        await ctx.db.rolePermission.create({
          data: {
            roleId: input.targetId,
            permissionId: permission.id,
          },
        });
      } else if (input.targetType === "group") {
        await ctx.db.groupPermission.create({
          data: {
            groupId: input.targetId,
            permissionId: permission.id,
          },
        });
      }

      return permission;
    }),

  removePermission: protectedProcedure
    .input(
      z.object({
        permissionId: z.string(),
        targetType: z.enum(["user", "role", "group"]),
        targetId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Remove the link between the permission and the target
      if (input.targetType === "user") {
        await ctx.db.userPermission.delete({
          where: {
            userId_permissionId: {
              userId: input.targetId,
              permissionId: input.permissionId,
            },
          },
        });
      } else if (input.targetType === "role") {
        await ctx.db.rolePermission.delete({
          where: {
            roleId_permissionId: {
              roleId: input.targetId,
              permissionId: input.permissionId,
            },
          },
        });
      } else if (input.targetType === "group") {
        await ctx.db.groupPermission.delete({
          where: {
            groupId_permissionId: {
              groupId: input.targetId,
              permissionId: input.permissionId,
            },
          },
        });
      }

      // Check if the permission is still linked to any targets
      const userPermissions = await ctx.db.userPermission.findMany({
        where: { permissionId: input.permissionId },
      });
      const rolePermissions = await ctx.db.rolePermission.findMany({
        where: { permissionId: input.permissionId },
      });
      const groupPermissions = await ctx.db.groupPermission.findMany({
        where: { permissionId: input.permissionId },
      });

      // If the permission is not linked to any targets, delete it
      if (
        userPermissions.length === 0 &&
        rolePermissions.length === 0 &&
        groupPermissions.length === 0
      ) {
        await ctx.db.permission.delete({
          where: { id: input.permissionId },
        });
      }

      return { success: true };
    }),

  checkPermission: protectedProcedure
    .input(
      z.object({
        resourceType: z.string(),
        resourceId: z.string(),
        action: z.enum(["view", "create", "edit", "delete"]),
      })
    )
    .query(async ({ ctx, input }) => {
      // In a real application, we would have a more sophisticated way to check permissions
      // For now, we'll implement a simple check

      if (!ctx.userId) {
        return { hasPermission: false };
      }

      const userId = ctx.userId;

      // Get user's roles
      const userRoles = await ctx.db.userRole.findMany({
        where: { userId },
        include: { role: true },
      });

      // Get user's groups
      const userGroups = await ctx.db.userGroup.findMany({
        where: { userId },
        include: { group: true },
      });

      // Check if the user is a SuperAdmin (has system role with name "SuperAdmin")
      const isSuperAdmin = userRoles.some(
        (ur) => ur.role.isSystem && ur.role.name === "SuperAdmin"
      );

      if (isSuperAdmin) {
        return { hasPermission: true };
      }

      // For simplicity, we'll assume resourceType is "page" and resourceId is the page ID
      if (input.resourceType !== "page") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported resource type",
        });
      }

      // Get all permissions for this page
      const page = await ctx.db.page.findUnique({
        where: { id: input.resourceId },
        include: {
          permissions: {
            include: {
              userPermissions: true,
              rolePermissions: true,
              groupPermissions: true,
            },
          },
        },
      });

      if (!page) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Page not found",
        });
      }

      // Check user's direct permissions
      for (const permission of page.permissions) {
        const hasUserPermission = permission.userPermissions.some(
          (up) => up.userId === userId
        );

        if (hasUserPermission) {
          if (
            (input.action === "view" && permission.canView) ||
            (input.action === "create" && permission.canCreate) ||
            (input.action === "edit" && permission.canEdit) ||
            (input.action === "delete" && permission.canDelete)
          ) {
            return { hasPermission: true };
          }
        }

        // Check user's role permissions
        const userRoleIds = userRoles.map((ur) => ur.roleId);
        const hasRolePermission = permission.rolePermissions.some((rp) =>
          userRoleIds.includes(rp.roleId)
        );

        if (hasRolePermission) {
          if (
            (input.action === "view" && permission.canView) ||
            (input.action === "create" && permission.canCreate) ||
            (input.action === "edit" && permission.canEdit) ||
            (input.action === "delete" && permission.canDelete)
          ) {
            return { hasPermission: true };
          }
        }

        // Check user's group permissions
        const userGroupIds = userGroups.map((ug) => ug.groupId);
        const hasGroupPermission = permission.groupPermissions.some((gp) =>
          userGroupIds.includes(gp.groupId)
        );

        if (hasGroupPermission) {
          if (
            (input.action === "view" && permission.canView) ||
            (input.action === "create" && permission.canCreate) ||
            (input.action === "edit" && permission.canEdit) ||
            (input.action === "delete" && permission.canDelete)
          ) {
            return { hasPermission: true };
          }
        }
      }

      return { hasPermission: false };
    }),
});
