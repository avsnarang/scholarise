#!/usr/bin/env tsx

/**
 * Finance Data Cleanup Script
 * Removes all finance module data to prepare for schema restructuring
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupFinanceData() {
  console.log('🧹 Starting finance data cleanup...');
  
  try {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      console.log('  📦 Deleting FeeCollectionItem records...');
      const deletedItems = await tx.feeCollectionItem.deleteMany({});
      console.log(`    ✅ Deleted ${deletedItems.count} FeeCollectionItem records`);

      console.log('  📦 Deleting FeeCollection records...');
      const deletedCollections = await tx.feeCollection.deleteMany({});
      console.log(`    ✅ Deleted ${deletedCollections.count} FeeCollection records`);

      console.log('  📦 Deleting PaymentGatewayTransaction records...');
      const deletedTransactions = await tx.paymentGatewayTransaction.deleteMany({});
      console.log(`    ✅ Deleted ${deletedTransactions.count} PaymentGatewayTransaction records`);

      console.log('  📦 Deleting PaymentRequest records...');
      const deletedRequests = await tx.paymentRequest.deleteMany({});
      console.log(`    ✅ Deleted ${deletedRequests.count} PaymentRequest records`);

      console.log('  📦 Deleting PaymentWebhookLog records...');
      const deletedLogs = await tx.paymentWebhookLog.deleteMany({});
      console.log(`    ✅ Deleted ${deletedLogs.count} PaymentWebhookLog records`);
    });

    console.log('');
    console.log('✅ Finance data cleanup completed successfully!');
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const remaining = await Promise.all([
      prisma.feeCollectionItem.count(),
      prisma.feeCollection.count(),
      prisma.paymentGatewayTransaction.count(),
      prisma.paymentRequest.count(),
      prisma.paymentWebhookLog.count(),
    ]);

    const [items, collections, transactions, requests, logs] = remaining;
    
    console.log(`  - FeeCollectionItem: ${items} records remaining`);
    console.log(`  - FeeCollection: ${collections} records remaining`);
    console.log(`  - PaymentGatewayTransaction: ${transactions} records remaining`);
    console.log(`  - PaymentRequest: ${requests} records remaining`);
    console.log(`  - PaymentWebhookLog: ${logs} records remaining`);

    if (remaining.every(count => count === 0)) {
      console.log('');
      console.log('🎉 All finance data successfully cleaned!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('  1. Run schema restructuring migration');
      console.log('  2. Import new data from CSV file');
    } else {
      console.log('');
      console.log('⚠️  Some records remain. Please check for foreign key constraints.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupFinanceData()
  .then(() => {
    console.log('✅ Cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });