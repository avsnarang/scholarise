-- Update Fixed Amount Concession Types to use fee term wise amounts
-- This migration ensures that FIXED type concessions have their value set to 0
-- and rely on feeTermAmounts for actual amounts

-- Update all FIXED type concession types to have value = 0
UPDATE "ConcessionType" 
SET "value" = 0 
WHERE "type" = 'FIXED';

-- Add a comment to document this change
COMMENT ON COLUMN "ConcessionType"."value" IS 'For PERCENTAGE type: the percentage value (0-100). For FIXED type: should be 0, actual amounts stored in feeTermAmounts JSON field.';

-- Ensure feeTermAmounts field is properly initialized for all concession types
UPDATE "ConcessionType" 
SET "feeTermAmounts" = '{}'::jsonb 
WHERE "feeTermAmounts" IS NULL;

-- Add a check constraint to ensure FIXED type concessions have value = 0
ALTER TABLE "ConcessionType" 
DROP CONSTRAINT IF EXISTS "ConcessionType_fixed_value_check";

ALTER TABLE "ConcessionType" 
ADD CONSTRAINT "ConcessionType_fixed_value_check" 
CHECK (
  ("type" = 'FIXED' AND "value" = 0) OR 
  ("type" = 'PERCENTAGE' AND "value" > 0)
);

-- Create an index on the JSON field for better performance when querying fee term amounts
CREATE INDEX IF NOT EXISTS "ConcessionType_feeTermAmounts_idx" 
ON "ConcessionType" USING gin ("feeTermAmounts");