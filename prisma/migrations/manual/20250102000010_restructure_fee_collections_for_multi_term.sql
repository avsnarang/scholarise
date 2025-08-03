-- Migration: Restructure Fee Collections for Multi-Term Support
-- This allows one fee collection (receipt) to span multiple fee terms

BEGIN;

-- Step 1: Add feeTermId column to FeeCollectionItem
ALTER TABLE "FeeCollectionItem" ADD COLUMN "feeTermId" TEXT;

-- Step 2: Populate feeTermId in FeeCollectionItem from parent FeeCollection
UPDATE "FeeCollectionItem" 
SET "feeTermId" = (
  SELECT "feeTermId" 
  FROM "FeeCollection" 
  WHERE "FeeCollection"."id" = "FeeCollectionItem"."feeCollectionId"
);

-- Step 3: Make feeTermId NOT NULL after population
ALTER TABLE "FeeCollectionItem" ALTER COLUMN "feeTermId" SET NOT NULL;

-- Step 4: Add foreign key constraint for feeTermId in FeeCollectionItem
ALTER TABLE "FeeCollectionItem" 
ADD CONSTRAINT "FeeCollectionItem_feeTermId_fkey" 
FOREIGN KEY ("feeTermId") REFERENCES "FeeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Remove foreign key constraint from FeeCollection.feeTermId
ALTER TABLE "FeeCollection" DROP CONSTRAINT "FeeCollection_feeTermId_fkey";

-- Step 6: Drop feeTermId column from FeeCollection
ALTER TABLE "FeeCollection" DROP COLUMN "feeTermId";

-- Step 7: Add indexes for performance
CREATE INDEX "FeeCollectionItem_feeTermId_idx" ON "FeeCollectionItem"("feeTermId");

COMMIT;