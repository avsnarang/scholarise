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
  const [showLoading, setShowLoading] = useState(false);
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);

  // Show global loading when session changes
  useEffect(() => {
    if (isLoading) {
      globalLoading.show("Loading session data...");
    } else if (previousSessionId && previousSessionId !== currentSessionId) {
      globalLoading.show("Switching session...");
      
      // Hide loading after a delay
      const timer = setTimeout(() => {
        globalLoading.hide();
        setShowLoading(false);
      }, 1000);
      
      setShowLoading(true);
      return () => clearTimeout(timer);
    } else if (!showLoading) {
      globalLoading.hide();
    }
    
    setPreviousSessionId(currentSessionId);
  }, [currentSessionId, previousSessionId, isLoading, showLoading, globalLoading]);

  return <>{children}</>;
}
