-- Migration: Add Section Support to ClasswiseFee Model
-- This is an OPTIONAL migration for users who want section-level fee differentiation
-- 
-- WARNING: This migration will modify the existing ClasswiseFee structure.
-- Make sure to backup your database before running this migration.
-- 
-- Author: Generated for enhanced classwise fee assignment
-- Date: 2025-01-12

-- Step 1: Add sectionId column to ClasswiseFee table (nullable initially)
ALTER TABLE "ClasswiseFee" ADD COLUMN "sectionId" TEXT;

-- Step 2: Create index for better query performance
CREATE INDEX "classwisefee_section_idx" ON "ClasswiseFee"("sectionId");

-- Step 3: Add foreign key constraint to link with Section table
ALTER TABLE "ClasswiseFee" 
ADD CONSTRAINT "ClasswiseFee_sectionId_fkey" 
FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Update the unique constraint to include sectionId (optional)
-- This allows different fees for different sections in the same class
-- Comment out if you want to keep class-level uniqueness
-- ALTER TABLE "ClasswiseFee" DROP CONSTRAINT "ClasswiseFee_classId_feeTermId_feeHeadId_key";
-- ALTER TABLE "ClasswiseFee" ADD CONSTRAINT "ClasswiseFee_classId_sectionId_feeTermId_feeHeadId_key" 
-- UNIQUE ("classId", "sectionId", "feeTermId", "feeHeadId");

-- Step 5: Migrate existing data (set sectionId to first section of each class)
-- This step ensures existing fee structures remain valid
UPDATE "ClasswiseFee" 
SET "sectionId" = (
    SELECT s.id 
    FROM "Section" s 
    WHERE s."classId" = "ClasswiseFee"."classId" 
    AND s."isActive" = true 
    ORDER BY s."displayOrder" ASC, s."name" ASC 
    LIMIT 1
)
WHERE "sectionId" IS NULL;

-- Step 6: Make sectionId required (after data migration)
-- Uncomment if you want sectionId to be required going forward
-- ALTER TABLE "ClasswiseFee" ALTER COLUMN "sectionId" SET NOT NULL;

-- Instructions for Schema File Update:
-- 
-- After running this migration, update your schema.prisma file:
-- 
-- model ClasswiseFee {
--   id        String          @id @default(cuid())
--   classId   String
--   sectionId String?         // Add this line
--   feeTermId String
--   feeHeadId String
--   amount    Float
--   branchId  String
--   sessionId String
--   createdAt DateTime        @default(now())
--   updatedAt DateTime        @updatedAt
--   branch    Branch          @relation(fields: [branchId], references: [id])
--   class     Class           @relation(fields: [classId], references: [id])
--   section   Section?        @relation(fields: [sectionId], references: [id])  // Add this line
--   feeHead   FeeHead         @relation(fields: [feeHeadId], references: [id])
--   feeTerm   FeeTerm         @relation(fields: [feeTermId], references: [id])
--   session   AcademicSession @relation("ClasswiseFeeSession", fields: [sessionId], references: [id])
-- 
--   @@unique([classId, feeTermId, feeHeadId])                                    // Keep existing unique constraint
--   // OR use section-level uniqueness:
--   // @@unique([classId, sectionId, feeTermId, feeHeadId])                     // Uncomment for section-level uniqueness
--   @@index([sectionId])                                                        // Add this line
-- }
-- 
-- Then update the Section model to include the relation:
-- model Section {
--   // ... existing fields ...
--   classwiseFees   ClasswiseFee[]                                              // Add this line
--   // ... rest of existing fields ...
-- }

-- Rollback Instructions:
-- If you need to rollback this migration:
-- 
-- ALTER TABLE "ClasswiseFee" DROP CONSTRAINT "ClasswiseFee_sectionId_fkey";
-- DROP INDEX "classwisefee_section_idx";
-- ALTER TABLE "ClasswiseFee" DROP COLUMN "sectionId"; 