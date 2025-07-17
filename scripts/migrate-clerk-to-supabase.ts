import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/env';

const prisma = new PrismaClient();

// Migration statistics interface
interface MigrationStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface UserMigrationData {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'student' | 'parent' | 'teacher' | 'employee' | 'admission_staff';
  metadata: any;
  branchId?: string;
  recordId: string;
}

// Default password for migrated users
const DEFAULT_PASSWORD = 'TempPass123!';

async function fetchAllClerkUsers(): Promise<UserMigrationData[]> {
  console.log('🔍 Fetching all Clerk user data from database...');
  
  const users: UserMigrationData[] = [];

  try {
    // Fetch students with Clerk IDs
    const students = await prisma.student.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
      },
      include: {
        branch: true,
      },
    });

    console.log(`Found ${students.length} students with Clerk IDs`);

    for (const student of students) {
      if (!student.clerkId) continue;
      
      // Generate email if not present
      let email = student.email || student.personalEmail;
      if (!email) {
        const branchCode = student.branch?.code || 'tsh';
        const domain = branchCode === 'PS' ? 'ps.tsh.edu.in' :
                      branchCode === 'JUN' ? 'jun.tsh.edu.in' :
                      branchCode === 'MAJ' ? 'majra.tsh.edu.in' : 'tsh.edu.in';
        email = `${student.admissionNumber}@${domain}`;
      }

      users.push({
        clerkId: student.clerkId,
        email,
        firstName: student.firstName,
        lastName: student.lastName,
        userType: 'student',
        metadata: {
          role: 'Student',
          roles: ['Student'],
          branchId: student.branchId,
          admissionNumber: student.admissionNumber,
        },
        branchId: student.branchId,
        recordId: student.id,
      });
    }

    // Fetch parents with Clerk IDs
    const parents = await prisma.parent.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
      },
      include: {
        students: {
          include: {
            branch: true,
          },
        },
      },
    });

    console.log(`Found ${parents.length} parents with Clerk IDs`);

    for (const parent of parents) {
      if (!parent.clerkId) continue;
      
      // Use father or mother email, fallback to generated email
      let email = parent.fatherEmail || parent.motherEmail || parent.guardianEmail;
      if (!email && parent.students.length > 0) {
        const student = parent.students[0];
        const branchCode = student?.branch?.code || 'tsh';
        const domain = branchCode === 'PS' ? 'ps.tsh.edu.in' :
                      branchCode === 'JUN' ? 'jun.tsh.edu.in' :
                      branchCode === 'MAJ' ? 'majra.tsh.edu.in' : 'tsh.edu.in';
        email = `P${student?.admissionNumber}@${domain}`;
      }

      if (!email) {
        console.warn(`No email found for parent ${parent.id}, skipping...`);
        continue;
      }

      const firstName = parent.fatherName || parent.motherName || parent.guardianName || 'Parent';
      const branchId = parent.students[0]?.branchId;

      users.push({
        clerkId: parent.clerkId,
        email,
        firstName,
        lastName: 'Parent',
        userType: 'parent',
        metadata: {
          role: 'Parent',
          roles: ['Parent'],
          branchId,
        },
        branchId,
        recordId: parent.id,
      });
    }

    // Fetch teachers with Clerk IDs
    const teachers = await prisma.teacher.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log(`Found ${teachers.length} teachers with Clerk IDs`);

    for (const teacher of teachers) {
      if (!teacher.clerkId) continue;
      
      const email = teacher.officialEmail || teacher.personalEmail || `${teacher.firstName.toLowerCase()}.${teacher.lastName.toLowerCase()}@tsh.edu.in`;
      const roles = teacher.userRoles.map(ur => ur.role.name);

      users.push({
        clerkId: teacher.clerkId,
        email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        userType: 'teacher',
        metadata: {
          role: roles[0] || 'Teacher',
          roles: roles.length > 0 ? roles : ['Teacher'],
          branchId: teacher.branchId,
          employeeCode: teacher.employeeCode,
        },
        branchId: teacher.branchId,
        recordId: teacher.id,
      });
    }

    // Fetch employees with Clerk IDs
    const employees = await prisma.employee.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log(`Found ${employees.length} employees with Clerk IDs`);

    for (const employee of employees) {
      if (!employee.clerkId) continue;
      
      const email = employee.officialEmail || employee.personalEmail || `${employee.firstName.toLowerCase()}.${employee.lastName.toLowerCase()}@tsh.edu.in`;
      const roles = employee.userRoles.map(ur => ur.role.name);

      users.push({
        clerkId: employee.clerkId,
        email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        userType: 'employee',
        metadata: {
          role: roles[0] || 'Employee',
          roles: roles.length > 0 ? roles : ['Employee'],
          branchId: employee.branchId,
          designation: employee.designation,
          department: employee.department,
        },
        branchId: employee.branchId,
        recordId: employee.id,
      });
    }

    // Fetch admission staff with Clerk IDs
    const admissionStaff = await prisma.admissionStaff.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
      },
    });

    console.log(`Found ${admissionStaff.length} admission staff with Clerk IDs`);

    for (const staff of admissionStaff) {
      if (!staff.clerkId) continue;
      
      const email = staff.email || `${staff.name.toLowerCase().replace(' ', '.')}@tsh.edu.in`;

      users.push({
        clerkId: staff.clerkId,
        email,
        firstName: staff.name.split(' ')[0] || staff.name,
        lastName: staff.name.split(' ').slice(1).join(' ') || '',
        userType: 'admission_staff',
        metadata: {
          role: staff.role || 'Admission Staff',
          roles: [staff.role || 'Admission Staff'],
        },
        recordId: staff.id,
      });
    }

    console.log(`📊 Total users found: ${users.length}`);
    return users;

  } catch (error) {
    console.error('Error fetching Clerk users:', error);
    throw error;
  }
}

