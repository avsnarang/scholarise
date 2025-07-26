-- Check branch mismatch for Aditya's account

-- 1. Check what branch ID "cmbdk8dd9000w7ip2rpxsd5rr" actually is
SELECT 
  id as "branchId",
  name as "branchName", 
  code as "branchCode",
  address
FROM "Branch" 
WHERE id = 'cmbdk8dd9000w7ip2rpxsd5rr';

-- 2. Check if there's a branch with ID "headquarters"
SELECT 
  id as "branchId",
  name as "branchName", 
  code as "branchCode", 
  address
FROM "Branch" 
WHERE id = 'headquarters';

-- 3. Look for headquarters/HQ branch by name or code
SELECT 
  id as "branchId",
  name as "branchName", 
  code as "branchCode",
  address
FROM "Branch" 
WHERE 
  name ILIKE '%headquarters%' 
  OR name ILIKE '%HQ%' 
  OR code ILIKE '%HQ%'
ORDER BY name;

-- 4. Check conversations in both branches
SELECT 
  'cmbdk8dd9000w7ip2rpxsd5rr conversations' as info,
  COUNT(*) as count
FROM "Conversation" 
WHERE "branchId" = 'cmbdk8dd9000w7ip2rpxsd5rr';

SELECT 
  'headquarters conversations' as info,
  COUNT(*) as count
FROM "Conversation" 
WHERE "branchId" = 'headquarters';

-- 5. If "headquarters" is the correct branch, update Employee record:
-- UPDATE "Employee" SET "branchId" = 'headquarters' WHERE id = 'cmd7pacy900017i0k9wz0x3ep';

-- 6. OR if "cmbdk8dd9000w7ip2rpxsd5rr" is correct, we need to fix the user metadata
-- (This would require updating your authentication/session data) 