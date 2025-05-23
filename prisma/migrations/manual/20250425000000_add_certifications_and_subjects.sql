-- Add certifications and subjects array fields to Teacher model
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "certifications" TEXT[] DEFAULT '{}';
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "subjects" TEXT[] DEFAULT '{}';

-- Add certifications and subjects array fields to Employee model
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "certifications" TEXT[] DEFAULT '{}';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "subjects" TEXT[] DEFAULT '{}'; 