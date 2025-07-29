import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import path from 'path';

const prisma = new PrismaClient();

async function updateInquiryGenders() {
  console.log('🔄 Starting gender value update for admission inquiries...');
  
  try {
    // First, let's see what we're working with
    const beforeUpdate = await prisma.admissionInquiry.findMany({
      where: {
        gender: {
          in: ['M', 'F', 'Male', 'Female']
        }
      },
      select: {
        id: true,
        gender: true,
        firstName: true,
        lastName: true,
        registrationNumber: true
      }
    });

    console.log(`📊 Found ${beforeUpdate.length} inquiries with non-standardized gender values:`);
    const mCount = beforeUpdate.filter(i => i.gender === 'M').length;
    const fCount = beforeUpdate.filter(i => i.gender === 'F').length;
    const maleCount = beforeUpdate.filter(i => i.gender === 'Male').length;
    const femaleCount = beforeUpdate.filter(i => i.gender === 'Female').length;
    console.log(`   - M: ${mCount} records`);
    console.log(`   - F: ${fCount} records`);
    console.log(`   - Male: ${maleCount} records`);
    console.log(`   - Female: ${femaleCount} records`);

    if (beforeUpdate.length === 0) {
      console.log('✅ No records need updating. All gender values are already standardized.');
      return;
    }

    // Update M to MALE
    const maleUpdate = await prisma.admissionInquiry.updateMany({
      where: {
        gender: 'M'
      },
      data: {
        gender: 'MALE'
      }
    });

    console.log(`✅ Updated ${maleUpdate.count} records from M to MALE`);

    // Update F to FEMALE
    const femaleUpdate = await prisma.admissionInquiry.updateMany({
      where: {
        gender: 'F'
      },
      data: {
        gender: 'FEMALE'
      }
    });

    console.log(`✅ Updated ${femaleUpdate.count} records from F to FEMALE`);

    // Update Male to MALE (case normalization)
    const maleNormUpdate = await prisma.admissionInquiry.updateMany({
      where: {
        gender: 'Male'
      },
      data: {
        gender: 'MALE'
      }
    });

    console.log(`✅ Updated ${maleNormUpdate.count} records from Male to MALE`);

    // Update Female to FEMALE (case normalization)
    const femaleNormUpdate = await prisma.admissionInquiry.updateMany({
      where: {
        gender: 'Female'
      },
      data: {
        gender: 'FEMALE'
      }
    });

    console.log(`✅ Updated ${femaleNormUpdate.count} records from Female to FEMALE`);

    // Verification: Check final state
    const afterUpdate = await prisma.admissionInquiry.groupBy({
      by: ['gender'],
      _count: {
        gender: true
      },
      where: {
        gender: {
          not: null
        }
      }
    });

    console.log('\n📈 Final gender distribution:');
    afterUpdate.forEach(group => {
      console.log(`   - ${group.gender}: ${group._count.gender} records`);
    });

    console.log('\n🎉 Gender update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating gender values:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update if this script is executed directly
// Check if this file is being run directly (ES module compatible)
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  updateInquiryGenders().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { updateInquiryGenders }; 