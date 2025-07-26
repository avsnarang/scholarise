-- Test realtime by temporarily disabling RLS

-- 1. Disable RLS temporarily (FOR TESTING ONLY)
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" DISABLE ROW LEVEL SECURITY;

-- 2. Check RLS status
SELECT 
  'RLS Status After Disable' as info,
  schemaname, 
  tablename, 
  rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE tablename IN ('Conversation', 'ChatMessage');

-- 3. Test basic conversation access
SELECT 
  'Conversation Access Test' as test,
  COUNT(*) as total_conversations
FROM "Conversation";

SELECT 
  'Conversations by Branch' as test,
  "branchId",
  COUNT(*) as count
FROM "Conversation" 
GROUP BY "branchId"
ORDER BY count DESC;

-- ⚠️ IMPORTANT: After testing realtime, re-enable RLS with:
-- ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY; 