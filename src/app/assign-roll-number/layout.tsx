"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="assign-roll-number" description="assign-roll-number page">
      {children}
    </AppLayout>
  );
}
