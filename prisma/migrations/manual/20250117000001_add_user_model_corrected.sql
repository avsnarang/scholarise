-- Migration: Add User model and fix clerkId foreign key relationships (CORRECTED)
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "email" IS NOT NULL;
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "User_email_idx" ON "User"("email");

-- Step 3: Insert users from each table, handling potential email conflicts
-- Insert from Students (prioritize students for email conflicts)
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

-- Insert from Teachers (skip if email already exists)
INSERT INTO "User" ("id", "email", "firstName", "lastName", "phone", "createdAt", "updatedAt")
SELECT DISTINCT 
    t."clerkId",
    CASE 
        WHEN t."email" NOT IN (SELECT "email" FROM "User" WHERE "email" IS NOT NULL) THEN t."email"
        ELSE NULL
    END,
    t."firstName", 
    t."lastName",
    t."phone",
    t."createdAt",
    t."updatedAt"
FROM "Teacher" t 
WHERE t."clerkId" IS NOT NULL 
  AND t."clerkId" != ''
ON CONFLICT ("id") DO NOTHING;

-- Insert from Employees (skip if email already exists)
INSERT INTO "User" ("id", "email", "firstName", "lastName", "phone", "createdAt", "updatedAt")
SELECT DISTINCT 
    e."clerkId",
    CASE 
        WHEN e."email" NOT IN (SELECT "email" FROM "User" WHERE "email" IS NOT NULL) THEN e."email"
        ELSE NULL
    END,
    e."firstName", 
    e."lastName",
    e."phone",
    e."createdAt",
    e."updatedAt"
FROM "Employee" e 
WHERE e."clerkId" IS NOT NULL 
  AND e."clerkId" != ''
ON CONFLICT ("id") DO NOTHING;

-- Insert from Parents (use father email, skip if already exists)
INSERT INTO "User" ("id", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    p."clerkId",
    CASE 
        WHEN p."fatherEmail" NOT IN (SELECT "email" FROM "User" WHERE "email" IS NOT NULL) THEN p."fatherEmail"
        ELSE NULL
    END,
    p."fatherName", 
    p."motherName",
    p."createdAt",
    p."updatedAt"
FROM "Parent" p 
WHERE p."clerkId" IS NOT NULL 
  AND p."clerkId" != ''
ON CONFLICT ("id") DO NOTHING;

-- Insert from AdmissionStaff (skip if email already exists)
INSERT INTO "User" ("id", "email", "firstName", "lastName", "phone", "createdAt", "updatedAt")
SELECT DISTINCT 
    a."clerkId",
    CASE 
        WHEN a."email" NOT IN (SELECT "email" FROM "User" WHERE "email" IS NOT NULL) THEN a."email"
        ELSE NULL
    END,
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
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AdmissionStaff" ADD COLUMN IF NOT EXISTS "userId" TEXT;

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

-- Step 8: Add unique constraints where appropriate (1:1 relationships)
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

-- Verification: Check counts
-- SELECT COUNT(*) as total_users FROM "User";
-- SELECT COUNT(*) as students_with_users FROM "Student" WHERE "userId" IS NOT NULL;
-- SELECT COUNT(*) as parents_with_users FROM "Parent" WHERE "userId" IS NOT NULL;
-- SELECT COUNT(*) as teachers_with_users FROM "Teacher" WHERE "userId" IS NOT NULL;
-- SELECT COUNT(*) as employees_with_users FROM "Employee" WHERE "userId" IS NOT NULL; 