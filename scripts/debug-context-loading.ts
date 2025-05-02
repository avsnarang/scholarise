import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Debugging context loading issues...');

  try {
    // Check if the context provider initialization might be failing
    
    // 1. Test Branch API
    console.log('\nTesting Branch API:');
    
    // Test getAll
    console.log('Testing api.branch.getAll:');
    try {
      const branches = await prisma.branch.findMany();
      console.log(`✅ Successfully retrieved ${branches.length} branches`);
    } catch (error) {
      console.error('❌ Error in branch.getAll:', error);
    }
    
    // Test getById with first branch
    try {
      const firstBranch = await prisma.branch.findFirst();
      if (firstBranch) {
        console.log(`Testing api.branch.getById with ${firstBranch.id}:`);
        const branch = await prisma.branch.findUnique({
          where: { id: firstBranch.id }
        });
        console.log(`✅ Successfully retrieved branch: ${branch?.name}`);
      }
    } catch (error) {
      console.error('❌ Error in branch.getById:', error);
    }
    
    // 2. Test Academic Session API
    console.log('\nTesting Academic Session API:');
    
    // Test getAll
    console.log('Testing api.academicSession.getAll:');
    try {
      const sessions = await prisma.academicSession.findMany();
      console.log(`✅ Successfully retrieved ${sessions.length} academic sessions`);
    } catch (error) {
      console.error('❌ Error in academicSession.getAll:', error);
    }
    
    // Test getCurrentSession
    console.log('Testing api.academicSession.getCurrentSession:');
    try {
      const currentSession = await prisma.academicSession.findFirst({
        where: { isActive: true }
      });
      if (currentSession) {
        console.log(`✅ Successfully retrieved current session: ${currentSession.name}`);
      } else {
        console.log('⚠️ No active session found');
      }
    } catch (error) {
      console.error('❌ Error in academicSession.getCurrentSession:', error);
    }
    
    // 3. Local Storage Test simulation
    console.log('\nSimulating Local Storage Behavior:');
    
    console.log('For branch context:');
    // Get first branch id to simulate local storage
    const firstBranch = await prisma.branch.findFirst();
    if (firstBranch) {
      console.log(`✅ If localStorage has '${firstBranch.id}', it should load ${firstBranch.name}`);
    }
    
    console.log('For academic session context:');
    // Get first active session id to simulate local storage
    const activeSession = await prisma.academicSession.findFirst({ where: { isActive: true } });
    if (activeSession) {
      console.log(`✅ If localStorage has '${activeSession.id}', it should load ${activeSession.name}`);
    }
    
  } catch (error) {
    console.error('Error in debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 