-- Username Authentication System Migration
-- Date: 2025-01-17
-- Description: Implements username-based authentication using Supabase Auth

-- Step 1: Create User table (if not exists)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT UNIQUE NOT NULL, -- This will match Supabase Auth email field
    "email" TEXT,                    -- Real email address (can be non-unique)
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

-- Step 2: Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");

-- Step 3: Insert users from Students with generated usernames
INSERT INTO "User" ("id", "username", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    s."clerkId",
    'student_' || s."admissionNumber",  -- Generate username like "student_10003356"
    s."email",                          -- Store real email separately
    s."firstName", 
    s."lastName",
    s."createdAt",
    s."updatedAt"
FROM "Student" s 
WHERE s."clerkId" IS NOT NULL 
  AND s."clerkId" != ''
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = s."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 4: Insert users from Parents with generated usernames
INSERT INTO "User" ("id", "username", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    p."clerkId",
    'parent_' || LOWER(REPLACE(COALESCE(p."fatherName", 'parent'), ' ', '_')) || '_' || substr(p."id", 1, 8), -- Generate username like "parent_ravi_sharma_abc12345"
    p."fatherEmail",                    -- Store real email separately
    p."fatherName", 
    p."motherName",
    p."createdAt",
    p."updatedAt"
FROM "Parent" p 
WHERE p."clerkId" IS NOT NULL 
  AND p."clerkId" != ''
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = p."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 5: Insert users from Teachers with generated usernames
INSERT INTO "User" ("id", "username", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    t."clerkId",
    'teacher_' || LOWER(REPLACE(t."firstName" || '_' || t."lastName", ' ', '_')), -- Generate username like "teacher_kavita_garg"
    t."email",                          -- Store real email separately
    t."firstName", 
    t."lastName",
    t."createdAt",
    t."updatedAt"
FROM "Teacher" t 
WHERE t."clerkId" IS NOT NULL 
  AND t."clerkId" != ''
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = t."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 6: Insert users from Employees with generated usernames
INSERT INTO "User" ("id", "username", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    e."clerkId",
    'employee_' || LOWER(REPLACE(e."firstName" || '_' || e."lastName", ' ', '_')), -- Generate username like "employee_abhishek_sharma"
    e."email",                          -- Store real email separately
    e."firstName", 
    e."lastName",
    e."createdAt",
    e."updatedAt"
FROM "Employee" e 
WHERE e."clerkId" IS NOT NULL 
  AND e."clerkId" != ''
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = e."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 7: Insert users from AdmissionStaff with generated usernames
INSERT INTO "User" ("id", "username", "email", "firstName", "lastName", "createdAt", "updatedAt")
SELECT DISTINCT 
    a."clerkId",
    'staff_' || LOWER(REPLACE(a."name", ' ', '_')),  -- Generate username like "staff_admission_officer"
    a."email",                          -- Store real email separately
    a."name", 
    '',
    a."createdAt",
    a."updatedAt"
FROM "AdmissionStaff" a 
WHERE a."clerkId" IS NOT NULL 
  AND a."clerkId" != ''
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = a."clerkId")
ON CONFLICT ("id") DO NOTHING;

-- Step 8: Add userId columns to all tables
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Parent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AdmissionStaff" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 9: Update userId from clerkId
UPDATE "Student" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "Parent" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "Teacher" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "Employee" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;
UPDATE "AdmissionStaff" SET "userId" = "clerkId" WHERE "clerkId" IS NOT NULL AND "clerkId" != '' AND "userId" IS NULL;

-- Step 10: Add foreign key constraints
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

-- Step 11: Add UserRole foreign key constraint
ALTER TABLE "UserRole" ADD CONSTRAINT IF NOT EXISTS "UserRole_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 12: Add unique constraints for 1:1 relationships
ALTER TABLE "Student" ADD CONSTRAINT IF NOT EXISTS "Student_userId_key" UNIQUE ("userId");
ALTER TABLE "Teacher" ADD CONSTRAINT IF NOT EXISTS "Teacher_userId_key" UNIQUE ("userId");
ALTER TABLE "Employee" ADD CONSTRAINT IF NOT EXISTS "Employee_userId_key" UNIQUE ("userId");
ALTER TABLE "AdmissionStaff" ADD CONSTRAINT IF NOT EXISTS "AdmissionStaff_userId_key" UNIQUE ("userId");

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS "Student_userId_idx" ON "Student"("userId");
CREATE INDEX IF NOT EXISTS "Parent_userId_idx" ON "Parent"("userId");
CREATE INDEX IF NOT EXISTS "Teacher_userId_idx" ON "Teacher"("userId");
CREATE INDEX IF NOT EXISTS "Employee_userId_idx" ON "Employee"("userId");
CREATE INDEX IF NOT EXISTS "AdmissionStaff_userId_idx" ON "AdmissionStaff"("userId");

-- Verification: Show sample usernames created
SELECT 
    'Students' as type, 
    COUNT(*) as count,
    array_agg(username ORDER BY username LIMIT 3) as sample_usernames
FROM "User" 
WHERE username LIKE 'student_%'

UNION ALL

SELECT 
    'Parents' as type,
    COUNT(*) as count, 
    array_agg(username ORDER BY username LIMIT 3) as sample_usernames
FROM "User" 
WHERE username LIKE 'parent_%'

UNION ALL

SELECT 
    'Teachers' as type,
    COUNT(*) as count,
    array_agg(username ORDER BY username LIMIT 3) as sample_usernames  
FROM "User" 
WHERE username LIKE 'teacher_%'

UNION ALL

SELECT 
    'All Users' as type,
    COUNT(*) as count,
    NULL as sample_usernames
FROM "User"; 