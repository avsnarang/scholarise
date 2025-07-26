-- Find records for Aditya Veer Singh Narang

-- 1. Look for existing Teacher records with similar name
SELECT 
  'Teacher' as type,
  id, 
  "firstName", 
  "lastName", 
  "employeeCode", 
  "branchId", 
  "userId"
FROM "Teacher" 
WHERE 
  ("firstName" ILIKE '%Aditya%' OR "lastName" ILIKE '%Narang%' OR "firstName" ILIKE '%Singh%')
ORDER BY "firstName", "lastName";

-- 2. Look for existing Employee records with similar name  
SELECT 
  'Employee' as type,
  id, 
  "firstName", 
  "lastName", 
  "employeeCode", 
  "branchId", 
  "userId"
FROM "Employee"
WHERE 
  ("firstName" ILIKE '%Aditya%' OR "lastName" ILIKE '%Narang%' OR "firstName" ILIKE '%Singh%')
ORDER BY "firstName", "lastName";

-- 3. Check the headquarters branch ID
SELECT 
  'Branch' as type,
  id as "branchId", 
  name as "branchName",
  address
FROM "Branch"
WHERE id = 'headquarters' OR name ILIKE '%headquarters%' OR name ILIKE '%HQ%'
ORDER BY name;

-- 4. If no records found, here's a template to create a new Employee record:
-- (Uncomment and modify as needed)

/*
INSERT INTO "Employee" (
  id,
  "firstName",
  "lastName", 
  "employeeCode",
  "branchId",
  "userId",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Aditya Veer Singh',
  'Narang',
  'EMP001',           -- Replace with appropriate employee code
  'headquarters',     -- Your branch ID
  'YOUR_USER_ID_HERE', -- Replace with your Supabase User ID
  true,
  NOW(),
  NOW()
);
*/ 