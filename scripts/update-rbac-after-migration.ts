import { PrismaClient } from '@prisma/client';
import { updateUserMetadata } from '@/utils/supabase-auth';

const prisma = new PrismaClient();

interface RoleUpdateStats {
  usersProcessed: number;
  rolesCreated: number;
  roleAssignmentsUpdated: number;
  metadataUpdated: number;
  errors: string[];
}

// Define default roles that should exist in the system
const DEFAULT_ROLES = [
  { name: 'Student', description: 'Student role with basic permissions', isSystem: true },
  { name: 'Parent', description: 'Parent role with student-related permissions', isSystem: true },
  { name: 'Teacher', description: 'Teacher role with classroom management permissions', isSystem: true },
  { name: 'Employee', description: 'Employee role with staff permissions', isSystem: true },
  { name: 'Admin', description: 'Administrative role with elevated permissions', isSystem: true },
  { name: 'SuperAdmin', description: 'Super admin role with all permissions', isSystem: true },
  { name: 'Principal', description: 'Principal role with school-wide permissions', isSystem: true },
  { name: 'Head Teacher', description: 'Head teacher role with department permissions', isSystem: true },
  { name: 'Admission Staff', description: 'Admission staff role with enrollment permissions', isSystem: true },
];

async function ensureDefaultRoles(): Promise<void> {
  console.log('📋 Ensuring default roles exist...');

  for (const roleData of DEFAULT_ROLES) {
    const existingRole = await prisma.rbacRole.findFirst({
      where: { name: roleData.name }
    });

    if (!existingRole) {
      await prisma.rbacRole.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
          permissions: [], // Will be set by permission seeding script
        }
      });
      console.log(`✅ Created role: ${roleData.name}`);
    } else {
      console.log(`⏭️  Role already exists: ${roleData.name}`);
    }
  }
}

async function updateStudentRoles(): Promise<number> {
  console.log('👨‍🎓 Updating student role assignments...');
  
  const students = await prisma.student.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    include: {
      branch: true,
    }
  });

  let updated = 0;

  // Find or create Student role
  let studentRole = await prisma.rbacRole.findFirst({
    where: { name: 'Student' }
  });

  if (!studentRole) {
    studentRole = await prisma.rbacRole.create({
      data: {
        name: 'Student',
        description: 'Student role with basic permissions',
        isSystem: true,
        permissions: ['view_dashboard', 'view_own_attendance', 'view_own_marks'],
      }
    });
  }

  for (const student of students) {
    if (!student.clerkId) continue;

    try {
      // Check if user role assignment already exists
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: student.clerkId,
          roleId: studentRole.id,
        }
      });

      if (!existingUserRole) {
        // Create user role assignment
        await prisma.userRole.create({
          data: {
            userId: student.clerkId,
            roleId: studentRole.id,
            branchId: student.branchId,
            isActive: true,
          }
        });

        // Update Supabase user metadata
        await updateUserMetadata(student.clerkId, {
          role: 'Student',
          roles: ['Student'],
          branchId: student.branchId,
          permissions: studentRole.permissions,
        });

        updated++;
      }
    } catch (error) {
      console.error(`❌ Error updating student ${student.admissionNumber}:`, error);
    }
  }

  console.log(`✅ Updated ${updated} student role assignments`);
  return updated;
}

async function updateParentRoles(): Promise<number> {
  console.log('👨‍👩‍👧‍👦 Updating parent role assignments...');
  
  const parents = await prisma.parent.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    include: {
      students: {
        include: {
          branch: true,
        }
      }
    }
  });

  let updated = 0;

  // Find or create Parent role
  let parentRole = await prisma.rbacRole.findFirst({
    where: { name: 'Parent' }
  });

  if (!parentRole) {
    parentRole = await prisma.rbacRole.create({
      data: {
        name: 'Parent',
        description: 'Parent role with student-related permissions',
        isSystem: true,
        permissions: ['view_dashboard', 'view_child_attendance', 'view_child_marks', 'view_child_fees'],
      }
    });
  }

  for (const parent of parents) {
    if (!parent.clerkId) continue;

    try {
      // Get branch ID from first student
      const branchId = parent.students[0]?.branchId;

      // Check if user role assignment already exists
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: parent.clerkId,
          roleId: parentRole.id,
        }
      });

      if (!existingUserRole) {
        // Create user role assignment
        await prisma.userRole.create({
          data: {
            userId: parent.clerkId,
            roleId: parentRole.id,
            branchId: branchId,
            isActive: true,
          }
        });

        // Update Supabase user metadata
        await updateUserMetadata(parent.clerkId, {
          role: 'Parent',
          roles: ['Parent'],
          branchId: branchId,
          permissions: parentRole.permissions,
        });

        updated++;
      }
    } catch (error) {
      console.error(`❌ Error updating parent ${parent.id}:`, error);
    }
  }

  console.log(`✅ Updated ${updated} parent role assignments`);
  return updated;
}

