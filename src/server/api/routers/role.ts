import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permission, Role } from "@/types/permissions";
import { rbacService } from "@/services/rbac-service";

/**
 * Router for managing RBAC roles and permissions
 */
export const roleRouter = createTRPCRouter({
  // Get all roles
  getAll: protectedProcedure
    .input(z.object({ branchId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return rbacService.getAllRoles(input?.branchId);
    }),

  // Get a specific role by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const role = await rbacService.getRole(input.id);
      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }
      return role;
    }),

  // Create a new role
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Role name is required"),
        description: z.string().optional(),
        permissions: z.array(z.nativeEnum(Permission)),
        branchId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can create roles)
      const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);
      
      if (!isSuperAdmin) {
        // Check if user has permission to create roles
        const canManageRoles = await rbacService.hasPermission(
          ctx.userId,
          Permission.MANAGE_ROLES,
          undefined,
          userMetadata
        );
        
        if (!canManageRoles) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create roles",
          });
        }
      }

      return rbacService.createRole(input.name, input.permissions, {
        description: input.description,
        branchId: input.branchId,
      });
    }),

  // Update role permissions
  updatePermissions: protectedProcedure
    .input(
      z.object({
        roleId: z.string(),
        permissions: z.array(z.nativeEnum(Permission)),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can update roles)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Check if user has permission to manage roles
        const canManageRoles = await rbacService.hasPermission(
          ctx.userId,
          Permission.MANAGE_ROLES
        );
        
        if (!canManageRoles) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update roles",
          });
        }
      }

      await rbacService.updateRolePermissions(input.roleId, input.permissions);
      return { success: true };
    }),

  // Get user roles
  getUserRoles: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can view anyone's roles)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (isSuperAdmin) {
        const userRoles = await rbacService.getUserRoles(input.userId);
        // Get role details for each role
        const rolesWithDetails = await Promise.all(
          userRoles.map(async (userRole) => {
            const roleDetails = await rbacService.getRole(userRole.roleId);
            return {
              ...userRole,
              role: roleDetails
            };
          })
        );
        return rolesWithDetails;
      }
      
      // Users can only see their own roles unless they have permission to view others
      const canViewOtherUsers = await rbacService.hasPermission(
        ctx.userId,
        Permission.VIEW_EMPLOYEES
      );
      
      if (input.userId !== ctx.userId && !canViewOtherUsers) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view other users' roles",
        });
      }

      const userRoles = await rbacService.getUserRoles(input.userId);
      // Get role details for each role
      const rolesWithDetails = await Promise.all(
        userRoles.map(async (userRole) => {
          const roleDetails = await rbacService.getRole(userRole.roleId);
          return {
            ...userRole,
            role: roleDetails
          };
        })
      );
      return rolesWithDetails;
    }),

  // Get user permissions
  getUserPermissions: protectedProcedure
    .input(z.object({ 
      userId: z.string(),
      branchId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can view anyone's permissions)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (isSuperAdmin) {
        return rbacService.getUserPermissions(input.userId, input.branchId);
      }
      
      // Users can only see their own permissions unless they have permission to view others
      const canViewOtherUsers = await rbacService.hasPermission(
        ctx.userId,
        Permission.VIEW_EMPLOYEES
      );
      
      if (input.userId !== ctx.userId && !canViewOtherUsers) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view other users' permissions",
        });
      }

      return rbacService.getUserPermissions(input.userId, input.branchId);
    }),

  // Assign role to user
  assignRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        branchId: z.string().optional(),
        teacherId: z.string().optional(),
        employeeId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can assign roles)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Check if user has permission to manage roles
        const canManageRoles = await rbacService.hasPermission(
          ctx.userId,
          Permission.MANAGE_ROLES
        );
        
        if (!canManageRoles) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to assign roles",
          });
        }
      }

      await rbacService.assignRole(input.userId, input.roleId, {
        branchId: input.branchId,
        teacherId: input.teacherId,
        employeeId: input.employeeId,
      });

      return { success: true };
    }),

  // Remove role from user
  removeRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        branchId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can remove roles)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Check if user has permission to manage roles
        const canManageRoles = await rbacService.hasPermission(
          ctx.userId,
          Permission.MANAGE_ROLES
        );
        
        if (!canManageRoles) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to remove roles",
          });
        }
      }

      await rbacService.removeRole(input.userId, input.roleId, input.branchId);
      return { success: true };
    }),

  // Check if user has permission
  hasPermission: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        permission: z.nativeEnum(Permission),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can check anyone's permissions)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Users can only check their own permissions unless they have permission to view others
        const canViewOtherUsers = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_EMPLOYEES
        );
        
        if (input.userId !== ctx.userId && !canViewOtherUsers) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to check other users' permissions",
          });
        }
      }

      return rbacService.hasPermission(input.userId, input.permission, input.branchId);
    }),

  // Check if user has any of the specified permissions
  hasAnyPermission: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(z.nativeEnum(Permission)),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can check anyone's permissions)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Users can only check their own permissions unless they have permission to view others
        const canViewOtherUsers = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_EMPLOYEES
        );
        
        if (input.userId !== ctx.userId && !canViewOtherUsers) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to check other users' permissions",
          });
        }
      }

      return rbacService.hasAnyPermission(input.userId, input.permissions, input.branchId);
    }),

  // Check if user has all of the specified permissions
  hasAllPermissions: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(z.nativeEnum(Permission)),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can check anyone's permissions)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Users can only check their own permissions unless they have permission to view others
        const canViewOtherUsers = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_EMPLOYEES
        );
        
        if (input.userId !== ctx.userId && !canViewOtherUsers) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to check other users' permissions",
          });
        }
      }

      return rbacService.hasAllPermissions(input.userId, input.permissions, input.branchId);
    }),

  // Check if user has a specific role
  hasRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleName: z.string(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can check anyone's roles)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Users can only check their own roles unless they have permission to view others
        const canViewOtherUsers = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_EMPLOYEES
        );
        
        if (input.userId !== ctx.userId && !canViewOtherUsers) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to check other users' roles",
          });
        }
      }

      return rbacService.hasRole(input.userId, input.roleName, input.branchId);
    }),

  // Check if user is super admin
  isSuperAdmin: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Check if user is super admin first (super admins can check anyone's admin status)
      const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
      
      if (!isSuperAdmin) {
        // Users can only check their own super admin status unless they have permission to view others
        const canViewOtherUsers = await rbacService.hasPermission(
          ctx.userId,
          Permission.VIEW_EMPLOYEES
        );
        
        if (input.userId !== ctx.userId && !canViewOtherUsers) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to check other users' admin status",
          });
        }
      }

      return rbacService.isSuperAdmin(input.userId);
    }),

  // Get all available permissions
  getAllPermissions: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is super admin first (super admins can view all permissions)
    const userMetadata = ctx.user ? { role: ctx.user.role, roles: ctx.user.roles } : undefined;
    const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId, userMetadata);
    
    if (!isSuperAdmin) {
      // Check if user has permission to view permissions
      const canViewPermissions = await rbacService.hasPermission(
        ctx.userId,
        Permission.MANAGE_ROLES,
        undefined,
        userMetadata
      );
      
      if (!canViewPermissions) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view permissions",
        });
      }
    }

    return Object.values(Permission).map(permission => ({
      name: permission,
      description: getPermissionDescription(permission),
      category: getPermissionCategory(permission),
    }));
  }),

  // Seed default roles
  seedDefaultRoles: protectedProcedure.mutation(async ({ ctx }) => {
    // Only super admins can seed default roles
    const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
    
    if (!isSuperAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can seed default roles",
      });
    }

    await rbacService.seedDefaultRoles();
    return { success: true };
  }),

  // Clear RBAC cache
  clearCache: protectedProcedure.mutation(async ({ ctx }) => {
    // Only super admins can clear cache
    const isSuperAdmin = await rbacService.isSuperAdmin(ctx.userId);
    
    if (!isSuperAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can clear the cache",
      });
    }

    rbacService.clearCache();
    return { success: true };
  }),
});

