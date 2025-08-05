/**
 * Script to migrate payment gateway from Easebuzz to Razorpay
 * This script updates existing payment records and runs the necessary SQL migration
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('Starting payment gateway migration from Easebuzz to Razorpay...\n');

  try {
    // First, let's check if there are any Easebuzz records
    const easebuzzTransactions = await prisma.paymentGatewayTransaction.count({
      where: { gateway: 'EASEBUZZ' as any }
    });

    const easebuzzRequests = await prisma.paymentRequest.count({
      where: { gateway: 'EASEBUZZ' as any }
    });

      const easebuzzWebhooks = await prisma.paymentWebhookLog.count({
    where: { gateway: 'EASEBUZZ' as any }
  });

    console.log('Current Easebuzz records:');
    console.log(`- Payment Gateway Transactions: ${easebuzzTransactions}`);
    console.log(`- Payment Requests: ${easebuzzRequests}`);
    console.log(`- Payment Gateway Webhooks: ${easebuzzWebhooks}`);
    console.log('');

    if (easebuzzTransactions === 0 && easebuzzRequests === 0 && easebuzzWebhooks === 0) {
      console.log('No Easebuzz records found. Skipping data migration.');
    } else {
      console.log('Found Easebuzz records. Running data migration...');
      
      // Read and execute the migration SQL
      const migrationPath = path.join(__dirname, '../prisma/migrations/manual/remove_easebuzz_gateway.sql');
      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
      
      // Execute the migration statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('UPDATE') || statement.includes('ALTER') || statement.includes('CREATE') || statement.includes('DROP')) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await prisma.$executeRawUnsafe(statement);
        }
      }

      console.log('\nData migration completed successfully!');
    }

    // Verify the migration
    console.log('\nVerifying migration results...');
    
    const remainingEasebuzz = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT 1 FROM "PaymentGatewayTransaction" WHERE "gateway"::text = 'EASEBUZZ'
        UNION ALL
        SELECT 1 FROM "PaymentRequest" WHERE "gateway"::text = 'EASEBUZZ'
        UNION ALL
        SELECT 1 FROM "PaymentWebhookLog" WHERE "gateway"::text = 'EASEBUZZ'
      ) as easebuzz_records
    ` as any[];

    if (remainingEasebuzz[0]?.count === '0' || remainingEasebuzz[0]?.count === 0n) {
      console.log('✅ Migration successful! No Easebuzz records remaining.');
    } else {
      console.log('⚠️  Warning: Some Easebuzz records might still exist.');
    }

    // Show current gateway distribution
    const gatewayStats = await prisma.paymentGatewayTransaction.groupBy({
      by: ['gateway'],
      _count: true,
    });

    console.log('\nCurrent payment gateway distribution:');
    gatewayStats.forEach(stat => {
      console.log(`- ${stat.gateway}: ${stat._count} transactions`);
    });

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\nMigration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });