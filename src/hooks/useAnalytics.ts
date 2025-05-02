"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "./useAuth";

export function useAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    // Mock implementation - just log to console
    console.log(`Analytics event: ${eventName}`, properties);
  }, []);

  return { trackEvent };
}
