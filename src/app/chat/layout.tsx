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

  // Chat loading is now handled by global loading overlay
  // Individual chat loading is handled at the component level

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