// Helper functions
function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<Permission, string> = {
    [Permission.VIEW_DASHBOARD]: "View dashboard and analytics",
    [Permission.VIEW_STUDENTS]: "View student information",
    [Permission.CREATE_STUDENT]: "Create new student records",
    [Permission.EDIT_STUDENT]: "Edit existing student records",
    [Permission.DELETE_STUDENT]: "Delete student records",
    [Permission.MANAGE_ADMISSIONS]: "Manage student admissions",
    [Permission.MANAGE_TRANSFER_CERTIFICATES]: "Manage transfer certificates",
    [Permission.VIEW_MONEY_COLLECTION]: "View money collection records",
    [Permission.CREATE_MONEY_COLLECTION]: "Create money collection records",
    [Permission.EDIT_MONEY_COLLECTION]: "Edit money collection records",
    [Permission.DELETE_MONEY_COLLECTION]: "Delete money collection records",
    [Permission.VIEW_TEACHERS]: "View teacher information",
    [Permission.CREATE_TEACHER]: "Create new teacher records",
    [Permission.EDIT_TEACHER]: "Edit existing teacher records",
    [Permission.DELETE_TEACHER]: "Delete teacher records",
    [Permission.VIEW_EMPLOYEES]: "View employee information",
    [Permission.CREATE_EMPLOYEE]: "Create new employee records",
    [Permission.EDIT_EMPLOYEE]: "Edit existing employee records",
    [Permission.DELETE_EMPLOYEE]: "Delete employee records",
    [Permission.VIEW_DEPARTMENTS]: "View department information",
    [Permission.CREATE_DEPARTMENT]: "Create new departments",
    [Permission.EDIT_DEPARTMENT]: "Edit existing departments",
    [Permission.DELETE_DEPARTMENT]: "Delete departments",
    [Permission.VIEW_DESIGNATIONS]: "View designation information",
    [Permission.CREATE_DESIGNATION]: "Create new designations",
    [Permission.EDIT_DESIGNATION]: "Edit existing designations",
    [Permission.DELETE_DESIGNATION]: "Delete designations",
    [Permission.VIEW_CLASSES]: "View class information",
    [Permission.CREATE_CLASS]: "Create new classes",
    [Permission.EDIT_CLASS]: "Edit existing classes",
    [Permission.DELETE_CLASS]: "Delete classes",
    [Permission.MANAGE_CLASS_STUDENTS]: "Manage students in classes",
    [Permission.VIEW_ATTENDANCE]: "View attendance records",
    [Permission.MARK_ATTENDANCE]: "Mark attendance for students",
    [Permission.MARK_ATTENDANCE_ANY_DATE]: "Mark attendance for any date",
    [Permission.MARK_SELF_ATTENDANCE]: "Mark own attendance",
    [Permission.MARK_ALL_STAFF_ATTENDANCE]: "Mark attendance for all staff",
    [Permission.VIEW_ATTENDANCE_REPORTS]: "View attendance reports",
    [Permission.VIEW_LEAVES]: "View leave applications",
    [Permission.MANAGE_LEAVE_APPLICATIONS]: "Manage leave applications",
    [Permission.MANAGE_LEAVE_POLICIES]: "Manage leave policies",
    [Permission.VIEW_SALARY]: "View salary information",
    [Permission.MANAGE_SALARY_STRUCTURES]: "Manage salary structures",
    [Permission.MANAGE_TEACHER_SALARIES]: "Manage teacher salaries",
    [Permission.MANAGE_EMPLOYEE_SALARIES]: "Manage employee salaries",
    [Permission.MANAGE_SALARY_INCREMENTS]: "Manage salary increments",
    [Permission.PROCESS_SALARY_PAYMENTS]: "Process salary payments",
    [Permission.VIEW_TRANSPORT]: "View transport information",
    [Permission.MANAGE_TRANSPORT_ROUTES]: "Manage transport routes",
    [Permission.MANAGE_TRANSPORT_STOPS]: "Manage transport stops",
    [Permission.MANAGE_TRANSPORT_ASSIGNMENTS]: "Manage transport assignments",
    [Permission.VIEW_FEES]: "View fee information",
    [Permission.MANAGE_FEES]: "Manage fee structures",
    [Permission.VIEW_QUESTION_PAPERS]: "View question papers",
    [Permission.CREATE_QUESTION_PAPER]: "Create question papers",
    [Permission.MANAGE_QUESTION_PAPERS]: "Manage question papers",
    [Permission.VIEW_EXAMINATIONS]: "View examination information",
    [Permission.MANAGE_EXAM_TYPES]: "Manage exam types",
    [Permission.MANAGE_EXAM_CONFIGURATIONS]: "Manage exam configurations",
    [Permission.MANAGE_EXAM_SCHEDULES]: "Manage exam schedules",
    [Permission.MANAGE_SEATING_PLANS]: "Manage seating plans",
    [Permission.ENTER_MARKS]: "Enter examination marks",
    [Permission.MANAGE_ASSESSMENTS]: "Manage assessments",
    [Permission.MANAGE_GRADE_SCALES]: "Manage grade scales",
    [Permission.VIEW_EXAM_REPORTS]: "View examination reports",
    [Permission.VIEW_REPORTS]: "View system reports",
    [Permission.VIEW_SETTINGS]: "View system settings",
    [Permission.MANAGE_BRANCHES]: "Manage branches",
    [Permission.MANAGE_ACADEMIC_SESSIONS]: "Manage academic sessions",
    [Permission.MANAGE_SUBJECTS]: "Manage subjects",
    [Permission.MANAGE_ATTENDANCE_CONFIG]: "Manage attendance configuration",
    [Permission.VIEW_FINANCE_MODULE]: "View finance module",
    [Permission.MANAGE_FEE_HEADS]: "Manage fee heads",
    [Permission.MANAGE_FEE_TERMS]: "Manage fee terms",
    [Permission.MANAGE_CLASSWISE_FEES]: "Manage classwise fees",
    [Permission.COLLECT_FEES]: "Collect fees",
    [Permission.VIEW_FINANCE_REPORTS]: "View finance reports",
    [Permission.MANAGE_ROLES]: "Manage user roles and permissions",
    [Permission.VIEW_COURTESY_CALLS]: "View courtesy calls",
    [Permission.CREATE_COURTESY_CALL_FEEDBACK]: "Create courtesy call feedback",
    [Permission.EDIT_COURTESY_CALL_FEEDBACK]: "Edit courtesy call feedback",
    [Permission.VIEW_OWN_COURTESY_CALL_FEEDBACK]: "View own courtesy call feedback",
    [Permission.VIEW_ALL_COURTESY_CALL_FEEDBACK]: "View all courtesy call feedback",
    [Permission.DELETE_COURTESY_CALL_FEEDBACK]: "Delete courtesy call feedback",
  };

  return descriptions[permission] || "No description available";
}

