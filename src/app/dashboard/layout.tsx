"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useBranchContext } from "@/hooks/useBranchContext";
import { AppLayout } from "@/components/layout/app-layout";

type UserRole = "SuperAdmin" | "Admin" | "Teacher" | "Student" | "Employee";

export default function DashboardLayout({
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
        const userRole = userMetadata.role as UserRole;
        const assignedBranchId = userMetadata.branchId as string;

        // If user is SuperAdmin, default to Paonta Sahib branch
        if (userRole === "SuperAdmin") {
          const defaultBranchId = "1"; // Paonta Sahib branch
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
        // Default to Paonta Sahib branch in case of errors
        setCurrentBranchId("1");
      }
    };

    handleBranchSelection();
  }, [isLoaded, user, setCurrentBranchId]);

  // You might want to show a loading state while the branch is being selected
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AppLayout title="Dashboard" description="ScholaRise ERP Dashboard">
      {children}
    </AppLayout>
  );
} 