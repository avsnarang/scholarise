import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFeeDefaultersFix() {
  console.log('🔍 Testing Fee Defaulters Report Fix...\n');

  try {
    // Get active branch and session
    const branch = await prisma.branch.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    const session = await prisma.academicSession.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!branch || !session) {
      throw new Error('Branch or session not found');
    }

    console.log(`📊 Testing for Branch: ${branch.name}, Session: ${session.name}\n`);

    // Get a sample of students with concessions
    const students = await prisma.student.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
        studentConcessions: {
          some: {
            status: 'APPROVED'
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
      take: 100, // Test sample
    });

    console.log(`👥 Testing ${students.length} students with concessions...\n`);

    // Get student concessions (using the new logic)
    const studentConcessions = await prisma.studentConcession.findMany({
      where: {
        studentId: { in: students.map(s => s.id) },
        branchId: branch.id,
        sessionId: session.id,
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

    // Get classwise fees for these students
    const sectionIds = Array.from(new Set(students.map(s => s.sectionId)));
    const classwiseFees = await prisma.classwiseFee.findMany({
      where: {
        sectionId: { in: sectionIds.filter((id): id is string => id !== null) },
        branchId: branch.id,
        sessionId: session.id,
      },
      include: {
        feeHead: true,
        feeTerm: true,
      },
    });

    let totalConcessionByNewLogic = 0;
    let totalConcessionByOldLogic = 0;
    let concessionApplications = 0;

    for (const student of students) {
      const studentClasswiseFees = classwiseFees.filter(cf => cf.sectionId === student.sectionId);
      const studentConcessionsList = studentConcessions.filter(sc => sc.studentId === student.id);

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
            concessionApplications++;

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
          }
        }

        // Cap at fee amount
        newLogicConcession = Math.min(newLogicConcession, classwiseFee.amount);
        oldLogicConcession = Math.min(oldLogicConcession, classwiseFee.amount);

        totalConcessionByNewLogic += newLogicConcession;
        totalConcessionByOldLogic += oldLogicConcession;
      }
    }

    // Get total import amount for comparison
    const allStudentConcessions = await prisma.studentConcession.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        concessionType: true
      }
    });

    const totalImportedAmount = allStudentConcessions.reduce((sum, c) => 
      sum + (c.customValue || c.concessionType.value), 0
    );

    console.log('\n' + '='.repeat(60));
    console.log('📊 LOGIC COMPARISON RESULTS');
    console.log('='.repeat(60));
    console.log(`🎯 Concession applications tested: ${concessionApplications}`);
    console.log(`🔢 OLD Logic total (sample): ₹${totalConcessionByOldLogic.toLocaleString('en-IN')}`);
    console.log(`✅ NEW Logic total (sample): ₹${totalConcessionByNewLogic.toLocaleString('en-IN')}`);
    console.log(`📁 Total Import Amount: ₹${totalImportedAmount.toLocaleString('en-IN')}`);
    
    const sampleRatio = students.length / allStudentConcessions.length;
    const projectedNewTotal = totalConcessionByNewLogic / sampleRatio;
    const projectedOldTotal = totalConcessionByOldLogic / sampleRatio;
    
    console.log(`\n📈 PROJECTED FULL TOTALS:`);
    console.log(`🔢 OLD Logic (projected): ₹${projectedOldTotal.toLocaleString('en-IN')}`);
    console.log(`✅ NEW Logic (projected): ₹${projectedNewTotal.toLocaleString('en-IN')}`);
    
    console.log(`\n🎯 SUCCESS: ${Math.abs(projectedNewTotal - totalImportedAmount) < 1000 ? '✅' : '❌'} New logic should match import total!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFeeDefaultersFix();