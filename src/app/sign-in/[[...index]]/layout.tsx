"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="sign-in/[[...index]]" description="sign-in/[[...index]] page">
      {children}
    </AppLayout>
  );
}