async function createSupabaseUser(userData: UserMigrationData): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: `${userData.firstName} ${userData.lastName}`,
        ...userData.metadata,
        // Store original Clerk ID for reference
        originalClerkId: userData.clerkId,
        migratedAt: new Date().toISOString(),
      },
    });

    if (error) {
      console.error(`❌ Error creating Supabase user for ${userData.email}:`, error.message);
      return null;
    }

    if (!data.user) {
      console.error(`❌ No user returned for ${userData.email}`);
      return null;
    }

    console.log(`✅ Created Supabase user for ${userData.email} (${data.user.id})`);
    return data.user.id;

  } catch (error) {
    console.error(`❌ Unexpected error creating user for ${userData.email}:`, error);
    return null;
  }
}

async function updateDatabaseRecord(userData: UserMigrationData, supabaseUserId: string): Promise<boolean> {
  try {
    switch (userData.userType) {
      case 'student':
        await prisma.student.update({
          where: { id: userData.recordId },
          data: { clerkId: supabaseUserId },
        });
        break;

      case 'parent':
        await prisma.parent.update({
          where: { id: userData.recordId },
          data: { clerkId: supabaseUserId },
        });
        break;

      case 'teacher':
        await prisma.teacher.update({
          where: { id: userData.recordId },
          data: { 
            clerkId: supabaseUserId,
            userId: supabaseUserId,
          },
        });
        break;

      case 'employee':
        await prisma.employee.update({
          where: { id: userData.recordId },
          data: { 
            clerkId: supabaseUserId,
            userId: supabaseUserId,
          },
        });
        break;

      case 'admission_staff':
        await prisma.admissionStaff.update({
          where: { id: userData.recordId },
          data: { 
            clerkId: supabaseUserId,
            userId: supabaseUserId,
          },
        });
        break;

      default:
        console.warn(`Unknown user type: ${userData.userType}`);
        return false;
    }

    console.log(`✅ Updated ${userData.userType} record ${userData.recordId} with Supabase ID ${supabaseUserId}`);
    return true;

  } catch (error) {
    console.error(`❌ Error updating ${userData.userType} record ${userData.recordId}:`, error);
    return false;
  }
}

