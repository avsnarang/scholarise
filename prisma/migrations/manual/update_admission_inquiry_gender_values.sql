-- Migration: Update AdmissionInquiry gender values
-- Description: Convert M -> MALE and F -> FEMALE for consistency
-- Created: 2025-01-20

-- Start transaction to ensure atomicity
BEGIN;

-- Update gender values
UPDATE "AdmissionInquiry" 
SET "gender" = 'MALE' 
WHERE "gender" = 'M';

UPDATE "AdmissionInquiry" 
SET "gender" = 'FEMALE' 
WHERE "gender" = 'F';

-- Show what was updated
SELECT 
    COUNT(*) as total_records,
    SUM(CASE WHEN "gender" = 'MALE' THEN 1 ELSE 0 END) as male_count,
    SUM(CASE WHEN "gender" = 'FEMALE' THEN 1 ELSE 0 END) as female_count,
    SUM(CASE WHEN "gender" NOT IN ('MALE', 'FEMALE', 'OTHER') AND "gender" IS NOT NULL THEN 1 ELSE 0 END) as other_values
FROM "AdmissionInquiry";

-- Commit the transaction
COMMIT;

-- Verification query to check results
SELECT 
    "gender", 
    COUNT(*) as count 
FROM "AdmissionInquiry" 
WHERE "gender" IS NOT NULL
GROUP BY "gender"
ORDER BY "gender"; 