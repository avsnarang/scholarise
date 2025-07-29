-- Add firstJoinedSessionId column to Student table
-- This field tracks which academic session the student first joined the school
-- This provides a foolproof method to identify new admissions vs old students

ALTER TABLE "Student" ADD COLUMN "firstJoinedSessionId" TEXT;

-- Create an index for better query performance
CREATE INDEX "Student_firstJoinedSessionId_idx" ON "Student"("firstJoinedSessionId");

-- Add foreign key constraint to AcademicSession
ALTER TABLE "Student" ADD CONSTRAINT "Student_firstJoinedSessionId_fkey" 
FOREIGN KEY ("firstJoinedSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- For existing students without this field, we'll leave it NULL
-- The application logic will treat NULL values as "old students" 