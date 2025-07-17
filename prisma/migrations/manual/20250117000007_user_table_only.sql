-- Step-by-step User Table Creation
-- Date: 2025-01-17

-- Step 1: Drop existing User table if exists
DROP TABLE IF EXISTS "User" CASCADE;

-- Step 2: Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authIdentifier" TEXT UNIQUE NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "userType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes
CREATE UNIQUE INDEX "User_authIdentifier_key" ON "User"("authIdentifier");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_userType_idx" ON "User"("userType");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- Step 4: Insert Students with school email addresses (simplified)
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    s."clerkId",
    s."admissionNumber" || '@ps.tsh.edu.in' as school_email,  -- Default to PS branch for now
    s."email" as personal_email,
    s."firstName", 
    s."lastName",
    'student',
    s."createdAt",
    s."updatedAt"
FROM "Student" s 
WHERE s."clerkId" IS NOT NULL 
  AND s."clerkId" != '';

-- Step 5: Add userId columns and update
ALTER TABLE "Student" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Student" ADD COLUMN "userId" TEXT;
UPDATE "Student" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';

-- Step 6: Add foreign key constraint for Students
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_key" UNIQUE ("userId");

-- Verification
SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as students_with_users FROM "Student" WHERE "userId" IS NOT NULL; 