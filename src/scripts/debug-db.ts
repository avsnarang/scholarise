import { PrismaClient } from '@prisma/client';

const debugDatabase = async () => {
  console.log('🔍 Database Debug Script');
  console.log('------------------------');

  try {
    const prisma = new PrismaClient();
    
    // Connect to the database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Check for designations
    const designationCount = await prisma.designation.count();
    console.log(`Found ${designationCount} designations in the database`);
    
    if (designationCount > 0) {
      const designations = await prisma.designation.findMany({ take: 5 });
      console.log('Sample designations:', designations);
    }

    // Check for departments
    const departmentCount = await prisma.department.count();
    console.log(`Found ${departmentCount} departments in the database`);
    
    if (departmentCount > 0) {
      const departments = await prisma.department.findMany({ take: 5 });
      console.log('Sample departments:', departments);
    }

    // Check for branches
    const branchCount = await prisma.branch.count();
    console.log(`Found ${branchCount} branches in the database`);
    
    if (branchCount > 0) {
      const branches = await prisma.branch.findMany({ take: 5 });
      console.log('Sample branches:', branches.map(b => ({ id: b.id, name: b.name, code: b.code })));
    }

    // Disconnect
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
  }
};

// Run the debug function
debugDatabase(); 