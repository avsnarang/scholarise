"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="admin/clerk-users" description="admin/clerk-users page">
      {children}
    </AppLayout>
  );
}
