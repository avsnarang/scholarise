"use client";

import React from "react";
import { WhatsAppSidebar } from "./whatsapp-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface WhatsAppChatLayoutProps {
  children: React.ReactNode;
  className?: string;
  selectedConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onMetadataRefresh?: () => void; // Add callback for metadata refresh
}

export function WhatsAppChatLayout({ 
  children, 
  className, 
  selectedConversationId, 
  onConversationSelect,
  onMetadataRefresh
}: WhatsAppChatLayoutProps) {
  // Load saved layout from localStorage
  const getSavedLayout = (): number[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat-panel-layout');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 2) {
            return parsed;
          }
        } catch (e) {
          // Invalid JSON, use defaults
        }
      }
    }
    return [20, 80]; // Default layout - 15% sidebar, 85% content
  };

  const defaultLayout = getSavedLayout();

  return (
    <div className={cn("h-full bg-background", className)}>
      <ResizablePanelGroup 
        direction="horizontal" 
        className="h-full"
        onLayout={(sizes) => {
          // Persist the layout to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('chat-panel-layout', JSON.stringify(sizes));
          }
        }}
      >
        <ResizablePanel 
          defaultSize={defaultLayout[0]} 
          minSize={20} 
          maxSize={30}
          id="sidebar"
        >
          <WhatsAppSidebar 
            selectedConversationId={selectedConversationId}
            onConversationSelect={onConversationSelect}
            onMetadataRefresh={onMetadataRefresh}
          />
        </ResizablePanel>
        <ResizableHandle 
          withHandle 
          className="bg-border hover:bg-primary/20 active:bg-primary/30 transition-colors duration-200 group"
        />
        <ResizablePanel 
          defaultSize={defaultLayout[1]} 
          minSize={60}
          id="content"
          className="overflow-hidden"
        >
          <div className="flex flex-col h-full w-full bg-background">
            {children}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 