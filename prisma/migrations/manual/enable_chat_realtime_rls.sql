-- Enable Row Level Security (RLS) for Chat Tables
-- This is required for Supabase Realtime to work properly

-- Enable RLS on Conversation table
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ChatMessage table  
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Conversation table
-- Allow users to see conversations for their branch based on their User.id -> Teacher/Employee.userId relationship
CREATE POLICY "Allow branch access to conversations" ON "Conversation"
  FOR ALL USING (
    "branchId" IN (
      SELECT DISTINCT "branchId" 
      FROM "Teacher" 
      WHERE "userId" = auth.uid()::text
      UNION
      SELECT DISTINCT "branchId" 
      FROM "Employee" 
      WHERE "userId" = auth.uid()::text
    )
  );

-- Create RLS policies for ChatMessage table
-- Allow users to see messages for conversations they have access to
CREATE POLICY "Allow branch access to chat messages" ON "ChatMessage"
  FOR ALL USING (
    "conversationId" IN (
      SELECT "id" 
      FROM "Conversation" 
      WHERE "branchId" IN (
        SELECT DISTINCT "branchId" 
        FROM "Teacher" 
        WHERE "userId" = auth.uid()::text
        UNION
        SELECT DISTINCT "branchId" 
        FROM "Employee" 
        WHERE "userId" = auth.uid()::text
      )
    )
  );

-- Enable realtime for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE "Conversation";
ALTER PUBLICATION supabase_realtime ADD TABLE "ChatMessage";

-- Create indexes for performance with realtime
CREATE INDEX IF NOT EXISTS "idx_conversation_branch_realtime" ON "Conversation" ("branchId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "idx_chatmessage_conversation_realtime" ON "ChatMessage" ("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_conversation_participant_realtime" ON "Conversation" ("participantPhone", "branchId");

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS "idx_teacher_userid_branch" ON "Teacher" ("userId", "branchId");
CREATE INDEX IF NOT EXISTS "idx_employee_userid_branch" ON "Employee" ("userId", "branchId");

-- Grant necessary permissions for realtime
GRANT SELECT, INSERT, UPDATE ON "Conversation" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "ChatMessage" TO authenticated; 