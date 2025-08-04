"use client";

import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/layout/header";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { BranchProvider } from "@/hooks/useBranchContext";
import { AcademicSessionProvider } from "@/hooks/useAcademicSessionContext";
import { SessionLoadingWrapper } from "@/components/layout/session-loading-wrapper";
import { Breadcrumbs } from "@/components/breadcrumbs";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AppLayout({ 
  children, 
  title = "ScholaRise ERP", 
  description = "School Management System"
}: AppLayoutProps) {
  const { isLoading } = useAuth();

  // App loading is now handled by global loading overlay
  // Individual page loading is handled at the component level

  return (
    <>
      <BranchProvider>
        <AcademicSessionProvider>
          <SidebarProvider
            defaultOpen={true}
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
                  <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                    <Breadcrumbs />
                    <SessionLoadingWrapper>
                      {children}
                    </SessionLoadingWrapper>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </AcademicSessionProvider>
      </BranchProvider>
    </>
  );
} 