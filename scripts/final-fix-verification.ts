import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFix() {
  console.log('🔍 Final Verification: Fee Defaulters Fix...\n');

  try {
    // Use the correct branch and session where concessions exist
    const branchId = 'cmbdk8dd9000w7ip2rpxsd5rr'; // Paonta Sahib
    const sessionId = 'cmbdk90xz000x7ip2ido648y3'; // 2025-26

    console.log('📊 Testing with Paonta Sahib / 2025-26 (where concessions exist)\n');

    // Simulate the NEW Fee Defaulters logic
    console.log('🔄 Running NEW Fee Defaulters Logic...\n');

    // Get students with concessions in the correct branch/session
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
      take: 50, // Sample for testing
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

    let totalNewLogicConcession = 0;
    let totalOldLogicConcession = 0;
    let applicationCount = 0;

    console.log(`Processing ${students.length} students...\n`);

    for (const student of students) {
      const studentClasswiseFees = classwiseFees.filter(cf => cf.sectionId === student.sectionId);
      const studentConcessionsList = studentConcessions.filter(sc => sc.studentId === student.id);

      if (studentConcessionsList.length === 0) continue;

      for (const classwiseFee of studentClasswiseFees) {
        let newLogicConcession = 0;
        let oldLogicConcession = 0;

        for (const concession of studentConcessionsList) {
          // Check if concession applies to this fee head
          const isApplicable = concession.concessionType.appliedFeeHeads.length === 0 || 
            concession.concessionType.appliedFeeHeads.includes(classwiseFee.feeHeadId);
          
          // Check if concession applies to this fee term
          const isTermApplicable = concession.concessionType.appliedFeeTerms.length === 0 || 
            concession.concessionType.appliedFeeTerms.includes(classwiseFee.feeTermId);
          
          if (isApplicable && isTermApplicable) {
            applicationCount++;

            // NEW LOGIC: Use actual imported concession amount
            const actualConcessionAmount = concession.customValue || concession.concessionType.value;
            newLogicConcession += actualConcessionAmount;

            // OLD LOGIC: Calculate dynamically
            if (concession.concessionType.type === 'PERCENTAGE') {
              oldLogicConcession += (classwiseFee.amount * (concession.customValue || concession.concessionType.value)) / 100;
            } else {
              if (concession.concessionType.feeTermAmounts && 
                  typeof concession.concessionType.feeTermAmounts === 'object' &&
                  (concession.concessionType.feeTermAmounts as any)[classwiseFee.feeTermId]) {
                oldLogicConcession += (concession.concessionType.feeTermAmounts as any)[classwiseFee.feeTermId];
              } else {
                oldLogicConcession += concession.customValue || concession.concessionType.value;
              }
            }

            if (applicationCount <= 5) { // Show first few examples
              console.log(`Example ${applicationCount}:`);
              console.log(`  Student: ${student.firstName} ${student.lastName}`);
              console.log(`  Concession: ${concession.concessionType.name}`);
              console.log(`  Fee: ${classwiseFee.feeHeadId} - ${classwiseFee.feeTermId} (₹${classwiseFee.amount})`);
              console.log(`  OLD Logic: ₹${oldLogicConcession.toLocaleString('en-IN')}`);
              console.log(`  NEW Logic: ₹${actualConcessionAmount.toLocaleString('en-IN')}`);
              console.log('');
            }
          }
        }

        // Cap at fee amount
        newLogicConcession = Math.min(newLogicConcession, classwiseFee.amount);
        oldLogicConcession = Math.min(oldLogicConcession, classwiseFee.amount);

        totalNewLogicConcession += newLogicConcession;
        totalOldLogicConcession += oldLogicConcession;
      }
    }

    // Get total import amount for comparison
    const allConcessions = await prisma.studentConcession.findMany({
      where: { 
        status: 'APPROVED',
        branchId: branchId,
        sessionId: sessionId
      },
      include: { concessionType: true }
    });

    const totalImportedAmount = allConcessions.reduce((sum, c) => 
      sum + (c.customValue || c.concessionType.value), 0
    );

    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL VERIFICATION RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Total concession applications: ${applicationCount}`);
    console.log(`🔢 OLD Logic total: ₹${totalOldLogicConcession.toLocaleString('en-IN')}`);
    console.log(`✅ NEW Logic total: ₹${totalNewLogicConcession.toLocaleString('en-IN')}`);
    console.log(`📁 Import total: ₹${totalImportedAmount.toLocaleString('en-IN')}`);
    
    console.log(`\n🏆 RESULT:`);
    if (Math.abs(totalNewLogicConcession - totalImportedAmount) < 10000) {
      console.log(`✅ SUCCESS! Fee Defaulters now matches import total!`);
    } else {
      console.log(`❌ Still has discrepancy of ₹${Math.abs(totalNewLogicConcession - totalImportedAmount).toLocaleString('en-IN')}`);
    }

    const reduction = totalOldLogicConcession - totalNewLogicConcession;
    console.log(`📉 Reduced concession calculation by: ₹${reduction.toLocaleString('en-IN')}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFix();