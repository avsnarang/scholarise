"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { WhatsAppChatLayout } from "@/components/chat/whatsapp-chat-layout";
import { WhatsAppChat } from "@/components/chat/whatsapp-chat";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";

function SimpleChatPageContent() {
  const { hasPermission } = usePermissions();
  const { currentBranchId } = useBranchContext();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to trigger refresh of conversation data
  const handleMetadataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Check permissions and branch access
  if (!currentBranchId) {
    return (
      <WhatsAppChatLayout
        selectedConversationId={selectedConversationId}
        onConversationSelect={setSelectedConversationId}
        onMetadataRefresh={handleMetadataRefresh}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Branch Selected</h3>
            <p className="text-gray-500 mb-4">
              Please select a branch to access WhatsApp conversations.
            </p>
            <Link href="/communication">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Communication
              </Button>
            </Link>
          </Card>
        </div>
      </WhatsAppChatLayout>
    );
  }

  if (!hasPermission("view_communication_logs")) {
    return (
      <WhatsAppChatLayout
        selectedConversationId={selectedConversationId}
        onConversationSelect={setSelectedConversationId}
        onMetadataRefresh={handleMetadataRefresh}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-500 mb-4">
              You don't have permission to view WhatsApp conversations.
            </p>
            <Link href="/communication">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Communication
              </Button>
            </Link>
          </Card>
        </div>
      </WhatsAppChatLayout>
    );
  }

  return (
    <WhatsAppChatLayout
      selectedConversationId={selectedConversationId}
      onConversationSelect={setSelectedConversationId}
      onMetadataRefresh={handleMetadataRefresh}
    >
      <WhatsAppChat 
        conversationId={selectedConversationId}
        refreshTrigger={refreshTrigger}
      />
    </WhatsAppChatLayout>
  );
}
// Dynamically import to disable SSR completely
const DynamicSimpleChatPageContent = dynamic(() => Promise.resolve(SimpleChatPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function SimpleChatPage() {
  return <DynamicSimpleChatPageContent />;
} 