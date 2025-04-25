import { type ReactNode } from "react";
import { useBranchChangeLoading } from "@/hooks/useBranchChangeLoading";
import { BranchLoadingOverlay } from "@/components/ui/branch-loading-overlay";

interface BranchLoadingWrapperProps {
  children: ReactNode;
}

export function BranchLoadingWrapper({ children }: BranchLoadingWrapperProps) {
  const { isChangingBranch } = useBranchChangeLoading();

  return (
    <>
      <BranchLoadingOverlay isLoading={isChangingBranch} />
      {children}
    </>
  );
}
