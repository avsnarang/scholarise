-- Migration script to separate Class and Section models
-- This script will:
-- 1. Create the new Section table
-- 2. Extract unique classes from the current Class table
-- 3. Create sections for each class
-- 4. Update student references
-- 5. Drop old columns

-- Step 1: Create the Section table
CREATE TABLE "Section" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create a temporary table to store the mapping
CREATE TEMPORARY TABLE class_section_mapping (
  old_class_id TEXT,
  new_class_id TEXT,
  section_id TEXT,
  class_name TEXT,
  section_name TEXT
);

-- Step 3: Insert unique classes into the mapping table and create new class records
WITH unique_classes AS (
  SELECT DISTINCT 
    "name",
    "branchId",
    "sessionId",
    "isActive",
    "createdAt",
    "updatedAt",
    "displayOrder"
  FROM "Class"
),
new_class_inserts AS (
  INSERT INTO "Class" (
    "id",
    "name", 
    "branchId", 
    "sessionId", 
    "isActive", 
    "createdAt", 
    "updatedAt", 
    "displayOrder"
  )
  SELECT 
    'cl_' || lower(replace(replace("name", ' ', '_'), '.', '')) || '_' || "branchId" || '_' || "sessionId",
    "name",
    "branchId",
    "sessionId", 
    "isActive",
    "createdAt",
    "updatedAt",
    "displayOrder"
  FROM unique_classes
  ON CONFLICT ("name", "branchId", "sessionId") DO NOTHING
  RETURNING "id", "name", "branchId", "sessionId"
)
INSERT INTO class_section_mapping (new_class_id, class_name)
SELECT "id", "name" FROM new_class_inserts;

-- Step 4: Create sections and complete the mapping
WITH old_classes AS (
  SELECT 
    c."id" as old_class_id,
    c."name" as class_name,
    c."section" as section_name,
    c."capacity",
    c."teacherId",
    c."branchId",
    c."sessionId",
    c."displayOrder"
  FROM "Class" c
),
section_inserts AS (
  INSERT INTO "Section" (
    "id",
    "name",
    "capacity", 
    "classId",
    "teacherId",
    "displayOrder"
  )
  SELECT 
    'sec_' || o.old_class_id,
    o.section_name,
    o.capacity,
    m.new_class_id,
    o.teacherId,
    o.displayOrder
  FROM old_classes o
  JOIN class_section_mapping m ON m.class_name = o.class_name
  RETURNING "id", "classId"
)
UPDATE class_section_mapping 
SET 
  section_id = si."id",
  old_class_id = oc.old_class_id,
  section_name = oc.section_name
FROM section_inserts si
JOIN old_classes oc ON ('sec_' || oc.old_class_id) = si."id"
WHERE class_section_mapping.new_class_id = si."classId";

-- Step 5: Update student references
UPDATE "Student" 
SET "sectionId" = csm.section_id
FROM class_section_mapping csm
WHERE "Student"."classId" = csm.old_class_id;

-- Step 6: Update StudentAttendance references
UPDATE "StudentAttendance"
SET "sectionId" = csm.section_id
FROM class_section_mapping csm
WHERE "StudentAttendance"."classId" = csm.old_class_id;

-- Step 7: Add foreign key constraints for Section table
ALTER TABLE "Section" ADD CONSTRAINT "Section_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Section" ADD CONSTRAINT "Section_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Add unique constraint for section names per class
ALTER TABLE "Section" ADD CONSTRAINT "Section_name_classId_key" UNIQUE ("name", "classId");

-- Step 9: Drop old columns and add new foreign keys
ALTER TABLE "Student" DROP COLUMN "classId";
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentAttendance" DROP COLUMN "classId";
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 10: Clear old Class table and update schema
DELETE FROM "Class" WHERE "id" NOT IN (SELECT DISTINCT new_class_id FROM class_section_mapping);

-- Step 11: Drop old columns from Class table
ALTER TABLE "Class" DROP COLUMN "section";
ALTER TABLE "Class" DROP COLUMN "capacity"; 
ALTER TABLE "Class" DROP COLUMN "teacherId";

-- Step 12: Add new columns to Class table
ALTER TABLE "Class" ADD COLUMN "grade" INTEGER;
ALTER TABLE "Class" ADD COLUMN "description" TEXT;

-- Step 13: Add unique constraint to Class table
ALTER TABLE "Class" ADD CONSTRAINT "Class_name_branchId_sessionId_key" UNIQUE ("name", "branchId", "sessionId");

-- Step 14: Update indexes
CREATE INDEX "StudentAttendance_date_sectionId_idx" ON "StudentAttendance"("date", "sectionId");
DROP INDEX IF EXISTS "StudentAttendance_date_classId_idx"; 