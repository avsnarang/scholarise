import { PrismaClient } from '@prisma/client';

export async function seedLeavePolicies(prisma: PrismaClient, branchId: string) {
  console.log('Seeding leave policies...');

  const defaultPolicies = [
    {
      name: "Casual Leave",
      description: "Short-term leave for personal matters",
      maxDaysPerYear: 12,
      isPaid: true,
      applicableRoles: ["Teacher", "Employee"],
      branchId,
    },
    {
      name: "Sick Leave",
      description: "Leave for medical reasons with doctor's certificate",
      maxDaysPerYear: 15,
      isPaid: true,
      applicableRoles: ["Teacher", "Employee"],
      branchId,
    },
    {
      name: "Maternity Leave",
      description: "Leave for female staff during childbirth",
      maxDaysPerYear: 90,
      isPaid: true,
      applicableRoles: ["Teacher", "Employee"],
      branchId,
    },
    {
      name: "Paternity Leave",
      description: "Leave for male staff during childbirth",
      maxDaysPerYear: 15,
      isPaid: true,
      applicableRoles: ["Teacher", "Employee"],
      branchId,
    },
    {
      name: "Study Leave",
      description: "Leave for academic pursuits and professional development",
      maxDaysPerYear: 30,
      isPaid: false,
      applicableRoles: ["Teacher"],
      branchId,
    },
    {
      name: "Long-term Medical Leave",
      description: "Extended leave for major medical conditions",
      maxDaysPerYear: 60,
      isPaid: true,
      applicableRoles: ["Teacher", "Employee"],
      branchId,
    },
    {
      name: "Unpaid Leave",
      description: "Leave without pay for personal reasons",
      maxDaysPerYear: 30,
      isPaid: false,
      applicableRoles: ["Teacher", "Employee"],
      branchId,
    }
  ];

  // Check if policies already exist for this branch
  const existingPolicies = await prisma.leavePolicy.findMany({
    where: { branchId },
  });

  if (existingPolicies.length > 0) {
    console.log(`${existingPolicies.length} leave policies already exist for this branch.`);
    return;
  }

  // Create policies
  const policies = await Promise.all(
    defaultPolicies.map(async (policy) => {
      return prisma.leavePolicy.create({
        data: policy,
      });
    })
  );

  console.log(`Created ${policies.length} leave policies.`);

  // Create leave balances for existing teachers and employees
  const currentYear = new Date().getFullYear();
  
  // Get all active teachers and employees
  const teachers = await prisma.teacher.findMany({
    where: { 
      branchId,
      isActive: true 
    },
  });
  
  const employees = await prisma.employee.findMany({
    where: { 
      branchId,
      isActive: true 
    },
  });

  console.log(`Creating leave balances for ${teachers.length} teachers and ${employees.length} employees...`);

  // Create leave balances for teachers
  for (const teacher of teachers) {
    for (const policy of policies) {
      // Skip policies not applicable to teachers
      if (!policy.applicableRoles.includes('Teacher')) continue;
      
      await prisma.leaveBalance.create({
        data: {
          year: currentYear,
          totalDays: policy.maxDaysPerYear,
          usedDays: 0,
          remainingDays: policy.maxDaysPerYear,
          policyId: policy.id,
          teacherId: teacher.id,
        },
      });
    }
  }

  // Create leave balances for employees
  for (const employee of employees) {
    for (const policy of policies) {
      // Skip policies not applicable to employees
      if (!policy.applicableRoles.includes('Employee')) continue;
      
      await prisma.leaveBalance.create({
        data: {
          year: currentYear,
          totalDays: policy.maxDaysPerYear,
          usedDays: 0,
          remainingDays: policy.maxDaysPerYear,
          policyId: policy.id,
          employeeId: employee.id,
        },
      });
    }
  }

  console.log('Leave policies and balances seeded successfully!');
}
