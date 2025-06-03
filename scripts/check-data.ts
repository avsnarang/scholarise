import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking database content...');

  try {
    // Check branches
    const branches = await prisma.branch.findMany();
    console.log(`Found ${branches.length} branches:`);
    if (branches.length > 0) {
      branches.forEach(branch => {
        console.log(`- ${branch.name} (${branch.code}): ${branch.id}`);
      });
    } else {
      console.log('No branches found in the database');
    }

    // Check academic sessions
    const sessions = await prisma.academicSession.findMany();
    console.log(`\nFound ${sessions.length} academic sessions:`);
    if (sessions.length > 0) {
      sessions.forEach(session => {
        console.log(`- ${session.name} (${session.isActive ? 'ACTIVE' : 'inactive'}): ${session.id}`);
      });
    } else {
      console.log('No academic sessions found in the database');
    }

    // Check classes to see if they're linked
    const classes = await prisma.class.findMany({
      include: {
        branch: true,
        session: true,
        sections: true
      }
    });
    console.log(`\nFound ${classes.length} classes:`);
    if (classes.length > 0) {
      classes.forEach(cls => {
        const sectionNames = cls.sections.map(s => s.name).join(', ');
        console.log(`- ${cls.name} (sections: ${sectionNames}): Branch=${cls.branch.name}, Session=${cls.session.name}`);
      });
    } else {
      console.log('No classes found in the database');
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 