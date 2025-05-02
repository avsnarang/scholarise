"use client";

import { useState, useEffect } from 'react';
import { useBranchContext } from './useBranchContext';

/**
 * Custom hook to track branch changes and loading state
 * @returns An object with isChangingBranch flag
 */
export function useBranchChangeLoading() {
  const { currentBranchId, isLoading } = useBranchContext();
  const [previousBranchId, setPreviousBranchId] = useState<string | null>(null);
  const [isChangingBranch, setIsChangingBranch] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If this is the first load or branch context is loading, show loading state
    if (isLoading) {
      setIsChangingBranch(true);
      return;
    }

    // If branch ID changed, show loading state
    if (previousBranchId !== null && previousBranchId !== currentBranchId) {
      setIsChangingBranch(true);

      // Clear any existing timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      // Set a minimum loading time to prevent flickering, but keep it short
      const timeout = setTimeout(() => {
        setIsChangingBranch(false);
      }, 500); // Reduced minimum loading time to 500ms for faster response

      setLoadingTimeout(timeout);
    } else if (previousBranchId === null && currentBranchId !== null) {
      // Initial load complete
      setIsChangingBranch(false);
    }

    // Update previous branch ID
    setPreviousBranchId(currentBranchId);

    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [currentBranchId, previousBranchId, isLoading, loadingTimeout]);

  return { isChangingBranch };
}
