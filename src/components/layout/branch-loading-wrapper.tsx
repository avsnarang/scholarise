import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useGlobalLoading } from "@/providers/global-loading-provider";

interface BranchLoadingWrapperProps {
  children: ReactNode;
}

export function BranchLoadingWrapper({ children }: BranchLoadingWrapperProps) {
  const router = useRouter();
  const globalLoading = useGlobalLoading();
  const [isLoading, setIsLoading] = useState(true);
  
  const { data: userBranches, isLoading: branchesLoading, isSuccess, isError } = api.branch.getUserBranches.useQuery();

  useEffect(() => {
    if (branchesLoading || isLoading) {
      globalLoading.show("Loading user branches...");
    } else if (isSuccess && userBranches) {
      if (userBranches.length === 0) {
        globalLoading.show("Redirecting to onboarding...");
        router.push("/onboarding");
      } else {
        globalLoading.hide();
        setIsLoading(false);
      }
    } else if (isError) {
      globalLoading.hide();
      setIsLoading(false);
      console.error("Failed to load user branches");
    }
  }, [userBranches, branchesLoading, isSuccess, isError, router, isLoading, globalLoading]);

  return <>{children}</>;
} 