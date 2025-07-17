"use client";

import { AppLayout } from "@/components/layout/app-layout";
// SessionProvider no longer needed with Supabase auth

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout title="Attendance" description="Manage attendance for teachers and students">
      {children}
    </AppLayout>
  );
} 