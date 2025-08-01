"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { AppLayout } from "@/components/layout/app-layout";

export default function MoneyCollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const { setCurrentBranchId, currentBranchId } = useBranchContext();

  useEffect(() => {
    const handleBranchSelection = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const userRole = user.role;
        const assignedBranchId = user.branchId;

        console.log("MoneyCollectionLayout - Current user role:", userRole);
        console.log("MoneyCollectionLayout - Assigned branch ID:", assignedBranchId);

        // If user is SuperAdmin, default to first branch
        if (userRole === "SuperAdmin") {
          const defaultBranchId = "1";
          console.log("MoneyCollectionLayout - Setting default branch for SuperAdmin:", defaultBranchId);
          setCurrentBranchId(defaultBranchId);
          return;
        }

        // For other roles, use their assigned branch
        if (!assignedBranchId) {
          console.error("No branch assigned to user");
          return;
        }

        console.log("MoneyCollectionLayout - Setting branch ID from user metadata:", assignedBranchId);
        setCurrentBranchId(assignedBranchId);
      } catch (error) {
        console.error("Error handling branch selection:", error);
        // Default to first branch in case of errors
        setCurrentBranchId("1");
      }
    };

    handleBranchSelection();
  }, [isAuthenticated, user, setCurrentBranchId]);

  // Log current branch ID after it might have changed
  useEffect(() => {
    console.log("MoneyCollectionLayout - Current branch ID after setup:", currentBranchId);
  }, [currentBranchId]);

  // Show loading state while the branch is being selected
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AppLayout 
      title="Money Collection" 
      description="Manage money collection from students"
    >
      {children}
    </AppLayout>
  );
} 