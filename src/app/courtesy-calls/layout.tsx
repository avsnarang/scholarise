"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function CourtesyCallsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout 
      title="Courtesy Calls" 
      description="Manage courtesy call feedback and communication with parents"
    >
      {children}
    </AppLayout>
  );
} 