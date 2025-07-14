-- Migration: Convert ClasswiseFee from class-level to section-level
-- This migration changes the fee structure from being assigned per class to per section

BEGIN;

-- Step 1: Add sectionId column (nullable initially)
ALTER TABLE "ClasswiseFee" ADD COLUMN "sectionId" TEXT;

-- Step 2: Create a mapping from existing class fees to all sections within those classes
-- For each existing ClasswiseFee record, create entries for all sections in that class
INSERT INTO "ClasswiseFee" (
    id, "sectionId", "feeTermId", "feeHeadId", amount, "branchId", "sessionId", "createdAt", "updatedAt"
)
SELECT 
    'migrated_' || cf.id || '_' || s.id as id,
    s.id as "sectionId",
    cf."feeTermId",
    cf."feeHeadId", 
    cf.amount,
    cf."branchId",
    cf."sessionId",
    cf."createdAt",
    NOW() as "updatedAt"
FROM "ClasswiseFee" cf
INNER JOIN "Section" s ON s."classId" = cf."classId"
WHERE cf."sectionId" IS NULL; -- Only migrate records that haven't been migrated yet

-- Step 3: Delete the original class-level records
DELETE FROM "ClasswiseFee" WHERE "sectionId" IS NULL;

-- Step 4: Make sectionId NOT NULL
ALTER TABLE "ClasswiseFee" ALTER COLUMN "sectionId" SET NOT NULL;

-- Step 5: Add foreign key constraint for sectionId
ALTER TABLE "ClasswiseFee" ADD CONSTRAINT "ClasswiseFee_sectionId_fkey" 
    FOREIGN KEY ("sectionId") REFERENCES "Section"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Drop the old classId column and its constraints
ALTER TABLE "ClasswiseFee" DROP CONSTRAINT IF EXISTS "ClasswiseFee_classId_fkey";
ALTER TABLE "ClasswiseFee" DROP CONSTRAINT IF EXISTS "ClasswiseFee_classId_feeTermId_feeHeadId_key";
ALTER TABLE "ClasswiseFee" DROP COLUMN "classId";

-- Step 7: Create new unique constraint for section-level fees
ALTER TABLE "ClasswiseFee" ADD CONSTRAINT "ClasswiseFee_sectionId_feeTermId_feeHeadId_key" 
    UNIQUE ("sectionId", "feeTermId", "feeHeadId");

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "ClasswiseFee_sectionId_idx" ON "ClasswiseFee"("sectionId");
CREATE INDEX IF NOT EXISTS "ClasswiseFee_section_term_idx" ON "ClasswiseFee"("sectionId", "feeTermId");

COMMIT; 