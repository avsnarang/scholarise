import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStudentStatus() {
  console.log('🔄 Starting migration from isActive to status enum...');
  
  try {
    // Get all students with their current isActive status
    const students = await prisma.student.findMany({
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        isActive: true,
        status: true,
      },
    });

    console.log(`📊 Found ${students.length} students to migrate`);

    let migratedCount = 0;
    let alreadyMigratedCount = 0;
    let errorCount = 0;

    // Migrate students in batches
    const batchSize = 100;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      
      console.log(`\n📋 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(students.length / batchSize)}...`);

      for (const student of batch) {
        try {
          // Determine the correct status based on isActive
          let newStatus: 'ACTIVE' | 'INACTIVE';
          
          if (student.isActive) {
            newStatus = 'ACTIVE';
          } else {
            newStatus = 'INACTIVE';
          }

          // Check if status is already correctly set
          if (student.status === newStatus) {
            alreadyMigratedCount++;
            continue;
          }

          // Update the status
          await prisma.student.update({
            where: { id: student.id },
            data: { status: newStatus },
          });

          console.log(`✅ Migrated: ${student.admissionNumber} - ${student.firstName} ${student.lastName} → ${newStatus}`);
          migratedCount++;

        } catch (error) {
          console.error(`❌ Error migrating student ${student.admissionNumber}:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} students`);
    console.log(`⚠️  Already migrated: ${alreadyMigratedCount} students`);
    console.log(`❌ Errors: ${errorCount} students`);
    console.log(`📋 Total processed: ${students.length} students`);

    // Verification: Check status distribution
    console.log('\n🔍 Status distribution after migration:');
    const statusCounts = await prisma.student.groupBy({
      by: ['status'],
      _count: true,
    });

    statusCounts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count} students`);
    });

    // Verification: Check for any mismatches
    console.log('\n🔍 Checking for isActive/status mismatches:');
    const mismatches = await prisma.student.findMany({
      where: {
        OR: [
          { isActive: true, status: { not: 'ACTIVE' } },
          { isActive: false, status: 'ACTIVE' },
        ],
      },
      select: {
        admissionNumber: true,
        firstName: true,
        lastName: true,
        isActive: true,
        status: true,
      },
    });

    if (mismatches.length > 0) {
      console.log(`⚠️  Found ${mismatches.length} mismatches:`);
      mismatches.forEach(student => {
        console.log(`  ${student.admissionNumber} - isActive: ${student.isActive}, status: ${student.status}`);
      });
    } else {
      console.log('✅ No mismatches found - migration successful!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateStudentStatus()
  .then(() => {
    console.log('🎉 Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });