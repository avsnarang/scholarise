"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="classes/[id]/students" description="classes/[id]/students page">
      {children}
    </AppLayout>
  );
}
