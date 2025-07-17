-- Add Parent relationship to User table
-- Date: 2025-01-17

-- Step 1: Insert Parent users (use fatherEmail if available, avoiding conflicts)
INSERT INTO "User" ("id", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    p."clerkId",
    CASE 
        -- Only use email if it doesn't already exist in User table
        WHEN p."fatherEmail" IS NOT NULL 
             AND p."fatherEmail" != '' 
             AND NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = p."fatherEmail")
        THEN p."fatherEmail"
        ELSE NULL
    END,
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

-- Step 5: Add index for performance (Note: Parent is not unique because multiple parents can share one user account)
CREATE INDEX IF NOT EXISTS "Parent_userId_idx" ON "Parent"("userId");

-- Verification
SELECT 
    (SELECT COUNT(*) FROM "User") as total_users,
    (SELECT COUNT(*) FROM "Parent" WHERE "userId" IS NOT NULL) as parents_with_users; 