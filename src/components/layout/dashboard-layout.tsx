"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./header";
import { useAuth } from "@/hooks/useAuth";
import { BranchProvider } from "@/hooks/useBranchContext";
import { AcademicSessionProvider } from "@/hooks/useAcademicSessionContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { BranchLoadingWrapper } from "./branch-loading-wrapper";
import { SessionLoadingWrapper } from "./session-loading-wrapper";
import { cn } from "@/lib/utils";
import { 
  SidebarProvider, 
  SidebarInset 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { requireAuth, isLoading } = useAuth();
  const router = useRouter();

  // Initialize analytics
  useAnalytics();

  // Protect the route
  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BranchProvider>
      <AcademicSessionProvider>
        <BranchLoadingWrapper>
          <SidebarProvider
            style={{
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties}
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <Header />
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <SessionLoadingWrapper>
                      {children}
                    </SessionLoadingWrapper>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </BranchLoadingWrapper>
      </AcademicSessionProvider>
    </BranchProvider>
  );
}
