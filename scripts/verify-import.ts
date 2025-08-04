import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  console.log('🔍 Verifying student import...');
  
  try {
    // Check for the newly imported students
    const admissionNumbers = ['10003489', '10003488', '10003487'];
    
    for (const admissionNumber of admissionNumbers) {
      const student = await prisma.student.findFirst({
        where: { admissionNumber },
        include: {
          parent: true,
          section: {
            include: {
              class: true,
            },
          },
          academicRecords: {
            include: {
              session: true,
            },
          },
        },
      });
      
      if (student) {
        console.log(`✅ Student found: ${student.firstName} ${student.lastName}`);
        console.log(`   📋 Admission Number: ${student.admissionNumber}`);
        console.log(`   📧 Email: ${student.email}`);
        console.log(`   🏫 Section: ${student.section?.name} (Class: ${student.section?.class?.name})`);
        console.log(`   👨‍👩‍👧‍👦 Parent: ${student.parent?.fatherName || 'N/A'} & ${student.parent?.motherName || 'N/A'}`);
        console.log(`   📚 Academic Records: ${student.academicRecords.length} records`);
        if (student.academicRecords.length > 0) {
          console.log(`   📅 Session: ${student.academicRecords[0]?.session?.name}`);
        }
        console.log('');
      } else {
        console.log(`❌ Student not found: ${admissionNumber}`);
      }
    }
    
    // Get total student count for this branch
    const totalStudents = await prisma.student.count({
      where: {
        branch: {
          code: 'PS'
        }
      }
    });
    
    console.log(`📊 Total students in PS branch: ${totalStudents}`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyImport()
  .then(() => {
    console.log('🎉 Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });