-- Add roleId to Teacher model
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "roleId" TEXT;

-- Add roleId to Employee model
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "roleId" TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS "Teacher_roleId_idx" ON "Teacher"("roleId");
CREATE INDEX IF NOT EXISTS "Employee_roleId_idx" ON "Employee"("roleId"); 