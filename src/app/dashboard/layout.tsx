"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { AppLayout } from "@/components/layout/app-layout";

type UserRole = "SuperAdmin" | "Admin" | "Teacher" | "Student" | "Employee";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const { setCurrentBranchId } = useBranchContext();

  useEffect(() => {
    const handleBranchSelection = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const userRole = user.role as UserRole;
        const assignedBranchId = user.branchId as string;

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
  }, [isAuthenticated, user, setCurrentBranchId]);

  // You might want to show a loading state while the branch is being selected
  if (!isAuthenticated) {
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