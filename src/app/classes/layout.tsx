"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="classes" description="classes page">
      {children}
    </AppLayout>
  );
}