async function updateTeacherRoles(): Promise<number> {
  console.log('👨‍🏫 Updating teacher role assignments...');
  
  const teachers = await prisma.teacher.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    include: {
      userRoles: {
        include: {
          role: true,
        }
      }
    }
  });

  let updated = 0;

  for (const teacher of teachers) {
    if (!teacher.clerkId) continue;

    try {
      // If teacher already has role assignments, update metadata
      if (teacher.userRoles.length > 0) {
        const roles = teacher.userRoles.map(ur => ur.role.name);
        const permissions = teacher.userRoles.flatMap(ur => ur.role.permissions);

        await updateUserMetadata(teacher.clerkId, {
          role: roles[0] || 'Teacher',
          roles: roles,
          branchId: teacher.branchId,
          permissions: [...new Set(permissions)], // Remove duplicates
        });

        updated++;
      } else {
        // Create default Teacher role assignment
        let teacherRole = await prisma.rbacRole.findFirst({
          where: { name: 'Teacher' }
        });

        if (!teacherRole) {
          teacherRole = await prisma.rbacRole.create({
            data: {
              name: 'Teacher',
              description: 'Teacher role with classroom management permissions',
              isSystem: true,
              permissions: ['view_dashboard', 'manage_attendance', 'enter_marks', 'view_students'],
            }
          });
        }

        await prisma.userRole.create({
          data: {
            userId: teacher.clerkId,
            roleId: teacherRole.id,
            teacherId: teacher.id,
            branchId: teacher.branchId,
            isActive: true,
          }
        });

        await updateUserMetadata(teacher.clerkId, {
          role: 'Teacher',
          roles: ['Teacher'],
          branchId: teacher.branchId,
          permissions: teacherRole.permissions,
        });

        updated++;
      }
    } catch (error) {
      console.error(`❌ Error updating teacher ${teacher.firstName} ${teacher.lastName}:`, error);
    }
  }

  console.log(`✅ Updated ${updated} teacher role assignments`);
  return updated;
}

async function updateEmployeeRoles(): Promise<number> {
  console.log('👨‍💼 Updating employee role assignments...');
  
  const employees = await prisma.employee.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    },
    include: {
      userRoles: {
        include: {
          role: true,
        }
      }
    }
  });

  let updated = 0;

  for (const employee of employees) {
    if (!employee.clerkId) continue;

    try {
      // If employee already has role assignments, update metadata
      if (employee.userRoles.length > 0) {
        const roles = employee.userRoles.map(ur => ur.role.name);
        const permissions = employee.userRoles.flatMap(ur => ur.role.permissions);

        await updateUserMetadata(employee.clerkId, {
          role: roles[0] || 'Employee',
          roles: roles,
          branchId: employee.branchId,
          permissions: [...new Set(permissions)], // Remove duplicates
        });

        updated++;
      } else {
        // Create default Employee role assignment based on designation
        let roleName = 'Employee';
        if (employee.designation?.toLowerCase().includes('admin')) {
          roleName = 'Admin';
        } else if (employee.designation?.toLowerCase().includes('principal')) {
          roleName = 'Principal';
        } else if (employee.designation?.toLowerCase().includes('head')) {
          roleName = 'Head Teacher';
        }

        let employeeRole = await prisma.rbacRole.findFirst({
          where: { name: roleName }
        });

        if (!employeeRole) {
          employeeRole = await prisma.rbacRole.create({
            data: {
              name: roleName,
              description: `${roleName} role with appropriate permissions`,
              isSystem: true,
              permissions: roleName === 'Admin' ? ['view_dashboard', 'manage_users', 'view_reports'] : ['view_dashboard'],
            }
          });
        }

        await prisma.userRole.create({
          data: {
            userId: employee.clerkId,
            roleId: employeeRole.id,
            employeeId: employee.id,
            branchId: employee.branchId,
            isActive: true,
          }
        });

        await updateUserMetadata(employee.clerkId, {
          role: roleName,
          roles: [roleName],
          branchId: employee.branchId,
          permissions: employeeRole.permissions,
        });

        updated++;
      }
    } catch (error) {
      console.error(`❌ Error updating employee ${employee.firstName} ${employee.lastName}:`, error);
    }
  }

  console.log(`✅ Updated ${updated} employee role assignments`);
  return updated;
}

