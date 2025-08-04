#!/usr/bin/env tsx

/**
 * Script to clean up recently imported finance data
 * Usage: npx tsx scripts/cleanup-finance-import.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupFinanceImport() {
  console.log('🧹 Starting finance data cleanup...');
  
  try {
    // Find recent fee collections (last 1 hour) to identify our import
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentCollections = await prisma.feeCollection.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
      include: {
        items: true,
        student: {
          select: {
            admissionNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Found ${recentCollections.length} recent fee collections to potentially remove`);
    
    if (recentCollections.length === 0) {
      console.log('ℹ️  No recent fee collections found to clean up');
      return;
    }

    // Show preview of what will be deleted
    console.log('\n📋 Preview of collections to be deleted:');
    recentCollections.forEach((collection, index) => {
      console.log(`${index + 1}. Receipt: ${collection.receiptNumber}`);
      console.log(`   Student: ${collection.student.firstName} ${collection.student.lastName} (${collection.student.admissionNumber})`);
      console.log(`   Amount: ₹${collection.totalAmount}`);
      console.log(`   Items: ${collection.items.length}`);
      console.log(`   Created: ${collection.createdAt.toLocaleString()}`);
      console.log('');
    });

    // Confirm deletion
    console.log('⚠️  This will permanently delete the above fee collections and their items.');
    console.log('💡 If these look like the imported records, proceed with deletion.');
    
    // Since this is a script, we'll proceed automatically
    // In a real scenario, you might want to add a confirmation prompt
    
    console.log('\n🗑️  Proceeding with deletion...');

    // Delete fee collection items first (due to foreign key constraints)
    const itemIds = recentCollections.flatMap(c => c.items.map(item => item.id));
    
    if (itemIds.length > 0) {
      console.log(`🔗 Deleting ${itemIds.length} fee collection items...`);
      const deletedItems = await prisma.feeCollectionItem.deleteMany({
        where: {
          id: { in: itemIds },
        },
      });
      console.log(`✅ Deleted ${deletedItems.count} fee collection items`);
    }

    // Delete fee collections
    const collectionIds = recentCollections.map(c => c.id);
    console.log(`💰 Deleting ${collectionIds.length} fee collections...`);
    const deletedCollections = await prisma.feeCollection.deleteMany({
      where: {
        id: { in: collectionIds },
      },
    });
    console.log(`✅ Deleted ${deletedCollections.count} fee collections`);

    // Optionally clean up auto-created fee heads and terms that might not be needed
    console.log('\n🧹 Checking for auto-created fee heads and terms...');
    
    // Find fee heads created recently that might be auto-generated
    const autoCreatedFeeHeads = await prisma.feeHead.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
        description: {
          startsWith: 'Auto-created from import:',
        },
      },
      include: {
        _count: {
          select: {
            feeCollectionItems: true,
            classwiseFees: true,
          },
        },
      },
    });

    console.log(`📝 Found ${autoCreatedFeeHeads.length} auto-created fee heads`);
    
    // Only delete fee heads that have no remaining references
    const safeToDeleteFeeHeads = autoCreatedFeeHeads.filter(
      fh => fh._count.feeCollectionItems === 0 && fh._count.classwiseFees === 0
    );

    if (safeToDeleteFeeHeads.length > 0) {
      console.log(`🗑️  Deleting ${safeToDeleteFeeHeads.length} unused auto-created fee heads...`);
      for (const feeHead of safeToDeleteFeeHeads) {
        await prisma.feeHead.delete({ where: { id: feeHead.id } });
        console.log(`   - Deleted fee head: ${feeHead.name}`);
      }
    }

    // Find fee terms created recently that might be auto-generated
    const autoCreatedFeeTerms = await prisma.feeTerm.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
        description: {
          startsWith: 'Auto-created from import:',
        },
      },
      include: {
        _count: {
          select: {
            feeCollectionItems: true,
            classwiseFees: true,
          },
        },
      },
    });

    console.log(`📅 Found ${autoCreatedFeeTerms.length} auto-created fee terms`);
    
    // Only delete fee terms that have no remaining references
    const safeToDeleteFeeTerms = autoCreatedFeeTerms.filter(
      ft => ft._count.feeCollectionItems === 0 && ft._count.classwiseFees === 0
    );

    if (safeToDeleteFeeTerms.length > 0) {
      console.log(`🗑️  Deleting ${safeToDeleteFeeTerms.length} unused auto-created fee terms...`);
      for (const feeTerm of safeToDeleteFeeTerms) {
        await prisma.feeTerm.delete({ where: { id: feeTerm.id } });
        console.log(`   - Deleted fee term: ${feeTerm.name}`);
      }
    }

    console.log('\n✅ Finance data cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Fee collections deleted: ${deletedCollections.count}`);
    console.log(`   - Fee collection items deleted: ${itemIds.length}`);
    console.log(`   - Fee heads cleaned up: ${safeToDeleteFeeHeads.length}`);
    console.log(`   - Fee terms cleaned up: ${safeToDeleteFeeTerms.length}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await cleanupFinanceImport();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});