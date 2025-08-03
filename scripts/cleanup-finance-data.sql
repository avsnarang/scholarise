-- Cleanup Finance Module Data
-- This script removes all finance-related data to prepare for schema restructuring

BEGIN;

-- Step 1: Delete all fee collection items first (due to foreign key constraints)
DELETE FROM "FeeCollectionItem";

-- Step 2: Delete all fee collections
DELETE FROM "FeeCollection";

-- Step 3: Delete payment gateway transactions (if any)
DELETE FROM "PaymentGatewayTransaction";

-- Step 4: Delete payment requests (if any)
DELETE FROM "PaymentRequest";

-- Step 5: Delete payment webhook logs (if any)
DELETE FROM "PaymentWebhookLog";

-- Optional: Reset sequences/counters for clean numbering
-- (Postgres will handle this automatically for CUID fields)

-- Commit the cleanup
COMMIT;

-- Verify cleanup
SELECT 
  'FeeCollectionItem' as table_name, 
  COUNT(*) as remaining_records 
FROM "FeeCollectionItem"
UNION ALL
SELECT 
  'FeeCollection' as table_name, 
  COUNT(*) as remaining_records 
FROM "FeeCollection"
UNION ALL
SELECT 
  'PaymentGatewayTransaction' as table_name, 
  COUNT(*) as remaining_records 
FROM "PaymentGatewayTransaction"
UNION ALL
SELECT 
  'PaymentRequest' as table_name, 
  COUNT(*) as remaining_records 
FROM "PaymentRequest"
UNION ALL
SELECT 
  'PaymentWebhookLog' as table_name, 
  COUNT(*) as remaining_records 
FROM "PaymentWebhookLog";