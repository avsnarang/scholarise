-- Update RLS policies to give Super Admins access to all branches

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow branch access to conversations" ON "Conversation";
DROP POLICY IF EXISTS "Allow access to chat messages" ON "ChatMessage";

-- 2. Create new policies with Super Admin support

-- Conversation policy: Super Admins see all, regular users see their branch only
CREATE POLICY "Allow authenticated access to conversations" ON "Conversation"
FOR ALL TO authenticated
USING (
  -- Super Admins can access all conversations
  EXISTS (
    SELECT 1 FROM "Employee" 
    WHERE "userId" = auth.uid()::text 
    AND "employeeCode" ILIKE '%super%' -- Adjust this condition as needed
  )
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

-- ChatMessage policy: Super Admins see all, regular users see their branch only
CREATE POLICY "Allow authenticated access to chat messages" ON "ChatMessage"
FOR ALL TO authenticated
USING (
  -- Super Admins can access all chat messages
  EXISTS (
    SELECT 1 FROM "Employee" 
    WHERE "userId" = auth.uid()::text 
    AND "employeeCode" ILIKE '%super%' -- Adjust this condition as needed
  )
  OR
  -- OR Regular users can access messages in conversations from their branch
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

-- 3. Alternative: Use a dedicated super admin check
-- If you have a better way to identify super admins, use this instead:

/*
-- Option A: Check if user has super_admin role in user metadata
-- (This would require checking Supabase auth.jwt() for role claims)

-- Option B: Create a dedicated SuperAdmin table and check against that
CREATE TABLE IF NOT EXISTS "SuperAdmin" (
  id text PRIMARY KEY,
  "userId" text NOT NULL UNIQUE,
  "createdAt" timestamptz DEFAULT NOW(),
  "updatedAt" timestamptz DEFAULT NOW()
);

-- Insert your user as super admin
INSERT INTO "SuperAdmin" ("id", "userId") 
VALUES (gen_random_uuid()::text, '332c7cda-caf7-44e9-b09d-85e92086ed37')
ON CONFLICT ("userId") DO NOTHING;

-- Updated policies using SuperAdmin table
DROP POLICY IF EXISTS "Allow authenticated access to conversations" ON "Conversation";
DROP POLICY IF EXISTS "Allow authenticated access to chat messages" ON "ChatMessage";

CREATE POLICY "Allow authenticated access to conversations" ON "Conversation"
FOR ALL TO authenticated
USING (
  -- Super Admins can access all conversations
  EXISTS (
    SELECT 1 FROM "SuperAdmin" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  -- Regular users can access conversations in their branch
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

CREATE POLICY "Allow authenticated access to chat messages" ON "ChatMessage"
FOR ALL TO authenticated
USING (
  -- Super Admins can access all chat messages
  EXISTS (
    SELECT 1 FROM "SuperAdmin" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  -- Regular users can access messages in their branch
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
*/

-- 4. Check your Employee record to see what we can use for super admin detection
SELECT 
  'Your Employee Record' as info,
  id, 
  "firstName", 
  "lastName", 
  "employeeCode", 
  "branchId", 
  "userId"
FROM "Employee" 
WHERE id = 'cmd7pacy900017i0k9wz0x3ep';

-- 5. Test the new policies
SELECT 'Policy Test' as test, 'Should return true for super admin' as note; 