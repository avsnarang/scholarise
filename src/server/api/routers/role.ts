import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permission, Role } from "@/types/permissions";
import { rolePermissions } from "@/utils/rbac";

/**
 * Router for managing RBAC roles and permissions
 */
export const roleRouter = createTRPCRouter({
  // Get all roles with their permission counts
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // First check if we have any roles in the database
    const existingRoles = await (ctx.db as any).rbacRole.findMany({
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userRoles: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // If no roles exist, seed the database with default roles
    if (existingRoles.length === 0) {
      await seedDefaultRoles(ctx.db);
      
      // Fetch again after seeding
      return await (ctx.db as any).rbacRole.findMany({
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    } else {
      // If roles exist, check if we need to update system role flags
      await fixSystemRoleFlags(ctx.db);
    }

    return existingRoles;
  }),

  // Get a specific role with all its permissions
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const role = await (ctx.db as any).rbacRole.findUnique({
        where: { id: input.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      return role;
    }),

  // Get user permissions by roleId (JSON-based system)
  getUserPermissionsByRoleId: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Get role with JSON permissions
        const role = await (ctx.db as any).rbacRole.findUnique({
          where: { id: input.roleId },
          select: {
            permissions: true,
            isSystem: true,
            name: true,
          },
        });

        if (!role) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found",
          });
        }

        // If role has JSON permissions, return them directly
        if (role.permissions && Array.isArray(role.permissions) && role.permissions.length > 0) {
          return role.permissions;
        } else {
          // Fall back to relational table for backward compatibility
          const roleWithPermissions = await (ctx.db as any).rbacRole.findUnique({
            where: { id: input.roleId },
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          });

          if (!roleWithPermissions) {
            return [];
          }

          // Extract permissions from the role
          const permissions = roleWithPermissions.rolePermissions.map((rp: any) => rp.permission.name);
          return permissions;
        }
      } catch (error) {
        console.error("Error fetching user permissions by roleId:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve permissions",
        });
      }
    }),

  // Create a new role
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        copyFromRoleId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Create the new role
        const newRole = await (ctx.db as any).rbacRole.create({
          data: {
            name: input.name,
            description: input.description || "",
            isSystem: false,
          },
        });

        // If copying permissions from another role
        if (input.copyFromRoleId) {
          await copyRolePermissions(ctx.db, input.copyFromRoleId, newRole.id);
        }

        return newRole;
      } catch (error: any) {
        if (error.code === "P2002") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A role with this name already exists",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while creating the role",
          cause: error,
        });
      }
    }),

  // Update a role
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if role exists
      const role = await (ctx.db as any).rbacRole.findUnique({
        where: { id },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Prevent modification of system roles (except for description and isActive)
      if (role.isSystem && input.name) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify name of system roles",
        });
      }

      return (ctx.db as any).rbacRole.update({
        where: { id },
        data,
      });
    }),

  // Delete a role
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if role exists and is not a system role
      const role = await (ctx.db as any).rbacRole.findUnique({
        where: { id: input.id },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system roles",
        });
      }

      // Delete the role (cascade will delete role permissions)
      return (ctx.db as any).rbacRole.delete({
        where: { id: input.id },
      });
    }),

  // Get all permissions 
  getAllPermissions: protectedProcedure.query(async ({ ctx }) => {
    // First check if we have any permissions in the database
    const existingPermissions = await (ctx.db as any).rbacPermission.findMany({
      orderBy: { name: "asc" },
    });

    // If no permissions exist, seed the database with default permissions
    if (existingPermissions.length === 0) {
      await seedDefaultPermissions(ctx.db);
      
      // Fetch again after seeding
      return await (ctx.db as any).rbacPermission.findMany({
        orderBy: { name: "asc" },
      });
    }

    return existingPermissions;
  }),

  // Get permissions for a specific role (JSON-based system)
  getRolePermissions: protectedProcedure
    .input(z.object({ roleId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First try to get permissions from JSON field
      const role = await (ctx.db as any).rbacRole.findUnique({
        where: { id: input.roleId },
        select: {
          permissions: true,
          isSystem: true,
          name: true,
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // If role has JSON permissions, use them
      if (role.permissions && Array.isArray(role.permissions) && role.permissions.length > 0) {
        // Get permission objects from the permission names stored in JSON
        const permissions = await (ctx.db as any).rbacPermission.findMany({
          where: {
            name: {
              in: role.permissions,
            },
          },
        });
        return permissions;
      } else {
        // Fall back to relational table for backward compatibility
        const rolePermissions = await (ctx.db as any).rbacRolePermission.findMany({
          where: { roleId: input.roleId },
          include: {
            permission: true,
          },
        });

        return rolePermissions.map((rp: any) => rp.permission);
      }
    }),

  // Update permissions for a role (JSON-based system)
  updateRolePermissions: protectedProcedure
    .input(
      z.object({
        roleId: z.string(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { roleId, permissions } = input;

      // Check if role exists
      const role = await (ctx.db as any).rbacRole.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // For system roles, prevent removing all permissions
      if (role.isSystem && permissions.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove all permissions from system roles",
        });
      }

      // Convert permission IDs to permission names for JSON storage
      const permissionObjects = await (ctx.db as any).rbacPermission.findMany({
        where: {
          id: {
            in: permissions,
          },
        },
        select: {
          name: true,
        },
      });

      const permissionNames = permissionObjects.map((p: any) => p.name);

      // Update the role with JSON permissions instead of relational tables
      await (ctx.db as any).rbacRole.update({
        where: { id: roleId },
        data: {
          permissions: permissionNames, // Store as JSON array
        },
      });

      // Also maintain the relational table for backward compatibility if needed
      // Delete all existing permissions for this role
      await (ctx.db as any).rbacRolePermission.deleteMany({
        where: { roleId },
      });

      // Add the new permissions
      if (permissions.length > 0) {
        // Create role permissions directly using the provided permission IDs
        const rolePermissions = permissions.map((permissionId) => ({
          roleId,
          permissionId,
        }));

        // Use createMany for efficient bulk creation
        await (ctx.db as any).rbacRolePermission.createMany({
          data: rolePermissions,
          skipDuplicates: true,
        });
      }

      return { success: true };
    }),

  // Assign role to a user
  assignRoleToUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        teacherId: z.string().optional(),
        employeeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, roleId, teacherId, employeeId } = input;

      try {
        // Check if role exists
        const role = await (ctx.db as any).rbacRole.findUnique({
          where: { id: roleId },
        });

        if (!role) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found",
          });
        }

        // Check if the user already has this role
        const existingRole = await (ctx.db as any).userRole.findFirst({
          where: {
            userId,
            roleId,
          },
        });

        if (existingRole) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User already has this role",
          });
        }

        // Create the role assignment
        const userRole = await (ctx.db as any).userRole.create({
          data: {
            userId,
            roleId,
            teacherId,
            employeeId,
          },
        });

        return { success: true, userRole };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign role to user",
          cause: error,
        });
      }
    }),

  // Remove role from a user
  removeRoleFromUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Remove role from user
        await (ctx.db as any).userRole.deleteMany({
          where: {
            userId: input.userId,
            roleId: input.roleId,
          },
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove role from user",
          cause: error,
        });
      }
    }),

  // Get roles assigned to a user
  getUserRoles: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const userRoles = await (ctx.db as any).userRole.findMany({
          where: { userId: input.userId },
          include: {
            role: true,
          },
        });

        return userRoles.map((ur: any) => ur.role);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve user roles",
          cause: error,
        });
      }
    }),
});

