-- Migration: Add Easebuzz Payment Gateway Support
-- Date: 2025-01-13
-- Description: Adds models for Easebuzz payment gateway integration while maintaining existing fee collection functionality

-- Payment Gateway Providers enum (for future extensibility)
CREATE TYPE "PaymentGateway" AS ENUM ('EASEBUZZ', 'RAZORPAY', 'PAYTM', 'STRIPE');

-- Payment Gateway Transaction Status enum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

-- Payment Gateway Transactions table
CREATE TABLE "PaymentGatewayTransaction" (
    "id" TEXT NOT NULL,
    "gatewayTransactionId" TEXT,
    "gateway" "PaymentGateway" NOT NULL DEFAULT 'EASEBUZZ',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "studentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "feeTermId" TEXT NOT NULL,
    "paymentRequestId" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "failureReason" TEXT,
    "gatewayResponse" JSONB,
    "webhookData" JSONB,
    "refundAmount" DOUBLE PRECISION DEFAULT 0,
    "refundReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayTransaction_pkey" PRIMARY KEY ("id")
);

-- Payment Links/Requests table
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL DEFAULT 'EASEBUZZ',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "studentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "feeTermId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "gatewayRequestId" TEXT,
    "paymentUrl" TEXT,
    "shortUrl" TEXT,
    "fees" JSONB NOT NULL, -- Array of fee items {feeHeadId, amount, feeHeadName}
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "buyerPhone" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "webhookUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- Payment Webhook Logs table (for debugging and audit)
CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL DEFAULT 'EASEBUZZ',
    "event" TEXT NOT NULL,
    "transactionId" TEXT,
    "requestId" TEXT,
    "headers" JSONB,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

-- Add gateway transaction reference to existing FeeCollection
ALTER TABLE "FeeCollection" ADD COLUMN "gatewayTransactionId" TEXT;
ALTER TABLE "FeeCollection" ADD COLUMN "paymentRequestId" TEXT;
ALTER TABLE "FeeCollection" ADD COLUMN "gateway" "PaymentGateway";

-- Add indexes for performance
CREATE INDEX "PaymentGatewayTransaction_studentId_idx" ON "PaymentGatewayTransaction"("studentId");
CREATE INDEX "PaymentGatewayTransaction_branchId_sessionId_idx" ON "PaymentGatewayTransaction"("branchId", "sessionId");
CREATE INDEX "PaymentGatewayTransaction_status_idx" ON "PaymentGatewayTransaction"("status");
CREATE INDEX "PaymentGatewayTransaction_gateway_idx" ON "PaymentGatewayTransaction"("gateway");
CREATE INDEX "PaymentGatewayTransaction_gatewayTransactionId_idx" ON "PaymentGatewayTransaction"("gatewayTransactionId");
CREATE INDEX "PaymentGatewayTransaction_createdAt_idx" ON "PaymentGatewayTransaction"("createdAt");

CREATE INDEX "PaymentRequest_studentId_idx" ON "PaymentRequest"("studentId");
CREATE INDEX "PaymentRequest_branchId_sessionId_idx" ON "PaymentRequest"("branchId", "sessionId");
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");
CREATE INDEX "PaymentRequest_gateway_idx" ON "PaymentRequest"("gateway");
CREATE INDEX "PaymentRequest_createdAt_idx" ON "PaymentRequest"("createdAt");

CREATE INDEX "PaymentWebhookLog_gateway_event_idx" ON "PaymentWebhookLog"("gateway", "event");
CREATE INDEX "PaymentWebhookLog_transactionId_idx" ON "PaymentWebhookLog"("transactionId");
CREATE INDEX "PaymentWebhookLog_processed_idx" ON "PaymentWebhookLog"("processed");
CREATE INDEX "PaymentWebhookLog_createdAt_idx" ON "PaymentWebhookLog"("createdAt");

CREATE INDEX "FeeCollection_gatewayTransactionId_idx" ON "FeeCollection"("gatewayTransactionId");
CREATE INDEX "FeeCollection_paymentRequestId_idx" ON "FeeCollection"("paymentRequestId");
CREATE INDEX "FeeCollection_gateway_idx" ON "FeeCollection"("gateway");

-- Add foreign key constraints
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_feeTermId_fkey" FOREIGN KEY ("feeTermId") REFERENCES "FeeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_feeTermId_fkey" FOREIGN KEY ("feeTermId") REFERENCES "FeeTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeeCollection" ADD CONSTRAINT "FeeCollection_gatewayTransactionId_fkey" FOREIGN KEY ("gatewayTransactionId") REFERENCES "PaymentGatewayTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeeCollection" ADD CONSTRAINT "FeeCollection_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE; 