-- Migration: Change grade column from integer to text
-- Date: 2025-01-22
-- Description: Change grade field from int4 to text to support non-numeric grades like "Pre-K", "Kindergarten", etc.

-- First, convert existing integer values to text
-- This will preserve existing data by converting numbers to strings
ALTER TABLE "Class" ALTER COLUMN "grade" TYPE TEXT USING CASE 
    WHEN "grade" IS NULL THEN NULL 
    ELSE "grade"::TEXT 
END;

-- Add a comment to the column for clarity
COMMENT ON COLUMN "Class"."grade" IS 'Grade level as text (e.g., "Pre-K", "Kindergarten", "Grade 1", "10th", etc.)'; 