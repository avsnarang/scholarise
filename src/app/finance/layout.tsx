"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Finance" description="Manage all financial aspects of the institution.">
      {children}
    </AppLayout>
  );
} 