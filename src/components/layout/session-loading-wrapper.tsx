"use client";

import { useEffect, useState } from "react";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useGlobalLoading } from "@/providers/global-loading-provider";

interface SessionLoadingWrapperProps {
  children: React.ReactNode;
}

export function SessionLoadingWrapper({ children }: SessionLoadingWrapperProps) {
  const { isLoading, currentSessionId } = useAcademicSessionContext();
  const globalLoading = useGlobalLoading();
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);

  // Track previous session ID separately to avoid effect dependency issues
  useEffect(() => {
    setPreviousSessionId(currentSessionId);
  }, [currentSessionId]);

  // Show global loading when session changes
  useEffect(() => {
    if (isLoading) {
      globalLoading.show("Loading session data...");
      return;
    }

    // Check if session has actually changed
    const sessionChanged = previousSessionId !== null && previousSessionId !== currentSessionId;
    
    if (sessionChanged) {
      globalLoading.show("Switching session...");
      
      // Hide loading after a delay
      const timer = setTimeout(() => {
        globalLoading.hide();
      }, 800);
      
      return () => clearTimeout(timer);
    } else {
      // Normal case - just hide loading
      globalLoading.hide();
    }
  }, [currentSessionId, isLoading, previousSessionId]); // Removed globalLoading from dependencies

  return <>{children}</>;
}
