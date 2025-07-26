-- Check detailed RLS policy conditions

-- 1. Get the actual policy definitions with WHERE clauses
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as "where_clause"
FROM pg_policies 
WHERE tablename IN ('Conversation', 'ChatMessage')
ORDER BY tablename, policyname;

-- 2. Test the specific RLS condition for Conversation manually
-- This simulates what the RLS policy checks
SELECT 
  'RLS Test - Conversation Access' as test,
  EXISTS (
    SELECT 1 
    FROM "Teacher" 
    WHERE "userId" = '332c7cda-caf7-44e9-b09d-85e92086ed37'::text 
    AND "branchId" = 'headquarters'
  ) as "teacher_access",
  EXISTS (
    SELECT 1 
    FROM "Employee" 
    WHERE "userId" = '332c7cda-caf7-44e9-b09d-85e92086ed37'::text 
    AND "branchId" = 'headquarters'
  ) as "employee_access";

-- 3. Check what your actual Employee record shows
SELECT 
  'Your Employee Record' as info,
  id,
  "firstName",
  "lastName", 
  "branchId",
  "userId",
  CASE 
    WHEN "userId" = '332c7cda-caf7-44e9-b09d-85e92086ed37'::text THEN '✅ User ID matches'
    ELSE '❌ User ID does not match'
  END as "user_id_check",
  CASE 
    WHEN "branchId" = 'headquarters' THEN '✅ Branch ID matches' 
    ELSE '❌ Branch ID does not match'
  END as "branch_id_check"
FROM "Employee" 
WHERE id = 'cmd7pacy900017i0k9wz0x3ep';

-- 4. Test direct conversation access (this is what's failing)
SELECT 
  'Direct Conversation Test' as test,
  id,
  "branchId",
  "participantName"
FROM "Conversation" 
WHERE "branchId" = 'headquarters'
LIMIT 3;

-- 5. Show the auth.uid() function result (what Supabase uses for RLS)
-- Note: This will only work if run from a Supabase authenticated session
-- SELECT auth.uid() as "current_auth_uid";

-- QUICK FIXES TO TRY:

-- Fix 1: Update your Employee record to headquarters branch
-- UPDATE "Employee" SET "branchId" = 'headquarters' WHERE id = 'cmd7pacy900017i0k9wz0x3ep';

-- Fix 2: If RLS policies are checking TEXT vs UUID casting, this might help:
-- (Run this to see if there are casting issues)
SELECT 
  'Casting Test' as test,
  '332c7cda-caf7-44e9-b09d-85e92086ed37'::text as "as_text",
  '332c7cda-caf7-44e9-b09d-85e92086ed37'::uuid as "as_uuid",
  '332c7cda-caf7-44e9-b09d-85e92086ed37'::uuid::text as "uuid_to_text"; 