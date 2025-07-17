-- School Authentication System Migration
-- Date: 2025-01-17
-- Description: Implements school-specific auth where parents use usernames (P{admissionNumber}) and others use emails

-- Step 1: Create User table with mixed authentication support
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "authIdentifier" TEXT UNIQUE NOT NULL, -- Username for parents, email for others (stored in Supabase Auth email field)
    "email" TEXT,                          -- Real email address 
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "userType" TEXT NOT NULL,              -- 'parent', 'student', 'teacher', 'employee', 'staff'
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "User_authIdentifier_key" ON "User"("authIdentifier");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_userType_idx" ON "User"("userType");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- Step 3: Get branch codes for email generation
-- We'll need to map branch IDs to codes for email generation

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
    s."email" as personal_email,           -- Store personal email separately
    s."firstName", 
    s."lastName",
    'student',
    s."createdAt",
    s."updatedAt"
FROM "Student" s 
JOIN "Branch" b ON s."branchId" = b."id"
WHERE s."clerkId" IS NOT NULL 
  AND s."clerkId" != ''
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = s."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 5: Insert Parents with username authentication (P{admissionNumber})
-- Parents will use the admission number of their first child
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    p."clerkId",
    'P' || (
        SELECT s."admissionNumber" 
        FROM "Student" s 
        WHERE s."parentId" = p."id" 
        ORDER BY s."admissionNumber" 
        LIMIT 1
    ) as username,                         -- Generate username like "P10005000"
    p."fatherEmail",                       -- Store real email separately
    p."fatherName", 
    p."motherName",
    'parent',
    p."createdAt",
    p."updatedAt"
FROM "Parent" p 
WHERE p."clerkId" IS NOT NULL 
  AND p."clerkId" != ''
  AND EXISTS (SELECT 1 FROM "Student" s WHERE s."parentId" = p."id") -- Only parents with students
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = p."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 6: Insert Teachers with their school email addresses
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    t."clerkId",
    t."email",                             -- Use their actual email for auth
    t."email",                             -- Same email stored here too
    t."firstName", 
    t."lastName",
    'teacher',
    t."createdAt",
    t."updatedAt"
FROM "Teacher" t 
WHERE t."clerkId" IS NOT NULL 
  AND t."clerkId" != ''
  AND t."email" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = t."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 7: Insert Employees with their school email addresses
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    e."clerkId",
    e."email",                             -- Use their actual email for auth
    e."email",                             -- Same email stored here too
    e."firstName", 
    e."lastName",
    'employee',
    e."createdAt",
    e."updatedAt"
FROM "Employee" e 
WHERE e."clerkId" IS NOT NULL 
  AND e."clerkId" != ''
  AND e."email" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = e."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 8: Insert AdmissionStaff with their email addresses
INSERT INTO "User" ("id", "authIdentifier", "email", "firstName", "lastName", "userType", "createdAt", "updatedAt")
SELECT DISTINCT 
    a."clerkId",
    a."email",                             -- Use their actual email for auth
    a."email",                             -- Same email stored here too
    a."name", 
    '',
    'staff',
    a."createdAt",
    a."updatedAt"
FROM "AdmissionStaff" a 
WHERE a."clerkId" IS NOT NULL 
  AND a."clerkId" != ''
  AND a."email" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = a."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 9: Add userId columns to all tables
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AdmissionStaff" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 10: Update userId from clerkId
UPDATE "Student" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "Parent" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "Teacher" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "Employee" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "AdmissionStaff" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;

-- Step 11: Add foreign key constraints
ALTER TABLE "Student" ADD CONSTRAINT IF NOT EXISTS "Student_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Parent" ADD CONSTRAINT IF NOT EXISTS "Parent_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Teacher" ADD CONSTRAINT IF NOT EXISTS "Teacher_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Employee" ADD CONSTRAINT IF NOT EXISTS "Employee_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdmissionStaff" ADD CONSTRAINT IF NOT EXISTS "AdmissionStaff_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 12: Add UserRole foreign key constraint
ALTER TABLE "UserRole" ADD CONSTRAINT IF NOT EXISTS "UserRole_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 13: Add unique constraints for 1:1 relationships
ALTER TABLE "Student" ADD CONSTRAINT IF NOT EXISTS "Student_userId_key" UNIQUE ("userId");
ALTER TABLE "Teacher" ADD CONSTRAINT IF NOT EXISTS "Teacher_userId_key" UNIQUE ("userId");
ALTER TABLE "Employee" ADD CONSTRAINT IF NOT EXISTS "Employee_userId_key" UNIQUE ("userId");
ALTER TABLE "AdmissionStaff" ADD CONSTRAINT IF NOT EXISTS "AdmissionStaff_userId_key" UNIQUE ("userId");

-- Step 14: Create indexes for performance
CREATE INDEX IF NOT EXISTS "Student_userId_idx" ON "Student"("userId");
CREATE INDEX IF NOT EXISTS "Parent_userId_idx" ON "Parent"("userId");
CREATE INDEX IF NOT EXISTS "Teacher_userId_idx" ON "Teacher"("userId");
CREATE INDEX IF NOT EXISTS "Employee_userId_idx" ON "Employee"("userId");
CREATE INDEX IF NOT EXISTS "AdmissionStaff_userId_idx" ON "AdmissionStaff"("userId");

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
    'Total Users' as type,
    COUNT(*) as count,
    NULL as sample_auth_identifiers
FROM "User"; 