-- Add Concession System to Finance Module
-- This migration adds support for managing student concessions/scholarships

-- Create ConcessionType table
CREATE TABLE "ConcessionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE' or 'FIXED'
    "value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxValue" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableStudentTypes" TEXT[] DEFAULT ARRAY['BOTH'], -- 'NEW_ADMISSION', 'OLD_STUDENT', 'BOTH'
    "eligibilityCriteria" TEXT,
    "requiredDocuments" TEXT[],
    "autoApproval" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ConcessionType_pkey" PRIMARY KEY ("id")
);

-- Create StudentConcession table
CREATE TABLE "StudentConcession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "concessionTypeId" TEXT NOT NULL,
    "customValue" DECIMAL(10,2), -- Override default concession value if needed
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "appliedFeeHeads" TEXT[], -- Specific fee heads this concession applies to (empty = all)
    "appliedFeeTerms" TEXT[], -- Specific fee terms this concession applies to (empty = all)
    "documents" TEXT[], -- Document URLs/paths for verification
    "notes" TEXT,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "StudentConcession_pkey" PRIMARY KEY ("id")
);

-- Create ConcessionHistory table for audit trail
CREATE TABLE "ConcessionHistory" (
    "id" TEXT NOT NULL,
    "studentConcessionId" TEXT NOT NULL,
    "action" TEXT NOT NULL, -- 'CREATED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'MODIFIED'
    "oldValue" DECIMAL(10,2),
    "newValue" DECIMAL(10,2),
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ConcessionHistory_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "ConcessionType" ADD CONSTRAINT "ConcessionType_branchId_fkey" 
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE;

ALTER TABLE "ConcessionType" ADD CONSTRAINT "ConcessionType_sessionId_fkey" 
    FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE;

ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_studentId_fkey" 
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE;

ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_concessionTypeId_fkey" 
    FOREIGN KEY ("concessionTypeId") REFERENCES "ConcessionType"("id") ON DELETE CASCADE;

ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_branchId_fkey" 
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE;

ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_sessionId_fkey" 
    FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE;

ALTER TABLE "ConcessionHistory" ADD CONSTRAINT "ConcessionHistory_studentConcessionId_fkey" 
    FOREIGN KEY ("studentConcessionId") REFERENCES "StudentConcession"("id") ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX "ConcessionType_branchId_sessionId_idx" ON "ConcessionType"("branchId", "sessionId");
CREATE INDEX "ConcessionType_isActive_idx" ON "ConcessionType"("isActive");
CREATE INDEX "ConcessionType_type_idx" ON "ConcessionType"("type");

CREATE INDEX "StudentConcession_studentId_idx" ON "StudentConcession"("studentId");
CREATE INDEX "StudentConcession_branchId_sessionId_idx" ON "StudentConcession"("branchId", "sessionId");
CREATE INDEX "StudentConcession_status_idx" ON "StudentConcession"("status");
CREATE INDEX "StudentConcession_concessionTypeId_idx" ON "StudentConcession"("concessionTypeId");
CREATE INDEX "StudentConcession_validFrom_validUntil_idx" ON "StudentConcession"("validFrom", "validUntil");

CREATE INDEX "ConcessionHistory_studentConcessionId_idx" ON "ConcessionHistory"("studentConcessionId");
CREATE INDEX "ConcessionHistory_performedAt_idx" ON "ConcessionHistory"("performedAt");

-- Add unique constraint to prevent duplicate concessions
CREATE UNIQUE INDEX "StudentConcession_student_concessionType_unique" 
    ON "StudentConcession"("studentId", "concessionTypeId") 
    WHERE "status" IN ('PENDING', 'APPROVED');

-- Add check constraints
ALTER TABLE "ConcessionType" ADD CONSTRAINT "ConcessionType_type_check" 
    CHECK ("type" IN ('PERCENTAGE', 'FIXED'));

ALTER TABLE "ConcessionType" ADD CONSTRAINT "ConcessionType_value_check" 
    CHECK ("value" >= 0);

ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_status_check" 
    CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED'));

ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_customValue_check" 
    CHECK ("customValue" IS NULL OR "customValue" >= 0);

-- Insert default concession types
INSERT INTO "ConcessionType" ("id", "name", "description", "type", "value", "applicableStudentTypes", "eligibilityCriteria", "branchId", "sessionId") 
SELECT 
    'default_sibling_' || b.id || '_' || s.id,
    'Sibling Discount',
    'Discount for students with siblings in the same school',
    'PERCENTAGE',
    10.00,
    ARRAY['BOTH'],
    'Student must have at least one sibling enrolled in the school',
    b.id,
    s.id
FROM "Branch" b
CROSS JOIN "AcademicSession" s
WHERE s."isActive" = true;

INSERT INTO "ConcessionType" ("id", "name", "description", "type", "value", "maxValue", "applicableStudentTypes", "eligibilityCriteria", "branchId", "sessionId") 
SELECT 
    'default_merit_' || b.id || '_' || s.id,
    'Merit Scholarship',
    'Merit-based scholarship for high-performing students',
    'PERCENTAGE',
    25.00,
    50.00,
    ARRAY['BOTH'],
    'Student must maintain 85%+ academic performance',
    b.id,
    s.id
FROM "Branch" b
CROSS JOIN "AcademicSession" s
WHERE s."isActive" = true;

INSERT INTO "ConcessionType" ("id", "name", "description", "type", "value", "applicableStudentTypes", "eligibilityCriteria", "branchId", "sessionId") 
SELECT 
    'default_staff_' || b.id || '_' || s.id,
    'Staff Quota',
    'Concession for children of school staff',
    'PERCENTAGE',
    50.00,
    ARRAY['BOTH'],
    'Parent must be employed as school staff',
    b.id,
    s.id
FROM "Branch" b
CROSS JOIN "AcademicSession" s
WHERE s."isActive" = true; 