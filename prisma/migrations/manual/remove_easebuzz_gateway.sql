-- Migration: Remove Easebuzz Payment Gateway
-- Date: 2025-01-25
-- Description: Removes EASEBUZZ from PaymentGateway enum and updates existing records

-- First, update any existing records that use EASEBUZZ gateway
-- We'll update them to RAZORPAY as a placeholder (you can change this based on your preference)
-- Alternative options: PAYTM, STRIPE

-- Update PaymentGatewayTransaction records
UPDATE "PaymentGatewayTransaction" 
SET "gateway" = 'RAZORPAY'
WHERE "gateway" = 'EASEBUZZ';

-- Update PaymentRequest records
UPDATE "PaymentRequest" 
SET "gateway" = 'RAZORPAY'
WHERE "gateway" = 'EASEBUZZ';

-- Update PaymentGatewayWebhook records
UPDATE "PaymentGatewayWebhook" 
SET "gateway" = 'RAZORPAY'
WHERE "gateway" = 'EASEBUZZ';

-- Now alter the enum type to remove EASEBUZZ
-- First, create a new enum without EASEBUZZ
CREATE TYPE "PaymentGateway_new" AS ENUM ('RAZORPAY', 'PAYTM', 'STRIPE');

-- Update all columns to use the new enum
ALTER TABLE "PaymentGatewayTransaction" 
  ALTER COLUMN "gateway" TYPE "PaymentGateway_new" 
  USING ("gateway"::text::"PaymentGateway_new");

ALTER TABLE "PaymentRequest" 
  ALTER COLUMN "gateway" TYPE "PaymentGateway_new" 
  USING ("gateway"::text::"PaymentGateway_new");

ALTER TABLE "PaymentGatewayWebhook" 
  ALTER COLUMN "gateway" TYPE "PaymentGateway_new" 
  USING ("gateway"::text::"PaymentGateway_new");

-- Drop the old enum
DROP TYPE "PaymentGateway";

-- Rename the new enum to the original name
ALTER TYPE "PaymentGateway_new" RENAME TO "PaymentGateway";

-- Add a comment to track this migration
COMMENT ON TYPE "PaymentGateway" IS 'Payment gateway options - Easebuzz removed on 2025-01-25';