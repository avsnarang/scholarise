"use client";

import { useEffect } from "react";
import { useGlobalLoading } from "@/providers/global-loading-provider";

/**
 * Hook to easily manage global loading state based on conditions
 * @param isLoading - Boolean indicating if loading should be shown
 * @param message - Optional message to display while loading
 */
export function useLoadingState(isLoading: boolean, message: string = "Loading...") {
  const globalLoading = useGlobalLoading();

  useEffect(() => {
    if (isLoading) {
      globalLoading.show(message);
    } else {
      globalLoading.hide();
    }
  }, [isLoading, message, globalLoading]);
}

/**
 * Hook for async operations with loading state
 * @param operation - Async function to execute
 * @param message - Optional message to display while loading
 * @returns Function to execute the operation with automatic loading state
 */
export function useAsyncWithLoading() {
  const globalLoading = useGlobalLoading();

  return async <T>(
    operation: () => Promise<T>,
    message: string = "Processing..."
  ): Promise<T> => {
    try {
      globalLoading.show(message);
      const result = await operation();
      return result;
    } finally {
      globalLoading.hide();
    }
  };
}