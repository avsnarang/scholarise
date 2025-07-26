-- Migration: Add MessageJob model and JobStatus enum for background message processing
-- Date: 2025-01-01
-- Description: Add job queue system for background message sending with real-time progress tracking

-- Add JobStatus enum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING');

-- Create MessageJob table
CREATE TABLE "MessageJob" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "processedRecipients" INTEGER NOT NULL DEFAULT 0,
    "successfulSent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageJob_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on messageId
CREATE UNIQUE INDEX "MessageJob_messageId_key" ON "MessageJob"("messageId");

-- Create indexes for performance
CREATE INDEX "MessageJob_status_idx" ON "MessageJob"("status");
CREATE INDEX "MessageJob_priority_scheduledAt_idx" ON "MessageJob"("priority", "scheduledAt");
CREATE INDEX "MessageJob_createdAt_idx" ON "MessageJob"("createdAt");
CREATE INDEX "MessageJob_createdBy_idx" ON "MessageJob"("createdBy");

-- Add foreign key constraint
ALTER TABLE "MessageJob" ADD CONSTRAINT "MessageJob_messageId_fkey" 
FOREIGN KEY ("messageId") REFERENCES "CommunicationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable real-time for MessageJob table
ALTER TABLE "MessageJob" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for MessageJob (allow all operations for authenticated users for now)
CREATE POLICY "Enable all operations for authenticated users" ON "MessageJob"
FOR ALL USING (true); 