"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="Subjects" description="Manage subjects, student mappings, and class assignments">
      {children}
    </AppLayout>
  );
} 