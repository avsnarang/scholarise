-- Create AutomationLog table for tracking automated system messages
-- This is completely separate from the regular communication system

CREATE TABLE IF NOT EXISTS "AutomationLog" (
    "id" TEXT NOT NULL,
    "automationType" TEXT NOT NULL, -- ADMISSION_REGISTRATION, FEE_REMINDER, etc.
    "automationTrigger" TEXT NOT NULL, -- admission_inquiry_created, fee_due_reminder, etc.
    "messageTitle" TEXT NOT NULL,
    "messageContent" TEXT,
    "templateId" TEXT,
    "templateName" TEXT,
    
    -- Recipient Information
    "recipientId" TEXT NOT NULL, -- ID of student, parent, teacher, etc.
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL, -- STUDENT, PARENT, TEACHER, EMPLOYEE
    
    -- Delivery Status
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, READ, FAILED
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    
    -- External System References
    "externalMessageId" TEXT, -- WhatsApp message ID, SMS ID, etc.
    "platformUsed" TEXT, -- WHATSAPP, SMS, EMAIL
    
    -- Context and Metadata
    "automationContext" JSONB, -- Additional context data
    "branchId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX "AutomationLog_branchId_idx" ON "AutomationLog"("branchId");
CREATE INDEX "AutomationLog_automationType_idx" ON "AutomationLog"("automationType");
CREATE INDEX "AutomationLog_status_idx" ON "AutomationLog"("status");
CREATE INDEX "AutomationLog_recipientType_idx" ON "AutomationLog"("recipientType");
CREATE INDEX "AutomationLog_createdAt_idx" ON "AutomationLog"("createdAt");
CREATE INDEX "AutomationLog_recipientPhone_idx" ON "AutomationLog"("recipientPhone");
CREATE INDEX "AutomationLog_externalMessageId_idx" ON "AutomationLog"("externalMessageId");

-- Add foreign key constraint to Branch
ALTER TABLE "AutomationLog" 
ADD CONSTRAINT "AutomationLog_branchId_fkey" 
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE; 