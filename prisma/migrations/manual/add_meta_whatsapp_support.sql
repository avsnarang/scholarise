-- Add Meta WhatsApp Business API Support to Communication System
-- Date: 2025-01-XX
-- This migration adds Meta WhatsApp API fields and removes Twilio dependencies

-- Add Meta template name to WhatsAppTemplate (Meta uses template names instead of Content SIDs)
ALTER TABLE "WhatsAppTemplate" 
ADD COLUMN IF NOT EXISTS "metaTemplateName" TEXT,
ADD COLUMN IF NOT EXISTS "metaTemplateLanguage" TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS "metaTemplateStatus" TEXT,
ADD COLUMN IF NOT EXISTS "metaTemplateId" TEXT;

-- Update existing templates with placeholder Meta template names based on their existing names
UPDATE "WhatsAppTemplate" 
SET "metaTemplateName" = LOWER(REPLACE(REPLACE(name, ' ', '_'), '-', '_'))
WHERE "metaTemplateName" IS NULL;

-- Now make metaTemplateName required (NOT NULL)
ALTER TABLE "WhatsAppTemplate" 
ALTER COLUMN "metaTemplateName" SET NOT NULL;

-- Add unique constraint for Meta template name + language combination
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppTemplate_metaTemplateName_metaTemplateLanguage_key" 
ON "WhatsAppTemplate"("metaTemplateName", "metaTemplateLanguage") 
WHERE "metaTemplateName" IS NOT NULL;

-- Add Meta message ID to CommunicationMessage
ALTER TABLE "CommunicationMessage" 
ADD COLUMN IF NOT EXISTS "metaMessageId" TEXT;

-- Add Meta message ID to MessageRecipient  
ALTER TABLE "MessageRecipient"
ADD COLUMN IF NOT EXISTS "metaMessageId" TEXT;

-- Add Meta message ID to ChatMessage (for chat conversations)
ALTER TABLE "ChatMessage"
ADD COLUMN IF NOT EXISTS "metaMessageId" TEXT;

-- Add Meta API configuration to CommunicationSettings
ALTER TABLE "CommunicationSettings"
ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "metaPhoneNumberId" TEXT,
ADD COLUMN IF NOT EXISTS "metaBusinessAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "metaApiVersion" TEXT DEFAULT 'v21.0',
ADD COLUMN IF NOT EXISTS "metaWebhookVerifyToken" TEXT,
ADD COLUMN IF NOT EXISTS "metaIsActive" BOOLEAN DEFAULT false;

-- Create indexes for Meta message IDs for performance
CREATE INDEX IF NOT EXISTS "CommunicationMessage_metaMessageId_idx" 
ON "CommunicationMessage"("metaMessageId") 
WHERE "metaMessageId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "MessageRecipient_metaMessageId_idx" 
ON "MessageRecipient"("metaMessageId") 
WHERE "metaMessageId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ChatMessage_metaMessageId_idx" 
ON "ChatMessage"("metaMessageId") 
WHERE "metaMessageId" IS NOT NULL;

-- Add unique constraint for Meta message IDs to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "ChatMessage_metaMessageId_unique_key" 
ON "ChatMessage"("metaMessageId") 
WHERE "metaMessageId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "CommunicationMessage_metaMessageId_unique_key" 
ON "CommunicationMessage"("metaMessageId") 
WHERE "metaMessageId" IS NOT NULL;

-- Create index for Meta phone number ID lookups
CREATE INDEX IF NOT EXISTS "CommunicationSettings_metaPhoneNumberId_idx" 
ON "CommunicationSettings"("metaPhoneNumberId") 
WHERE "metaPhoneNumberId" IS NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN "WhatsAppTemplate"."metaTemplateName" IS 'Template name used by Meta WhatsApp Business API';
COMMENT ON COLUMN "WhatsAppTemplate"."metaTemplateLanguage" IS 'Template language code for Meta API (e.g., en, es, fr)';
COMMENT ON COLUMN "WhatsAppTemplate"."metaTemplateStatus" IS 'Template approval status from Meta (APPROVED, PENDING, REJECTED)';
COMMENT ON COLUMN "WhatsAppTemplate"."metaTemplateId" IS 'Template ID assigned by Meta after approval';

COMMENT ON COLUMN "CommunicationSettings"."metaAccessToken" IS 'Meta WhatsApp Business API access token';
COMMENT ON COLUMN "CommunicationSettings"."metaPhoneNumberId" IS 'Meta WhatsApp Business phone number ID';
COMMENT ON COLUMN "CommunicationSettings"."metaBusinessAccountId" IS 'Meta WhatsApp Business account ID for template management';
COMMENT ON COLUMN "CommunicationSettings"."metaApiVersion" IS 'Meta Graph API version to use (default: v21.0)';
COMMENT ON COLUMN "CommunicationSettings"."metaWebhookVerifyToken" IS 'Token for verifying Meta webhook callbacks';
COMMENT ON COLUMN "CommunicationSettings"."metaIsActive" IS 'Whether Meta WhatsApp API is active for this branch';

