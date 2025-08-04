-- Enhanced Concession System Migration
-- This migration updates the concession system to support:
-- 1. Fee heads and terms selection at concession type level
-- 2. Per-term fixed amounts for FIXED type concessions
-- 3. Approval workflow settings
-- 4. Improved data structure and constraints

-- =====================================================
-- STEP 1: Update ConcessionType table
-- =====================================================

-- Add new fields to ConcessionType for fee application control
ALTER TABLE "ConcessionType" 
ADD COLUMN "appliedFeeHeads" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "ConcessionType" 
ADD COLUMN "appliedFeeTerms" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add JSON field for per-term fixed amounts (for FIXED type concessions)
ALTER TABLE "ConcessionType" 
ADD COLUMN "feeTermAmounts" JSONB DEFAULT '{}'::JSONB;

-- Add comment to explain the feeTermAmounts structure
COMMENT ON COLUMN "ConcessionType"."feeTermAmounts" IS 'JSON object storing fixed amounts per fee term. Format: {"termId1": amount1, "termId2": amount2}. Only used when type is FIXED.';

-- =====================================================
-- STEP 2: Update StudentConcession table
-- =====================================================

-- Remove appliedFeeHeads and appliedFeeTerms from StudentConcession
-- (This functionality is now handled at ConcessionType level)
ALTER TABLE "StudentConcession" 
DROP COLUMN IF EXISTS "appliedFeeHeads";

ALTER TABLE "StudentConcession" 
DROP COLUMN IF EXISTS "appliedFeeTerms";

-- =====================================================
-- STEP 3: Create ConcessionApprovalSettings table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS "ConcessionApprovalSettings" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL DEFAULT '1_PERSON', -- '1_PERSON', '2_PERSON', 'COMMITTEE'
    "authorizationType" TEXT NOT NULL DEFAULT 'ROLE_BASED', -- 'ROLE_BASED', 'INDIVIDUAL_BASED'
    "autoApproveBelow" DECIMAL(10,2) NOT NULL DEFAULT 1000,
    "requireDocumentVerification" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfApproval" BOOLEAN NOT NULL DEFAULT false,
    "maxApprovalAmount" DECIMAL(10,2) NOT NULL DEFAULT 50000,
    "escalationThreshold" DECIMAL(10,2) NOT NULL DEFAULT 25000,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalTimeoutDays" INTEGER NOT NULL DEFAULT 7,
    "requireReason" BOOLEAN NOT NULL DEFAULT true,
    "approvalRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secondApprovalRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvalIndividuals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secondApprovalIndividuals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    CONSTRAINT "ConcessionApprovalSettings_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints for ConcessionApprovalSettings
ALTER TABLE "ConcessionApprovalSettings" 
ADD CONSTRAINT "ConcessionApprovalSettings_branchId_fkey" 
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE;

ALTER TABLE "ConcessionApprovalSettings" 
ADD CONSTRAINT "ConcessionApprovalSettings_sessionId_fkey" 
FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE;

-- =====================================================
-- STEP 4: Add new indexes for performance
-- =====================================================

-- Index for ConcessionType fee application fields
CREATE INDEX IF NOT EXISTS "ConcessionType_appliedFeeHeads_idx" 
ON "ConcessionType" USING GIN("appliedFeeHeads");

CREATE INDEX IF NOT EXISTS "ConcessionType_appliedFeeTerms_idx" 
ON "ConcessionType" USING GIN("appliedFeeTerms");

-- Index for ConcessionApprovalSettings
CREATE INDEX IF NOT EXISTS "ConcessionApprovalSettings_branchId_sessionId_idx" 
ON "ConcessionApprovalSettings"("branchId", "sessionId");

CREATE UNIQUE INDEX IF NOT EXISTS "ConcessionApprovalSettings_branch_session_unique"
ON "ConcessionApprovalSettings"("branchId", "sessionId");

-- =====================================================
-- STEP 5: Add new check constraints
-- =====================================================

-- Ensure feeTermAmounts is valid JSON when type is FIXED
ALTER TABLE "ConcessionType" 
ADD CONSTRAINT "ConcessionType_feeTermAmounts_check" 
CHECK (
    ("type" = 'FIXED' AND "feeTermAmounts" IS NOT NULL) OR 
    ("type" = 'PERCENTAGE' AND ("feeTermAmounts" IS NULL OR "feeTermAmounts" = '{}'::JSONB))
);

-- Add check constraints for ConcessionApprovalSettings
ALTER TABLE "ConcessionApprovalSettings" 
ADD CONSTRAINT "ConcessionApprovalSettings_approvalType_check" 
CHECK ("approvalType" IN ('1_PERSON', '2_PERSON', 'COMMITTEE'));

ALTER TABLE "ConcessionApprovalSettings" 
ADD CONSTRAINT "ConcessionApprovalSettings_authorizationType_check" 
CHECK ("authorizationType" IN ('ROLE_BASED', 'INDIVIDUAL_BASED'));

ALTER TABLE "ConcessionApprovalSettings" 
ADD CONSTRAINT "ConcessionApprovalSettings_amounts_check" 
CHECK (
    "autoApproveBelow" >= 0 AND 
    "maxApprovalAmount" >= 0 AND 
    "escalationThreshold" >= 0 AND
    "escalationThreshold" <= "maxApprovalAmount"
);

-- =====================================================
-- STEP 6: Update existing data (if any)
-- =====================================================

