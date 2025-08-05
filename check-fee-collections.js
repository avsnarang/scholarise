import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFeeCollections() {
  try {
    console.log('=== Checking FeeCollection Records ===');
    
    // Get total count
    const totalCount = await prisma.feeCollection.count();
    console.log(`Total FeeCollection records: ${totalCount}`);
    
    // Get sample records with their gateway values
    const sampleRecords = await prisma.feeCollection.findMany({
      take: 10,
      select: {
        id: true,
        receiptNumber: true,
        totalAmount: true,
        paymentMode: true,
        gateway: true,
        paymentDate: true,
        branchId: true,
        sessionId: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n=== Sample Records ===');
    sampleRecords.forEach((record, index) => {
      console.log(`${index + 1}. Receipt: ${record.receiptNumber}`);
      console.log(`   Student: ${record.student?.firstName} ${record.student?.lastName} (${record.student?.admissionNumber})`);
      console.log(`   Amount: ₹${record.totalAmount}`);
      console.log(`   Payment Mode: ${record.paymentMode}`);
      console.log(`   Gateway: ${record.gateway || 'null'}`);
      console.log(`   Branch ID: ${record.branchId}`);
      console.log(`   Session ID: ${record.sessionId}`);
      console.log(`   Date: ${record.paymentDate}`);
      console.log('   ---');
    });
    
    // Check gateway distribution
    console.log('\n=== Gateway Distribution ===');
    const gatewayGroups = await prisma.feeCollection.groupBy({
      by: ['gateway'],
      _count: {
        gateway: true
      }
    });
    
    gatewayGroups.forEach(group => {
      console.log(`${group.gateway || 'null'}: ${group._count.gateway} records`);
    });
    
    // Check specific branch/session combo
    console.log('\n=== Current Branch/Session Check ===');
    const currentBranchId = 'cmbdk8dd9000w7ip2rpxsd5rr'; // From the error message
    const currentSessionId = 'cmbdk90xz000x7ip2ido648y3'; // From the error message
    
    const currentRecords = await prisma.feeCollection.findMany({
      where: {
        branchId: currentBranchId,
        sessionId: currentSessionId,
      },
      take: 5,
      select: {
        id: true,
        receiptNumber: true,
        totalAmount: true,
        gateway: true,
        paymentMode: true,
      }
    });
    
    console.log(`Records for current branch/session: ${currentRecords.length}`);
    currentRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.receiptNumber} - ₹${record.totalAmount} - Gateway: ${record.gateway || 'null'} - Mode: ${record.paymentMode}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeeCollections();