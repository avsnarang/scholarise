-- Migration: Add order field to FeeTerm model for custom ordering
-- Author: System Generated
-- Date: 2025-01-12

-- Step 1: Add order column to FeeTerm table
ALTER TABLE "FeeTerm" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Create index for better query performance on ordering
CREATE INDEX "feeterm_branch_session_order_idx" ON "FeeTerm"("branchId", "sessionId", "order");

-- Step 3: Initialize order values based on current startDate order
-- This preserves existing order while setting up the new system
WITH ordered_terms AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY "branchId", "sessionId" ORDER BY "startDate" ASC) as new_order
  FROM "FeeTerm"
  WHERE "isActive" = true
)
UPDATE "FeeTerm" 
SET "order" = ordered_terms.new_order
FROM ordered_terms 
WHERE "FeeTerm".id = ordered_terms.id;

-- Update inactive terms to have higher order values
UPDATE "FeeTerm" 
SET "order" = 999 
WHERE "isActive" = false; 