import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/utils/api";

interface BranchLoadingWrapperProps {
  children: ReactNode;
}

export function BranchLoadingWrapper({ children }: BranchLoadingWrapperProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const { data: userBranches, isLoading: branchesLoading, isSuccess, isError } = api.branch.getUserBranches.useQuery();

  useEffect(() => {
    if (isSuccess && userBranches) {
      if (userBranches.length === 0) {
        router.push("/onboarding");
      }
      setIsLoading(false);
    } else if (isError) {
      setIsLoading(false);
      // Optionally, show a toast or log the error
      console.error("Failed to load user branches");
    }
  }, [userBranches, branchesLoading, isSuccess, isError, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
} 