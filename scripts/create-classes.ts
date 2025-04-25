import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to create classes for all branches and sessions...');

  // Get all branches
  const branches = await prisma.branch.findMany();
  if (branches.length === 0) {
    console.error('No branches found. Please create branches first.');
    return;
  }
  console.log(`Found ${branches.length} branches`);

  // Get all academic sessions
  const sessions = await prisma.academicSession.findMany();
  if (sessions.length === 0) {
    console.error('No academic sessions found. Please create sessions first.');
    return;
  }
  console.log(`Found ${sessions.length} academic sessions`);

  // Class data template
  const classData = [
    { name: '1st', section: 'A', capacity: 30 },
    { name: '1st', section: 'B', capacity: 30 },
    { name: '2nd', section: 'A', capacity: 30 },
    { name: '2nd', section: 'B', capacity: 30 },
    { name: '3rd', section: 'A', capacity: 30 },
    { name: '3rd', section: 'B', capacity: 30 },
  ];

  // Create classes for each branch and session
  for (const branch of branches) {
    console.log(`Creating classes for branch: ${branch.name} (${branch.code})`);

    for (const session of sessions) {
      console.log(`- Session: ${session.name}`);

      // Check if classes already exist for this branch and session
      const existingClasses = await prisma.class.count({
        where: {
          branchId: branch.id,
          sessionId: session.id,
        },
      });

      if (existingClasses > 0) {
        console.log(`  Classes already exist for this branch and session. Skipping.`);
        continue;
      }

      // Create classes for this branch and session
      for (const cls of classData) {
        const newClass = await prisma.class.create({
          data: {
            name: cls.name,
            section: cls.section,
            capacity: cls.capacity,
            isActive: true,
            branchId: branch.id,
            sessionId: session.id,
          },
        });
        console.log(`  Created class ${cls.name}-${cls.section}`);
      }
    }
  }

  console.log('Class creation completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 