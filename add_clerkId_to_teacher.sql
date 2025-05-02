-- Add clerkId column to Teacher table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Teacher'
        AND column_name = 'clerkId'
    ) THEN
        ALTER TABLE "Teacher" ADD COLUMN "clerkId" TEXT;
    END IF;
END
$$; 