"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function SalaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Salary Management" description="Manage salary structures and payroll">
      {children}
    </AppLayout>
  );
} 