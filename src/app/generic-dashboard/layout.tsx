"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function GenericDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Dashboard" description="General Access Dashboard">
      {children}
    </AppLayout>
  );
} 