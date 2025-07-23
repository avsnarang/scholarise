-- Add displayOrder column to Subject table
ALTER TABLE "Subject" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- Update existing subjects to have sequential display orders based on name
UPDATE "Subject" 
SET "displayOrder" = row_number 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 as row_number 
  FROM "Subject"
) AS numbered_subjects 
WHERE "Subject".id = numbered_subjects.id; 