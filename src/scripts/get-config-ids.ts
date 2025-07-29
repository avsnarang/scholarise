import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getConfigurationIds() {
  try {
    console.log('🔍 Finding Branch and Session IDs for import scripts...\n');

    // Get all branches
      const branches = await prisma.branch.findMany({
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log('📍 Available Branches:');
  console.log('═'.repeat(50));
  branches.forEach((branch, index) => {
    console.log(`${index + 1}. ${branch.name} (${branch.code})`);
    console.log(`   ID: ${branch.id}`);
  });

    // Get all academic sessions
    const sessions = await prisma.academicSession.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    console.log('\n📅 Available Academic Sessions:');
    console.log('═'.repeat(50));
    sessions.forEach((session, index) => {
      const status = session.isActive ? '✅ Active' : '❌ Inactive';
      const startYear = session.startDate.getFullYear();
      const endYear = session.endDate.getFullYear();
      console.log(`${index + 1}. ${session.name} (${startYear}-${endYear}) - ${status}`);
      console.log(`   ID: ${session.id}`);
    });

      // Suggest the most likely configuration
  const firstBranch = branches[0]; // Just pick the first branch since we can't determine "active" or "HQ"
  const currentSession = sessions.find(s => s.isActive);

    if (firstBranch && currentSession) {
      console.log('\n🎯 Recommended Configuration:');
      console.log('═'.repeat(50));
      console.log(`Branch: ${firstBranch.name}`);
      console.log(`BRANCH_ID = '${firstBranch.id}'`);
      console.log(`\nSession: ${currentSession.name}`);
      console.log(`SESSION_ID = '${currentSession.id}'`);

      console.log('\n📝 Copy these values to your import scripts:');
      console.log('═'.repeat(50));
      console.log(`const BRANCH_ID = '${firstBranch.id}';`);
      console.log(`const SESSION_ID = '${currentSession.id}';`);

      // Generate script templates
      console.log('\n📋 Script Commands (with correct IDs):');
      console.log('═'.repeat(50));
      console.log('1. Import admission data:');
      console.log(`   npx tsx src/scripts/import-admissions-data.ts`);
      console.log('\n2. Setup new admission fees:');
      console.log(`   npx tsx src/scripts/setup-new-admission-fees.ts`);
      console.log('\n3. Cleanup fees (if needed):');
      console.log(`   npx tsx src/scripts/setup-new-admission-fees.ts cleanup`);
    } else {
      console.log('\n⚠️  Warning: Could not find branch or active session.');
      console.log('Please manually select the appropriate IDs from the lists above.');
    }

  } catch (error) {
    console.error('❌ Error fetching configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateConfiguration(branchId: string, sessionId: string) {
  try {
    console.log('🔍 Validating configuration...\n');

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    const session = await prisma.academicSession.findUnique({
      where: { id: sessionId },
    });

    if (!branch) {
      console.log('❌ Invalid BRANCH_ID: Branch not found');
      return false;
    }

    if (!session) {
      console.log('❌ Invalid SESSION_ID: Session not found');
      return false;
    }

    console.log('✅ Configuration is valid!');
    console.log(`Branch: ${branch.name}`);
    console.log(`Session: ${session.name} (${session.isActive ? 'Active' : 'Inactive'})`);

    if (!session.isActive) {
      console.log('⚠️  Warning: Selected session is inactive');
    }

    return true;

  } catch (error) {
    console.error('❌ Error validating configuration:', error);
    return false;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const branchId = process.argv[3];
  const sessionId = process.argv[4];

  if (command === 'validate' && branchId && sessionId) {
    validateConfiguration(branchId, sessionId)
      .then((isValid) => {
        process.exit(isValid ? 0 : 1);
      })
      .catch(() => {
        process.exit(1);
      });
  } else {
    getConfigurationIds()
      .then(() => {
        console.log('\n✅ Configuration retrieval completed!');
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  }
}

export { getConfigurationIds, validateConfiguration }; 