import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const roleRouter = createTRPCRouter({
  // Get all roles
  getAll: protectedProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        includeSystem: z.boolean().default(true),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.branchId) {
        whereConditions.OR = [
          { branchId: input.branchId },
          { branchId: null }, // Include global roles
        ];
      }
      
      if (!input.includeSystem) {
        whereConditions.isSystem = false;
      }
      
      if (!input.includeInactive) {
        whereConditions.isActive = true;
      }

      const roles = await ctx.db.rbacRole.findMany({
        where: whereConditions,
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          userRoles: {
            where: { isActive: true },
            select: { userId: true },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [
          { isSystem: "desc" },
          { name: "asc" },
        ],
      });

      // Transform the data to include permissions as an array of strings
      return roles.map(role => ({
        ...role,
        permissions: role.rolePermissions.map(rp => rp.permission.name),
      }));
    }),

  // Get role by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const role = await ctx.db.rbacRole.findUnique({
        where: { id: input.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          userRoles: {
            where: { isActive: true },
            select: { userId: true },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Transform the data to include permissions as an array of strings
      return {
        ...role,
        permissions: role.rolePermissions.map(rp => rp.permission.name),
      };
    }),

  // Create new role
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Role name is required"),
        description: z.string().optional(),
        branchId: z.string().optional(),
        permissions: z.array(z.string()).default([]),
        permissionIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if role name already exists
      const existingRole = await ctx.db.rbacRole.findUnique({
        where: { name: input.name },
      });

      if (existingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Role with this name already exists",
        });
      }

      // Use permissions array if provided, otherwise use permissionIds for backward compatibility
      const permissionList = input.permissions.length > 0 ? input.permissions : input.permissionIds;

      // Create role and assign permissions in a transaction
      return ctx.db.$transaction(async (tx) => {
        const role = await tx.rbacRole.create({
          data: {
            name: input.name,
            description: input.description,
            branchId: input.branchId,
            isSystem: false,
          },
        });

        // Assign permissions if provided
        if (permissionList.length > 0) {
          // Get permission IDs by name
          const permissions = await tx.permission.findMany({
            where: {
              name: { in: permissionList },
            },
          });

          if (permissions.length > 0) {
            await tx.rolePermission.createMany({
              data: permissions.map((permission: any) => ({
                roleId: role.id,
                permissionId: permission.id,
              })),
            });
          }
        }

        // Return the created role with permissions in the correct format
        const createdRoleWithPermissions = await tx.rbacRole.findUnique({
          where: { id: role.id },
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        return {
          ...createdRoleWithPermissions,
          permissions: createdRoleWithPermissions?.rolePermissions.map(rp => rp.permission.name) || [],
        };
      });
    }),

  // Update role permissions
  updatePermissions: protectedProcedure
    .input(
      z.object({
        roleId: z.string(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if role exists and is not a system role
      const existingRole = await ctx.db.rbacRole.findUnique({
        where: { id: input.roleId },
      });

      if (!existingRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (existingRole.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify system roles",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        // Remove existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: input.roleId },
        });

        // Add new permissions
        if (input.permissions.length > 0) {
          // Get permission IDs by name
          const permissions = await tx.permission.findMany({
            where: {
              name: { in: input.permissions },
            },
          });

          if (permissions.length > 0) {
            await tx.rolePermission.createMany({
              data: permissions.map((permission: any) => ({
                roleId: input.roleId,
                permissionId: permission.id,
              })),
            });
          }
        }

        // Return updated role with permissions
        const updatedRole = await tx.rbacRole.findUnique({
          where: { id: input.roleId },
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        });

        if (!updatedRole) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found after update",
          });
        }

        // Transform the data to include permissions as an array of strings
        return {
          ...updatedRole,
          permissions: updatedRole.rolePermissions.map(rp => rp.permission.name),
        };
      });
    }),

  // Seed default roles
  seedDefaultRoles: protectedProcedure
    .mutation(async ({ ctx }) => {
      const defaultRoles = [
        {
          name: "Super Admin",
          description: "Full system access with all permissions",
          permissions: [
            "manage_roles",
            "manage_branches",
            "manage_academic_sessions",
            "manage_subjects",
            "manage_classes",
            "manage_students",
            "manage_teachers",
            "manage_employees",
            "view_finance",
            "manage_finance",
            "view_settings",
            "manage_settings",
          ],
        },
        {
          name: "School Admin",
          description: "School-level administration access",
          permissions: [
            "manage_classes",
            "manage_students",
            "manage_teachers",
            "view_finance",
            "manage_finance",
            "view_settings",
          ],
        },
        {
          name: "Teacher",
          description: "Teacher access for classes and students",
          permissions: [
            "view_students",
            "manage_attendance",
            "view_classes",
          ],
        },
        {
          name: "Finance Officer",
          description: "Finance and billing management",
          permissions: [
            "view_students",
            "view_finance",
            "manage_finance",
          ],
        },
      ];

      const createdRoles = [];

      for (const roleData of defaultRoles) {
        // Check if role already exists
        const existingRole = await ctx.db.rbacRole.findUnique({
          where: { name: roleData.name },
        });

        if (!existingRole) {
          const role = await ctx.db.$transaction(async (tx) => {
            const newRole = await tx.rbacRole.create({
              data: {
                name: roleData.name,
                description: roleData.description,
                isSystem: true,
              },
            });

            // Get permission IDs by name
            const permissions = await tx.permission.findMany({
              where: {
                name: { in: roleData.permissions },
              },
            });

            if (permissions.length > 0) {
              await tx.rolePermission.createMany({
                data: permissions.map((permission: any) => ({
                  roleId: newRole.id,
                  permissionId: permission.id,
                })),
              });
            }

            return newRole;
          });

          createdRoles.push(role);
        }
      }

      return {
        message: `Seeded ${createdRoles.length} default roles`,
        createdRoles,
      };
    }),

  // Clear cache (placeholder for Redis or other caching systems)
  clearCache: protectedProcedure
    .mutation(async ({ ctx }) => {
      // In a real implementation, this would clear Redis cache or other caching mechanism
      // For now, we'll just return a success message
      
      // Could also refresh any in-memory caches if implemented
      return {
        message: "RBAC cache cleared successfully",
        timestamp: new Date().toISOString(),
      };
    }),

  // Update role
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Role name is required").optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        permissionIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, permissionIds, ...updateData } = input;

      // Check if role exists and is not a system role
      const existingRole = await ctx.db.rbacRole.findUnique({
        where: { id },
      });

      if (!existingRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (existingRole.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify system roles",
        });
      }

      // Check if new name conflicts with existing roles
      if (updateData.name && updateData.name !== existingRole.name) {
        const nameConflict = await ctx.db.rbacRole.findUnique({
          where: { name: updateData.name },
        });

        if (nameConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Role with this name already exists",
          });
        }
      }

      return ctx.db.$transaction(async (tx) => {
        // Update role
        const updatedRole = await tx.rbacRole.update({
          where: { id },
          data: updateData,
        });

        // Update permissions if provided
        if (permissionIds !== undefined) {
          // Remove existing permissions
          await tx.rolePermission.deleteMany({
            where: { roleId: id },
          });

          // Add new permissions
          if (permissionIds.length > 0) {
            await tx.rolePermission.createMany({
              data: permissionIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
            });
          }
        }

        return updatedRole;
      });
    }),

  // Delete role
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if role exists and is not a system role
      const existingRole = await ctx.db.rbacRole.findUnique({
        where: { id: input.id },
        include: {
          userRoles: {
            where: { isActive: true },
          },
        },
      });

      if (!existingRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (existingRole.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system roles",
        });
      }

      if (existingRole.userRoles.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete role that is assigned to users",
        });
      }

      // Delete role (permissions will be deleted automatically due to cascade)
      return ctx.db.rbacRole.delete({
        where: { id: input.id },
      });
    }),

  // Assign role to user
  assignToUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        branchId: z.string().optional(),
        teacherId: z.string().optional(),
        employeeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if role exists
      const role = await ctx.db.rbacRole.findUnique({
        where: { id: input.roleId },
      });

      if (!role || !role.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found or inactive",
        });
      }

      // Check if assignment already exists
      const existingAssignment = await ctx.db.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: input.userId,
            roleId: input.roleId,
          },
        },
      });

      if (existingAssignment) {
        if (existingAssignment.isActive) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User already has this role",
          });
        } else {
          // Reactivate existing assignment
          return ctx.db.userRole.update({
            where: { id: existingAssignment.id },
            data: {
              isActive: true,
              branchId: input.branchId,
              teacherId: input.teacherId,
              employeeId: input.employeeId,
            },
          });
        }
      }

      // Create new assignment
      return ctx.db.userRole.create({
        data: {
          userId: input.userId,
          roleId: input.roleId,
          branchId: input.branchId,
          teacherId: input.teacherId,
          employeeId: input.employeeId,
        },
      });
    }),

  // Remove role from user
  removeFromUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        branchId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: input.userId,
            roleId: input.roleId,
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role assignment not found",
        });
      }

      // Soft delete by setting isActive to false
      return ctx.db.userRole.update({
        where: { id: assignment.id },
        data: { isActive: false },
      });
    }),

  // Get user roles
  getUserRoles: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userRole.findMany({
        where: {
          userId: input.userId,
          isActive: true,
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });
    }),

  // Get user permissions (flattened from all roles)
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userRoles = await ctx.db.userRole.findMany({
        where: {
          userId: input.userId,
          isActive: true,
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
                where: {
                  permission: {
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      });

      // Flatten permissions from all roles
      const permissions = new Set<string>();
      userRoles.forEach((userRole) => {
        if (userRole.role?.rolePermissions) {
          userRole.role.rolePermissions.forEach((rolePermission: any) => {
            permissions.add(rolePermission.permission.name);
          });
        }
        
        // Legacy permissions are handled through rolePermissions now
      });

      return Array.from(permissions);
    }),
}); 