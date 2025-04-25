import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import React from "react";
import { useRouter } from "next/router";
import { api } from "@/utils/api";
import { optimizedQueries } from "./useOptimizedQuery";
import { queryCache } from "@/utils/query-cache";
import { useAuth } from "./useAuth";

interface BranchContextType {
  currentBranchId: string | null;
  setCurrentBranchId: (branchId: string) => void;
  currentBranch: {
    id: string;
    name: string;
    code: string;
  } | null;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType>({
  currentBranchId: null,
  setCurrentBranchId: () => {},
  currentBranch: null,
  isLoading: true,
});

export const useBranchContext = () => useContext(BranchContext);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use optimized queries with caching and better error handling
  const {
    data: branches,
    error: branchesError,
    isLoading: isBranchesLoading,
    refetch: refetchBranches
  } = api.branch.getAll.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Error fetching branches:', error);
      // Attempt to refetch after a delay
      setTimeout(() => {
        console.log('Retrying branch fetch...');
        void refetchBranches();
      }, 2000);
    }
  });

  const {
    data: currentBranch,
    error: currentBranchError,
    isLoading: isCurrentBranchLoading,
    refetch: refetchCurrentBranch
  } = api.branch.getById.useQuery(
    { id: currentBranchId || undefined },
    {
      enabled: !!currentBranchId,
      retry: 3,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      onError: (error) => {
        console.error(`Error fetching branch with ID ${currentBranchId}:`, error);
        // Attempt to refetch after a delay
        setTimeout(() => {
          console.log('Retrying current branch fetch...');
          void refetchCurrentBranch();
        }, 2000);
      }
    }
  );

  useEffect(() => {
    // Only proceed if we're not already loading branches
    if (isBranchesLoading) {
      console.log('Branches are still loading...');
      setIsLoading(true);
      return;
    }

    // Handle branch fetch error
    if (branchesError) {
      console.error('Branch fetch error in effect:', branchesError);
      // Keep loading state true to indicate there's an issue
      setIsLoading(true);
      return;
    }

    console.log('Determining branch selection...');

    // First, check if there's a stored branch in localStorage
    const storedBranchId = localStorage.getItem('currentBranchId');
    console.log('Stored branch ID:', storedBranchId);

    // Get branch from query parameter (highest priority)
    const branchId = router.query.branch as string;
    console.log('Query branch ID:', branchId);

    if (branchId) {
      console.log('Using branch ID from query:', branchId);
      setCurrentBranchId(branchId);
      localStorage.setItem('currentBranchId', branchId);
      setIsLoading(false);
      return;
    }

    // If no branch in query, use stored branch (second priority)
    if (storedBranchId) {
      console.log('Using stored branch ID:', storedBranchId);
      setCurrentBranchId(storedBranchId);
      setIsLoading(false);
      return;
    }

    // If no stored branch, use user's default branch (third priority)
    if (user?.branchId) {
      console.log('Using user default branch ID:', user.branchId);
      setCurrentBranchId(user.branchId);
      localStorage.setItem('currentBranchId', user.branchId);
      setIsLoading(false);
      return;
    }

    // If user has no default branch, use the first available branch (lowest priority)
    if (branches && branches.length > 0) {
      // Use the actual ID from the database
      const firstBranchId = branches[0]!.id;
      console.log('Using first available branch ID:', firstBranchId);
      setCurrentBranchId(firstBranchId);
      localStorage.setItem('currentBranchId', firstBranchId);
      setIsLoading(false);
      return;
    }

    console.log('No branch available, setting loading to false');
    setIsLoading(false);
  }, [router.query.branch, user?.branchId, branches, isBranchesLoading, branchesError]);

  const handleSetCurrentBranchId = (branchId: string) => {
    console.log('BranchContext handleSetCurrentBranchId called with:', branchId);

    if (!branchId || branchId === currentBranchId) {
      console.log('Branch ID is empty or unchanged, skipping update');
      return;
    }

    console.log('Setting current branch ID to:', branchId);

    // Set the branch ID in state
    setCurrentBranchId(branchId);

    // Store the branch ID in localStorage for persistence
    localStorage.setItem('currentBranchId', branchId);

    // Only update URL if we're not on a settings page
    if (!router.pathname.includes('/settings/')) {
      // Update the URL with the new branch ID
      const currentPath = router.pathname;
      const query = { ...router.query, branch: branchId };

      console.log('Updating URL with query:', query);

      // Use setTimeout to avoid router conflicts
      setTimeout(() => {
        try {
          router.push({
            pathname: currentPath,
            query,
          }, undefined, { shallow: true });
        } catch (error) {
          console.error('Error updating URL:', error);
        }
      }, 0);
    } else {
      console.log('Skipping URL update for settings page');
    }
  };

  // Combine loading states
  const combinedIsLoading = isLoading || isBranchesLoading || isCurrentBranchLoading;

  // Combine error states
  const hasError = !!branchesError || !!currentBranchError;

  // Log the current state for debugging
  useEffect(() => {
    console.log('BranchContext state:', {
      currentBranchId,
      currentBranch,
      isLoading: combinedIsLoading,
      hasError,
      branchesError,
      currentBranchError
    });
  }, [currentBranchId, currentBranch, combinedIsLoading, hasError, branchesError, currentBranchError]);

  return (
    React.createElement(BranchContext.Provider, {
      value: {
        currentBranchId,
        setCurrentBranchId: handleSetCurrentBranchId,
        currentBranch: currentBranch || null,
        isLoading: combinedIsLoading,
      }
    }, children)
  );
}
