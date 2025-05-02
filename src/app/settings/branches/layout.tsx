"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="settings/branches" description="settings/branches page">
      {children}
    </AppLayout>
  );
}
