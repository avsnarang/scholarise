import { PrismaClient } from '@prisma/client';
import { seedLeavePolicies } from './seed/leave-policies/seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if we already have data
  const existingBranches = await prisma.branch.count();
  if (existingBranches > 0) {
    console.log('✅ Database already has data, skipping seed.');
    return;
  }

  // Create a test branch
  const branch = await prisma.branch.create({
    data: {
      name: 'Main Branch',
      code: 'MAIN',
      address: '123 School Street',
      city: 'Demo City',
      state: 'Demo State',
      country: 'Demo Country',
      phone: '+1234567890',
      email: 'main@school.edu',
    },
  });

  // Create an academic session
  const session = await prisma.academicSession.create({
    data: {
      name: '2024-25',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      isActive: true,
    },
  });

  // Create test classes
  const classes = await Promise.all([
    prisma.class.create({
      data: {
        name: 'Class I',
        description: 'First grade',
        grade: 1,
        branchId: branch.id,
        sessionId: session.id,
        displayOrder: 1,
      },
    }),
    prisma.class.create({
      data: {
        name: 'Class II',
        description: 'Second grade',
        grade: 2,
        branchId: branch.id,
        sessionId: session.id,
        displayOrder: 2,
      },
    }),
    prisma.class.create({
      data: {
        name: 'Class III',
        description: 'Third grade',
        grade: 3,
        branchId: branch.id,
        sessionId: session.id,
        displayOrder: 3,
      },
    }),
  ]);

  // Create test teachers
  const teachers = await Promise.all([
    prisma.teacher.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        qualification: 'M.Ed',
        specialization: 'Mathematics',
        branchId: branch.id,
        employeeCode: 'TCH001',
      },
    }),
    prisma.teacher.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        qualification: 'B.Ed',
        specialization: 'English',
        branchId: branch.id,
        employeeCode: 'TCH002',
      },
    }),
  ]);

  // Create sections for each class
  const sections = [];
  for (const cls of classes) {
    // Create A and B sections for each class
    const sectionA = await prisma.section.create({
      data: {
        name: 'A',
        capacity: 30,
        classId: cls.id,
        teacherId: teachers[0]?.id,
        displayOrder: 1,
      },
    });
    
    const sectionB = await prisma.section.create({
      data: {
        name: 'B',
        capacity: 25,
        classId: cls.id,
        teacherId: teachers[1]?.id,
        displayOrder: 2,
      },
    });

    sections.push(sectionA, sectionB);
  }

  // Seed leave policies
  await seedLeavePolicies(prisma, branch.id);

  console.log('✅ Database seeded successfully!');
  console.log(`📊 Created:
    - 1 Branch: ${branch.name}
    - 1 Academic Session: ${session.name}
    - ${classes.length} Classes
    - ${teachers.length} Teachers
    - ${sections.length} Sections
    - Leave Policies`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
