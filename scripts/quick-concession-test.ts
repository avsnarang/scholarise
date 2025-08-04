import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickTest() {
  console.log('🔍 Quick Concession Test...\n');

  try {
    // Get all approved student concessions
    const concessions = await prisma.studentConcession.findMany({
      where: {
        status: 'APPROVED'
      },
      include: {
        concessionType: true,
        student: {
          include: {
            section: {
              include: {
                class: true
              }
            }
          }
        }
      },
      take: 10
    });

    console.log(`Found ${concessions.length} approved concessions\n`);

    concessions.forEach(c => {
      const amount = c.customValue || c.concessionType.value;
      console.log(`• Student: ${c.student.firstName} ${c.student.lastName}`);
      console.log(`  Concession: ${c.concessionType.name}`);
      console.log(`  Amount: ₹${amount.toLocaleString('en-IN')}`);
      console.log(`  Branch: ${c.branchId}`);
      console.log(`  Session: ${c.sessionId}`);
      console.log(`  Class: ${c.student.section?.class?.name || 'No class'}`);
      console.log(`  Applied Fee Heads: ${c.concessionType.appliedFeeHeads.length || 'All'}`);
      console.log(`  Applied Fee Terms: ${c.concessionType.appliedFeeTerms.length || 'All'}`);
      console.log('');
    });

    // Get branches and sessions
    const branches = await prisma.branch.findMany();
    const sessions = await prisma.academicSession.findMany();

    console.log('📊 Available Branches:');
    branches.forEach(b => console.log(`  • ${b.name} (${b.id})`));

    console.log('\n📊 Available Sessions:');
    sessions.forEach(s => console.log(`  • ${s.name} (${s.id})`));

    // Check what branch/session most concessions are in
    const concessionStats = await prisma.studentConcession.groupBy({
      by: ['branchId', 'sessionId'],
      where: { status: 'APPROVED' },
      _count: { id: true },
      _sum: { customValue: true }
    });

    console.log('\n📊 Concession Distribution:');
    for (const stat of concessionStats) {
      const branch = branches.find(b => b.id === stat.branchId);
      const session = sessions.find(s => s.id === stat.sessionId);
      console.log(`  • ${branch?.name || 'Unknown'} / ${session?.name || 'Unknown'}: ${stat._count.id} concessions`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();