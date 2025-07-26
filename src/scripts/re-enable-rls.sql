-- Re-enable RLS for chat tables after testing
-- This restores security after temporary testing

-- Enable RLS on Conversation table
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ChatMessage table  
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- Show current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('Conversation', 'ChatMessage');

-- Verify RLS policies are still in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('Conversation', 'ChatMessage'); 