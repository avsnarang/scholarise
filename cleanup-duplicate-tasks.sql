-- Clean up duplicate background tasks
-- First, let's see what we have
SELECT 
  id, 
  title, 
  status, 
  totalItems, 
  processedItems, 
  createdAt
FROM "BackgroundTask" 
WHERE taskType = 'BULK_CLERK_RETRY' 
ORDER BY createdAt DESC;

-- Delete duplicate retry tasks (keep the most recent one of each type)
DELETE FROM "BackgroundTask" 
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY taskType, title, "createdBy" 
        ORDER BY createdAt DESC
      ) as rn
    FROM "BackgroundTask"
    WHERE taskType = 'BULK_CLERK_RETRY'
    AND status IN ('PENDING', 'RUNNING')
  ) t
  WHERE rn > 1
);

-- Reset any stuck RUNNING tasks back to PENDING
UPDATE "BackgroundTask" 
SET status = 'PENDING', 
    "startedAt" = NULL,
    "processedItems" = 0,
    "failedItems" = 0,
    percentage = 0
WHERE status = 'RUNNING' 
AND "startedAt" < NOW() - INTERVAL '10 minutes'; 