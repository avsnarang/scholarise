"use client";


import dynamic from "next/dynamic";
import { AttendanceMarker } from "@/components/attendance/attendance-marker";
import { PageWrapper } from "@/components/layout/page-wrapper";

function AttendanceMarkerPageContent() {
  return (
    <PageWrapper>
      <AttendanceMarker />
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicAttendanceMarkerPageContent = dynamic(() => Promise.resolve(AttendanceMarkerPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function AttendanceMarkerPage() {
  return <DynamicAttendanceMarkerPageContent />;
} 