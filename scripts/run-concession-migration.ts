#!/usr/bin/env tsx

import { readFile } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runConcessionMigration() {
  console.log('🚀 Starting Enhanced Concession System Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'prisma/migrations/manual/enhance_concession_system.sql');
    const migrationSQL = await readFile(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded successfully');
    console.log('📊 Executing database migration...\n');

    // Execute the migration in a transaction
    await prisma.$transaction(async (tx) => {
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMIT'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        if (statement && statement.trim()) {
          try {
            console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
            await tx.$executeRawUnsafe(statement);
          } catch (error: any) {
            // Some statements might fail if they already exist (like CREATE TABLE IF NOT EXISTS)
            // Log warning but continue
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
              console.log(`⚠️  Statement ${i + 1}: Already exists, skipping...`);
            } else {
              console.error(`❌ Error in statement ${i + 1}:`, error.message);
              throw error;
            }
          }
        }
      }
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   • Added appliedFeeHeads and appliedFeeTerms to ConcessionType');
    console.log('   • Added feeTermAmounts (JSON) for per-term fixed amounts');
    console.log('   • Removed fee application fields from StudentConcession');
    console.log('   • Created ConcessionApprovalSettings table');
    console.log('   • Added indexes and constraints for performance');
    console.log('   • Created helper function for concession calculations');
    console.log('   • Initialized default approval settings for all branches');

    // Verify the migration by checking some key changes
    console.log('\n🔍 Verifying migration...');
    
    // Check if new columns exist
    const concessionTypes = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ConcessionType' 
      AND column_name IN ('appliedFeeHeads', 'appliedFeeTerms', 'feeTermAmounts')
    `;
    
    console.log(`   • ConcessionType new columns: ${(concessionTypes as any[]).length}/3 added`);
    
    // Check if ConcessionApprovalSettings table exists
    const approvalTable = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ConcessionApprovalSettings'
      )
    `;
    
    console.log(`   • ConcessionApprovalSettings table: ${(approvalTable as any[])[0].exists ? 'Created' : 'Missing'}`);
    
    // Check if appliedFeeHeads/appliedFeeTerms were removed from StudentConcession
    const studentConcessionCols = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'StudentConcession' 
      AND column_name IN ('appliedFeeHeads', 'appliedFeeTerms')
    `;
    
    console.log(`   • StudentConcession fee fields removed: ${(studentConcessionCols as any[]).length === 0 ? 'Yes' : 'No'}`);

    console.log('\n🎉 Enhanced Concession System is ready!');
    console.log('\n📚 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Test the new concession functionality in your app');
    console.log('   3. Configure approval settings for each branch if needed');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📋 Possible solutions:');
    console.error('   1. Check if the database is accessible');
    console.error('   2. Ensure you have proper database permissions');
    console.error('   3. Verify the Prisma schema is in sync');
    console.error('   4. Run: npx prisma db push --accept-data-loss (if safe)');
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  runConcessionMigration()
    .then(() => {
      console.log('\n✨ Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { runConcessionMigration };