async function migrateUserBatch(users: UserMigrationData[], batchSize: number = 5): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: users.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`\n🚀 Starting migration of ${users.length} users in batches of ${batchSize}...`);

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)} (${batch.length} users)...`);

    const batchPromises = batch.map(async (userData) => {
      try {
        // Check if user already exists in Supabase by checking if the clerkId is a valid UUID
        if (userData.clerkId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log(`⏭️  User ${userData.email} appears to already have Supabase ID, skipping...`);
          stats.skipped++;
          return;
        }

        // Create Supabase user
        const supabaseUserId = await createSupabaseUser(userData);
        if (!supabaseUserId) {
          stats.failed++;
          stats.errors.push(`Failed to create Supabase user for ${userData.email}`);
          return;
        }

        // Update database record
        const updated = await updateDatabaseRecord(userData, supabaseUserId);
        if (!updated) {
          stats.failed++;
          stats.errors.push(`Failed to update database record for ${userData.email}`);
          return;
        }

        stats.successful++;

      } catch (error) {
        stats.failed++;
        const errorMsg = `Error migrating ${userData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    });

    // Wait for batch to complete
    await Promise.allSettled(batchPromises);

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < users.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return stats;
}

async function createMigrationReport(stats: MigrationStats): Promise<void> {
  const report = `
📊 CLERK TO SUPABASE MIGRATION REPORT
=====================================
📅 Migration Date: ${new Date().toISOString()}

📈 MIGRATION STATISTICS:
- Total Users: ${stats.total}
- ✅ Successful Migrations: ${stats.successful}
- ❌ Failed Migrations: ${stats.failed}
- ⏭️  Skipped (Already Migrated): ${stats.skipped}
- 📊 Success Rate: ${((stats.successful / stats.total) * 100).toFixed(2)}%

${stats.errors.length > 0 ? `
❌ ERRORS ENCOUNTERED:
${stats.errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}
` : '✅ No errors encountered during migration.'}

🔑 IMPORTANT POST-MIGRATION STEPS:
1. All migrated users have been assigned the temporary password: "${DEFAULT_PASSWORD}"
2. Users should be prompted to change their passwords on first login
3. Verify that all role assignments are correct
4. Test authentication for a sample of migrated users
5. Consider implementing password reset flow for all users

💡 RECOMMENDATIONS:
- Send password reset emails to all migrated users
- Update your authentication documentation
- Remove any remaining Clerk dependencies from your codebase
- Monitor Supabase auth logs for any issues
`;

  console.log(report);

  // Save report to file
  const fs = await import('fs');
  const path = await import('path');
  const reportsDir = path.join(process.cwd(), 'migration-reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(reportsDir, `clerk-supabase-migration-${Date.now()}.txt`);
  fs.writeFileSync(reportFile, report);
  
  console.log(`📄 Migration report saved to: ${reportFile}`);
}

async function main() {
  console.log('🚀 Starting Clerk to Supabase Migration...\n');

  try {
    // Step 1: Fetch all Clerk user data
    const users = await fetchAllClerkUsers();

    if (users.length === 0) {
      console.log('ℹ️  No Clerk users found to migrate.');
      return;
    }

    // Step 2: Confirm migration
    console.log(`\n⚠️  You are about to migrate ${users.length} users from Clerk to Supabase.`);
    console.log('⚠️  This will:');
    console.log('   - Create new Supabase auth accounts for all users');
    console.log('   - Set temporary passwords for all users');
    console.log('   - Update database records to point to Supabase IDs');
    console.log('   - This operation cannot be easily reversed\n');

    // In a real scenario, you might want to add a confirmation prompt here
    // For now, we'll proceed automatically

    // Step 3: Perform migration
    const stats = await migrateUserBatch(users);

    // Step 4: Generate report
    await createMigrationReport(stats);

    console.log('\n🎉 Migration completed!');

    if (stats.failed > 0) {
      console.log(`⚠️  ${stats.failed} users failed to migrate. Check the report for details.`);
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as migrateClerkToSupabase }; 