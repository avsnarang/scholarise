-- Link Aditya's Supabase User ID to his Employee record
-- Employee ID: cmd7pacy900017i0k9wz0x3ep

-- Step 1: Check current Employee record
SELECT 
  id,
  "firstName", 
  "lastName", 
  "employeeCode", 
  "branchId", 
  "userId"
FROM "Employee" 
WHERE id = 'cmd7pacy900017i0k9wz0x3ep';

-- Step 2: Update the Employee record with your Supabase User ID
-- REPLACE 'YOUR_SUPABASE_USER_ID_HERE' with your actual User ID from the debug component
UPDATE "Employee" 
SET "userId" = 'YOUR_SUPABASE_USER_ID_HERE' 
WHERE id = 'cmd7pacy900017i0k9wz0x3ep';

-- Step 3: Verify the link was created
SELECT 
  id,
  "firstName", 
  "lastName", 
  "branchId", 
  "userId"
FROM "Employee" 
WHERE id = 'cmd7pacy900017i0k9wz0x3ep';

-- After running this, the realtime chat should work! 