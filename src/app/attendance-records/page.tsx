"use client";

import { AttendanceRecords } from "@/components/attendance/attendance-records";
import { AppLayout } from "@/components/layout/app-layout";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function AttendanceRecordsPage() {
  return (
    <PageWrapper>
      <AttendanceRecords />
    </PageWrapper>
  );
} 