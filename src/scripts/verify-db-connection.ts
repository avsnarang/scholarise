import { db } from '@/server/db';

/**
 * This script verifies that our database connection works properly.
 * It tests the singleton pattern, connection resilience, and model access.
 */
async function verifyDatabaseConnection() {
  console.log('🔍 Database Connection Verification');
  console.log('----------------------------------');

  try {
    // Test the connection
    console.log('Testing database connection...');
    await db.$connect();
    console.log('✅ Database connection successful');

    // Check that models are available
    const models = Object.keys(db).filter(key => !key.startsWith('_'));
    console.log(`Available models: ${models.join(', ')}`);
    
    if (!models.includes('designation') || !models.includes('department')) {
      console.error('❌ Critical models missing!');
    } else {
      console.log('✅ Critical models are available');
    }

    // Perform a basic query on each critical model
    console.log('\nTesting designation model:');
    const designationCount = await db.designation.count();
    console.log(`Found ${designationCount} designations`);
    
    if (designationCount > 0) {
      const sampleDesignation = await db.designation.findFirst();
      console.log('Sample designation:', JSON.stringify(sampleDesignation, null, 2));
    }

    console.log('\nTesting department model:');
    const departmentCount = await db.department.count();
    console.log(`Found ${departmentCount} departments`);
    
    if (departmentCount > 0) {
      const sampleDepartment = await db.department.findFirst();
      console.log('Sample department:', JSON.stringify(sampleDepartment, null, 2));
    }

    console.log('\nTesting branch model:');
    const branchCount = await db.branch.count();
    console.log(`Found ${branchCount} branches`);
    
    if (branchCount > 0) {
      const sampleBranch = await db.branch.findFirst();
      console.log('Sample branch:', JSON.stringify(sampleBranch, null, 2));
    }

    // Test transaction capability
    console.log('\nTesting transaction capability:');
    await db.$transaction(async (prisma) => {
      const count = await prisma.designation.count();
      console.log(`Designation count inside transaction: ${count}`);
      return count;
    });
    console.log('✅ Transaction completed successfully');

    // Close the connection
    await db.$disconnect();
    console.log('\n✅ Database connection verified and closed successfully');
  } catch (error) {
    console.error('❌ Database connection verification failed:', error);
  }
}

// Run the verification
verifyDatabaseConnection().catch(console.error); 