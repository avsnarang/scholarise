import { db } from '../src/server/db';

async function debugRBACData() {
  console.log('🔍 Debugging RBAC data...\n');

  try {
    // 1. Check all roles
    console.log('1️⃣ All Roles in Database:');
    const allRoles = await db.rbacRole.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          where: { isActive: true },
          select: { userId: true }
        }
      }
    });

    allRoles.forEach(role => {
      console.log(`   📋 ${role.name} (${role.isActive ? 'Active' : 'Inactive'})`);
      console.log(`      - Permissions: ${role.rolePermissions.length}`);
      console.log(`      - Users: ${role.userRoles.length}`);
      if (role.name.includes('CBSE') || role.name.includes('In-Charge')) {
        console.log(`      - Permissions list: ${role.rolePermissions.map(rp => rp.permission.name).join(', ')}`);
      }
    });

    // 2. Look for users with any role assignments
    console.log('\n2️⃣ Users with Role Assignments:');
    const usersWithRoles = await db.userRole.findMany({
      where: { isActive: true },
      include: {
        role: true,
        user: true
      },
      take: 10 // Just show first 10
    });

    usersWithRoles.forEach(ur => {
      console.log(`   👤 User ${ur.userId} has role: ${ur.role.name}`);
    });

    // 3. Check for roles that might be similar to CBSE In-Charge
    console.log('\n3️⃣ Roles containing "CBSE" or "In-Charge" or similar:');
    const searchTerms = ['CBSE', 'In-Charge', 'In Charge', 'incharge', 'cbse'];
    
    for (const term of searchTerms) {
      const matchingRoles = await db.rbacRole.findMany({
        where: {
          name: {
            contains: term,
            mode: 'insensitive'
          }
        },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          },
          userRoles: {
            where: { isActive: true },
            include: {
              user: true
            }
          }
        }
      });

      if (matchingRoles.length > 0) {
        console.log(`   🔍 Search term "${term}" found ${matchingRoles.length} roles:`);
        matchingRoles.forEach(role => {
          console.log(`      - ${role.name} (${role.userRoles.length} users, ${role.rolePermissions.length} permissions)`);
          if (role.userRoles.length > 0) {
            console.log(`        Users: ${role.userRoles.map(ur => ur.userId).join(', ')}`);
          }
          if (role.rolePermissions.length > 0) {
            console.log(`        Permissions: ${role.rolePermissions.map(rp => rp.permission.name).slice(0, 5).join(', ')}${role.rolePermissions.length > 5 ? '...' : ''}`);
          }
        });
      }
    }

    // 4. Check total users and recent role assignments
    console.log('\n4️⃣ Overall Statistics:');
    const totalUsers = await db.user.count();
    const totalActiveRoles = await db.rbacRole.count({ where: { isActive: true } });
    const totalActiveUserRoles = await db.userRole.count({ where: { isActive: true } });
    
    console.log(`   👥 Total Users: ${totalUsers}`);
    console.log(`   📋 Total Active Roles: ${totalActiveRoles}`);
    console.log(`   🔗 Total Active User-Role Assignments: ${totalActiveUserRoles}`);

    // 5. Recent role assignments
    console.log('\n5️⃣ Recent Role Assignments (last 10):');
    const recentAssignments = await db.userRole.findMany({
      where: { isActive: true },
      include: {
        role: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    recentAssignments.forEach(ur => {
      console.log(`   📅 ${ur.createdAt.toLocaleDateString()}: User ${ur.userId} → ${ur.role.name}`);
    });

  } catch (error) {
    console.error('❌ Error debugging RBAC data:', error);
    throw error;
  }
}

// Run the debug if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  debugRBACData()
    .then(() => {
      console.log('\n✅ Debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Debug failed:', error);
      process.exit(1);
    });
}

export { debugRBACData }; 