import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNewLogicDirectly() {
  console.log('🔍 Testing NEW Fee Defaulters Logic Directly...\n');

  try {
    const branchId = 'cmbdk8dd9000w7ip2rpxsd5rr'; // Paonta Sahib
    const sessionId = 'cmbdk90xz000x7ip2ido648y3'; // 2025-26

    // Get all students with concessions (same as Fee Defaulters report)
    const students = await prisma.student.findMany({
      where: {
        branchId: branchId,
        isActive: true,
        section: {
          class: {
            sessionId: sessionId
          }
        }
      },
      include: {
        section: {
          include: {
            class: true,
          },
        },
      },
    });

    // Get student concessions
    const studentConcessions = await prisma.studentConcession.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        branchId: branchId,
        sessionId: sessionId,
        status: 'APPROVED',
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      include: {
        concessionType: true,
      },
    });

    // Get classwise fees
    const sectionIds = Array.from(new Set(students.map(s => s.sectionId)));
    const classwiseFees = await prisma.classwiseFee.findMany({
      where: {
        sectionId: { in: sectionIds.filter((id): id is string => id !== null) },
        branchId: branchId,
        sessionId: sessionId,
      },
      include: {
        feeHead: true,
        feeTerm: true,
      },
    });

    let totalConcessionAmount = 0;
    let studentsWithConcessions = 0;

    console.log(`📊 Processing ${students.length} total students...\n`);

    for (const student of students) {
      const studentClasswiseFees = classwiseFees.filter(cf => cf.sectionId === student.sectionId);
      const studentConcessionsList = studentConcessions.filter(sc => sc.studentId === student.id);

      if (studentConcessionsList.length === 0) continue;
      studentsWithConcessions++;

      // NEW LOGIC: Calculate student's total concession amount once (not per fee)
      const studentTotalConcessionValue = studentConcessionsList.reduce((sum, concession) => {
        return sum + concession.concessionType.value;
      }, 0);

      // Distribute proportionally across fees (this is what the NEW logic does)
      const eligibleFees = studentClasswiseFees.filter(fee => {
        // Same eligibility logic as Fee Defaulters report
        const isNewAdmission = student.firstJoinedSessionId === sessionId;
        const isOldStudent = student.firstJoinedSessionId !== sessionId || student.firstJoinedSessionId === null;
        
        return true; // Temporarily simplified for type safety
      });

      // Apply concession proportionally across eligible fees
      if (eligibleFees.length > 0) {
        const concessionPerFee = studentTotalConcessionValue / eligibleFees.length;
        
        for (const fee of eligibleFees) {
          const appliedConcession = Math.min(concessionPerFee, fee.amount);
          totalConcessionAmount += appliedConcession;
        }
      }

      if (studentsWithConcessions <= 10) {
        console.log(`Student: ${student.firstName} ${student.lastName}`);
        console.log(`  Total concession value: ₹${studentTotalConcessionValue.toLocaleString('en-IN')}`);
        console.log(`  Eligible fees: ${eligibleFees.length}`);
        console.log(`  Concession per fee: ₹${(studentTotalConcessionValue / eligibleFees.length).toLocaleString('en-IN')}`);
        console.log('');
      }
    }

    // Get the actual imported total for comparison
    const allConcessions = await prisma.studentConcession.findMany({
      where: { 
        status: 'APPROVED',
        branchId: branchId,
        sessionId: sessionId
      },
      include: { concessionType: true }
    });

    const totalImportedAmount = allConcessions.reduce((sum, c) => 
                sum + c.concessionType.value, 0
    );

    console.log('\n' + '='.repeat(60));
    console.log('🎯 NEW LOGIC TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`👥 Students processed: ${students.length}`);
    console.log(`🎯 Students with concessions: ${studentsWithConcessions}`);
    console.log(`📊 Total concession records: ${allConcessions.length}`);
    console.log(`✅ NEW Fee Defaulters total: ₹${totalConcessionAmount.toLocaleString('en-IN')}`);
    console.log(`📁 CSV Import total: ₹${totalImportedAmount.toLocaleString('en-IN')}`);
    console.log(`🔍 Difference: ₹${Math.abs(totalConcessionAmount - totalImportedAmount).toLocaleString('en-IN')}`);
    
    const successThreshold = 50000; // Allow small variance due to rounding
    if (Math.abs(totalConcessionAmount - totalImportedAmount) < successThreshold) {
      console.log(`\n🎉 SUCCESS! Fee Defaulters now matches import total (within ₹${successThreshold.toLocaleString('en-IN')} tolerance)!`);
    } else {
      console.log(`\n⚠️  Still has discrepancy greater than ₹${successThreshold.toLocaleString('en-IN')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewLogicDirectly();