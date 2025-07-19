"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { BranchProvider } from "@/hooks/useBranchContext";
import { AcademicSessionProvider } from "@/hooks/useAcademicSessionContext";
import { SessionLoadingWrapper } from "@/components/layout/session-loading-wrapper";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-3 rounded-full bg-primary/10"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Loading Chat</h3>
            <p className="text-sm text-muted-foreground">Connecting to your conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BranchProvider>
      <AcademicSessionProvider>
        <div className="h-screen bg-background overflow-hidden">
          <SessionLoadingWrapper>
            <div className="h-full">
              {children}
            </div>
          </SessionLoadingWrapper>
        </div>
      </AcademicSessionProvider>
    </BranchProvider>
  );
} 