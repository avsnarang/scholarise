-- Migration to fix CourtesyCallFeedback foreign key constraints
-- This addresses the issue where a single callerId field was used for both teacher and employee relations

-- Step 1: Add new optional columns for teacherId and employeeId
ALTER TABLE "CourtesyCallFeedback" ADD COLUMN "teacherId" TEXT;
ALTER TABLE "CourtesyCallFeedback" ADD COLUMN "employeeId" TEXT;

-- Step 2: Migrate existing data based on callerType
UPDATE "CourtesyCallFeedback" 
SET "teacherId" = "callerId" 
WHERE "callerType" = 'TEACHER';

UPDATE "CourtesyCallFeedback" 
SET "employeeId" = "callerId" 
WHERE "callerType" = 'HEAD';

-- Step 3: Drop the old foreign key constraints
ALTER TABLE "CourtesyCallFeedback" DROP CONSTRAINT "CourtesyCallFeedback_teacher_fkey";
ALTER TABLE "CourtesyCallFeedback" DROP CONSTRAINT "CourtesyCallFeedback_employee_fkey";

-- Step 4: Add new foreign key constraints for the separate fields
ALTER TABLE "CourtesyCallFeedback" ADD CONSTRAINT "CourtesyCallFeedback_teacherId_fkey" 
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE;

ALTER TABLE "CourtesyCallFeedback" ADD CONSTRAINT "CourtesyCallFeedback_employeeId_fkey" 
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;

-- Step 5: Add indexes for the new fields
CREATE INDEX "CourtesyCallFeedback_teacherId_callDate_idx" ON "CourtesyCallFeedback"("teacherId", "callDate");
CREATE INDEX "CourtesyCallFeedback_employeeId_callDate_idx" ON "CourtesyCallFeedback"("employeeId", "callDate");

-- Note: We'll keep the callerId field for now for backward compatibility
-- It can be removed in a future migration after updating all application code 