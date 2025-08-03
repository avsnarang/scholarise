#!/usr/bin/env tsx

/**
 * Complete Finance & Concession Data Cleanup Script
 * Removes all finance and concession data to prepare for clean reimport
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAllFinanceAndConcessionData() {
  console.log('🧹 Starting complete finance and concession data cleanup...');
  
  try {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      console.log('');
      console.log('🏦 FINANCE DATA CLEANUP');
      console.log('========================');
      
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

      console.log('');
      console.log('💰 CONCESSION DATA CLEANUP');
      console.log('===========================');

      console.log('  📦 Deleting ConcessionHistory records...');
      const deletedHistory = await tx.concessionHistory.deleteMany({});
      console.log(`    ✅ Deleted ${deletedHistory.count} ConcessionHistory records`);

      console.log('  📦 Deleting StudentConcession records...');
      const deletedStudentConcessions = await tx.studentConcession.deleteMany({});
      console.log(`    ✅ Deleted ${deletedStudentConcessions.count} StudentConcession records`);

      console.log('  📦 Deleting ConcessionApprovalSettings records...');
      const deletedApprovalSettings = await tx.concessionApprovalSettings.deleteMany({});
      console.log(`    ✅ Deleted ${deletedApprovalSettings.count} ConcessionApprovalSettings records`);

      console.log('  📦 Deleting ConcessionType records...');
      const deletedConcessionTypes = await tx.concessionType.deleteMany({});
      console.log(`    ✅ Deleted ${deletedConcessionTypes.count} ConcessionType records`);
    });

    console.log('');
    console.log('✅ Complete cleanup completed successfully!');
    
    // Verify cleanup
    console.log('');
    console.log('🔍 Verifying cleanup...');
    console.log('');
    
    console.log('📊 FINANCE DATA VERIFICATION:');
    const financeRemaining = await Promise.all([
      prisma.feeCollectionItem.count(),
      prisma.feeCollection.count(),
      prisma.paymentGatewayTransaction.count(),
      prisma.paymentRequest.count(),
      prisma.paymentWebhookLog.count(),
    ]);

    const [items, collections, transactions, requests, logs] = financeRemaining;
    
    console.log(`  - FeeCollectionItem: ${items} records remaining`);
    console.log(`  - FeeCollection: ${collections} records remaining`);
    console.log(`  - PaymentGatewayTransaction: ${transactions} records remaining`);
    console.log(`  - PaymentRequest: ${requests} records remaining`);
    console.log(`  - PaymentWebhookLog: ${logs} records remaining`);

    console.log('');
    console.log('📊 CONCESSION DATA VERIFICATION:');
    const concessionRemaining = await Promise.all([
      prisma.concessionHistory.count(),
      prisma.studentConcession.count(),
      prisma.concessionApprovalSettings.count(),
      prisma.concessionType.count(),
    ]);

    const [history, studentConcessions, approvalSettings, concessionTypes] = concessionRemaining;
    
    console.log(`  - ConcessionHistory: ${history} records remaining`);
    console.log(`  - StudentConcession: ${studentConcessions} records remaining`);
    console.log(`  - ConcessionApprovalSettings: ${approvalSettings} records remaining`);
    console.log(`  - ConcessionType: ${concessionTypes} records remaining`);

    const allFinanceClean = financeRemaining.every(count => count === 0);
    const allConcessionClean = concessionRemaining.every(count => count === 0);

    console.log('');
    if (allFinanceClean && allConcessionClean) {
      console.log('🎉 ALL DATA SUCCESSFULLY CLEANED!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('  1. Apply schema restructuring for multi-term collections');
      console.log('  2. Import new finance and concession data from CSV files');
    } else {
      console.log('⚠️  Some records remain. Details above.');
      if (!allFinanceClean) {
        console.log('   - Finance data cleanup incomplete');
      }
      if (!allConcessionClean) {
        console.log('   - Concession data cleanup incomplete');
      }
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupAllFinanceAndConcessionData()
  .then(() => {
    console.log('✅ Complete cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Complete cleanup script failed:', error);
    process.exit(1);
  });