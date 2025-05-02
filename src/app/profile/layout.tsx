"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="profile" description="profile page">
      {children}
    </AppLayout>
  );
}
