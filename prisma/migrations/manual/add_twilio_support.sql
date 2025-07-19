-- Add Twilio Support to Communication System
-- Date: 2025-01-17
-- This migration adds Twilio API fields alongside existing WATI fields

-- Add Twilio Content SID to WhatsAppTemplate
ALTER TABLE "WhatsAppTemplate" 
ADD COLUMN IF NOT EXISTS "twilioContentSid" TEXT;

-- Make watiTemplateId optional (no longer required)
ALTER TABLE "WhatsAppTemplate" 
ALTER COLUMN "watiTemplateId" DROP NOT NULL;

-- Add unique constraint for Twilio Content SID
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppTemplate_twilioContentSid_key" 
ON "WhatsAppTemplate"("twilioContentSid") 
WHERE "twilioContentSid" IS NOT NULL;

-- Add Twilio message ID to CommunicationMessage
ALTER TABLE "CommunicationMessage" 
ADD COLUMN IF NOT EXISTS "twilioMessageId" TEXT;

-- Add Twilio message ID to MessageRecipient  
ALTER TABLE "MessageRecipient"
ADD COLUMN IF NOT EXISTS "twilioMessageId" TEXT;

-- Add Twilio API configuration to CommunicationSettings
ALTER TABLE "CommunicationSettings"
ADD COLUMN IF NOT EXISTS "twilioAccountSid" TEXT,
ADD COLUMN IF NOT EXISTS "twilioAuthToken" TEXT,
ADD COLUMN IF NOT EXISTS "twilioWhatsAppFrom" TEXT,
ADD COLUMN IF NOT EXISTS "twilioIsActive" BOOLEAN DEFAULT false;

-- Create index for Twilio message IDs for performance
CREATE INDEX IF NOT EXISTS "CommunicationMessage_twilioMessageId_idx" 
ON "CommunicationMessage"("twilioMessageId") 
WHERE "twilioMessageId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "MessageRecipient_twilioMessageId_idx" 
ON "MessageRecipient"("twilioMessageId") 
WHERE "twilioMessageId" IS NOT NULL; 