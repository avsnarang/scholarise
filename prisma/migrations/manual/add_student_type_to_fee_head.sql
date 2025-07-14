-- Add studentType column to FeeHead table
-- This field indicates whether the fee head applies to:
-- 'NEW_ADMISSION' - for newly admitted students
-- 'OLD_STUDENT' - for continuing/existing students  
-- 'BOTH' - for all students regardless of admission status

ALTER TABLE "FeeHead" ADD COLUMN "studentType" TEXT NOT NULL DEFAULT 'BOTH';

-- Create an index for better query performance
CREATE INDEX "FeeHead_studentType_idx" ON "FeeHead"("studentType");

-- Update existing records to have 'BOTH' as default
UPDATE "FeeHead" SET "studentType" = 'BOTH' WHERE "studentType" IS NULL;

-- Create a check constraint to ensure only valid values
ALTER TABLE "FeeHead" ADD CONSTRAINT "FeeHead_studentType_check" 
CHECK ("studentType" IN ('NEW_ADMISSION', 'OLD_STUDENT', 'BOTH')); 