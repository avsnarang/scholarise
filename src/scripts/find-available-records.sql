-- Find available Teacher/Employee records (properly quoted column names)

-- 1. Show Teachers without linked users
SELECT 
  'Teacher' as type, 
  id, 
  "firstName", 
  "lastName", 
  "employeeCode", 
  "branchId", 
  "userId"
FROM "Teacher" 
WHERE "userId" IS NULL OR "userId" = ''
ORDER BY "firstName", "lastName";

-- 2. Show Employees without linked users  
SELECT 
  'Employee' as type,
  id, 
  "firstName", 
  "lastName", 
  "employeeCode", 
  "branchId", 
  "userId"  
FROM "Employee"
WHERE "userId" IS NULL OR "userId" = ''
ORDER BY "firstName", "lastName";

-- 3. Show all branches for reference
SELECT 
  'Branch' as type,
  id as "branchId", 
  name as "branchName",
  address
FROM "Branch"
ORDER BY name; 