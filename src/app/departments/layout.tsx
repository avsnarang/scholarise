"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useBranchContext } from "@/hooks/useBranchContext";
import { AppLayout } from "@/components/layout/app-layout";

export default function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const { setCurrentBranchId } = useBranchContext();

  useEffect(() => {
    const handleBranchSelection = async () => {
      if (!isLoaded || !user) return;

      try {
        const userMetadata = user.publicMetadata;
        const userRole = userMetadata.role as string;
        const assignedBranchId = userMetadata.branchId as string;

        // If user is SuperAdmin, default to headquarters branch
        if (userRole === "SuperAdmin") {
          const defaultBranchId = "1"; // Default branch
          setCurrentBranchId(defaultBranchId);
          return;
        }

        // For other roles, use their assigned branch
        if (!assignedBranchId) {
          console.error("No branch assigned to user");
          return;
        }

        setCurrentBranchId(assignedBranchId);
      } catch (error) {
        console.error("Error handling branch selection:", error);
        // Default to main branch in case of errors
        setCurrentBranchId("1");
      }
    };

    handleBranchSelection();
  }, [isLoaded, user, setCurrentBranchId]);

  // Show loading state while the branch is being selected
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AppLayout title="Department Management" description="Manage school departments">
      {children}
    </AppLayout>
  );
} 