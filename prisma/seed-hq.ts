import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if Headquarters branch already exists
  const existingHQ = await prisma.branch.findUnique({
    where: { id: 'headquarters' }
  });

  if (!existingHQ) {
    // Create Headquarters branch
    const headquarters = await prisma.branch.create({
      data: {
        id: 'headquarters',  // Use a fixed ID so it can be referenced consistently
        name: 'Headquarters',
        code: 'HQ',
        address: 'Main Administrative Office',
        city: 'Corporate City',
        state: 'Corporate State',
        country: 'India',
        phone: '+91 1234567890',
        email: 'headquarters@scholarise.edu',
      }
    });

    console.log('Created Headquarters branch:', headquarters);
  } else {
    console.log('Headquarters branch already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 