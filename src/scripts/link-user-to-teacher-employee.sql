-- Link authenticated user to Teacher/Employee records
-- Replace 'YOUR_USER_ID' and 'YOUR_BRANCH_ID' with actual values

-- Step 1: Get your user ID from Supabase auth
-- You can find this in the browser console logs or by running the check-user-permissions script

-- Step 2: Find available Teacher/Employee records that might be yours
SELECT 'Teachers available:' as type, id, "firstName", "lastName", email, "employeeCode", "branchId", "userId"
FROM "Teacher" 
WHERE "userId" IS NULL OR "userId" = ''
ORDER BY "firstName", "lastName";

SELECT 'Employees available:' as type, id, "firstName", "lastName", email, "employeeCode", "branchId", "userId"  
FROM "Employee"
WHERE "userId" IS NULL OR "userId" = ''
ORDER BY "firstName", "lastName";

-- Step 3: Link your user ID to the appropriate Teacher record
-- Uncomment and modify the line below with your actual User ID and Teacher ID:
-- UPDATE "Teacher" SET "userId" = 'YOUR_USER_ID_HERE' WHERE id = 'TEACHER_ID_HERE';

-- OR Step 3: Link your user ID to the appropriate Employee record  
-- Uncomment and modify the line below with your actual User ID and Employee ID:
-- UPDATE "Employee" SET "userId" = 'YOUR_USER_ID_HERE' WHERE id = 'EMPLOYEE_ID_HERE';

-- Step 4: Verify the link was created
-- SELECT 'Linked Teachers:' as type, id, "firstName", "lastName", "userId", "branchId" FROM "Teacher" WHERE "userId" = 'YOUR_USER_ID_HERE';
-- SELECT 'Linked Employees:' as type, id, "firstName", "lastName", "userId", "branchId" FROM "Employee" WHERE "userId" = 'YOUR_USER_ID_HERE';

-- Example usage:
-- If your user ID is: 'abc123-def456-ghi789'
-- And you want to link to Teacher with ID: 'teacher123'
-- Run: UPDATE "Teacher" SET "userId" = 'abc123-def456-ghi789' WHERE id = 'teacher123'; 