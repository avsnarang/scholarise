-- Migration: Add age column to Class table
-- Date: 2025-01-22
-- Description: Add optional age field to Class model for age-based class assignment

ALTER TABLE "Class" ADD COLUMN "age" INTEGER;

-- Add a comment to the column for clarity
COMMENT ON COLUMN "Class"."age" IS 'Age in years for students eligible for this class'; 