import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyConcessionConsistency() {
  console.log('🔍 Verifying Concession Report Consistency...\n');

  try {
    const branchId = 'cmbdk8dd9000w7ip2rpxsd5rr'; // Paonta Sahib
    const sessionId = 'cmbdk90xz000x7ip2ido648y3'; // 2025-26

    // 1. Stats Cards Calculation (getConcessionStats API)
    const approvedConcessionsWithDetails = await prisma.studentConcession.findMany({
      where: {
        branchId: branchId,
        sessionId: sessionId,
        status: 'APPROVED',
      },
      include: {
        concessionType: true,
      },
    });

    const statsTotalAmount = approvedConcessionsWithDetails.reduce((sum, concession) => {
      const amount = concession.customValue ?? concession.concessionType.value;
      return sum + amount;
    }, 0);

    // 2. Student Concessions Report (getStudentConcessions API with status: "APPROVED")
    const studentConcessionsFiltered = await prisma.studentConcession.findMany({
      where: {
        branchId: branchId,
        sessionId: sessionId,
        status: 'APPROVED', // This is what the fixed UI now uses
      },
      include: {
        concessionType: true,
      },
    });

    const reportTotalAmount = studentConcessionsFiltered.reduce((sum, concession) => {
      const amount = concession.customValue ?? concession.concessionType.value;
      return sum + amount;
    }, 0);

    // 3. All Concessions (what was shown before the fix)
    const allConcessions = await prisma.studentConcession.findMany({
      where: {
        branchId: branchId,
        sessionId: sessionId,
        // No status filter - this was the issue
      },
      include: {
        concessionType: true,
      },
    });

    const allTotalAmount = allConcessions.reduce((sum, concession) => {
      const amount = concession.customValue ?? concession.concessionType.value;
      return sum + amount;
    }, 0);

    console.log('='.repeat(60));
    console.log('📊 CONCESSION CONSISTENCY VERIFICATION');
    console.log('='.repeat(60));
    console.log(`✅ Stats Cards Total (approved only): ₹${statsTotalAmount.toLocaleString('en-IN')}`);
    console.log(`🔧 Student Concessions Report (FIXED - approved only): ₹${reportTotalAmount.toLocaleString('en-IN')}`);
    console.log(`❌ All Concessions (BEFORE FIX - all statuses): ₹${allTotalAmount.toLocaleString('en-IN')}`);

    // Check consistency
    const isConsistent = Math.abs(statsTotalAmount - reportTotalAmount) < 1;
    console.log(`\n🎯 CONSISTENCY CHECK:`);
    if (isConsistent) {
      console.log(`✅ SUCCESS! Both reports now show the same amount (difference: ₹${Math.abs(statsTotalAmount - reportTotalAmount).toLocaleString('en-IN')})`);
    } else {
      console.log(`❌ FAILED! Reports still differ by ₹${Math.abs(statsTotalAmount - reportTotalAmount).toLocaleString('en-IN')}`);
    }

    // Show the breakdown
    const pendingConcessions = allConcessions.filter(c => c.status !== 'APPROVED');
    const pendingTotal = pendingConcessions.reduce((sum, concession) => {
      const amount = concession.customValue ?? concession.concessionType.value;
      return sum + amount;
    }, 0);

    console.log(`\n📋 BREAKDOWN:`);
    console.log(`  • Approved concessions: ${approvedConcessionsWithDetails.length} (₹${statsTotalAmount.toLocaleString('en-IN')})`);
    console.log(`  • Pending/Other concessions: ${pendingConcessions.length} (₹${pendingTotal.toLocaleString('en-IN')})`);
    console.log(`  • Total concessions: ${allConcessions.length} (₹${allTotalAmount.toLocaleString('en-IN')})`);

    // Show status breakdown
    const statusBreakdown: Record<string, number> = {};
    allConcessions.forEach(c => {
      statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
    });

    console.log(`\n📊 STATUS BREAKDOWN:`);
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  • ${status}: ${count} concessions`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConcessionConsistency();