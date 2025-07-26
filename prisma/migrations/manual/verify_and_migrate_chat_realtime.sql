-- Verify and Migrate Existing Chat Data for Realtime
-- This script ensures all existing conversations and messages work with the new realtime system

-- Step 1: Check data integrity
DO $$
DECLARE
    conversation_count INT;
    message_count INT;
    conversations_without_branch INT;
    conversations_with_invalid_branch INT;
    inactive_conversations INT;
BEGIN
    -- Count total conversations and messages
    SELECT COUNT(*) INTO conversation_count FROM "Conversation";
    SELECT COUNT(*) INTO message_count FROM "ChatMessage";
    
    -- Count conversations without valid branchId
    SELECT COUNT(*) INTO conversations_without_branch 
    FROM "Conversation" c 
    WHERE c."branchId" IS NULL OR c."branchId" = '';
    
    -- Count conversations with invalid branchId (not in Branch table)
    SELECT COUNT(*) INTO conversations_with_invalid_branch 
    FROM "Conversation" c 
    LEFT JOIN "Branch" b ON c."branchId" = b."id"
    WHERE b."id" IS NULL;
    
    -- Count inactive conversations
    SELECT COUNT(*) INTO inactive_conversations 
    FROM "Conversation" 
    WHERE "isActive" = false;
    
    -- Log the results
    RAISE NOTICE 'Chat Data Verification Results:';
    RAISE NOTICE '- Total Conversations: %', conversation_count;
    RAISE NOTICE '- Total Messages: %', message_count;
    RAISE NOTICE '- Conversations without branchId: %', conversations_without_branch;
    RAISE NOTICE '- Conversations with invalid branchId: %', conversations_with_invalid_branch;
    RAISE NOTICE '- Inactive conversations: %', inactive_conversations;
END $$;

-- Step 2: Fix conversations without branchId (assign to first available branch)
UPDATE "Conversation" 
SET "branchId" = (
    SELECT "id" FROM "Branch" WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "branchId" IS NULL OR "branchId" = '';

-- Step 3: Fix conversations with invalid branchId (assign to first available branch)
UPDATE "Conversation" 
SET "branchId" = (
    SELECT "id" FROM "Branch" WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "branchId" NOT IN (SELECT "id" FROM "Branch");

-- Step 4: Activate all conversations for realtime (optional - uncomment if needed)
-- UPDATE "Conversation" SET "isActive" = true WHERE "isActive" = false;

-- Step 5: Ensure all conversations have proper metadata for realtime
UPDATE "Conversation" 
SET 
    "lastMessageAt" = COALESCE("lastMessageAt", "updatedAt", "createdAt"),
    "lastMessageFrom" = COALESCE("lastMessageFrom", 'INCOMING'),
    "unreadCount" = COALESCE("unreadCount", 0)
WHERE "lastMessageAt" IS NULL OR "lastMessageFrom" IS NULL OR "unreadCount" IS NULL;

-- Step 6: Update conversation metadata from latest messages
UPDATE "Conversation" 
SET 
    "lastMessageAt" = latest_msg.latest_time,
    "lastMessageContent" = latest_msg.latest_content,
    "lastMessageFrom" = latest_msg.latest_direction
FROM (
    SELECT 
        cm."conversationId",
        MAX(cm."createdAt") as latest_time,
        (SELECT cm2."content" 
         FROM "ChatMessage" cm2 
         WHERE cm2."conversationId" = cm."conversationId" 
         ORDER BY cm2."createdAt" DESC 
         LIMIT 1) as latest_content,
        (SELECT cm2."direction" 
         FROM "ChatMessage" cm2 
         WHERE cm2."conversationId" = cm."conversationId" 
         ORDER BY cm2."createdAt" DESC 
         LIMIT 1) as latest_direction
    FROM "ChatMessage" cm
    GROUP BY cm."conversationId"
) latest_msg
WHERE "Conversation"."id" = latest_msg."conversationId";

-- Step 7: Update unread counts
UPDATE "Conversation" 
SET "unreadCount" = (
    SELECT COUNT(*)
    FROM "ChatMessage" cm
    WHERE cm."conversationId" = "Conversation"."id" 
    AND cm."direction" = 'INCOMING'
    AND cm."readAt" IS NULL
);

-- Step 8: Create indexes for better realtime performance if they don't exist
CREATE INDEX IF NOT EXISTS "idx_conversation_realtime_lookup" ON "Conversation" ("branchId", "isActive", "lastMessageAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_chatmessage_realtime_lookup" ON "ChatMessage" ("conversationId", "direction", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_chatmessage_unread" ON "ChatMessage" ("conversationId", "direction", "readAt");

-- Step 9: Verify the migration was successful
DO $$
DECLARE
    fixed_conversation_count INT;
    conversations_with_messages INT;
    total_unread_messages INT;
BEGIN
    -- Count conversations that should now work with realtime
    SELECT COUNT(*) INTO fixed_conversation_count 
    FROM "Conversation" c 
    JOIN "Branch" b ON c."branchId" = b."id"
    WHERE c."isActive" = true;
    
    -- Count conversations with messages
    SELECT COUNT(DISTINCT c."id") INTO conversations_with_messages
    FROM "Conversation" c
    JOIN "ChatMessage" cm ON cm."conversationId" = c."id";
    
    -- Count total unread messages
    SELECT SUM("unreadCount") INTO total_unread_messages FROM "Conversation";
    
    RAISE NOTICE 'Migration Verification Results:';
    RAISE NOTICE '- Conversations ready for realtime: %', fixed_conversation_count;
    RAISE NOTICE '- Conversations with messages: %', conversations_with_messages;
    RAISE NOTICE '- Total unread messages: %', COALESCE(total_unread_messages, 0);
    RAISE NOTICE 'Migration completed successfully!';
END $$; 