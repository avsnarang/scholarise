import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if branches already exist
    const existingBranches = await prisma.branch.findMany();
    
    if (existingBranches.length > 0) {
      console.log('Branches already exist in the database:');
      existingBranches.forEach(branch => {
        console.log(`- ${branch.name} (${branch.code}) - ID: ${branch.id}`);
      });
      return;
    }

    // Create sample branches
    const branches = await Promise.all([
      prisma.branch.create({
        data: {
          name: 'Paonta Sahib',
          code: 'PS',
          address: '123 Main St',
          city: 'Paonta Sahib',
          state: 'Himachal Pradesh',
          country: 'India',
          phone: '+91 1234567890',
          email: 'ps@scholarise.edu',
          order: 1,
        },
      }),
      prisma.branch.create({
        data: {
          name: 'Juniors',
          code: 'JUN',
          address: '456 Oak Ave',
          city: 'Paonta Sahib',
          state: 'Himachal Pradesh',
          country: 'India',
          phone: '+91 2345678901',
          email: 'jun@scholarise.edu',
          order: 2,
        },
      }),
      prisma.branch.create({
        data: {
          name: 'Majra',
          code: 'MAJ',
          address: '789 Pine Rd',
          city: 'Majra',
          state: 'Himachal Pradesh',
          country: 'India',
          phone: '+91 3456789012',
          email: 'maj@scholarise.edu',
          order: 3,
        },
      }),
    ]);

    console.log('Created branches:');
    branches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.code}) - ID: ${branch.id}`);
    });
  } catch (error) {
    console.error('Error creating branches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
