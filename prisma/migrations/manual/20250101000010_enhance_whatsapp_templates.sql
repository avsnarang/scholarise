-- Enhance WhatsApp Templates with Rich Media and Interactive Components
-- Migration: 20250101000010_enhance_whatsapp_templates.sql

-- Add new columns to WhatsAppTemplate table
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "headerType" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "headerContent" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "headerMediaUrl" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "footerText" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "buttons" JSONB;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "mediaAttachments" JSONB;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "interactiveType" TEXT;
ALTER TABLE "WhatsAppTemplate" ADD COLUMN "interactiveContent" JSONB;

-- Add new tables for better structure if needed
CREATE TABLE "TemplateButton" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateId" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'CALL_TO_ACTION', 'QUICK_REPLY', 'URL', 'PHONE_NUMBER'
  "text" TEXT NOT NULL,
  "url" TEXT,
  "phoneNumber" TEXT,
  "payload" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TemplateButton_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TemplateMedia" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateId" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'
  "url" TEXT NOT NULL,
  "filename" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "caption" TEXT,
  "supabaseBucket" TEXT DEFAULT 'whatsapp-media',
  "supabasePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TemplateMedia_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add indexes for better performance
CREATE INDEX "TemplateButton_templateId_idx" ON "TemplateButton"("templateId");
CREATE INDEX "TemplateButton_type_idx" ON "TemplateButton"("type");
CREATE INDEX "TemplateMedia_templateId_idx" ON "TemplateMedia"("templateId");
CREATE INDEX "TemplateMedia_type_idx" ON "TemplateMedia"("type");

-- Add similar enhancements to ChatMessage for rich messaging in chat
ALTER TABLE "ChatMessage" ADD COLUMN "headerType" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "headerContent" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "headerMediaUrl" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "footerText" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "buttons" JSONB;
ALTER TABLE "ChatMessage" ADD COLUMN "interactiveType" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "interactiveContent" JSONB;

-- Add table for chat message media attachments
CREATE TABLE "ChatMessageMedia" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'STICKER'
  "url" TEXT NOT NULL,
  "filename" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "caption" TEXT,
  "supabaseBucket" TEXT DEFAULT 'whatsapp-media',
  "supabasePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessageMedia_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ChatMessageMedia_messageId_idx" ON "ChatMessageMedia"("messageId");
CREATE INDEX "ChatMessageMedia_type_idx" ON "ChatMessageMedia"("type");

-- Update the existing enums or create new ones if needed
-- Note: PostgreSQL doesn't allow direct enum modification, so we'll use text fields for flexibility

-- Add comments for documentation
COMMENT ON COLUMN "WhatsAppTemplate"."headerType" IS 'Type of header: TEXT, IMAGE, VIDEO, DOCUMENT';
COMMENT ON COLUMN "WhatsAppTemplate"."headerContent" IS 'Text content for header (when headerType is TEXT)';
COMMENT ON COLUMN "WhatsAppTemplate"."headerMediaUrl" IS 'URL for media header (when headerType is IMAGE/VIDEO/DOCUMENT)';
COMMENT ON COLUMN "WhatsAppTemplate"."footerText" IS 'Footer text content (optional)';
COMMENT ON COLUMN "WhatsAppTemplate"."buttons" IS 'JSON array of button objects for template';
COMMENT ON COLUMN "WhatsAppTemplate"."mediaAttachments" IS 'JSON array of media attachments';
COMMENT ON COLUMN "WhatsAppTemplate"."interactiveType" IS 'Type of interactive content: BUTTON, LIST, CTA_URL';
COMMENT ON COLUMN "WhatsAppTemplate"."interactiveContent" IS 'JSON content for interactive elements';

COMMENT ON TABLE "TemplateButton" IS 'Buttons for WhatsApp template messages';
COMMENT ON TABLE "TemplateMedia" IS 'Media attachments for WhatsApp templates';
COMMENT ON TABLE "ChatMessageMedia" IS 'Media attachments for chat messages'; 