"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { SessionProvider } from "next-auth/react";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppLayout title="Attendance" description="Manage attendance for teachers and students">
        {children}
      </AppLayout>
    </SessionProvider>
  );
} 