"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="attendance/mark" description="attendance/mark page">
      {children}
    </AppLayout>
  );
}
