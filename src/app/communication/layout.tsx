"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function CommunicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Communication" description="Manage WhatsApp messages and communication">
      {children}
    </AppLayout>
  );
} 