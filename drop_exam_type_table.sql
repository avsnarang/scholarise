-- Drop ExamType table
-- This removes the legacy ExamType table that is no longer needed after the exam system cleanup

-- Drop the table (CASCADE will also drop any foreign key constraints that reference this table)
DROP TABLE IF EXISTS "public"."ExamType" CASCADE;

-- Print confirmation message
DO $$
BEGIN
    RAISE NOTICE 'ExamType table has been dropped successfully';
END;
$$; 