-- Add Parent relationship to User table (without emails to avoid conflicts)
-- Date: 2025-01-17

-- Step 1: Insert Parent users (without email to avoid conflicts)
INSERT INTO "User" ("id", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    p."clerkId",
    p."fatherName", 
    p."motherName",
    p."createdAt",
    p."updatedAt"
FROM "Parent" p 
WHERE p."clerkId" IS NOT NULL 
  AND p."clerkId" != ''
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = p."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 2: Add userId column to Parent table
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 3: Update Parent userId from clerkId
UPDATE "Parent" SET "userId" = "clerkId" 
WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;

-- Step 4: Add foreign key constraint for Parent
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS "Parent_userId_idx" ON "Parent"("userId");

-- Verification
SELECT 
    (SELECT COUNT(*) FROM "User") as total_users,
    (SELECT COUNT(*) FROM "Parent" WHERE "userId" IS NOT NULL) as parents_with_users; 