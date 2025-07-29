import { Permission, Role } from "@/types/permissions";
import { db } from "@/server/db";

export interface UserContext {
  id: string;
  roles?: string[];
  branchId?: string;
  teacherId?: string;
  employeeId?: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  branchId?: string;
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  branchId?: string;
  teacherId?: string;
  employeeId?: string;
  isActive: boolean;
}

/**
 * Centralized RBAC Service for managing roles and permissions
 */
export class RBACService {
  private static instance: RBACService;
  private roleCache: Map<string, RoleWithPermissions> = new Map();
  private userRoleCache: Map<string, UserRoleAssignment[]> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;

  private constructor() {}

  public static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.roleCache.clear();
    this.userRoleCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Check if cache needs refresh
   */
  private needsCacheRefresh(): boolean {
    return Date.now() - this.lastCacheUpdate > this.cacheExpiry;
  }

  /**
   * Get user roles from database
   */
  public async getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
    if (this.userRoleCache.has(userId) && !this.needsCacheRefresh()) {
      return this.userRoleCache.get(userId) || [];
    }

    const userRoles = await db.userRole.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    const assignments: UserRoleAssignment[] = userRoles.map((ur) => ({
      userId: ur.userId,
      roleId: ur.roleId,
      branchId: ur.branchId || undefined,
      teacherId: ur.teacherId || undefined,
      employeeId: ur.employeeId || undefined,
      isActive: ur.isActive,
    }));

