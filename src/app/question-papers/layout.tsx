"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function QuestionPapersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Question Papers" description="Manage question papers for exams">
      {children}
    </AppLayout>
  );
} 