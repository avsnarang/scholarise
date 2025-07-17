import { PrismaClient } from '@prisma/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserById } from '@/utils/supabase-auth';

const prisma = new PrismaClient();

interface VerificationResults {
  totalUsers: number;
  successfulMigrations: number;
  failedMigrations: number;
  roleAssignments: number;
  missingRoles: number;
  authTests: {
    students: { tested: number; successful: number };
    parents: { tested: number; successful: number };
    teachers: { tested: number; successful: number };
    employees: { tested: number; successful: number };
  };
  issues: string[];
}

async function verifyUserMigration(): Promise<VerificationResults> {
  console.log('🔍 Verifying user migration...\n');

  const results: VerificationResults = {
    totalUsers: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    roleAssignments: 0,
    missingRoles: 0,
    authTests: {
      students: { tested: 0, successful: 0 },
      parents: { tested: 0, successful: 0 },
      teachers: { tested: 0, successful: 0 },
      employees: { tested: 0, successful: 0 },
    },
    issues: [],
  };

  // Check students
  console.log('👨‍🎓 Verifying student migrations...');
  const students = await prisma.student.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    take: 10, // Sample of 10 for testing
  });

  for (const student of students) {
    results.totalUsers++;
    if (student.clerkId && student.clerkId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        // Check if user exists in Supabase
        const supabaseUser = await getUserById(student.clerkId);
        if (supabaseUser) {
          results.successfulMigrations++;
          console.log(`✅ Student ${student.admissionNumber} - Supabase user exists`);
          
          // Check role assignment
          const userRole = await prisma.userRole.findFirst({
            where: { userId: student.clerkId },
            include: { role: true }
          });
          
          if (userRole) {
            results.roleAssignments++;
            console.log(`✅ Student ${student.admissionNumber} - Role assigned: ${userRole.role.name}`);
          } else {
            results.missingRoles++;
            results.issues.push(`Student ${student.admissionNumber} missing role assignment`);
          }

          // Test authentication (metadata check)
          if (supabaseUser.user_metadata?.role) {
            results.authTests.students.successful++;
            console.log(`✅ Student ${student.admissionNumber} - Metadata correct`);
          } else {
            results.issues.push(`Student ${student.admissionNumber} missing metadata`);
          }
        } else {
          results.failedMigrations++;
          results.issues.push(`Student ${student.admissionNumber} not found in Supabase`);
        }
      } catch (error) {
        results.failedMigrations++;
        results.issues.push(`Student ${student.admissionNumber} verification error: ${error}`);
      }
    } else {
      results.issues.push(`Student ${student.admissionNumber} has invalid Supabase UUID`);
    }
    results.authTests.students.tested++;
  }

  // Check parents
  console.log('\n👨‍👩‍👧‍👦 Verifying parent migrations...');
  const parents = await prisma.parent.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    include: {
      students: true,
    },
    take: 10, // Sample of 10 for testing
  });

  for (const parent of parents) {
    results.totalUsers++;
    if (parent.clerkId && parent.clerkId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        // Check if user exists in Supabase
        const supabaseUser = await getUserById(parent.clerkId);
        if (supabaseUser) {
          results.successfulMigrations++;
          console.log(`✅ Parent for ${parent.students[0]?.admissionNumber || 'unknown'} - Supabase user exists`);
          
          // Check role assignment
          const userRole = await prisma.userRole.findFirst({
            where: { userId: parent.clerkId },
            include: { role: true }
          });
          
          if (userRole) {
            results.roleAssignments++;
            console.log(`✅ Parent - Role assigned: ${userRole.role.name}`);
          } else {
            results.missingRoles++;
            results.issues.push(`Parent ${parent.id} missing role assignment`);
          }

          // Test authentication (metadata check)
          if (supabaseUser.user_metadata?.role) {
            results.authTests.parents.successful++;
            console.log(`✅ Parent - Metadata correct`);
          } else {
            results.issues.push(`Parent ${parent.id} missing metadata`);
          }
        } else {
          results.failedMigrations++;
          results.issues.push(`Parent ${parent.id} not found in Supabase`);
        }
      } catch (error) {
        results.failedMigrations++;
        results.issues.push(`Parent ${parent.id} verification error: ${error}`);
      }
    } else {
      results.issues.push(`Parent ${parent.id} has invalid Supabase UUID`);
    }
    results.authTests.parents.tested++;
  }

  // Check teachers
  console.log('\n👨‍🏫 Verifying teacher migrations...');
  const teachers = await prisma.teacher.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    take: 5, // Sample of 5 for testing
  });

  for (const teacher of teachers) {
    results.totalUsers++;
    if (teacher.clerkId && teacher.clerkId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        // Check if user exists in Supabase
        const supabaseUser = await getUserById(teacher.clerkId);
        if (supabaseUser) {
          results.successfulMigrations++;
          console.log(`✅ Teacher ${teacher.firstName} ${teacher.lastName} - Supabase user exists`);
          
          // Check role assignment
          const userRole = await prisma.userRole.findFirst({
            where: { userId: teacher.clerkId },
            include: { role: true }
          });
          
          if (userRole) {
            results.roleAssignments++;
            console.log(`✅ Teacher ${teacher.firstName} ${teacher.lastName} - Role assigned: ${userRole.role.name}`);
          } else {
            results.missingRoles++;
            results.issues.push(`Teacher ${teacher.firstName} ${teacher.lastName} missing role assignment`);
          }

          // Test authentication (metadata check)
          if (supabaseUser.user_metadata?.role) {
            results.authTests.teachers.successful++;
            console.log(`✅ Teacher ${teacher.firstName} ${teacher.lastName} - Metadata correct`);
          } else {
            results.issues.push(`Teacher ${teacher.firstName} ${teacher.lastName} missing metadata`);
          }
        } else {
          results.failedMigrations++;
          results.issues.push(`Teacher ${teacher.firstName} ${teacher.lastName} not found in Supabase`);
        }
      } catch (error) {
        results.failedMigrations++;
        results.issues.push(`Teacher ${teacher.firstName} ${teacher.lastName} verification error: ${error}`);
      }
    } else {
      results.issues.push(`Teacher ${teacher.firstName} ${teacher.lastName} has invalid Supabase UUID`);
    }
    results.authTests.teachers.tested++;
  }

  // Check employees
  console.log('\n👨‍💼 Verifying employee migrations...');
  const employees = await prisma.employee.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    take: 5, // Sample of 5 for testing
  });

  for (const employee of employees) {
    results.totalUsers++;
    if (employee.clerkId && employee.clerkId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        // Check if user exists in Supabase
        const supabaseUser = await getUserById(employee.clerkId);
        if (supabaseUser) {
          results.successfulMigrations++;
          console.log(`✅ Employee ${employee.firstName} ${employee.lastName} - Supabase user exists`);
          
          // Check role assignment
          const userRole = await prisma.userRole.findFirst({
            where: { userId: employee.clerkId },
            include: { role: true }
          });
          
          if (userRole) {
            results.roleAssignments++;
            console.log(`✅ Employee ${employee.firstName} ${employee.lastName} - Role assigned: ${userRole.role.name}`);
          } else {
            results.missingRoles++;
            results.issues.push(`Employee ${employee.firstName} ${employee.lastName} missing role assignment`);
          }

          // Test authentication (metadata check)
          if (supabaseUser.user_metadata?.role) {
            results.authTests.employees.successful++;
            console.log(`✅ Employee ${employee.firstName} ${employee.lastName} - Metadata correct`);
          } else {
            results.issues.push(`Employee ${employee.firstName} ${employee.lastName} missing metadata`);
          }
        } else {
          results.failedMigrations++;
          results.issues.push(`Employee ${employee.firstName} ${employee.lastName} not found in Supabase`);
        }
      } catch (error) {
        results.failedMigrations++;
        results.issues.push(`Employee ${employee.firstName} ${employee.lastName} verification error: ${error}`);
      }
    } else {
      results.issues.push(`Employee ${employee.firstName} ${employee.lastName} has invalid Supabase UUID`);
    }
    results.authTests.employees.tested++;
  }

  return results;
}

