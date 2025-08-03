#!/usr/bin/env tsx

/**
 * Concession Data Cleanup Script
 * Removes all concession-related data to prepare for clean reimport
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupConcessionData() {
  console.log('🧹 Starting concession data cleanup...');
  
  try {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete in order of dependencies (child tables first)
      
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
    console.log('✅ Concession data cleanup completed successfully!');
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const remaining = await Promise.all([
      prisma.concessionHistory.count(),
      prisma.studentConcession.count(),
      prisma.concessionApprovalSettings.count(),
      prisma.concessionType.count(),
    ]);

    const [history, studentConcessions, approvalSettings, concessionTypes] = remaining;
    
    console.log(`  - ConcessionHistory: ${history} records remaining`);
    console.log(`  - StudentConcession: ${studentConcessions} records remaining`);
    console.log(`  - ConcessionApprovalSettings: ${approvalSettings} records remaining`);
    console.log(`  - ConcessionType: ${concessionTypes} records remaining`);

    if (remaining.every(count => count === 0)) {
      console.log('');
      console.log('🎉 All concession data successfully cleaned!');
    } else {
      console.log('');
      console.log('⚠️  Some concession records remain. Please check for foreign key constraints.');
    }

  } catch (error) {
    console.error('❌ Error during concession cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupConcessionData()
  .then(() => {
    console.log('✅ Concession cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Concession cleanup script failed:', error);
    process.exit(1);
  });