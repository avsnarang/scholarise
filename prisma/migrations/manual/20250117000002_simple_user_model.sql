-- Simplified Migration: Add User model and Student relationship only
-- Date: 2025-01-17

-- Step 1: Create the User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique index on email (where not null)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email") WHERE "email" IS NOT NULL;

-- Step 3: Insert users from Students only
INSERT INTO "User" ("id", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    s."clerkId",
    s."email",
    s."firstName", 
    s."lastName",
    s."createdAt",
    s."updatedAt"
FROM "Student" s 
WHERE s."clerkId" IS NOT NULL 
  AND s."clerkId" != ''
  AND s."clerkId" NOT IN (SELECT "id" FROM "User")
ON CONFLICT ("id") DO NOTHING;

-- Step 4: Add userId column to Student table
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 5: Update Student userId from clerkId
UPDATE "Student" SET "userId" = "clerkId" 
WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;

-- Step 6: Add foreign key constraint for Student
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Add unique constraint for Student
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_key" UNIQUE ("userId");

-- Step 8: Add index for performance
CREATE INDEX IF NOT EXISTS "Student_userId_idx" ON "Student"("userId");

-- Verification
SELECT 
    (SELECT COUNT(*) FROM "User") as total_users,
    (SELECT COUNT(*) FROM "Student" WHERE "userId" IS NOT NULL) as students_with_users; 