-- Add batch tracking fields to MessageJob table
-- This allows tracking of batch processing for large message campaigns

-- Add parent job reference for batch jobs
ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "parentJobId" UUID REFERENCES "MessageJob"("id") ON DELETE SET NULL;

-- Add batch information
ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "batchIndex" INTEGER;

ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "totalBatches" INTEGER;

ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "recipientRange" TEXT;

-- Create index for parent job lookups
CREATE INDEX IF NOT EXISTS "MessageJob_parentJobId_idx" ON "MessageJob"("parentJobId");

-- Add status for partially completed jobs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'MessageJobStatus'
    ) THEN
        -- If the enum doesn't exist, create it
        CREATE TYPE "MessageJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED');
        
        -- Update the status column to use the new enum
        ALTER TABLE "MessageJob"
        ALTER COLUMN "status" TYPE "MessageJobStatus" USING "status"::"MessageJobStatus";
    ELSE
        -- If the enum exists, add new value if not present
        ALTER TYPE "MessageJobStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_COMPLETED';
    END IF;
END $$;

-- Add aggregate fields for parent jobs
ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "totalBatchesCompleted" INTEGER DEFAULT 0;

ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "totalBatchRecipients" INTEGER DEFAULT 0;

ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "totalBatchSuccessful" INTEGER DEFAULT 0;

ALTER TABLE "MessageJob"
ADD COLUMN IF NOT EXISTS "totalBatchFailed" INTEGER DEFAULT 0;

-- Create a view to aggregate batch job statistics
CREATE OR REPLACE VIEW "MessageJobBatchStats" AS
SELECT 
    parent."id" AS "parentJobId",
    parent."messageId",
    COUNT(batch."id") AS "completedBatches",
    parent."totalBatches",
    SUM(batch."processedRecipients") AS "totalProcessed",
    SUM(batch."successfulSent") AS "totalSuccessful",
    SUM(batch."failed") AS "totalFailed",
    MAX(batch."completedAt") AS "lastBatchCompletedAt",
    CASE 
        WHEN COUNT(batch."id") = parent."totalBatches" THEN 'COMPLETED'
        WHEN COUNT(batch."id") > 0 THEN 'PROCESSING'
        ELSE 'PENDING'
    END AS "aggregateStatus"
FROM "MessageJob" parent
LEFT JOIN "MessageJob" batch ON batch."parentJobId" = parent."id" AND batch."status" IN ('COMPLETED', 'PARTIALLY_COMPLETED')
WHERE parent."parentJobId" IS NULL
GROUP BY parent."id", parent."messageId", parent."totalBatches";

-- Comment on new columns
COMMENT ON COLUMN "MessageJob"."parentJobId" IS 'Reference to parent job for batch processing';
COMMENT ON COLUMN "MessageJob"."batchIndex" IS 'Index of this batch (1-based) within the parent job';
COMMENT ON COLUMN "MessageJob"."totalBatches" IS 'Total number of batches for this job';
COMMENT ON COLUMN "MessageJob"."recipientRange" IS 'Human-readable range of recipients in this batch';
COMMENT ON COLUMN "MessageJob"."totalBatchesCompleted" IS 'Number of batches completed (for parent jobs)';
COMMENT ON COLUMN "MessageJob"."totalBatchRecipients" IS 'Total recipients across all batches (for parent jobs)';
COMMENT ON COLUMN "MessageJob"."totalBatchSuccessful" IS 'Total successful sends across all batches (for parent jobs)';
COMMENT ON COLUMN "MessageJob"."totalBatchFailed" IS 'Total failed sends across all batches (for parent jobs)';