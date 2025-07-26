-- Secure Super Admin Policies (Replace the overly permissive ones)

-- Drop the temporary "allow all" policies
DROP POLICY IF EXISTS "Allow all authenticated conversations" ON "Conversation";
DROP POLICY IF EXISTS "Allow all authenticated chat messages" ON "ChatMessage";
DROP POLICY IF EXISTS "Allow all authenticated realtime read" ON "realtime"."messages";
DROP POLICY IF EXISTS "Allow all authenticated realtime write" ON "realtime"."messages";

-- Create proper Super Admin policies using the SuperAdmin table approach
-- First ensure the SuperAdmin table exists
INSERT INTO "SuperAdmin" ("userId") 
VALUES ('332c7cda-caf7-44e9-b09d-85e92086ed37')
ON CONFLICT ("userId") DO NOTHING;

-- Secure conversation policy: Super Admin OR branch access
CREATE POLICY "Secure super admin conversations" ON "Conversation"
FOR ALL TO authenticated
USING (
  -- Super Admin check via SuperAdmin table
  EXISTS (
    SELECT 1 FROM "SuperAdmin" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  -- Regular users: branch access via Employee
  EXISTS (
    SELECT 1 FROM "Employee" 
    WHERE "userId" = auth.uid()::text 
    AND "branchId" = "Conversation"."branchId"
  )
  OR
  -- Regular users: branch access via Teacher
  EXISTS (
    SELECT 1 FROM "Teacher" 
    WHERE "userId" = auth.uid()::text 
    AND "branchId" = "Conversation"."branchId"
  )
);

-- Secure chat message policy: Super Admin OR branch access
CREATE POLICY "Secure super admin chat messages" ON "ChatMessage"
FOR ALL TO authenticated
USING (
  -- Super Admin check via SuperAdmin table
  EXISTS (
    SELECT 1 FROM "SuperAdmin" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  -- Regular users: access via conversation's branch
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

-- Secure realtime policies: Super Admin OR branch access
CREATE POLICY "Secure super admin realtime read" ON "realtime"."messages"
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "SuperAdmin" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM "Employee" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM "Teacher" 
    WHERE "userId" = auth.uid()::text
  )
);

CREATE POLICY "Secure super admin realtime write" ON "realtime"."messages"
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "SuperAdmin" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM "Employee" 
    WHERE "userId" = auth.uid()::text
  )
  OR
  EXISTS (
    SELECT 1 FROM "Teacher" 
    WHERE "userId" = auth.uid()::text
  )
);

-- Verify the secure setup
SELECT 'Secure Policies Created' as status,
  tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('Conversation', 'ChatMessage') 
OR (schemaname = 'realtime' AND tablename = 'messages')
ORDER BY tablename, policyname; 