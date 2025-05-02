import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running API route debugging...');

  try {
    // Check branches
    console.log('\n== BRANCHES ==');
    const branches = await prisma.branch.findMany({
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
    });
    
    console.log(`Found ${branches.length} branches:`);
    if (branches.length > 0) {
      branches.forEach(branch => {
        console.log(`- ${branch.name} (${branch.code}): ${branch.id}`);
      });
    } else {
      console.log('No branches found in the database');
      console.log('Creating a sample branch...');
      
      const newBranch = await prisma.branch.create({
        data: {
          name: 'Main Campus',
          code: 'MAIN',
          address: '123 Education St',
          city: 'Knowledge City',
          state: 'Learning State',
          country: 'Education Land',
          phone: '123-456-7890',
          email: 'main@example.com',
          order: 1,
        }
      });
      
      console.log(`Created branch: ${newBranch.name} (${newBranch.code}): ${newBranch.id}`);
    }

    // Check academic sessions
    console.log('\n== ACADEMIC SESSIONS ==');
    const sessions = await prisma.academicSession.findMany({
      orderBy: [
        { startDate: 'desc' },
        { name: 'asc' }
      ],
    });
    
    console.log(`Found ${sessions.length} academic sessions:`);
    if (sessions.length > 0) {
      sessions.forEach(session => {
        console.log(`- ${session.name} (${session.isActive ? 'ACTIVE' : 'inactive'}): ${session.id}`);
        console.log(`  ${session.startDate.toISOString()} - ${session.endDate.toISOString()}`);
      });
    } else {
      console.log('No academic sessions found in the database');
      console.log('Creating a sample academic session...');
      
      const now = new Date();
      const endDate = new Date();
      endDate.setFullYear(now.getFullYear() + 1);
      
      const newSession = await prisma.academicSession.create({
        data: {
          name: 'Academic Year 2023-2024',
          startDate: now,
          endDate: endDate,
          isActive: true,
        }
      });
      
      console.log(`Created session: ${newSession.name} (${newSession.isActive ? 'ACTIVE' : 'inactive'}): ${newSession.id}`);
    }

    // Test full data path
    console.log('\n== DATA PATH TEST ==');
    
    // Check context providers
    console.log('Simulating context provider loading...');
    console.log('- BranchContext would load branch data via api.branch.getAll.useQuery()');
    console.log('- AcademicSessionContext would load session data via api.academicSession.getAll.useQuery()');
    
    console.log('\nThe fix we implemented:');
    console.log('1. Added proper data transformation in the httpBatchLink config');
    console.log('2. Added defensive coding to handle non-array data in components');
    console.log('3. Simplified component UI for better performance and debugging');
    
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  }); 