import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoleAssignments() {
  console.log('🔧 Fixing Role Assignments...\n');

  try {
    // Get or create Student role
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

    // Get or create Parent role
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

    // Get or create Teacher role
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

    // Get or create Employee role
    let employeeRole = await prisma.rbacRole.findFirst({
      where: { name: 'Employee' }
    });

    if (!employeeRole) {
      employeeRole = await prisma.rbacRole.create({
        data: {
          name: 'Employee',
          description: 'Employee role with staff permissions',
          isSystem: true,
          permissions: ['view_dashboard'],
        }
      });
    }

    console.log('✅ All required roles exist\n');

    // Fix student role assignments
    console.log('👨‍🎓 Fixing student role assignments...');
    const studentsNeedingRoles = await prisma.student.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
        AND: {
          NOT: {
            clerkId: {
              in: await prisma.userRole.findMany({
                where: { roleId: studentRole.id },
                select: { userId: true }
              }).then(roles => roles.map(r => r.userId))
            }
          }
        }
      }
    });

    let studentCount = 0;
    for (const student of studentsNeedingRoles) {
      if (!student.clerkId) continue;

      try {
        await prisma.userRole.create({
          data: {
            userId: student.clerkId,
            roleId: studentRole.id,
            branchId: student.branchId,
            isActive: true,
          }
        });
        studentCount++;
        
        if (studentCount % 10 === 0) {
          console.log(`  ✅ Assigned roles to ${studentCount} students...`);
        }
      } catch (error) {
        // Skip if already exists
        if (!error.toString().includes('Unique constraint')) {
          console.log(`    ⚠️  Error for student ${student.admissionNumber}: ${error}`);
        }
      }
    }
    console.log(`✅ Fixed ${studentCount} student role assignments\n`);

    // Fix parent role assignments
    console.log('👨‍👩‍👧‍👦 Fixing parent role assignments...');
    const parentsNeedingRoles = await prisma.parent.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
        AND: {
          NOT: {
            clerkId: {
              in: await prisma.userRole.findMany({
                where: { roleId: parentRole.id },
                select: { userId: true }
              }).then(roles => roles.map(r => r.userId))
            }
          }
        }
      },
      include: {
        students: true
      }
    });

    let parentCount = 0;
    for (const parent of parentsNeedingRoles) {
      if (!parent.clerkId) continue;

      try {
        const branchId = parent.students[0]?.branchId;
        await prisma.userRole.create({
          data: {
            userId: parent.clerkId,
            roleId: parentRole.id,
            branchId: branchId,
            isActive: true,
          }
        });
        parentCount++;
        
        if (parentCount % 10 === 0) {
          console.log(`  ✅ Assigned roles to ${parentCount} parents...`);
        }
      } catch (error) {
        // Skip if already exists
        if (!error.toString().includes('Unique constraint')) {
          console.log(`    ⚠️  Error for parent ${parent.id}: ${error}`);
        }
      }
    }
    console.log(`✅ Fixed ${parentCount} parent role assignments\n`);

    // Fix teacher role assignments
    console.log('👨‍🏫 Fixing teacher role assignments...');
    const teachersNeedingRoles = await prisma.teacher.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
        userRoles: {
          none: {}
        }
      }
    });

    let teacherCount = 0;
    for (const teacher of teachersNeedingRoles) {
      if (!teacher.clerkId) continue;

      try {
        await prisma.userRole.create({
          data: {
            userId: teacher.clerkId,
            roleId: teacherRole.id,
            teacherId: teacher.id,
            branchId: teacher.branchId,
            isActive: true,
          }
        });
        teacherCount++;
      } catch (error) {
        // Skip if already exists
        if (!error.toString().includes('Unique constraint')) {
          console.log(`    ⚠️  Error for teacher ${teacher.firstName} ${teacher.lastName}: ${error}`);
        }
      }
    }
    console.log(`✅ Fixed ${teacherCount} teacher role assignments\n`);

    // Fix employee role assignments
    console.log('👨‍💼 Fixing employee role assignments...');
    const employeesNeedingRoles = await prisma.employee.findMany({
      where: {
        clerkId: {
          not: null,
          not: '',
        },
        userRoles: {
          none: {}
        }
      }
    });

    let employeeCount = 0;
    for (const employee of employeesNeedingRoles) {
      if (!employee.clerkId) continue;

      try {
        // Choose role based on designation
        let roleToAssign = employeeRole;
        if (employee.designation?.toLowerCase().includes('admin')) {
          const adminRole = await prisma.rbacRole.findFirst({ where: { name: 'Admin' } });
          if (adminRole) roleToAssign = adminRole;
        } else if (employee.designation?.toLowerCase().includes('principal')) {
          const principalRole = await prisma.rbacRole.findFirst({ where: { name: 'Principal' } });
          if (principalRole) roleToAssign = principalRole;
        }

        await prisma.userRole.create({
          data: {
            userId: employee.clerkId,
            roleId: roleToAssign.id,
            employeeId: employee.id,
            branchId: employee.branchId,
            isActive: true,
          }
        });
        employeeCount++;
      } catch (error) {
        // Skip if already exists
        if (!error.toString().includes('Unique constraint')) {
          console.log(`    ⚠️  Error for employee ${employee.firstName} ${employee.lastName}: ${error}`);
        }
      }
    }
    console.log(`✅ Fixed ${employeeCount} employee role assignments\n`);

    console.log('🎉 Role assignment fix completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Students: ${studentCount} roles assigned`);
    console.log(`  - Parents: ${parentCount} roles assigned`);
    console.log(`  - Teachers: ${teacherCount} roles assigned`);
    console.log(`  - Employees: ${employeeCount} roles assigned`);
    console.log('\n✅ You can now run: npm run verify:migration');

  } catch (error) {
    console.error('❌ Error fixing role assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixRoleAssignments().catch(console.error);
}

export { fixRoleAssignments }; 