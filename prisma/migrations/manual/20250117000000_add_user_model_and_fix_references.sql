-- Migration: Add User model and fix clerkId foreign key relationships
-- Date: 2025-01-17
-- Description: Creates a User table to represent Supabase auth users and converts all clerkId fields to proper foreign key relationships

-- Step 1: Create the User table to represent Supabase auth users
CREATE TABLE "User" (
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

-- Step 2: Create indexes for better performance
-- Note: Not making email unique since multiple users might share emails (like parents)
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "User_email_idx" ON "User"("email");

-- Step 3: Insert existing users from clerkId fields into the User table
-- This ensures all existing Supabase user IDs are represented in the User table

-- Insert from Students
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
ON CONFLICT ("id") DO NOTHING;

-- Insert from Parents
INSERT INTO "User" ("id", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    p."clerkId",
    p."fatherEmail",
    p."fatherName", 
    p."motherName",
    p."createdAt",
    p."updatedAt"
FROM "Parent" p 
WHERE p."clerkId" IS NOT NULL 
  AND p."clerkId" != ''
ON CONFLICT ("id") DO NOTHING;

-- Insert from Teachers
INSERT INTO "User" ("id", "email", "firstName", "lastName", "phone", "createdAt", "updatedAt")
SELECT DISTINCT 
    t."clerkId",
    t."email",
    t."firstName", 
    t."lastName",
    t."phone",
    t."createdAt",
    t."updatedAt"
FROM "Teacher" t 
WHERE t."clerkId" IS NOT NULL 
  AND t."clerkId" != ''
ON CONFLICT ("id") DO NOTHING;

-- Insert from Employees
INSERT INTO "User" ("id", "email", "firstName", "lastName", "phone", "createdAt", "updatedAt")
SELECT DISTINCT 
    e."clerkId",
    e."email",
    e."firstName", 
    e."lastName",
    e."phone",
    e."createdAt",
    e."updatedAt"
FROM "Employee" e 
WHERE e."clerkId" IS NOT NULL 
  AND e."clerkId" != ''
ON CONFLICT ("id") DO NOTHING;

-- Insert from AdmissionStaff
INSERT INTO "User" ("id", "email", "firstName", "lastName", "phone", "createdAt", "updatedAt")
SELECT DISTINCT 
    a."clerkId",
    a."email",
    a."name", 
    '',
    a."phone",
    a."createdAt",
    a."updatedAt"
FROM "AdmissionStaff" a 
WHERE a."clerkId" IS NOT NULL 
  AND a."clerkId" != ''
ON CONFLICT ("id") DO NOTHING;

-- Step 4: Add new columns with proper foreign key relationships
-- Add userId columns to replace clerkId
ALTER TABLE "Student" ADD COLUMN "userId" TEXT;
ALTER TABLE "Parent" ADD COLUMN "userId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "userId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "userId" TEXT;
ALTER TABLE "AdmissionStaff" ADD COLUMN "userId" TEXT;

-- Step 5: Copy data from clerkId to userId
UPDATE "Student" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "Parent" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "Teacher" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "Employee" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "AdmissionStaff" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';

-- Step 6: Add foreign key constraints
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdmissionStaff" ADD CONSTRAINT "AdmissionStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Update UserRole table to have proper foreign key to User
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Add unique constraints where appropriate
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_key" UNIQUE ("userId");
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_key" UNIQUE ("userId");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_key" UNIQUE ("userId");
ALTER TABLE "AdmissionStaff" ADD CONSTRAINT "AdmissionStaff_userId_key" UNIQUE ("userId");

-- Step 9: Create indexes for better performance
CREATE INDEX "Student_userId_idx" ON "Student"("userId");
CREATE INDEX "Parent_userId_idx" ON "Parent"("userId");
CREATE INDEX "Teacher_userId_idx" ON "Teacher"("userId");
CREATE INDEX "Employee_userId_idx" ON "Employee"("userId");
CREATE INDEX "AdmissionStaff_userId_idx" ON "AdmissionStaff"("userId");

-- Step 10: Drop the old clerkId columns (optional - can be done later after verification)
-- ALTER TABLE "Student" DROP COLUMN "clerkId";
-- ALTER TABLE "Parent" DROP COLUMN "clerkId";
-- ALTER TABLE "Teacher" DROP COLUMN "clerkId";
-- ALTER TABLE "Employee" DROP COLUMN "clerkId";
-- ALTER TABLE "AdmissionStaff" DROP COLUMN "clerkId";

-- Verification queries
-- SELECT COUNT(*) as total_users FROM "User";
-- SELECT COUNT(*) as students_with_users FROM "Student" WHERE "userId" IS NOT NULL;
-- SELECT COUNT(*) as parents_with_users FROM "Parent" WHERE "userId" IS NOT NULL;
-- SELECT COUNT(*) as teachers_with_users FROM "Teacher" WHERE "userId" IS NOT NULL;
-- SELECT COUNT(*) as employees_with_users FROM "Employee" WHERE "userId" IS NOT NULL; 