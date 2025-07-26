-- Direct Super Admin RLS fix - hardcode your User ID

-- 1. Test the current auth.uid() function
SELECT 'Current auth.uid()' as test, auth.uid() as "user_id";

-- 2. Check your SuperAdmin record
SELECT 'SuperAdmin Record' as test, * FROM "SuperAdmin";

-- 3. Drop existing policies and create simpler ones
DROP POLICY IF EXISTS "Allow super admin and branch access to conversations" ON "Conversation";
DROP POLICY IF EXISTS "Allow super admin and branch access to chat messages" ON "ChatMessage";
DROP POLICY IF EXISTS "Allow authenticated access to conversations" ON "Conversation";
DROP POLICY IF EXISTS "Allow authenticated access to chat messages" ON "ChatMessage";

-- 4. Create SIMPLE Super Admin policies with hardcoded User ID
CREATE POLICY "Super admin or branch access to conversations" ON "Conversation"
FOR ALL TO authenticated
USING (
  -- Direct User ID check for Super Admin (replace with your actual User ID)
  auth.uid()::text = '332c7cda-caf7-44e9-b09d-85e92086ed37'
  OR
  -- OR Regular users can access conversations in their branch
  EXISTS (
    SELECT 1 FROM "Employee" 
    WHERE "userId" = auth.uid()::text 
    AND "branchId" = "Conversation"."branchId"
  )
  OR 
  EXISTS (
    SELECT 1 FROM "Teacher" 
    WHERE "userId" = auth.uid()::text 
    AND "branchId" = "Conversation"."branchId"
  )
);

CREATE POLICY "Super admin or branch access to chat messages" ON "ChatMessage"
FOR ALL TO authenticated
USING (
  -- Direct User ID check for Super Admin (replace with your actual User ID)
  auth.uid()::text = '332c7cda-caf7-44e9-b09d-85e92086ed37'
  OR
  -- OR Regular users can access messages in their branch
  EXISTS (
    SELECT 1 FROM "Conversation" c
    JOIN "Employee" e ON e."branchId" = c."branchId"
    WHERE c.id = "ChatMessage"."conversationId"
    AND e."userId" = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM "Conversation" c
    JOIN "Teacher" t ON t."branchId" = c."branchId"
    WHERE c.id = "ChatMessage"."conversationId"
    AND t."userId" = auth.uid()::text
  )
);

-- 5. Test the new policies manually
-- This should return true for your User ID
SELECT 'Policy Test for Conversations' as test,
(
  auth.uid()::text = '332c7cda-caf7-44e9-b09d-85e92086ed37'
  OR
  EXISTS (
    SELECT 1 FROM "Employee" 
    WHERE "userId" = auth.uid()::text 
    AND "branchId" = 'cmbdk8dd9000w7ip2rpxsd5rr'
  )
) as "should_have_access";

-- 6. Alternative: Even simpler policy - Super Admin gets EVERYTHING
/*
-- If the above doesn't work, try this ultra-simple approach:
DROP POLICY IF EXISTS "Super admin or branch access to conversations" ON "Conversation";
DROP POLICY IF EXISTS "Super admin or branch access to chat messages" ON "ChatMessage";

-- Ultra-simple policies
CREATE POLICY "Allow super admin all conversations" ON "Conversation"
FOR ALL TO authenticated
USING (auth.uid()::text = '332c7cda-caf7-44e9-b09d-85e92086ed37');

CREATE POLICY "Allow super admin all chat messages" ON "ChatMessage"
FOR ALL TO authenticated
USING (auth.uid()::text = '332c7cda-caf7-44e9-b09d-85e92086ed37');
*/

-- 7. Check RLS status
SELECT 'RLS Status' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('Conversation', 'ChatMessage'); 