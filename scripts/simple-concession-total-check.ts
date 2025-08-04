import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConcessionTotals() {
  console.log('🔍 Checking Concession Totals...\n');

  try {
    // 1. Get total from StudentConcession table (our import)
    console.log('📊 STUDENT CONCESSION RECORDS (Our Import):');
    console.log('='.repeat(50));
    
    const studentConcessions = await prisma.studentConcession.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        concessionType: true
      }
    });

    let totalImportedAmount = 0;
    const concessionsByType: Record<string, { count: number; total: number }> = {};

    studentConcessions.forEach(concession => {
      const amount = concession.customValue || concession.concessionType.value;
      totalImportedAmount += amount;
      
      const typeName = concession.concessionType.name;
      if (!concessionsByType[typeName]) {
        concessionsByType[typeName] = { count: 0, total: 0 };
      }
      concessionsByType[typeName].count++;
      concessionsByType[typeName].total += amount;
    });

    console.log(`Total Student Concessions: ${studentConcessions.length}`);
    console.log(`Total Amount: ₹${totalImportedAmount.toLocaleString('en-IN')}\n`);

    // Show breakdown by concession type
    console.log('📋 Breakdown by Concession Type:');
    Object.entries(concessionsByType)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .forEach(([typeName, data]) => {
        console.log(`  • ${typeName}`);
        console.log(`    Count: ${data.count}, Total: ₹${data.total.toLocaleString('en-IN')}`);
      });

    // 2. Check how many concession types we have
    console.log('\n' + '='.repeat(50));
    console.log('📝 CONCESSION TYPES:');
    console.log('='.repeat(50));
    
    const concessionTypes = await prisma.concessionType.findMany({
      include: {
        studentConcessions: {
          where: { status: 'APPROVED' }
        }
      }
    });

    console.log(`Total Concession Types: ${concessionTypes.length}`);
    
    const typesWithStudents = concessionTypes.filter(ct => ct.studentConcessions.length > 0);
    console.log(`Types with Students: ${typesWithStudents.length}`);
    
    const typesWithoutStudents = concessionTypes.filter(ct => ct.studentConcessions.length === 0);
    console.log(`Types without Students: ${typesWithoutStudents.length}\n`);

    // Show examples of types without students
    if (typesWithoutStudents.length > 0) {
      console.log('🚫 Example types without students:');
      typesWithoutStudents.slice(0, 5).forEach(ct => {
        console.log(`  • ${ct.name} (${ct.type}: ${ct.value})`);
      });
      console.log();
    }

    // 3. Check a few students and their applied concessions in detail
    console.log('='.repeat(50));
    console.log('👥 SAMPLE STUDENT ANALYSIS:');
    console.log('='.repeat(50));
    
    const sampleStudents = await prisma.student.findMany({
      where: {
        studentConcessions: {
          some: {
            status: 'APPROVED'
          }
        }
      },
      include: {
        studentConcessions: {
          where: { status: 'APPROVED' },
          include: {
            concessionType: true
          }
        }
      },
      take: 5
    });

    sampleStudents.forEach(student => {
      console.log(`\n📚 Student: ${student.firstName} ${student.lastName} (${student.admissionNumber})`);
      student.studentConcessions.forEach(concession => {
        const amount = concession.customValue || concession.concessionType.value;
        console.log(`  • ${concession.concessionType.name}: ₹${amount.toLocaleString('en-IN')}`);
        console.log(`    Type: ${concession.concessionType.type}, Applied to: ${concession.concessionType.appliedFeeHeads.length || 'All'} fee heads`);
      });
    });

    console.log('\n' + '='.repeat(50));
    console.log('📈 SUMMARY COMPARISON:');
    console.log('='.repeat(50));
    console.log(`✅ Our Import Total: ₹${totalImportedAmount.toLocaleString('en-IN')}`);
    console.log(`🔢 Your Report Shows: ₹1,43,50,835`);
    console.log(`📊 Difference: ₹${(14350835 - totalImportedAmount).toLocaleString('en-IN')}`);
    console.log(`📊 Multiplier: ${(14350835 / totalImportedAmount).toFixed(2)}x`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConcessionTotals();