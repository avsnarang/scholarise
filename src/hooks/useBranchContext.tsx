"use client";

import React, { useState, useEffect, createContext, useContext, Suspense } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/utils/api";
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

function BranchProviderContent({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get user-specific branches
  const {
    data: branches = [],
    isLoading: isBranchesLoading,
    error: branchesError,
  } = api.branch.getUserBranches.useQuery(undefined, {
    retry: 3,
    retryDelay: 1000,
  });

  // Get current branch details
  const {
    data: currentBranch,
    isLoading: isCurrentBranchLoading,
    error: currentBranchError,
  } = api.branch.getById.useQuery(
    { id: currentBranchId! },
    {
      enabled: !!currentBranchId,
      retry: 3,
      retryDelay: 1000,
    }
  );

  useEffect(() => {
    if (isBranchesLoading) {
      setIsLoading(true);
      return;
    }

    if (branchesError) {
      console.error('Branch fetch error:', branchesError);
      setIsLoading(false);
      return;
    }

    // Get branch from query parameter (highest priority)
    const branchId = searchParams?.get('branch') ?? null;
    
    // Get stored branch from localStorage
    const storedBranchId = typeof window !== 'undefined' ? localStorage.getItem('currentBranchId') : null;

    // Determine which branch ID to use
    const finalBranchId = branchId || storedBranchId || user?.branchId || (branches.length > 0 ? branches[0]?.id : null);

    if (finalBranchId) {
      setCurrentBranchId(finalBranchId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentBranchId', finalBranchId);
      }
    }

    setIsLoading(false);
  }, [searchParams, user?.branchId, branches, isBranchesLoading, branchesError]);

  const handleSetCurrentBranchId = (branchId: string) => {
    if (!branchId || branchId === currentBranchId) return;

    // Set the branch ID in state
    setCurrentBranchId(branchId);

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentBranchId', branchId);
    }

    // Update URL if not on settings page
    if (!pathname?.includes('/settings/')) {
      const newSearchParams = new URLSearchParams(searchParams?.toString() ?? '');
      newSearchParams.set('branch', branchId);
      router.push(`${pathname ?? '/'}?${newSearchParams.toString()}`);
    }
  };

  return React.createElement(BranchContext.Provider, {
    value: {
      currentBranchId,
      setCurrentBranchId: handleSetCurrentBranchId,
      currentBranch: currentBranch || null,
      isLoading: isLoading || isBranchesLoading,
    },
    children
  });
}

export function BranchProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading branch data...</div>}>
      <BranchProviderContent>{children}</BranchProviderContent>
    </Suspense>
  );
}