// Helper functions

// Fix system role flags in existing data
async function fixSystemRoleFlags(db: any) {
  // Make sure all standard roles from the Role enum are marked as system roles
  for (const role of Object.values(Role)) {
    await db.rbacRole.updateMany({
      where: { name: role },
      data: { isSystem: true },
    });
  }
}

// Seed default roles from the Role enum
async function seedDefaultRoles(db: any) {
  // Create all standard roles from the Role enum with JSON permissions
  for (const role of Object.values(Role)) {
    const permissions = (rolePermissions as any)[role] || [];
    
    await db.rbacRole.upsert({
      where: { name: role },
      update: {
        description: getRoleDescription(role),
        isSystem: true,
        permissions: permissions, // Store as JSON array
      },
      create: {
        name: role,
        description: getRoleDescription(role),
        isSystem: true,
        permissions: permissions, // Store as JSON array
      },
    });
  }
}

// Seed default permissions from the Permission enum
async function seedDefaultPermissions(db: any) {
  // Create all permissions from the Permission enum
  for (const permission of Object.values(Permission)) {
    await db.rbacPermission.create({
      data: {
        name: permission,
        description: getPermissionDescription(permission),
        category: getPermissionCategory(permission),
      },
    });
  }

  // For each role, assign the default permissions (both JSON and relational for compatibility)
  const roles = await db.rbacRole.findMany();
  for (const role of roles) {
    if ((rolePermissions as any)[role.name]) {
      const permissions = (rolePermissions as any)[role.name];
      
      // Update the JSON permissions field
      await db.rbacRole.update({
        where: { id: role.id },
        data: { permissions: permissions }
      });
      
      // Also add to relational table for backward compatibility
      await addPermissionsToRole(db, role.id, permissions);
    }
  }
}

