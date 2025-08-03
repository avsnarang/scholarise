-- Schema Restructuring for Multi-Term Fee Collections (Clean Version)
-- Run this AFTER cleaning all finance data

BEGIN;

-- Step 1: Add feeTermId column to FeeCollectionItem
ALTER TABLE "FeeCollectionItem" ADD COLUMN "feeTermId" TEXT;

-- Step 2: Make feeTermId NOT NULL (safe since table is empty)
ALTER TABLE "FeeCollectionItem" ALTER COLUMN "feeTermId" SET NOT NULL;

-- Step 3: Add foreign key constraint for feeTermId in FeeCollectionItem
ALTER TABLE "FeeCollectionItem" 
ADD CONSTRAINT "FeeCollectionItem_feeTermId_fkey" 
FOREIGN KEY ("feeTermId") REFERENCES "FeeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Remove foreign key constraint from FeeCollection.feeTermId
ALTER TABLE "FeeCollection" DROP CONSTRAINT IF EXISTS "FeeCollection_feeTermId_fkey";

-- Step 5: Drop feeTermId column from FeeCollection
ALTER TABLE "FeeCollection" DROP COLUMN IF EXISTS "feeTermId";

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS "FeeCollectionItem_feeTermId_idx" ON "FeeCollectionItem"("feeTermId");

COMMIT;

-- Verify schema changes
\d "FeeCollection"
\d "FeeCollectionItem"