-- Initialize appliedFeeHeads and appliedFeeTerms as empty arrays for existing records
UPDATE "ConcessionType" 
SET 
    "appliedFeeHeads" = ARRAY[]::TEXT[],
    "appliedFeeTerms" = ARRAY[]::TEXT[],
    "feeTermAmounts" = '{}'::JSONB
WHERE 
    "appliedFeeHeads" IS NULL OR 
    "appliedFeeTerms" IS NULL OR 
    "feeTermAmounts" IS NULL;

-- =====================================================
-- STEP 7: Create default approval settings for existing branches
-- =====================================================

INSERT INTO "ConcessionApprovalSettings" (
    "id", 
    "branchId", 
    "sessionId", 
    "approvalType",
    "authorizationType",
    "autoApproveBelow",
    "maxApprovalAmount",
    "escalationThreshold",
    "approvalRoles",
    "createdBy"
) 
SELECT 
    'default_approval_' || b.id || '_' || s.id,
    b.id,
    s.id,
    '1_PERSON',
    'ROLE_BASED',
    1000.00,
    50000.00,
    25000.00,
    ARRAY['PRINCIPAL', 'FINANCE_MANAGER'],
    'SYSTEM'
FROM "Branch" b
CROSS JOIN "AcademicSession" s
WHERE s."isActive" = true
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 8: Create sample enhanced concession types
-- =====================================================

-- Update existing concession types to include sample fee application
-- This is optional - can be customized per school requirements

-- Example: Update Merit Scholarship to apply to Tuition and Development fees only
UPDATE "ConcessionType" 
SET 
    "appliedFeeHeads" = ARRAY(
        SELECT fh.id 
        FROM "FeeHead" fh 
        WHERE fh."name" IN ('Tuition Fee', 'Development Fee', 'Academic Fee')
        AND fh."branchId" = "ConcessionType"."branchId"
        AND fh."sessionId" = "ConcessionType"."sessionId"
        LIMIT 3
    ),
    "appliedFeeTerms" = ARRAY(
        SELECT ft.id 
        FROM "FeeTerm" ft 
        WHERE ft."branchId" = "ConcessionType"."branchId"
        AND ft."sessionId" = "ConcessionType"."sessionId"
        ORDER BY ft."order"
    )
WHERE "name" = 'Merit Scholarship';

-- =====================================================
-- STEP 9: Create functions for concession calculations
-- =====================================================

-- Function to calculate total concession amount for a student
CREATE OR REPLACE FUNCTION calculate_student_concession_amount(
    p_student_id TEXT,
    p_fee_term_id TEXT,
    p_fee_head_id TEXT
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total_concession DECIMAL(10,2) := 0;
    v_concession RECORD;
    v_fee_amount DECIMAL(10,2);
    v_concession_value DECIMAL(10,2);
BEGIN
    -- Get the fee amount for the term and head
    SELECT amount INTO v_fee_amount
    FROM "ClasswiseFee" cf
    JOIN "Student" s ON s."sectionId" = cf."sectionId"
    WHERE s."id" = p_student_id 
    AND cf."feeTermId" = p_fee_term_id 
    AND cf."feeHeadId" = p_fee_head_id;
    
    IF v_fee_amount IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Loop through all active concessions for the student
    FOR v_concession IN
        SELECT 
            sc.*,
            ct."type",
            ct."value",
            ct."appliedFeeHeads",
            ct."appliedFeeTerms",
            ct."feeTermAmounts"
        FROM "StudentConcession" sc
        JOIN "ConcessionType" ct ON ct."id" = sc."concessionTypeId"
        WHERE sc."studentId" = p_student_id
        AND sc."status" = 'APPROVED'
        AND sc."validFrom" <= CURRENT_TIMESTAMP
        AND (sc."validUntil" IS NULL OR sc."validUntil" >= CURRENT_TIMESTAMP)
        AND (
            cardinality(ct."appliedFeeHeads") = 0 OR 
            p_fee_head_id = ANY(ct."appliedFeeHeads")
        )
        AND (
            cardinality(ct."appliedFeeTerms") = 0 OR 
            p_fee_term_id = ANY(ct."appliedFeeTerms")
        )
    LOOP
        -- Calculate concession value
        IF v_concession."type" = 'PERCENTAGE' THEN
            v_concession_value := COALESCE(v_concession."customValue", v_concession."value");
            v_total_concession := v_total_concession + (v_fee_amount * v_concession_value / 100);
        ELSIF v_concession."type" = 'FIXED' THEN
            -- Check if there's a specific amount for this term
            IF v_concession."feeTermAmounts"->p_fee_term_id IS NOT NULL THEN
                v_concession_value := (v_concession."feeTermAmounts"->>p_fee_term_id)::DECIMAL(10,2);
            ELSE
                v_concession_value := COALESCE(v_concession."customValue", v_concession."value");
            END IF;
            v_total_concession := v_total_concession + v_concession_value;
        END IF;
    END LOOP;
    
    -- Ensure concession doesn't exceed the fee amount
    RETURN LEAST(v_total_concession, v_fee_amount);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log the migration completion
INSERT INTO "BackgroundTask" (
    "id",
    "type", 
    "status", 
    "data",
    "result",
    "branchId",
    "createdAt",
    "completedAt"
) 
SELECT 
    'concession_enhancement_' || generate_random_uuid(),
    'DATABASE_MIGRATION',
    'COMPLETED',
    '{"migration": "enhance_concession_system", "version": "2.0"}',
    '{"message": "Enhanced concession system with fee application control", "tablesUpdated": ["ConcessionType", "StudentConcession", "ConcessionApprovalSettings"]}',
    b.id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Branch" b
LIMIT 1;

COMMIT;