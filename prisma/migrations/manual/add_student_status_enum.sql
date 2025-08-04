-- Create StudentStatus enum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPELLED', 'WITHDRAWN', 'REPEAT', 'TRANSFERRED', 'GRADUATED', 'SUSPENDED');

-- Add status column to Student table with default value
ALTER TABLE "Student" ADD COLUMN "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- Migrate existing isActive boolean values to status enum
UPDATE "Student" 
SET "status" = CASE 
    WHEN "isActive" = true THEN 'ACTIVE'::"StudentStatus"
    ELSE 'INACTIVE'::"StudentStatus"
END;

-- Add index for status column (replacing isActive index later)
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- Note: We'll keep isActive column for now to ensure compatibility
-- It will be removed in a subsequent migration after code updates