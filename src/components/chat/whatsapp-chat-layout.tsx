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
    <div className={cn("h-full bg-background", className)}>
      <SidebarProvider defaultOpen={true}>
        <WhatsAppSidebar 
          selectedConversationId={selectedConversationId}
          onConversationSelect={onConversationSelect}
        />
        <SidebarInset className="flex flex-col">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
} 