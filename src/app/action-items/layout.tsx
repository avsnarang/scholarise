"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function ActionItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Action Items" description="Manage and track action items from courtesy calls">
      {children}
    </AppLayout>
  );
}