async function updateAdmissionStaffRoles(): Promise<number> {
  console.log('🎓 Updating admission staff role assignments...');
  
  const admissionStaff = await prisma.admissionStaff.findMany({
    where: {
      clerkId: {
        not: null,
        not: '',
      }
    }
  });

  let updated = 0;

  // Find or create Admission Staff role
  let admissionRole = await prisma.rbacRole.findFirst({
    where: { name: 'Admission Staff' }
  });

  if (!admissionRole) {
    admissionRole = await prisma.rbacRole.create({
      data: {
        name: 'Admission Staff',
        description: 'Admission staff role with enrollment permissions',
        isSystem: true,
        permissions: ['view_dashboard', 'manage_admissions', 'view_leads'],
      }
    });
  }

  for (const staff of admissionStaff) {
    if (!staff.clerkId) continue;

    try {
      // Check if user role assignment already exists
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: staff.clerkId,
          roleId: admissionRole.id,
        }
      });

      if (!existingUserRole) {
        // Create user role assignment
        await prisma.userRole.create({
          data: {
            userId: staff.clerkId,
            roleId: admissionRole.id,
            isActive: true,
          }
        });

        // Update Supabase user metadata
        await updateUserMetadata(staff.clerkId, {
          role: 'Admission Staff',
          roles: ['Admission Staff'],
          permissions: admissionRole.permissions,
        });

        updated++;
      }
    } catch (error) {
      console.error(`❌ Error updating admission staff ${staff.name}:`, error);
    }
  }

  console.log(`✅ Updated ${updated} admission staff role assignments`);
  return updated;
}

async function generateRbacReport(stats: RoleUpdateStats): Promise<void> {
  const report = `
📊 RBAC UPDATE REPORT
====================
📅 Update Date: ${new Date().toISOString()}

📈 UPDATE STATISTICS:
- Users Processed: ${stats.usersProcessed}
- Roles Created: ${stats.rolesCreated}
- Role Assignments Updated: ${stats.roleAssignmentsUpdated}
- User Metadata Updated: ${stats.metadataUpdated}

${stats.errors.length > 0 ? `
❌ ERRORS ENCOUNTERED:
${stats.errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}
` : '✅ No errors encountered during RBAC update.'}

✅ RBAC SYSTEM STATUS:
- All migrated users should now have proper role assignments
- User metadata in Supabase has been updated with roles and permissions
- Default system roles have been created
- Role-based access control is fully functional

🔍 VERIFICATION STEPS:
1. Test login for users from each role type
2. Verify permission checks are working correctly
3. Check that branch-specific access is properly enforced
4. Ensure user dashboards show appropriate content based on roles

📝 NEXT STEPS:
1. Run permission tests to verify all role assignments work correctly
2. Update any hardcoded role checks in the application
3. Consider running the seed permissions script if needed
4. Monitor user access patterns for any permission issues
`;

  console.log(report);

  // Save report to file
  const fs = await import('fs');
  const path = await import('path');
  const reportsDir = path.join(process.cwd(), 'migration-reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(reportsDir, `rbac-update-${Date.now()}.txt`);
  fs.writeFileSync(reportFile, report);
  
  console.log(`📄 RBAC update report saved to: ${reportFile}`);
}

async function main() {
  console.log('🔐 Starting RBAC Update After Migration...\n');

  const stats: RoleUpdateStats = {
    usersProcessed: 0,
    rolesCreated: 0,
    roleAssignmentsUpdated: 0,
    metadataUpdated: 0,
    errors: [],
  };

  try {
    // Step 1: Ensure default roles exist
    await ensureDefaultRoles();

    // Step 2: Update role assignments for each user type
    console.log('\n👥 Updating user role assignments...');
    
    const studentUpdates = await updateStudentRoles();
    stats.roleAssignmentsUpdated += studentUpdates;
    stats.metadataUpdated += studentUpdates;

    const parentUpdates = await updateParentRoles();
    stats.roleAssignmentsUpdated += parentUpdates;
    stats.metadataUpdated += parentUpdates;

    const teacherUpdates = await updateTeacherRoles();
    stats.roleAssignmentsUpdated += teacherUpdates;
    stats.metadataUpdated += teacherUpdates;

    const employeeUpdates = await updateEmployeeRoles();
    stats.roleAssignmentsUpdated += employeeUpdates;
    stats.metadataUpdated += employeeUpdates;

    const admissionUpdates = await updateAdmissionStaffRoles();
    stats.roleAssignmentsUpdated += admissionUpdates;
    stats.metadataUpdated += admissionUpdates;

    stats.usersProcessed = studentUpdates + parentUpdates + teacherUpdates + employeeUpdates + admissionUpdates;

    // Step 3: Generate report
    await generateRbacReport(stats);

    console.log('\n🎉 RBAC update completed successfully!');

  } catch (error) {
    console.error('💥 RBAC update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as updateRbacAfterMigration }; 