"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="settings/location-config" description="settings/location-config page">
      {children}
    </AppLayout>
  );
}