function getPermissionCategory(permission: Permission): string {
  const categories: Record<string, string> = {
    // Dashboard
    view_dashboard: "Dashboard",
    
    // Students
    view_students: "Students",
    create_student: "Students",
    edit_student: "Students",
    delete_student: "Students",
    manage_admissions: "Students",
    manage_transfer_certificates: "Students",
    
    // Money Collection
    view_money_collection: "Money Collection",
    create_money_collection: "Money Collection",
    edit_money_collection: "Money Collection",
    delete_money_collection: "Money Collection",
    
    // Teachers
    view_teachers: "Teachers",
    create_teacher: "Teachers",
    edit_teacher: "Teachers",
    delete_teacher: "Teachers",
    
    // Employees
    view_employees: "Employees",
    create_employee: "Employees",
    edit_employee: "Employees",
    delete_employee: "Employees",
    
    // Departments
    view_departments: "Departments",
    create_department: "Departments",
    edit_department: "Departments",
    delete_department: "Departments",
    
    // Designations
    view_designations: "Designations",
    create_designation: "Designations",
    edit_designation: "Designations",
    delete_designation: "Designations",
    
    // Classes
    view_classes: "Classes",
    create_class: "Classes",
    edit_class: "Classes",
    delete_class: "Classes",
    manage_class_students: "Classes",
    
    // Attendance
    view_attendance: "Attendance",
    mark_attendance: "Attendance",
    mark_attendance_any_date: "Attendance",
    mark_self_attendance: "Attendance",
    mark_all_staff_attendance: "Attendance",
    view_attendance_reports: "Attendance",
    
    // Leave Management
    view_leaves: "Leave Management",
    manage_leave_applications: "Leave Management",
    manage_leave_policies: "Leave Management",
    
    // Salary
    view_salary: "Salary",
    manage_salary_structures: "Salary",
    manage_teacher_salaries: "Salary",
    manage_employee_salaries: "Salary",
    manage_salary_increments: "Salary",
    process_salary_payments: "Salary",
    
    // Transport
    view_transport: "Transport",
    manage_transport_routes: "Transport",
    manage_transport_stops: "Transport",
    manage_transport_assignments: "Transport",
    
    // Fees
    view_fees: "Fees",
    manage_fees: "Fees",
    view_finance_module: "Finance",
    manage_fee_heads: "Finance",
    manage_fee_terms: "Finance",
    manage_classwise_fees: "Finance",
    collect_fees: "Finance",
    view_finance_reports: "Finance",
    
    // Question Papers
    view_question_papers: "Question Papers",
    create_question_paper: "Question Papers",
    manage_question_papers: "Question Papers",
    
    // Examinations
    view_examinations: "Examinations",
    manage_exam_types: "Examinations",
    manage_exam_configurations: "Examinations",
    manage_exam_schedules: "Examinations",
    manage_seating_plans: "Examinations",
    enter_marks: "Examinations",
    manage_assessments: "Examinations",
    manage_grade_scales: "Examinations",
    view_exam_reports: "Examinations",
    
    // System
    view_reports: "System",
    view_settings: "System",
    manage_branches: "System",
    manage_academic_sessions: "System",
    manage_subjects: "System",
    manage_attendance_config: "System",
    manage_roles: "System",
  };

  return categories[permission] || "Other";
} 