    this.userRoleCache.set(userId, assignments);
    return assignments;
  }

  /**
   * Get role with permissions
   */
  public async getRole(roleId: string): Promise<RoleWithPermissions | null> {
    if (this.roleCache.has(roleId) && !this.needsCacheRefresh()) {
      return this.roleCache.get(roleId) || null;
    }

    const role = await db.rbacRole.findUnique({
      where: { id: roleId, isActive: true },
    });

    if (!role) {
      return null;
    }

    const roleWithPermissions: RoleWithPermissions = {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.permissions || [],
      isSystem: role.isSystem,
      isActive: role.isActive,
      branchId: role.branchId || undefined,
    };

    this.roleCache.set(roleId, roleWithPermissions);
    return roleWithPermissions;
  }

  /**
   * Get all user permissions across all roles
   */
  public async getUserPermissions(
    userId: string,
    branchId?: string
  ): Promise<string[]> {
    const userRoles = await this.getUserRoles(userId);
    const allPermissions = new Set<string>();

    for (const userRole of userRoles) {
      // If branch-specific check is requested, only include roles for that branch or global roles
      if (branchId && userRole.branchId && userRole.branchId !== branchId) {
        continue;
      }

      const role = await this.getRole(userRole.roleId);
      if (role && role.isActive) {
        role.permissions.forEach((perm) => allPermissions.add(perm));
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Check if user has a specific permission
   */
  public async hasPermission(
    userId: string,
    permission: Permission,
    branchId?: string,
    userMetadata?: { role?: string; roles?: string[] }
  ): Promise<boolean> {
    // Check for super admin first
    const isSuperAdmin = await this.isSuperAdmin(userId, userMetadata);
    if (isSuperAdmin) {
      return true;
    }

    const userPermissions = await this.getUserPermissions(userId, branchId);
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  public async hasAnyPermission(
    userId: string,
    permissions: Permission[],
    branchId?: string,
    userMetadata?: { role?: string; roles?: string[] }
  ): Promise<boolean> {
    if (await this.isSuperAdmin(userId, userMetadata)) {
      return true;
    }

    const userPermissions = await this.getUserPermissions(userId, branchId);
    return permissions.some((perm) => userPermissions.includes(perm));
  }

  /**
   * Check if user has all of the specified permissions
   */
  public async hasAllPermissions(
    userId: string,
    permissions: Permission[],
    branchId?: string,
    userMetadata?: { role?: string; roles?: string[] }
  ): Promise<boolean> {
    if (await this.isSuperAdmin(userId, userMetadata)) {
      return true;
    }

    const userPermissions = await this.getUserPermissions(userId, branchId);
    return permissions.every((perm) => userPermissions.includes(perm));
  }

  /**
   * Check if user is a super admin
   */
  public async isSuperAdmin(userId: string, userMetadata?: { role?: string; roles?: string[] }): Promise<boolean> {
    // First check Clerk metadata for super admin role
    if (userMetadata) {
      const isSuperAdminFromClerk = userMetadata.role === 'super_admin' || 
        userMetadata.roles?.includes('super_admin') ||
        userMetadata.roles?.includes('Super Admin') ||
        userMetadata.roles?.includes('SuperAdmin');
      
      if (isSuperAdminFromClerk) {
        return true;
      }
    }
    
    // Fallback to database roles check
    const userRoles = await this.getUserRoles(userId);
    
    for (const userRole of userRoles) {
      const role = await this.getRole(userRole.roleId);
      if (role && (
        role.name === Role.SUPER_ADMIN ||
        role.name === 'SuperAdmin' ||
        role.name === 'super_admin' ||
        role.name === 'Super Admin'
      )) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if user has a specific role
   */
  public async hasRole(
    userId: string,
    roleName: string,
    branchId?: string
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    
    for (const userRole of userRoles) {
      // If branch-specific check is requested, only include roles for that branch or global roles
      if (branchId && userRole.branchId && userRole.branchId !== branchId) {
        continue;
      }

      const role = await this.getRole(userRole.roleId);
      if (role && role.name === roleName) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Assign role to user
   */
  public async assignRole(
    userId: string,
    roleId: string,
    options?: {
      branchId?: string;
      teacherId?: string;
      employeeId?: string;
    }
  ): Promise<void> {
    await db.userRole.create({
      data: {
        userId,
        roleId,
        branchId: options?.branchId,
        teacherId: options?.teacherId,
        employeeId: options?.employeeId,
        isActive: true,
      },
    });

    // Clear cache for this user
    this.userRoleCache.delete(userId);
  }

  /**
   * Remove role from user
   */
  public async removeRole(
    userId: string,
    roleId: string,
    branchId?: string
  ): Promise<void> {
    await db.userRole.updateMany({
      where: {
        userId,
        roleId,
        ...(branchId && { branchId }),
      },
      data: {
        isActive: false,
      },
    });

    // Clear cache for this user
    this.userRoleCache.delete(userId);
  }

  /**
   * Create a new role
   */
  public async createRole(
    name: string,
    permissions: Permission[],
    options?: {
      description?: string;
      isSystem?: boolean;
      branchId?: string;
    }
  ): Promise<RoleWithPermissions> {
    const role = await db.rbacRole.create({
      data: {
        name,
        description: options?.description,
        permissions,
        isSystem: options?.isSystem || false,
        branchId: options?.branchId,
        isActive: true,
      },
    });

    const roleWithPermissions: RoleWithPermissions = {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.permissions || [],
      isSystem: role.isSystem,
      isActive: role.isActive,
      branchId: role.branchId || undefined,
    };

    // Clear cache
    this.clearCache();

    return roleWithPermissions;
  }

  /**
   * Update role permissions
   */
  public async updateRolePermissions(
    roleId: string,
    permissions: Permission[]
  ): Promise<void> {
    await db.rbacRole.update({
      where: { id: roleId },
      data: { permissions },
    });

    // Clear cache
    this.clearCache();
  }

  /**
   * Get all roles
   */
  public async getAllRoles(branchId?: string): Promise<RoleWithPermissions[]> {
    const roles = await db.rbacRole.findMany({
      where: {
        isActive: true,
        ...(branchId && { 
          OR: [
            { branchId },
            { branchId: null }, // Include global roles
          ]
        }),
      },
      orderBy: { name: "asc" },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.permissions || [],
      isSystem: role.isSystem,
      isActive: role.isActive,
      branchId: role.branchId || undefined,
    }));
  }

  /**
   * Seed default system roles
   */
  public async seedDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: Role.SUPER_ADMIN,
        description: "Super Administrator with full system access",
        permissions: Object.values(Permission),
        isSystem: true,
      },
      {
        name: Role.ADMIN,
        description: "Administrator with branch-level access",
        permissions: [
          Permission.VIEW_DASHBOARD,
          Permission.VIEW_STUDENTS,
          Permission.CREATE_STUDENT,
          Permission.EDIT_STUDENT,
          Permission.DELETE_STUDENT,
          Permission.MANAGE_ADMISSIONS,
          Permission.VIEW_TEACHERS,
          Permission.CREATE_TEACHER,
          Permission.EDIT_TEACHER,
          Permission.DELETE_TEACHER,
          Permission.VIEW_EMPLOYEES,
          Permission.CREATE_EMPLOYEE,
          Permission.EDIT_EMPLOYEE,
          Permission.DELETE_EMPLOYEE,
          Permission.VIEW_CLASSES,
          Permission.CREATE_CLASS,
          Permission.EDIT_CLASS,
          Permission.DELETE_CLASS,
          Permission.MANAGE_CLASS_STUDENTS,
          Permission.VIEW_SUBJECTS,
          Permission.MANAGE_SUBJECTS,
          Permission.MANAGE_SUBJECT_ASSIGNMENTS,
          Permission.MANAGE_CLASS_SUBJECTS,
          Permission.MANAGE_STUDENT_SUBJECTS,
          Permission.VIEW_ATTENDANCE,
          Permission.MARK_ATTENDANCE,
          Permission.VIEW_ATTENDANCE_REPORTS,
          Permission.VIEW_LEAVES,
          Permission.MANAGE_LEAVE_APPLICATIONS,
          Permission.MANAGE_LEAVE_POLICIES,
          Permission.VIEW_SALARY,
          Permission.MANAGE_SALARY_STRUCTURES,
          Permission.VIEW_FEES,
          Permission.MANAGE_FEES,
          Permission.VIEW_FINANCE_MODULE,
          Permission.MANAGE_FEE_HEADS,
          Permission.MANAGE_FEE_TERMS,
          Permission.MANAGE_CLASSWISE_FEES,
          Permission.COLLECT_FEES,
          Permission.VIEW_FINANCE_REPORTS,
          Permission.MANAGE_CONCESSION_TYPES,
          Permission.MANAGE_STUDENT_CONCESSIONS,
          Permission.MANAGE_FEE_REMINDERS,
          Permission.VIEW_EXAMINATIONS,
          Permission.MANAGE_EXAM_TYPES,
          Permission.VIEW_EXAM_REPORTS,
          Permission.MANAGE_EXAM_TERMS,
          Permission.VIEW_REPORT_CARDS,
          Permission.GENERATE_REPORT_CARDS,
          Permission.VIEW_COMMUNICATION,
          Permission.CREATE_COMMUNICATION_MESSAGE,
          Permission.MANAGE_WHATSAPP_TEMPLATES,
          Permission.VIEW_COMMUNICATION_LOGS,
          Permission.MANAGE_COMMUNICATION_SETTINGS,
          Permission.VIEW_REPORTS,
          Permission.VIEW_SETTINGS,
          Permission.MANAGE_BRANCHES,
          Permission.MANAGE_ACADEMIC_SESSIONS,
          Permission.MANAGE_ATTENDANCE_CONFIG,
        ],
        isSystem: true,
      },
      {
        name: Role.TEACHER,
        description: "Teacher with classroom management access",
        permissions: [
          Permission.VIEW_DASHBOARD,
          Permission.VIEW_STUDENTS,
          Permission.VIEW_CLASSES,
          Permission.MANAGE_CLASS_STUDENTS,
          Permission.VIEW_SUBJECTS,
          Permission.VIEW_ATTENDANCE,
          Permission.MARK_ATTENDANCE,
          Permission.VIEW_LEAVES,
          Permission.MANAGE_LEAVE_APPLICATIONS,
          Permission.VIEW_QUESTION_PAPERS,
          Permission.CREATE_QUESTION_PAPER,
          Permission.VIEW_EXAMINATIONS,
          Permission.ENTER_MARKS,
          Permission.VIEW_EXAM_REPORTS,
          Permission.VIEW_REPORT_CARDS,
          Permission.VIEW_COMMUNICATION,
          Permission.CREATE_COMMUNICATION_MESSAGE,
          Permission.VIEW_COMMUNICATION_LOGS,
        ],
        isSystem: true,
      },
      {
        name: Role.STAFF,
        description: "Staff member with basic access",
        permissions: [
          Permission.VIEW_DASHBOARD,
          Permission.VIEW_STUDENTS,
          Permission.VIEW_LEAVES,
          Permission.MANAGE_LEAVE_APPLICATIONS,
          Permission.VIEW_ATTENDANCE,
          Permission.MARK_SELF_ATTENDANCE,
        ],
        isSystem: true,
      },
    ];

    for (const roleData of defaultRoles) {
      await db.rbacRole.upsert({
        where: { name: roleData.name },
        update: {
          permissions: roleData.permissions,
          description: roleData.description,
        },
        create: {
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
          isSystem: roleData.isSystem,
          isActive: true,
        },
      });
    }

    // Clear cache after seeding
    this.clearCache();
  }
}

// Export singleton instance
export const rbacService = RBACService.getInstance(); 