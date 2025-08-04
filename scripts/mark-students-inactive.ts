import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markStudentsInactive() {
  console.log('🔄 Starting to mark students as inactive...');
  
  const admissionNumbers = [
    '10003212',
    '10003017',
    '10003016',
    '10002838',
    '10003246',
    '10003335',
    '10003105',
    '10002725',
    '10003103',
    '10003104',
    '10001814',
    '10002837',
    '10002048',
    '10002262',
    '10003332',
    '10002920',
    '10003133',
    '10001264',
    '10001363',
    '10002921'
  ];

  try {
    let successCount = 0;
    let notFoundCount = 0;
    let alreadyInactiveCount = 0;

    console.log(`📋 Processing ${admissionNumbers.length} students...\n`);

    for (const admissionNumber of admissionNumbers) {
      try {
        // First, check if student exists and their current status
        const existingStudent = await prisma.student.findFirst({
          where: { admissionNumber },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true,
            section: {
              select: {
                name: true,
                class: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });

        if (!existingStudent) {
          console.log(`❌ Student not found: ${admissionNumber}`);
          notFoundCount++;
          continue;
        }

        if (!existingStudent.isActive) {
          console.log(`⚠️  Student already inactive: ${admissionNumber} - ${existingStudent.firstName} ${existingStudent.lastName}`);
          alreadyInactiveCount++;
          continue;
        }

        // Update student to inactive
        await prisma.student.update({
          where: { id: existingStudent.id },
          data: { isActive: false }
        });

        console.log(`✅ Marked inactive: ${admissionNumber} - ${existingStudent.firstName} ${existingStudent.lastName} (${existingStudent.section?.class?.name} ${existingStudent.section?.name})`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing ${admissionNumber}:`, error);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully marked inactive: ${successCount} students`);
    console.log(`⚠️  Already inactive: ${alreadyInactiveCount} students`);
    console.log(`❌ Not found: ${notFoundCount} students`);
    console.log(`📋 Total processed: ${admissionNumbers.length} students`);

    // Verify the changes
    console.log('\n🔍 Verification - checking updated students:');
    const updatedStudents = await prisma.student.findMany({
      where: {
        admissionNumber: { in: admissionNumbers },
        isActive: false
      },
      select: {
        admissionNumber: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    console.log(`✅ Confirmed ${updatedStudents.length} students are now inactive`);

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
markStudentsInactive()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });