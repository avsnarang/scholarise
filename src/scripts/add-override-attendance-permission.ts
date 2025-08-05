import { PrismaClient } from '@prisma/client';

// Initialize Prisma client with direct DATABASE_URL
const prisma = new PrismaClient();

async function addOverrideAttendancePermission() {
  console.log('🔐 Adding OVERRIDE_MARKED_ATTENDANCE permission...');

  try {
    // Add the new permission
    const permission = await prisma.permission.upsert({
      where: { name: 'override_marked_attendance' },
      update: {
        description: 'Override already marked attendance',
        category: 'attendance'
      },
      create: {
        name: 'override_marked_attendance',
        description: 'Override already marked attendance',
        category: 'attendance',
        isSystem: true
      }
    });

    console.log(`✅ Permission created/updated: ${permission.name}`);

    // Find Admin role and add the permission
    const adminRole = await prisma.rbacRole.findUnique({
      where: { name: 'Admin' },
      include: { rolePermissions: true }
    });

    if (adminRole) {
      // Check if permission is already assigned
      const existingAssignment = await prisma.rolePermission.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      });

      if (!existingAssignment) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
        console.log(`✅ Added permission to Admin role`);
      } else {
        console.log(`⏭️  Permission already assigned to Admin role`);
      }

      // Update the legacy permissions array
      const currentPermissions = adminRole.permissions || [];
      if (!currentPermissions.includes('override_marked_attendance')) {
        await prisma.rbacRole.update({
          where: { id: adminRole.id },
          data: {
            permissions: [...currentPermissions, 'override_marked_attendance']
          }
        });
        console.log(`✅ Updated Admin role legacy permissions array`);
      }
    }

    console.log('🎉 Override attendance permission setup completed!');
  } catch (error) {
    console.error('❌ Error adding permission:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  addOverrideAttendancePermission()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { addOverrideAttendancePermission };