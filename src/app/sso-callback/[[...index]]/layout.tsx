"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="sso-callback/[[...index]]" description="sso-callback/[[...index]] page">
      {children}
    </AppLayout>
  );
}
