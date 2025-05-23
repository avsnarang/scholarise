-- Add clerkId column to Employee table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Employee'
        AND column_name = 'clerkId'
    ) THEN
        ALTER TABLE "Employee" ADD COLUMN "clerkId" TEXT;
    END IF;
END
$$; 