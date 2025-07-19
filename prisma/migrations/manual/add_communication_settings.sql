-- Add CommunicationSettings table for storing communication preferences and configuration
-- This table stores communication settings for each branch

CREATE TABLE IF NOT EXISTS "CommunicationSettings" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    
    -- Wati API Configuration
    "watiApiUrl" TEXT,
    "watiApiToken" TEXT,
    "watiPhoneNumberId" TEXT,
    "watiIsActive" BOOLEAN NOT NULL DEFAULT false,
    
    -- Template Settings
    "templateAutoSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "templateSyncInterval" INTEGER NOT NULL DEFAULT 24, -- hours
    "templateDefaultCategory" TEXT DEFAULT 'UTILITY',
    "templateDefaultLanguage" TEXT NOT NULL DEFAULT 'en',
    
    -- Message Settings
    "messageEnableScheduling" BOOLEAN NOT NULL DEFAULT true,
    "messageMaxRecipientsPerMessage" INTEGER NOT NULL DEFAULT 1000,
    "messageRetryFailedMessages" BOOLEAN NOT NULL DEFAULT true,
    "messageMaxRetryAttempts" INTEGER NOT NULL DEFAULT 3,
    "messageRetryDelay" INTEGER NOT NULL DEFAULT 30, -- seconds
    
    -- Notification Settings
    "notificationEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "notifyOnFailures" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT false,
    "notificationDailySummary" BOOLEAN NOT NULL DEFAULT true,
    
    -- General Settings
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "CommunicationSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for branch (one settings record per branch)
CREATE UNIQUE INDEX IF NOT EXISTS "CommunicationSettings_branchId_key" 
ON "CommunicationSettings"("branchId");

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE "CommunicationSettings" 
ADD CONSTRAINT "CommunicationSettings_branchId_fkey" 
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "CommunicationSettings_branchId_idx" 
ON "CommunicationSettings"("branchId");

CREATE INDEX IF NOT EXISTS "CommunicationSettings_isActive_idx" 
ON "CommunicationSettings"("isActive"); 