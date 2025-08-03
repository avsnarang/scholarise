import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FeeCollectionWithDetails {
  id: string;
  receiptNumber: string;
  branchId: string;
  sessionId: string;
  branch: {
    code: string;
  };
  session: {
    name: string;
  };
}

/**
 * Convert old receipt number format to new format
 * @param oldReceiptNumber - Old format receipt number (e.g., "3516", "234")
 * @param branchCode - Branch code
 * @param sessionName - Session name
 * @returns string - New format receipt number
 */
function convertOldReceiptNumber(
  oldReceiptNumber: string,
  branchCode: string,
  sessionName: string
): string {
  // Old format is just a number (e.g., "3516", "234")
  // Convert to 6-digit padded format
  const paddedNumber = oldReceiptNumber.padStart(6, '0');
  
  return `TSH${branchCode}/FIN/${sessionName}/${paddedNumber}`;
}

/**
 * Check if receipt number is in old format (numeric only)
 */
function isOldFormat(receiptNumber: string): boolean {
  return /^\d+$/.test(receiptNumber);
}

async function migrateReceiptNumbers() {
  console.log('🚀 Starting receipt number migration...');
  
  try {
    // Get all fee collections and filter for numeric receipt numbers
    const allCollections = await prisma.feeCollection.findMany({
      include: {
        branch: {
          select: {
            code: true
          }
        },
        session: {
          select: {
            name: true
          }
        }
      }
    });

    // Filter for numeric-only receipt numbers (old format)
    const oldFormatCollections = allCollections.filter(collection => 
      isOldFormat(collection.receiptNumber)
    ) as FeeCollectionWithDetails[];

    console.log(`📋 Found ${oldFormatCollections.length} fee collections with old format receipt numbers`);

    if (oldFormatCollections.length === 0) {
      console.log('✅ No receipt numbers to migrate');
      return;
    }

    // Group by branch and session to handle sequence numbers properly
    const groupedCollections = oldFormatCollections.reduce((acc, collection) => {
      const key = `${collection.branchId}-${collection.sessionId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(collection);
      return acc;
    }, {} as Record<string, FeeCollectionWithDetails[]>);

    console.log(`📊 Processing ${Object.keys(groupedCollections).length} branch-session combinations`);

    let totalUpdated = 0;
    let errors = 0;

    // Process each branch-session group
    for (const [key, collections] of Object.entries(groupedCollections)) {
      const [branchId, sessionId] = key.split('-');
      const firstCollection = collections[0];
      
      if (!firstCollection) continue;

      const branchCode = firstCollection.branch.code;
      const sessionName = firstCollection.session.name;

      console.log(`\n🏢 Processing ${collections.length} collections for ${branchCode}/${sessionName}...`);

      // Sort by old receipt number numerically to maintain sequence
      collections.sort((a, b) => parseInt(a.receiptNumber) - parseInt(b.receiptNumber));

      // Process records individually for reliability
      console.log(`  🔄 Processing ${collections.length} records individually...`);
      
      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        
        if (!collection) continue;
        
        try {
          // Convert old numeric receipt number to new format
          const newReceiptNumber = convertOldReceiptNumber(
            collection.receiptNumber,
            branchCode,
            sessionName
          );

          // Update the receipt number individually (no transaction)
          await prisma.feeCollection.update({
            where: { id: collection.id },
            data: { receiptNumber: newReceiptNumber }
          });

          console.log(`  ✓ ${collection.receiptNumber} → ${newReceiptNumber} (${i + 1}/${collections.length})`);
          totalUpdated++;
          
          // Progress update every 100 records
          if ((i + 1) % 100 === 0) {
            console.log(`    📊 Progress: ${i + 1}/${collections.length} (${((i + 1) / collections.length * 100).toFixed(1)}%)`);
          }
        } catch (error) {
          console.error(`  ❌ Error updating ${collection.receiptNumber}:`, error);
          errors++;
        }
      }

      console.log(`✅ Successfully processed ${collections.length} records for ${branchCode}/${sessionName}`);
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Total updated: ${totalUpdated}`);
    console.log(`❌ Errors: ${errors}`);

    // Verify the migration
    const allCollectionsAfter = await prisma.feeCollection.findMany({
      select: { receiptNumber: true }
    });
    const remainingOldFormat = allCollectionsAfter.filter(collection => 
      isOldFormat(collection.receiptNumber)
    ).length;

    if (remainingOldFormat === 0) {
      console.log(`✅ All receipt numbers successfully migrated to new format!`);
    } else {
      console.log(`⚠️  Warning: ${remainingOldFormat} receipt numbers still in old format`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
async function main() {
  try {
    await migrateReceiptNumbers();
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration script
main();

export { migrateReceiptNumbers, convertOldReceiptNumber };