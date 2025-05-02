"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="admin/fix-teacher-account" description="admin/fix-teacher-account page">
      {children}
    </AppLayout>
  );
}
