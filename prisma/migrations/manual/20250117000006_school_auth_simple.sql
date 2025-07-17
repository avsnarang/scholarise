-- Simplified School Authentication System Migration
-- Date: 2025-01-17

-- Step 1: Drop existing User table if exists to start fresh
DROP TABLE IF EXISTS "User" CASCADE;

-- Step 2: Create User table with mixed authentication support
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

-- Step 4: Insert Students with school email addresses
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    s."clerkId",
    s."admissionNumber" || '@' || 
    CASE 
        WHEN b."code" = 'PS' THEN 'ps.tsh.edu.in'
        WHEN b."code" = 'JUN' THEN 'jun.tsh.edu.in'
        WHEN b."code" = 'MAJRA' THEN 'majra.tsh.edu.in'
        ELSE 'tsh.edu.in'
    END as school_email,
    s."email" as personal_email,
    s."firstName", 
    s."lastName",
    'student',
    s."createdAt",
    s."updatedAt"
FROM "Student" s 
JOIN "Branch" b ON s."branchId" = b."id"
WHERE s."clerkId" IS NOT NULL 
  AND s."clerkId" != '';

-- Step 5: Insert Parents with username authentication (P{admissionNumber})
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    p."clerkId",
    'P' || (
        SELECT s."admissionNumber" 
        FROM "Student" s 
        WHERE s."parentId" = p."id" 
        ORDER BY s."admissionNumber" 
        LIMIT 1
    ) as username,
    p."fatherEmail",
    p."fatherName", 
    p."motherName",
    'parent',
    p."createdAt",
    p."updatedAt"
FROM "Parent" p 
WHERE p."clerkId" IS NOT NULL 
  AND p."clerkId" != ''
  AND EXISTS (SELECT 1 FROM "Student" s WHERE s."parentId" = p."id");

-- Step 6: Insert Teachers with their school email addresses (if they have email)
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    t."clerkId",
    COALESCE(t."email", 'teacher_' || t."id" || '@tsh.edu.in'),
    t."email",
    t."firstName", 
    t."lastName",
    'teacher',
    t."createdAt",
    t."updatedAt"
FROM "Teacher" t 
WHERE t."clerkId" IS NOT NULL 
  AND t."clerkId" != '';

-- Step 7: Insert Employees with their school email addresses (if they have email)
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    e."clerkId",
    COALESCE(e."email", 'employee_' || e."id" || '@tsh.edu.in'),
    e."email",
    e."firstName", 
    e."lastName",
    'employee',
    e."createdAt",
    e."updatedAt"
FROM "Employee" e 
WHERE e."clerkId" IS NOT NULL 
  AND e."clerkId" != '';

-- Step 8: Insert AdmissionStaff
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    a."clerkId",
    COALESCE(a."email", 'staff_' || a."id" || '@tsh.edu.in'),
    a."email",
    a."name", 
    '',
    'staff',
    a."createdAt",
    a."updatedAt"
FROM "AdmissionStaff" a 
WHERE a."clerkId" IS NOT NULL 
  AND a."clerkId" != '';

-- Step 9: Add userId columns to all tables (drop if exists first)
ALTER TABLE "Student" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Parent" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Teacher" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Employee" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "AdmissionStaff" DROP COLUMN IF EXISTS "userId";

ALTER TABLE "Student" ADD COLUMN "userId" TEXT;
ALTER TABLE "Parent" ADD COLUMN "userId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "userId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "userId" TEXT;
ALTER TABLE "AdmissionStaff" ADD COLUMN "userId" TEXT;

-- Step 10: Update userId from clerkId
UPDATE "Student" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "Parent" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "Teacher" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "Employee" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';
UPDATE "AdmissionStaff" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '';

-- Step 11: Add foreign key constraints
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionStaff" ADD CONSTRAINT "AdmissionStaff_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 12: Add unique constraints for 1:1 relationships
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_key" UNIQUE ("userId");
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_key" UNIQUE ("userId");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_key" UNIQUE ("userId");
ALTER TABLE "AdmissionStaff" ADD CONSTRAINT "AdmissionStaff_userId_key" UNIQUE ("userId");

-- Step 13: Create indexes for performance
CREATE INDEX "Student_userId_idx" ON "Student"("userId");
CREATE INDEX "Parent_userId_idx" ON "Parent"("userId");
CREATE INDEX "Teacher_userId_idx" ON "Teacher"("userId");
CREATE INDEX "Employee_userId_idx" ON "Employee"("userId");
CREATE INDEX "AdmissionStaff_userId_idx" ON "AdmissionStaff"("userId");

-- Verification: Show the authentication identifiers created
SELECT 
    'Students (Email)' as type, 
    COUNT(*) as count,
    array_agg("authIdentifier" ORDER BY "authIdentifier" LIMIT 3) as sample_auth_identifiers
FROM "User" 
WHERE "userType" = 'student'

UNION ALL

SELECT 
    'Parents (Username)' as type,
    COUNT(*) as count, 
    array_agg("authIdentifier" ORDER BY "authIdentifier" LIMIT 3) as sample_auth_identifiers
FROM "User" 
WHERE "userType" = 'parent'

UNION ALL

SELECT 
    'Teachers (Email)' as type,
    COUNT(*) as count,
    array_agg("authIdentifier" ORDER BY "authIdentifier" LIMIT 3) as sample_auth_identifiers  
FROM "User" 
WHERE "userType" = 'teacher'

UNION ALL

SELECT 
    'All Users' as type,
    COUNT(*) as count,
    NULL as sample_auth_identifiers
FROM "User"; 