COMMENT ON COLUMN "ChatMessage"."metaMessageId" IS 'Message ID from Meta WhatsApp Business API';
COMMENT ON COLUMN "CommunicationMessage"."metaMessageId" IS 'Message ID from Meta WhatsApp Business API for broadcast messages';
COMMENT ON COLUMN "MessageRecipient"."metaMessageId" IS 'Individual message ID from Meta WhatsApp Business API';

-- Create a view to easily check which API is configured for each branch
CREATE OR REPLACE VIEW "BranchWhatsAppConfiguration" AS
SELECT 
    b.id as branch_id,
    b.name as branch_name,
    cs.id as settings_id,
    -- Twilio configuration
    cs."twilioIsActive" as twilio_active,
    CASE 
        WHEN cs."twilioAccountSid" IS NOT NULL AND cs."twilioAuthToken" IS NOT NULL 
        THEN true 
        ELSE false 
    END as twilio_configured,
    -- Meta configuration  
    cs."metaIsActive" as meta_active,
    CASE 
        WHEN cs."metaAccessToken" IS NOT NULL AND cs."metaPhoneNumberId" IS NOT NULL 
        THEN true 
        ELSE false 
    END as meta_configured,
    -- WATI configuration (legacy)
    cs."watiIsActive" as wati_active,
    CASE 
        WHEN cs."watiApiToken" IS NOT NULL 
        THEN true 
        ELSE false 
    END as wati_configured,
    -- Primary provider
    CASE 
        WHEN cs."metaIsActive" = true AND cs."metaAccessToken" IS NOT NULL THEN 'META'
        WHEN cs."twilioIsActive" = true AND cs."twilioAccountSid" IS NOT NULL THEN 'TWILIO'
        WHEN cs."watiIsActive" = true AND cs."watiApiToken" IS NOT NULL THEN 'WATI'
        ELSE 'NONE'
    END as primary_provider
FROM "Branch" b
LEFT JOIN "CommunicationSettings" cs ON b.id = cs."branchId"
WHERE b."isActive" = true;

-- Add a function to help migrate templates from Twilio to Meta format
CREATE OR REPLACE FUNCTION migrate_twilio_template_to_meta(
    template_id TEXT,
    meta_template_name TEXT,
    meta_template_language TEXT DEFAULT 'en'
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE "WhatsAppTemplate" 
    SET 
        "metaTemplateName" = meta_template_name,
        "metaTemplateLanguage" = meta_template_language,
        "metaTemplateStatus" = 'PENDING'
    WHERE id = template_id 
    AND "twilioContentSid" IS NOT NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add a function to check API configuration completeness
CREATE OR REPLACE FUNCTION check_whatsapp_api_configuration(branch_id_param TEXT)
RETURNS TABLE(
    provider TEXT,
    configured BOOLEAN,
    active BOOLEAN,
    missing_fields TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH settings AS (
        SELECT * FROM "CommunicationSettings" cs WHERE cs."branchId" = branch_id_param
    )
    SELECT 'META'::TEXT as provider,
           (s."metaAccessToken" IS NOT NULL AND s."metaPhoneNumberId" IS NOT NULL) as configured,
           COALESCE(s."metaIsActive", false) as active,
           ARRAY_REMOVE(ARRAY[
               CASE WHEN s."metaAccessToken" IS NULL THEN 'metaAccessToken' END,
               CASE WHEN s."metaPhoneNumberId" IS NULL THEN 'metaPhoneNumberId' END,
               CASE WHEN s."metaBusinessAccountId" IS NULL THEN 'metaBusinessAccountId' END
           ], NULL) as missing_fields
    FROM settings s
    UNION ALL
    SELECT 'TWILIO'::TEXT as provider,
           (s."twilioAccountSid" IS NOT NULL AND s."twilioAuthToken" IS NOT NULL AND s."twilioWhatsAppFrom" IS NOT NULL) as configured,
           COALESCE(s."twilioIsActive", false) as active,
           ARRAY_REMOVE(ARRAY[
               CASE WHEN s."twilioAccountSid" IS NULL THEN 'twilioAccountSid' END,
               CASE WHEN s."twilioAuthToken" IS NULL THEN 'twilioAuthToken' END,
               CASE WHEN s."twilioWhatsAppFrom" IS NULL THEN 'twilioWhatsAppFrom' END
           ], NULL) as missing_fields
    FROM settings s
    UNION ALL
    SELECT 'WATI'::TEXT as provider,
           (s."watiApiToken" IS NOT NULL) as configured,
           COALESCE(s."watiIsActive", false) as active,
           ARRAY_REMOVE(ARRAY[
               CASE WHEN s."watiApiToken" IS NULL THEN 'watiApiToken' END
           ], NULL) as missing_fields
    FROM settings s;
END;
$$ LANGUAGE plpgsql; 