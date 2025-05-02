"use client"

import { AppLayout } from "@/components/layout/app-layout";

export default function AttendanceMarkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Attendance Marker" description="Mark student attendance">
      {children}
    </AppLayout>
  );
} 