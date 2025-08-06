import { db } from "@/server/db";

/**
 * Quick fix for WhatsApp template permissions
 */
async function quickFixPermissions() {
  try {
    console.log('🔧 Quick fixing WhatsApp template permissions...');

    // 1. Ensure permission exists
    const permission = await db.permission.upsert({
      where: { name: 'manage_whatsapp_templates' },
      update: {},
      create: {
        name: 'manage_whatsapp_templates',
        description: 'Manage WhatsApp message templates',
        category: 'communication',
        isSystem: false,
        isActive: true,
      },
    });
    console.log('✅ Permission ensured:', permission.name);

    // 2. Find relevant roles
    const roles = await db.rbacRole.findMany({
      where: {
        name: {
          in: ['Admin', 'Principal', 'Coordinator']
        }
      }
    });
    console.log('✅ Found roles:', roles.map(r => r.name));

    // 3. Find communication permissions
    const permissions = await db.permission.findMany({
      where: {
        name: {
          in: [
            'view_communication',
            'create_communication_message', 
            'manage_whatsapp_templates',
            'view_communication_logs',
            'manage_communication_settings'
          ]
        }
      }
    });
    console.log('✅ Found permissions:', permissions.map(p => p.name));

    // 4. Assign permissions to roles
    for (const role of roles) {
      for (const perm of permissions) {
        try {
          await db.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
          console.log(`  ✅ Added ${perm.name} to ${role.name}`);
        } catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            console.log(`  ⏭️  ${perm.name} already assigned to ${role.name}`);
          } else {
            console.error(`  ❌ Error assigning ${perm.name} to ${role.name}:`, error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }
    }

    console.log('\n✅ WhatsApp template permissions fix completed!');
    console.log('📢 Users with Admin/Principal/Coordinator roles should now be able to manage templates.');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Auto-run
quickFixPermissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });