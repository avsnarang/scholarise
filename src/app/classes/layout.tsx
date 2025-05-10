"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="Classes" description="Manage school classes and sections">
      {children}
    </AppLayout>
  );
}
