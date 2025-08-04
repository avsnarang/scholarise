import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeFeeDefaultersConcessions() {
  console.log('🔍 Analyzing Fee Defaulters Report Concession Calculation...\n');

  try {
    // Get active branch and session (same logic as Fee Defaulters report)
    const branch = await prisma.branch.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    const session = await prisma.academicSession.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!branch || !session) {
      throw new Error('Branch or session not found');
    }

    console.log(`📊 Analysis for Branch: ${branch.name}, Session: ${session.name}\n`);

    // Get all students with their concessions and fees (mimicking Fee Defaulters logic)
    const students = await prisma.student.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
      },
      include: {
        section: {
          include: {
            class: true,
          },
        },
      },
      take: 50, // Limit for analysis
    });

    console.log(`👥 Analyzing ${students.length} students...\n`);

    let totalConcessionByReport = 0;
    let feeCalculationCount = 0;
    let studentConcessionApplications = 0;

    for (const student of students) {
      // Get student concessions (same logic as Fee Defaulters report)
      const studentConcessionsList = await prisma.studentConcession.findMany({
        where: {
          studentId: student.id,
          status: 'APPROVED',
        },
        include: {
          concessionType: true,
        },
      });

      if (studentConcessionsList.length === 0) continue;

      // Get all class-wise fees for this student
      const classwiseFees = await prisma.classwiseFee.findMany({
        where: {
          classId: student.section?.classId,
          sessionId: session.id,
          branchId: branch.id,
        },
        include: {
          feeHead: true,
          feeTerm: true,
        },
      });

      // Calculate concessions for each fee (exactly like Fee Defaulters report)
      for (const classwiseFee of classwiseFees) {
        feeCalculationCount++;
        
        let concessionAmount = 0;
        
        for (const concession of studentConcessionsList) {
          // Check if concession applies to this fee head
          const isApplicable = concession.concessionType.appliedFeeHeads.length === 0 || 
            concession.concessionType.appliedFeeHeads.includes(classwiseFee.feeHeadId);
          
          // Check if concession applies to this fee term
          const isTermApplicable = concession.concessionType.appliedFeeTerms.length === 0 || 
            concession.concessionType.appliedFeeTerms.includes(classwiseFee.feeTermId);
          
          if (isApplicable && isTermApplicable) {
            studentConcessionApplications++;
            
            if (concession.concessionType.type === 'PERCENTAGE') {
              const percentageAmount = (classwiseFee.amount * (concession.customValue || concession.concessionType.value)) / 100;
              concessionAmount += percentageAmount;
              
              if (percentageAmount > 0) {
                console.log(`   💰 ${student.firstName} ${student.lastName} - ${concession.concessionType.name}`);
                console.log(`       📋 Fee: ${classwiseFee.feeHead.name} - ${classwiseFee.feeTerm.name} (₹${classwiseFee.amount})`);
                console.log(`       🎯 Applied: ${concession.customValue || concession.concessionType.value}% = ₹${percentageAmount.toFixed(2)}\n`);
              }
            } else {
              // For FIXED concessions
              let fixedAmount = 0;
              if (concession.concessionType.feeTermAmounts && 
                  typeof concession.concessionType.feeTermAmounts === 'object' &&
                  (concession.concessionType.feeTermAmounts as any)[classwiseFee.feeTermId]) {
                fixedAmount = (concession.concessionType.feeTermAmounts as any)[classwiseFee.feeTermId];
              } else {
                fixedAmount = concession.customValue || concession.concessionType.value;
              }
              
              concessionAmount += fixedAmount;
              
              if (fixedAmount > 0) {
                console.log(`   💰 ${student.firstName} ${student.lastName} - ${concession.concessionType.name}`);
                console.log(`       📋 Fee: ${classwiseFee.feeHead.name} - ${classwiseFee.feeTerm.name} (₹${classwiseFee.amount})`);
                console.log(`       🎯 Applied: ₹${fixedAmount}\n`);
              }
            }
          }
        }

        // Cap concession at fee amount
        concessionAmount = Math.min(concessionAmount, classwiseFee.amount);
        totalConcessionByReport += concessionAmount;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`🎓 Students analyzed: ${students.length}`);
    console.log(`📝 Fee calculations performed: ${feeCalculationCount}`);
    console.log(`🎯 Concession applications: ${studentConcessionApplications}`);
    console.log(`💰 Total concession amount (Fee Defaulters logic): ₹${totalConcessionByReport.toLocaleString('en-IN')}`);
    
    // Compare with our imported total
    console.log('\n' + '-'.repeat(40));
    console.log('📈 COMPARISON');
    console.log('-'.repeat(40));
    console.log(`📊 Fee Defaulters calculation: ₹${totalConcessionByReport.toLocaleString('en-IN')}`);
    console.log(`📁 CSV Import total: ₹51,70,620`);
    console.log(`🔢 Your reported amount: ₹1,43,50,835`);
    
    const projectedTotal = (totalConcessionByReport / students.length) * await prisma.student.count({
      where: { branchId: branch.id }
    });
    console.log(`🔮 Projected full total: ₹${projectedTotal.toLocaleString('en-IN')}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeFeeDefaultersConcessions();