import { db } from '@/server/db';
import { updateUserMetadata } from '@/utils/supabase-auth';

/**
 * Synchronizes user permissions from database to Supabase Auth metadata
 * This ensures the user's auth token contains the latest permissions from their roles
 */
export async function syncUserPermissions(userId: string): Promise<void> {
  try {
    console.log(`Syncing permissions for user: ${userId}`);

    // Get user's active roles from database
    const userRoles = await db.userRole.findMany({
      where: {
        userId,
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
        branch: {
          select: { id: true, name: true, code: true },
        },
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Extract role names and permissions
    const roleNames = userRoles.map(ur => ur.role.name).filter(Boolean);
    const allPermissions = new Set<string>();
    
    // Add permissions from all roles
    userRoles.forEach(userRole => {
      if (userRole.role?.rolePermissions) {
        userRole.role.rolePermissions.forEach(rp => {
          allPermissions.add(rp.permission.name);
        });
      }
    });

    const permissions = Array.from(allPermissions);

    // Get primary role (first role) and branch info
    const primaryRole = roleNames[0] || 'User';
    const primaryBranch = userRoles[0]?.branch;

    // Get user's actual name from Employee/Teacher records
    let firstName = '';
    let lastName = '';
    let fullName = '';

    // Check if user is an employee or teacher and get their name
    const employeeRecord = userRoles.find(ur => ur.employee)?.employee;
    const teacherRecord = userRoles.find(ur => ur.teacher)?.teacher;

    if (employeeRecord) {
      firstName = employeeRecord.firstName || '';
      lastName = employeeRecord.lastName || '';
      fullName = `${firstName} ${lastName}`.trim();
    } else if (teacherRecord) {
      firstName = teacherRecord.firstName || '';
      lastName = teacherRecord.lastName || '';
      fullName = `${firstName} ${lastName}`.trim();
    }

    // Update Supabase Auth user metadata
    const metadata = {
      role: primaryRole,
      roles: roleNames,
      permissions: permissions,
      branchId: primaryBranch?.id,
      branchCode: primaryBranch?.code,
      ...(fullName && {
        name: fullName,
        firstName: firstName,
        lastName: lastName,
      }),
      lastPermissionSync: new Date().toISOString(),
    };

    await updateUserMetadata(userId, metadata);

    console.log(`Successfully synced permissions for user ${userId}:`, {
      roles: roleNames,
      permissionCount: permissions.length,
      branch: primaryBranch?.name,
      name: fullName || 'No name found',
    });

  } catch (error) {
    console.error(`Error syncing permissions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Sync permissions for all users with the specified role
 */
export async function syncPermissionsForRole(roleName: string): Promise<number> {
  try {
    console.log(`Syncing permissions for all users with role: ${roleName}`);

    // Find the role
    const role = await db.rbacRole.findFirst({
      where: { name: roleName, isActive: true },
    });

    if (!role) {
      throw new Error(`Role "${roleName}" not found`);
    }

    // Get all users with this role
    const userRoles = await db.userRole.findMany({
      where: {
        roleId: role.id,
        isActive: true,
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    let syncCount = 0;
    
    // Sync each user
    for (const userRole of userRoles) {
      try {
        await syncUserPermissions(userRole.userId);
        syncCount++;
      } catch (error) {
        console.error(`Failed to sync user ${userRole.userId}:`, error);
      }
    }

    console.log(`Successfully synced ${syncCount} users with role "${roleName}"`);
    return syncCount;

  } catch (error) {
    console.error(`Error syncing permissions for role ${roleName}:`, error);
    throw error;
  }
}

/**
 * Sync permissions for all users in the system
 */
export async function syncAllUserPermissions(): Promise<number> {
  try {
    console.log('Syncing permissions for all users');

    // Get all active user role assignments
    const userRoles = await db.userRole.findMany({
      where: { isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });

    let syncCount = 0;
    
    // Sync each user
    for (const userRole of userRoles) {
      try {
        await syncUserPermissions(userRole.userId);
        syncCount++;
      } catch (error) {
        console.error(`Failed to sync user ${userRole.userId}:`, error);
      }
    }

    console.log(`Successfully synced ${syncCount} users`);
    return syncCount;

  } catch (error) {
    console.error('Error syncing all user permissions:', error);
    throw error;
  }
} 