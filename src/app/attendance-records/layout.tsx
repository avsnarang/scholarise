"use client";

import { AppLayout } from "@/components/layout/app-layout";

export default function AttendanceRecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Attendance Records" description="View attendance records">
      {children}
    </AppLayout>
  );
} 