async function verifySystemRoles(): Promise<{ rolesCreated: number; missingRoles: string[] }> {
  console.log('\n🔐 Verifying system roles...');
  
  const expectedRoles = [
    'Student', 'Parent', 'Teacher', 'Employee', 
    'Admin', 'SuperAdmin', 'Principal', 'Head Teacher', 'Admission Staff'
  ];
  
  const missingRoles: string[] = [];
  let rolesCreated = 0;

  for (const roleName of expectedRoles) {
    const role = await prisma.rbacRole.findFirst({
      where: { name: roleName }
    });
    
    if (role) {
      rolesCreated++;
      console.log(`✅ Role exists: ${roleName}`);
    } else {
      missingRoles.push(roleName);
      console.log(`❌ Missing role: ${roleName}`);
    }
  }

  return { rolesCreated, missingRoles };
}

async function testSupabaseConnection(): Promise<boolean> {
  console.log('\n🔗 Testing Supabase connection...');
  
  try {
    const supabase = createServerSupabaseClient();
    
    // Try to list users (this will test our service role key)
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {
      console.log(`❌ Supabase connection error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Supabase connection successful - Found ${data.users.length > 0 ? 'users' : 'no users'}`);
    return true;
  } catch (error) {
    console.log(`❌ Supabase connection failed: ${error}`);
    return false;
  }
}

async function generateVerificationReport(results: VerificationResults, roleResults: any, supabaseOk: boolean): Promise<void> {
  const successRate = (results.successfulMigrations / results.totalUsers) * 100;
  const roleSuccessRate = (results.roleAssignments / results.successfulMigrations) * 100;
  
  const report = `
📊 MIGRATION VERIFICATION REPORT
===============================
📅 Verification Date: ${new Date().toISOString()}

🔗 SUPABASE CONNECTION:
${supabaseOk ? '✅ Connected successfully' : '❌ Connection failed'}

📈 MIGRATION VERIFICATION RESULTS:
- Total Users Tested: ${results.totalUsers}
- ✅ Successful Migrations: ${results.successfulMigrations}
- ❌ Failed Migrations: ${results.failedMigrations}
- 📊 Migration Success Rate: ${successRate.toFixed(2)}%

🔐 ROLE ASSIGNMENT VERIFICATION:
- ✅ Users with Roles: ${results.roleAssignments}
- ❌ Users Missing Roles: ${results.missingRoles}
- 📊 Role Assignment Rate: ${roleSuccessRate.toFixed(2)}%

🏢 SYSTEM ROLES:
- ✅ Roles Created: ${roleResults.rolesCreated}
- ❌ Missing Roles: ${roleResults.missingRoles.length}
${roleResults.missingRoles.length > 0 ? `\nMissing Roles:\n${roleResults.missingRoles.map((role: string) => `- ${role}`).join('\n')}` : ''}

👥 AUTHENTICATION TESTS BY USER TYPE:
- Students: ${results.authTests.students.successful}/${results.authTests.students.tested} (${((results.authTests.students.successful / results.authTests.students.tested) * 100).toFixed(1)}%)
- Parents: ${results.authTests.parents.successful}/${results.authTests.parents.tested} (${((results.authTests.parents.successful / results.authTests.parents.tested) * 100).toFixed(1)}%)
- Teachers: ${results.authTests.teachers.successful}/${results.authTests.teachers.tested} (${((results.authTests.teachers.successful / results.authTests.teachers.tested) * 100).toFixed(1)}%)
- Employees: ${results.authTests.employees.successful}/${results.authTests.employees.tested} (${((results.authTests.employees.successful / results.authTests.employees.tested) * 100).toFixed(1)}%)

${results.issues.length > 0 ? `
❌ ISSUES FOUND:
${results.issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')}
` : '✅ No issues found during verification.'}

🎯 MIGRATION STATUS:
${successRate >= 95 && roleSuccessRate >= 95 && supabaseOk ? 
  '🟢 MIGRATION SUCCESSFUL - Ready for production use' : 
  successRate >= 80 ? 
    '🟡 MIGRATION MOSTLY SUCCESSFUL - Some issues need attention' : 
    '🔴 MIGRATION HAS SIGNIFICANT ISSUES - Review and fix before proceeding'
}

📝 NEXT STEPS:
${results.issues.length > 0 ? '1. Address the issues listed above' : '1. ✅ No critical issues found'}
${roleResults.missingRoles.length > 0 ? '2. Run the RBAC update script to create missing roles' : '2. ✅ All system roles are in place'}
3. Test user login flow with sample users
4. Verify application functionality with migrated accounts
5. Send password reset instructions to all users
6. Monitor authentication logs for any issues

🔧 TROUBLESHOOTING:
- If users are missing: Run the migration script again
- If roles are missing: Run 'npm run migrate:update-rbac'
- If Supabase connection fails: Check environment variables
- If metadata is missing: Run the RBAC update script

⚠️ IMPORTANT REMINDERS:
- All users have temporary password: TempPass123!
- Users should be prompted to change passwords
- Monitor system closely for the first 48 hours
- Have support ready for user authentication issues
`;

  console.log(report);

  // Save report to file
  const fs = await import('fs');
  const path = await import('path');
  const reportsDir = path.join(process.cwd(), 'migration-reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(reportsDir, `migration-verification-${Date.now()}.txt`);
  fs.writeFileSync(reportFile, report);
  
  console.log(`📄 Verification report saved to: ${reportFile}`);
}

async function main() {
  console.log('🔍 Starting Migration Verification...\n');

  try {
    // Test Supabase connection first
    const supabaseOk = await testSupabaseConnection();
    
    if (!supabaseOk) {
      console.log('❌ Cannot proceed with verification - Supabase connection failed');
      return;
    }

    // Verify user migrations
    const userResults = await verifyUserMigration();
    
    // Verify system roles
    const roleResults = await verifySystemRoles();
    
    // Generate comprehensive report
    await generateVerificationReport(userResults, roleResults, supabaseOk);

    console.log('\n🎉 Verification completed!');
    
    const overallSuccess = (userResults.successfulMigrations / userResults.totalUsers) >= 0.95;
    if (!overallSuccess) {
      console.log('⚠️  Migration verification found issues. Please review the report.');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as verifyMigration }; 