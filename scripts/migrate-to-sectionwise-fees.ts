import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateFees() {
  console.log('Starting migration from classwise to sectionwise fees...');
  
  try {
    console.log('Step 1: Adding sectionId column...');
    await prisma.$executeRaw`ALTER TABLE "ClasswiseFee" ADD COLUMN IF NOT EXISTS "sectionId" TEXT`;

    console.log('Step 2: Checking current state...');
    const stats = await prisma.$queryRaw<[{total: string, with_section: string, without_section: string}]>`
      SELECT 
        COUNT(*) as total,
        COUNT("sectionId") as with_section,
        COUNT(*) - COUNT("sectionId") as without_section
      FROM "ClasswiseFee"
    `;
    
    console.log(`Current stats: Total: ${stats[0]?.total}, With sectionId: ${stats[0]?.with_section}, Without sectionId: ${stats[0]?.without_section}`);

    const needsMigration = parseInt(stats[0]?.without_section || '0');
    
    if (needsMigration > 0) {
      console.log('Step 3: Getting class-to-section mappings...');
      const mappings = await prisma.$queryRaw<Array<{class_id: string, section_id: string}>>`
        SELECT DISTINCT 
          c.id as class_id,
          s.id as section_id
        FROM "Class" c
        INNER JOIN "Section" s ON s."classId" = c.id
        WHERE c.id IN (
          SELECT DISTINCT "classId" FROM "ClasswiseFee" WHERE "sectionId" IS NULL
        )
        ORDER BY c.id, s.id
      `;
      
      console.log(`Found ${mappings.length} class-section mappings`);

      console.log('Step 4: Creating section-level fees from class-level fees...');
      
      // For each class-section mapping, create new fee records
      for (const mapping of mappings) {
        console.log(`Processing class ${mapping.class_id} -> section ${mapping.section_id}`);
        
        await prisma.$executeRaw`
          INSERT INTO "ClasswiseFee" (
              id, "sectionId", "feeTermId", "feeHeadId", amount, "branchId", "sessionId", "createdAt", "updatedAt"
          )
          SELECT 
              'sec_' || cf.id || '_' || ${mapping.section_id} as id,
              ${mapping.section_id} as "sectionId",
              cf."feeTermId",
              cf."feeHeadId", 
              cf.amount,
              cf."branchId",
              cf."sessionId",
              cf."createdAt",
              NOW() as "updatedAt"
          FROM "ClasswiseFee" cf
          WHERE cf."classId" = ${mapping.class_id} AND cf."sectionId" IS NULL
        `;
      }

      console.log('Step 5: Deleting original class-level records...');
      await prisma.$executeRaw`DELETE FROM "ClasswiseFee" WHERE "sectionId" IS NULL`;
      
      console.log('Step 6: Verifying migration...');
      const afterStats = await prisma.$queryRaw<[{total: string, with_section: string}]>`
        SELECT 
          COUNT(*) as total,
          COUNT("sectionId") as with_section
        FROM "ClasswiseFee"
      `;
      
      console.log(`After migration: Total: ${afterStats[0]?.total}, All with sectionId: ${afterStats[0]?.with_section}`);
    }

    console.log('Step 7: Making sectionId NOT NULL...');
    await prisma.$executeRaw`ALTER TABLE "ClasswiseFee" ALTER COLUMN "sectionId" SET NOT NULL`;

    console.log('Step 8: Adding foreign key constraint...');
    await prisma.$executeRaw`
      ALTER TABLE "ClasswiseFee" 
      ADD CONSTRAINT IF NOT EXISTS "ClasswiseFee_sectionId_fkey" 
      FOREIGN KEY ("sectionId") REFERENCES "Section"(id) ON DELETE RESTRICT ON UPDATE CASCADE
    `;

    console.log('Step 9: Dropping old constraints and column...');
    await prisma.$executeRaw`ALTER TABLE "ClasswiseFee" DROP CONSTRAINT IF EXISTS "ClasswiseFee_classId_fkey"`;
    await prisma.$executeRaw`ALTER TABLE "ClasswiseFee" DROP CONSTRAINT IF EXISTS "ClasswiseFee_classId_feeTermId_feeHeadId_key"`;
    await prisma.$executeRaw`ALTER TABLE "ClasswiseFee" DROP COLUMN IF EXISTS "classId"`;

    console.log('Step 10: Creating new unique constraint...');
    await prisma.$executeRaw`
      ALTER TABLE "ClasswiseFee" 
      ADD CONSTRAINT "ClasswiseFee_sectionId_feeTermId_feeHeadId_key" 
      UNIQUE ("sectionId", "feeTermId", "feeHeadId")
    `;

    console.log('Step 11: Creating indexes...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ClasswiseFee_sectionId_idx" ON "ClasswiseFee"("sectionId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ClasswiseFee_section_term_idx" ON "ClasswiseFee"("sectionId", "feeTermId")`;

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateFees(); 