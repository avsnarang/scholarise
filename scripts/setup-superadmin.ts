import { PrismaClient } from '@prisma/client';
import { seedPermissionsAndRoles } from '../src/scripts/seed-permissions';
import { createServerSupabaseClient } from '../src/lib/supabase/server';

const prisma = new PrismaClient();

async function setupSuperAdmin() {
  console.log('🚀 Setting up SuperAdmin...\n');

  try {
    // Step 1: Seed roles and permissions
    console.log('1️⃣ Seeding roles and permissions...');
    await seedPermissionsAndRoles();
    
    // Step 2: Get or create Super Admin role
    console.log('2️⃣ Getting Super Admin role...');
    let superAdminRole = await prisma.rbacRole.findFirst({
      where: { 
        name: { in: ['Super Admin', 'super_admin', 'SuperAdmin', 'SUPER_ADMIN'] }
      }
    });

    if (!superAdminRole) {
      console.log('Creating Super Admin role...');
      
      // Get all permissions
      const allPermissions = await prisma.permission.findMany({
        select: { name: true }
      });
      
      superAdminRole = await prisma.rbacRole.create({
        data: {
          name: 'Super Admin',
          description: 'Super Administrator with full system access',
          isSystem: true,
          permissions: allPermissions.map(p => p.name),
          isActive: true,
        }
      });
    }

    console.log(`✅ Super Admin role: ${superAdminRole.name} (${superAdminRole.id})`);

    // Step 3: Create SuperAdmin user account in Supabase
    console.log('3️⃣ Creating SuperAdmin user in Supabase...');
    
    const supabase = createServerSupabaseClient();
    const adminEmail = 'admin@scholarise.com';
    const adminPassword = 'Admin@123';

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Super Admin',
        role: 'super_admin',
        roles: ['super_admin', 'Super Admin'],
        isHQ: true,
        permissions: superAdminRole.permissions,
      },
    });

    if (authError && !authError.message.includes('already been registered')) {
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.log('⚠️ User may already exist, trying to find existing user...');
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const foundUser = existingUser.users.find(u => u.email === adminEmail);
      if (foundUser) {
        console.log('✅ Found existing user, updating metadata...');
        await supabase.auth.admin.updateUserById(foundUser.id, {
          user_metadata: {
            name: 'Super Admin',
            role: 'super_admin',
            roles: ['super_admin', 'Super Admin'],
            isHQ: true,
            permissions: superAdminRole.permissions,
          },
        });
      }
    } else {
      console.log(`✅ Created SuperAdmin user: ${adminEmail}`);
    }

    // Step 4: Create User record in database (if needed)
    console.log('4️⃣ Creating user record in database...');
    
    const finalUserId = userId || (await supabase.auth.admin.listUsers())
      .data.users.find(u => u.email === adminEmail)?.id;

    if (finalUserId) {
      // Create or update User record
      await prisma.user.upsert({
        where: { id: finalUserId },
        create: {
          id: finalUserId,
          email: adminEmail,
          firstName: 'Super',
          lastName: 'Admin',
          userType: 'employee',
          isActive: true,
        },
        update: {
          email: adminEmail,
          isActive: true,
        },
      });

      // Create UserRole assignment
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: finalUserId,
            roleId: superAdminRole.id,
          },
        },
        create: {
          userId: finalUserId,
          roleId: superAdminRole.id,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      console.log(`✅ Assigned Super Admin role to user: ${finalUserId}`);
    }

    console.log('\n🎉 SuperAdmin setup completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error setting up SuperAdmin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSuperAdmin()
    .then(() => {
      console.log('✅ Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupSuperAdmin }; 