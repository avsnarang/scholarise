import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyImport() {
  try {
    console.log('Verifying fee collection import...\n');
    
    // Get current session and branch
    const session = await prisma.academicSession.findFirst({
      where: { isActive: true },
    });
    
    const branch = await prisma.branch.findFirst({
      orderBy: { order: 'asc' },
    });
    
    if (!session || !branch) {
      console.error('No active session or branch found');
      return;
    }
    
    console.log(`Session: ${session.name}`);
    console.log(`Branch: ${branch.name}\n`);
    
    // Count total fee collections
    const totalCollections = await prisma.feeCollection.count({
      where: {
        branchId: branch.id,
        sessionId: session.id,
      },
    });
    
    console.log(`📊 Total Fee Collections: ${totalCollections}`);
    
    // Count by payment mode
    const paymentModeStats = await prisma.feeCollection.groupBy({
      by: ['paymentMode'],
      where: {
        branchId: branch.id,
        sessionId: session.id,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
    
    console.log('\n💳 Payment Mode Distribution:');
    paymentModeStats.forEach(stat => {
      console.log(`  ${stat.paymentMode}: ${stat._count.id}`);
    });
    
    // Count by status
    const statusStats = await prisma.feeCollection.groupBy({
      by: ['status'],
      where: {
        branchId: branch.id,
        sessionId: session.id,
      },
      _count: {
        id: true,
      },
    });
    
    console.log('\n📋 Status Distribution:');
    statusStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat._count.id}`);
    });
    
    // Sum total amount collected
    const totalAmount = await prisma.feeCollection.aggregate({
      where: {
        branchId: branch.id,
        sessionId: session.id,
      },
      _sum: {
        totalAmount: true,
      },
    });
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(amount);
    };
    
    console.log(`\n💰 Total Amount Collected: ${formatCurrency(totalAmount._sum.totalAmount || 0)}`);
    
    // Get recent collections (last 10)
    const recentCollections = await prisma.feeCollection.findMany({
      where: {
        branchId: branch.id,
        sessionId: session.id,
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        items: {
          include: {
            feeHead: {
              select: {
                name: true,
              },
            },
            feeTerm: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });
    
    console.log('\n📝 Recent Collections (Last 5):');
    recentCollections.forEach((collection, index) => {
      console.log(`${index + 1}. Receipt: ${collection.receiptNumber}`);
      console.log(`   Student: ${collection.student.firstName} ${collection.student.lastName} (${collection.student.admissionNumber})`);
      console.log(`   Amount: ${formatCurrency(collection.totalAmount)}`);
      console.log(`   Mode: ${collection.paymentMode}`);
      console.log(`   Items: ${collection.items.length}`);
      collection.items.forEach(item => {
        console.log(`     - ${item.feeHead.name} (${item.feeTerm.name}): ${formatCurrency(item.amount)}`);
      });
      console.log('');
    });
    
    // Count fee collection items
    const totalItems = await prisma.feeCollectionItem.count({
      where: {
        feeCollection: {
          branchId: branch.id,
          sessionId: session.id,
        },
      },
    });
    
    console.log(`📋 Total Fee Collection Items: ${totalItems}`);
    
    // Group by fee head
    const feeHeadStats = await prisma.feeCollectionItem.groupBy({
      by: ['feeHeadId'],
      where: {
        feeCollection: {
          branchId: branch.id,
          sessionId: session.id,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });
    
    // Get fee head names
    const feeHeads = await prisma.feeHead.findMany({
      where: {
        id: { in: feeHeadStats.map(s => s.feeHeadId) },
      },
      select: {
        id: true,
        name: true,
      },
    });
    
    const feeHeadMap = new Map(feeHeads.map(h => [h.id, h.name]));
    
    console.log('\n💰 Collection by Fee Head:');
    feeHeadStats
      .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0))
      .forEach(stat => {
        const headName = feeHeadMap.get(stat.feeHeadId) || 'Unknown';
        console.log(`  ${headName}: ${stat._count.id} items, ${formatCurrency(stat._sum.amount || 0)}`);
      });
    
    console.log('\n✅ Import verification completed successfully!');
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyImport();