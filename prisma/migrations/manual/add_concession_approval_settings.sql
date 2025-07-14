-- Add ConcessionApprovalSettings table for managing approval workflows
-- This table stores approval configuration settings for each branch and session

CREATE TABLE IF NOT EXISTS "ConcessionApprovalSettings" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL DEFAULT '1_PERSON',
    "authorizationType" TEXT NOT NULL DEFAULT 'ROLE_BASED',
    "autoApproveBelow" DECIMAL(10,2) NOT NULL DEFAULT 1000,
    "requireDocumentVerification" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfApproval" BOOLEAN NOT NULL DEFAULT false,
    "maxApprovalAmount" DECIMAL(10,2) NOT NULL DEFAULT 50000,
    "escalationThreshold" DECIMAL(10,2) NOT NULL DEFAULT 25000,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalTimeoutDays" INTEGER NOT NULL DEFAULT 7,
    "requireReason" BOOLEAN NOT NULL DEFAULT true,
    "approvalRoles" TEXT[] NOT NULL DEFAULT '{}',
    "secondApprovalRoles" TEXT[] NOT NULL DEFAULT '{}',
    "approvalIndividuals" TEXT[] NOT NULL DEFAULT '{}',
    "secondApprovalIndividuals" TEXT[] NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ConcessionApprovalSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for branch and session combination
CREATE UNIQUE INDEX IF NOT EXISTS "ConcessionApprovalSettings_branchId_sessionId_key" 
ON "ConcessionApprovalSettings"("branchId", "sessionId");

-- Add foreign key constraints to ensure referential integrity
ALTER TABLE "ConcessionApprovalSettings" 
ADD CONSTRAINT "ConcessionApprovalSettings_branchId_fkey" 
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "ConcessionApprovalSettings_branchId_idx" 
ON "ConcessionApprovalSettings"("branchId");

CREATE INDEX IF NOT EXISTS "ConcessionApprovalSettings_sessionId_idx" 
ON "ConcessionApprovalSettings"("sessionId");

CREATE INDEX IF NOT EXISTS "ConcessionApprovalSettings_createdAt_idx" 
ON "ConcessionApprovalSettings"("createdAt");

-- Add trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_concession_approval_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_concession_approval_settings_updated_at
    BEFORE UPDATE ON "ConcessionApprovalSettings"
    FOR EACH ROW
    EXECUTE FUNCTION update_concession_approval_settings_updated_at(); 