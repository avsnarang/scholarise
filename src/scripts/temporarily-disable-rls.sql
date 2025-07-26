-- Temporarily disable RLS for chat tables to test realtime functionality
-- ⚠️ WARNING: This removes security - only use for testing!

-- Disable RLS on Conversation table temporarily
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;

-- Disable RLS on ChatMessage table temporarily  
ALTER TABLE "ChatMessage" DISABLE ROW LEVEL SECURITY;

-- Show current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('Conversation', 'ChatMessage');

-- Note: To re-enable RLS later, run:
-- ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY; 