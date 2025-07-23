"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function ERPManagerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Management Dashboard" description="Comprehensive system management and analytics">
      {children}
    </AppLayout>
  );
} 