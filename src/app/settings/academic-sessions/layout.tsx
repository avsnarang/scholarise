"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="settings/academic-sessions" description="settings/academic-sessions page">
      {children}
    </AppLayout>
  );
}
