"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use optimized queries with caching and better error handling
  const {
    data: branchesData,
    error: branchesError,
    isLoading: isBranchesLoading,
    refetch: refetchBranches
  } = api.branch.getAll.useQuery(undefined, {
    enabled: true, // Always enabled to ensure branches load
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: 1000
  });

  // Explicitly ensure branches is always an array
  const branches = Array.isArray(branchesData) ? branchesData : [];

  const {
    data: currentBranch,
    error: currentBranchError,
    isLoading: isCurrentBranchLoading,
    refetch: refetchCurrentBranch
  } = api.branch.getById.useQuery(
    { id: currentBranchId || "" },
    {
      enabled: !!currentBranchId && currentBranchId.trim() !== "",
      retry: 3,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true
    }
  );

  // Separate effect for debugging branch data
  useEffect(() => {
    if (branchesData) {
      console.log('Branch data fetched successfully:', Array.isArray(branchesData) ? `${branchesData.length} branches` : typeof branchesData);
      if (!Array.isArray(branchesData)) {
        console.error('Error: Expected branches to be an array but got:', typeof branchesData);
      }
    }
    if (branchesError) {
      console.error('Error fetching branches in useBranchContext:', branchesError);
    }
  }, [branchesData, branchesError]);

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

    // Make sure branches is an array (using our guaranteed array from above)
    console.log(`Processing ${branches.length} branches`);

    // First, check if there's a stored branch in localStorage
    let storedBranchId: string | null = null;
    if (typeof window !== 'undefined') {
      storedBranchId = localStorage.getItem('currentBranchId');
    }
    console.log('Stored branch ID:', storedBranchId);

    // Get branch from query parameter (highest priority)
    const branchId = searchParams?.get('branch') ?? null;
    console.log('Query branch ID:', branchId);

    if (branchId) {
      console.log('Using branch ID from query:', branchId);
      setCurrentBranchId(branchId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentBranchId', branchId);
      }
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentBranchId', user.branchId);
      }
      setIsLoading(false);
      return;
    }

    // If user has no default branch, use the first available branch (lowest priority)
    if (branches.length > 0) {
      // Use the actual ID from the database
      const firstBranchId = branches[0]!.id;
      console.log('Using first available branch ID:', firstBranchId);
      setCurrentBranchId(firstBranchId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentBranchId', firstBranchId);
      }
      setIsLoading(false);
      return;
    }

    console.log('No branch available, setting loading to false');
    setIsLoading(false);
  }, [searchParams, user?.branchId, branches, isBranchesLoading, branchesError]);

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
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentBranchId', branchId);
    }

    // Only update URL if we're not on a settings page
    if (!pathname?.includes('/settings/')) {
      // Create new URLSearchParams with the branch
      const newSearchParams = new URLSearchParams(searchParams?.toString() ?? '');
      newSearchParams.set('branch', branchId);
      
      // Navigate to the same path but with the new search params
      router.push(`${pathname ?? '/'}?${newSearchParams.toString()}`);
    } else {
      console.log('Skipping URL update for settings page');
    }
  };

  // Combine loading states
  const combinedIsLoading = isLoading || isBranchesLoading || isCurrentBranchLoading;

  // Combine error states
  const hasError = !!branchesError || !!currentBranchError;

  // Log the current state for debugging - KEEP THIS DEPENDENCY ARRAY CONSTANT
  useEffect(() => {
    console.log('BranchContext state:', {
      currentBranchId,
      currentBranch: currentBranch || null,
      isLoading: combinedIsLoading,
      hasError,
      branchesError: branchesError ? (branchesError instanceof Error ? branchesError.message : 'Unknown error') : null,
      currentBranchError: currentBranchError ? (currentBranchError instanceof Error ? currentBranchError.message : 'Unknown error') : null
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