// Add permissions to a role
async function addPermissionsToRole(db: any, roleId: string, permissionNames: string[]) {
  // Get permission IDs from names
  const permissions = await db.rbacPermission.findMany({
    where: {
      name: {
        in: permissionNames,
      },
    },
    select: {
      id: true,
    },
  });

  // Create role permissions
  const rolePermissions = permissions.map((permission: any) => ({
    roleId,
    permissionId: permission.id,
  }));

  // Use createMany for efficient bulk creation
  if (rolePermissions.length > 0) {
    await db.rbacRolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });
  }
}

// Copy permissions from one role to another
async function copyRolePermissions(db: any, sourceRoleId: string, targetRoleId: string) {
  // Get permissions from source role
  const sourcePermissions = await db.rbacRolePermission.findMany({
    where: { roleId: sourceRoleId },
    select: { permissionId: true },
  });

  // Create permissions for target role
  const targetPermissions = sourcePermissions.map((p: any) => ({
    roleId: targetRoleId,
    permissionId: p.permissionId,
  }));

  // Create role permissions for target role
  if (targetPermissions.length > 0) {
    await db.rbacRolePermission.createMany({
      data: targetPermissions,
      skipDuplicates: true,
    });
  }
}

// Helper function to get role description
function getRoleDescription(role: string): string {
  switch (role) {
    case Role.ADMIN:
      return "Administrative staff with access to most system functions";
    case Role.SUPER_ADMIN:
      return "Unrestricted access to all system features";
    case Role.TEACHER:
      return "Teaching staff with access to classroom and student management";
    case Role.PRINCIPAL:
      return "School principal with oversight of staff and academics";
    case Role.ACCOUNTANT:
      return "Financial staff with access to fee and payment management";
    case Role.RECEPTIONIST:
      return "Front office staff for admissions and general inquiries";
    case Role.TRANSPORT_MANAGER:
      return "Staff responsible for transportation management";
    case Role.STAFF:
      return "General staff with basic system access";
    default:
      return `${role} role`;
  }
}

// Helper function to get permission description
function getPermissionDescription(permission: string): string {
  // Generate readable description from permission name
  const formattedName = permission
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  
  return formattedName;
}

// Helper function to determine permission category
function getPermissionCategory(permission: string): string {
  if (permission.startsWith("view_dashboard")) return "Dashboard";
  if (permission.includes("_student") || permission.includes("_admission") || permission.includes("_transfer")) return "Students";
  if (permission.includes("_teacher")) return "Teachers";
  if (permission.includes("_employee") || permission.includes("_department") || permission.includes("_designation")) return "Employees";
  if (permission.includes("_class")) return "Classes";
  if (permission.includes("_attendance")) return "Attendance";
  if (permission.includes("_leave")) return "Leave Management";
  if (permission.includes("_salary") || permission.includes("_increment") || permission.includes("_payment")) return "Salary Management";
  if (permission.includes("_transport") || permission.includes("_route") || permission.includes("_stop") || permission.includes("_assignment")) return "Transport";
  if (permission.includes("_fee") && !permission.includes("_finance")) return "Fees";
  if (permission.includes("_finance") || permission.includes("fee_head") || permission.includes("fee_term") || permission.includes("classwise_fee") || permission.includes("collect_fee") || permission.includes("finance_report")) return "Finance";
  if (permission.includes("_question") || permission.includes("question_paper")) return "Question Papers";
  if (permission.includes("_exam") || permission.includes("_mark") || permission.includes("_assessment") || permission.includes("_grade") || permission.includes("_seating")) return "Examinations";
  if (permission.includes("_money_collection")) return "Money Collection";
  if (permission.includes("_report")) return "Reports";
  if (permission.includes("_setting") || permission.includes("_user") || permission.includes("_branch") || permission.includes("_academic") || permission.includes("_subject") || permission.includes("_config")) return "Settings";
  return "General";
} 