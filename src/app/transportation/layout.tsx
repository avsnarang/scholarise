"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function TransportationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Transportation" description="Manage school transportation including buses, routes, stops, and student assignments">
      {children}
    </AppLayout>
  );
} 