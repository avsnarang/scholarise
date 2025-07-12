-- Migration: Update Assessment Schema Term Relation
-- Description: Convert AssessmentSchema.term from String to foreign key relationship with Term table
-- Date: 2025-01-01

-- Step 1: Add termId column to AssessmentSchema
ALTER TABLE "public"."AssessmentSchema" ADD COLUMN "termId" TEXT;

-- Step 2: Create a temporary function to match term names to term IDs
CREATE OR REPLACE FUNCTION migrate_assessment_schema_terms()
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    matched_term_id TEXT;
BEGIN
    -- Loop through all assessment schemas
    FOR rec IN SELECT id, term, "branchId" FROM "public"."AssessmentSchema" WHERE "termId" IS NULL
    LOOP
        -- Try to find matching term by name and branchId
        SELECT t.id INTO matched_term_id
        FROM "public"."Term" t
        WHERE t.name = rec.term 
        AND t."branchId" = rec."branchId"
        AND t."isActive" = true
        LIMIT 1;
        
        -- If we found a matching term, update the assessment schema
        IF matched_term_id IS NOT NULL THEN
            UPDATE "public"."AssessmentSchema"
            SET "termId" = matched_term_id
            WHERE id = rec.id;
            
            RAISE NOTICE 'Matched assessment schema % with term %', rec.id, matched_term_id;
        ELSE
            -- If no matching term found, try to create a basic term
            -- This handles cases where assessment schemas have term names that don't exist as Term records
            BEGIN
                INSERT INTO "public"."Term" (
                    id,
                    name,
                    "startDate",
                    "endDate",
                    "branchId",
                    "sessionId",
                    "order",
                    "isActive",
                    "isCurrentTerm",
                    "createdAt",
                    "updatedAt"
                )
                SELECT 
                    gen_random_uuid(),
                    rec.term,
                    CURRENT_DATE,
                    CURRENT_DATE + INTERVAL '90 days',
                    rec."branchId",
                    s.id,
                    0,
                    true,
                    false,
                    NOW(),
                    NOW()
                FROM "public"."AcademicSession" s 
                WHERE s."isActive" = true 
                LIMIT 1
                RETURNING id INTO matched_term_id;
                
                -- Update the assessment schema with the new term ID
                UPDATE "public"."AssessmentSchema"
                SET "termId" = matched_term_id
                WHERE id = rec.id;
                
                RAISE NOTICE 'Created new term % for assessment schema %', matched_term_id, rec.id;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to create term for assessment schema %: %', rec.id, SQLERRM;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Run the migration function
SELECT migrate_assessment_schema_terms();

-- Step 4: Clean up - drop the function
DROP FUNCTION migrate_assessment_schema_terms();

-- Step 5: Make termId NOT NULL (only after all records have been migrated)
-- First, let's check if there are any NULL termIds remaining
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM "public"."AssessmentSchema" WHERE "termId" IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % assessment schemas still have NULL termId. Manual intervention required.', null_count;
    ELSE
        -- Add the NOT NULL constraint
        ALTER TABLE "public"."AssessmentSchema" ALTER COLUMN "termId" SET NOT NULL;
        RAISE NOTICE 'Successfully set termId column to NOT NULL';
    END IF;
END;
$$;

-- Step 6: Add foreign key constraint
ALTER TABLE "public"."AssessmentSchema" 
ADD CONSTRAINT "AssessmentSchema_termId_fkey" 
FOREIGN KEY ("termId") REFERENCES "public"."Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Drop the old term column
ALTER TABLE "public"."AssessmentSchema" DROP COLUMN "term";

-- Step 8: Update the unique constraint
ALTER TABLE "public"."AssessmentSchema" DROP CONSTRAINT "AssessmentSchema_branchId_classId_subjectId_term_key";
ALTER TABLE "public"."AssessmentSchema" ADD CONSTRAINT "AssessmentSchema_branchId_classId_subjectId_termId_key" 
UNIQUE ("branchId", "classId", "subjectId", "termId");

-- Step 9: Add index on termId
CREATE INDEX "AssessmentSchema_termId_idx" ON "public"."AssessmentSchema"("termId");

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully: AssessmentSchema now uses foreign key relationship to Term';
END;
$$; 