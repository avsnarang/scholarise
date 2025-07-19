import { syncPermissionsForRole, syncUserPermissions } from '../src/utils/sync-user-permissions';
import { db } from '../src/server/db';

async function fixCBSEInChargePermissions() {
  console.log('🔧 Starting CBSE In-Charge permissions fix...');

  try {
    // Step 1: Check if CBSE In-Charge role exists
    console.log('1️⃣ Checking CBSE In-Charge role...');
    const cbseRole = await db.rbacRole.findFirst({
      where: { 
        name: 'CBSE In-Charge',
        isActive: true 
      },
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

    if (!cbseRole) {
      console.log('❌ CBSE In-Charge role not found or inactive');
      return;
    }

    console.log(`✅ Found CBSE In-Charge role with ${cbseRole.rolePermissions.length} permissions`);
    console.log(`👥 Found ${cbseRole.userRoles.length} users with this role`);

    // Step 2: Display role permissions
    console.log('\n2️⃣ Role permissions:');
    cbseRole.rolePermissions.forEach(rp => {
      console.log(`   • ${rp.permission.name}`);
    });

    // Step 3: Sync permissions for all users with this role
    console.log('\n3️⃣ Syncing permissions for CBSE In-Charge users...');
    const syncedCount = await syncPermissionsForRole('CBSE In-Charge');
    
    console.log(`✅ Successfully synced permissions for ${syncedCount} users`);

    // Step 4: Verify sync for each user
    console.log('\n4️⃣ Verifying sync for each user...');
    for (const userRole of cbseRole.userRoles) {
      try {
        // Get user info from Supabase
        const { getUserById } = await import('../src/utils/supabase-auth');
        const user = await getUserById(userRole.userId);
        
        if (user) {
          console.log(`   User: ${user.email}`);
          console.log(`   Metadata roles: ${JSON.stringify(user.user_metadata?.roles || [])}`);
          console.log(`   Metadata permissions count: ${user.user_metadata?.permissions?.length || 0}`);
          console.log(`   Last sync: ${user.user_metadata?.lastPermissionSync || 'Never'}`);
          console.log('   ---');
        }
      } catch (error) {
        console.error(`   Error checking user ${userRole.userId}:`, error);
      }
    }

    console.log('\n✅ CBSE In-Charge permissions fix completed!');
    console.log('\nNext steps:');
    console.log('1. Ask affected users to log out and log back in');
    console.log('2. Or visit /debug-permissions to verify the fix');
    console.log('3. Check the sidebar visibility after login');

  } catch (error) {
    console.error('❌ Error fixing CBSE In-Charge permissions:', error);
    throw error;
  }
}

// Run the fix if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  fixCBSEInChargePermissions()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixCBSEInChargePermissions }; 