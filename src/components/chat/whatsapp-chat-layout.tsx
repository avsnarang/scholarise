"use client";

import React from "react";
import { WhatsAppSidebar } from "./whatsapp-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface WhatsAppChatLayoutProps {
  children: React.ReactNode;
  className?: string;
  selectedConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
}

export function WhatsAppChatLayout({ 
  children, 
  className, 
  selectedConversationId, 
  onConversationSelect 
}: WhatsAppChatLayoutProps) {
  return (
    <div className={cn("h-full bg-background flex", className)}>
      <SidebarProvider defaultOpen={true}>
        <div className="w-80 flex-shrink-0">
          <WhatsAppSidebar 
            selectedConversationId={selectedConversationId}
            onConversationSelect={onConversationSelect}
          />
        </div>
        <div className="flex-1 min-w-0">
          <SidebarInset className="flex flex-col h-full w-full">
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
} 