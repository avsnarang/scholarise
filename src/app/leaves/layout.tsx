"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="Leave Management" description="Manage leave applications and policies">
      {children}
    </AppLayout>
  );
} 