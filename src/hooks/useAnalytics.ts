import { useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "./useAuth";

export function useAnalytics() {
  const router = useRouter();
  const { user } = useAuth();

  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    // Mock implementation - just log to console
    console.log(`Analytics event: ${eventName}`, properties);
  }, []);

  return { trackEvent };
}
