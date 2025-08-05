import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPaymentHistoryData() {
  try {
    console.log('=== Testing Payment History API Data ===');
    
    const branchId = 'cmbdk8dd9000w7ip2rpxsd5rr';
    const sessionId = 'cmbdk90xz000x7ip2ido648y3';
    
    console.log(`\nTesting for branchId: ${branchId}`);
    console.log(`Testing for sessionId: ${sessionId}`);
    
    // Test 1: Gateway transactions
    console.log('\n=== 1. Gateway Transactions ===');
    const gatewayTransactions = await prisma.paymentGatewayTransaction.findMany({
      where: {
        branchId: branchId,
        sessionId: sessionId,
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        feeTerm: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    console.log(`Found ${gatewayTransactions.length} gateway transactions:`);
    gatewayTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. ID: ${txn.id}`);
      console.log(`   Gateway: ${txn.gateway}`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Status: ${txn.status}`);
      console.log(`   Student: ${txn.student?.firstName} ${txn.student?.lastName} (${txn.student?.admissionNumber})`);
      console.log(`   Fee Term: ${txn.feeTerm?.name || 'N/A'}`);
      console.log('   ---');
    });
    
    // Test 2: Manual fee collections
    console.log('\n=== 2. Manual Fee Collections ===');
    const feeCollections = await prisma.feeCollection.findMany({
      where: {
        branchId: branchId,
        sessionId: sessionId,
        gateway: null, // Only manual collections
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 5,
    });
    
    console.log(`Found ${feeCollections.length} manual fee collections:`);
    feeCollections.forEach((fee, index) => {
      console.log(`${index + 1}. Receipt: ${fee.receiptNumber}`);
      console.log(`   Amount: ₹${fee.totalAmount}`);
      console.log(`   Payment Mode: ${fee.paymentMode}`);
      console.log(`   Student: ${fee.student?.firstName} ${fee.student?.lastName} (${fee.student?.admissionNumber})`);
      console.log(`   Payment Date: ${fee.paymentDate}`);
      console.log(`   Gateway: ${fee.gateway || 'null (manual)'}`);
      console.log('   ---');
    });
    
    // Test 3: Combined mapping (simulating what the API does)
    console.log('\n=== 3. Combined Mapping Test ===');
    
    // Map gateway transactions
    const gatewayItems = gatewayTransactions.map((txn) => ({
      id: txn.id,
      transactionId: txn.gatewayTransactionId || '',
      gateway: txn.gateway,
      amount: txn.amount,
      status: txn.status,
      type: 'gateway',
      studentName: `${txn.student?.firstName || ''} ${txn.student?.lastName || ''}`.trim(),
      studentAdmissionNumber: txn.student?.admissionNumber || '',
      receiptNumber: undefined,
      paymentMode: 'ONLINE',
      paymentDate: txn.paidAt || txn.createdAt,
    }));
    
    // Map manual fee collections
    const manualItems = feeCollections.map((fee) => ({
      id: fee.id,
      transactionId: fee.receiptNumber,
      gateway: 'RAZORPAY', // Required by interface
      amount: fee.totalAmount,
      status: 'SUCCESS',
      type: 'manual',
      studentName: `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`.trim(),
      studentAdmissionNumber: fee.student?.admissionNumber || '',
      receiptNumber: fee.receiptNumber,
      paymentMode: fee.paymentMode,
      paymentDate: fee.paymentDate,
    }));
    
    // Merge and sort
    const allItems = [...gatewayItems, ...manualItems].sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
    
    console.log(`Combined result: ${allItems.length} total items`);
    console.log(`- Gateway items: ${gatewayItems.length}`);
    console.log(`- Manual items: ${manualItems.length}`);
    
    allItems.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. [${item.type.toUpperCase()}] ${item.transactionId || item.receiptNumber}`);
      console.log(`   Amount: ₹${item.amount}`);
      console.log(`   Student: ${item.studentName} (${item.studentAdmissionNumber})`);
      console.log(`   Date: ${item.paymentDate}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentHistoryData();