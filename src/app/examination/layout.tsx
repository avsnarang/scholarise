"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function ExaminationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Examination" description="Manage exams, assessments, and academic evaluations">
      {children}
    </AppLayout>
  );
} 