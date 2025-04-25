-- First, check for any orphaned records
DO $$ 
BEGIN
    -- Create a temporary table to store orphaned records
    CREATE TEMP TABLE orphaned_students AS
    SELECT id, "parentId"
    FROM "Student"
    WHERE "parentId" IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 
        FROM "Parent" 
        WHERE "Parent".id = "Student"."parentId"
    );

    -- If there are orphaned records, set their parentId to NULL
    UPDATE "Student"
    SET "parentId" = NULL
    WHERE id IN (SELECT id FROM orphaned_students);

    -- Log the number of fixed records (you can check this in your database logs)
    RAISE NOTICE 'Fixed % orphaned student records', (SELECT COUNT(*) FROM orphaned_students);
END $$;

-- Now safely add the foreign key constraint
ALTER TABLE "Student" 
ADD CONSTRAINT "Student_parentId_fkey" 
FOREIGN KEY ("parentId") 
REFERENCES "Parent"(id) 
ON DELETE SET NULL;

-- Create an index to improve query performance
CREATE INDEX IF NOT EXISTS "Student_parentId_idx" ON "Student"("parentId"); 