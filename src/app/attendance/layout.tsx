"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [pageTitle, setPageTitle] = useState("Attendance");
  const [pageDescription, setPageDescription] = useState("Manage attendance for teachers and students");

  useEffect(() => {
    // Set title and description based on the pathname
    if (pathname.includes("/attendance/students")) {
      setPageTitle("Student Attendance");
      setPageDescription("Mark and manage student attendance");
      document.title = "Student Attendance | ScholaRise ERP";
    } else if (pathname.includes("/attendance/teachers") || pathname.includes("/attendance/staff")) {
      setPageTitle("Staff Attendance");
      setPageDescription("Mark and manage staff attendance");
      document.title = "Staff Attendance | ScholaRise ERP";
    } else if (pathname.includes("/attendance/reports")) {
      setPageTitle("Attendance Reports");
      setPageDescription("View and generate attendance reports");
      document.title = "Attendance Reports | ScholaRise ERP";
    } else if (pathname.includes("/attendance/settings")) {
      setPageTitle("Attendance Settings");
      setPageDescription("Configure attendance system settings");
      document.title = "Attendance Settings | ScholaRise ERP";
    } else {
      setPageTitle("Attendance");
      setPageDescription("Manage attendance for teachers and students");
      document.title = "Attendance | ScholaRise ERP";
    }
  }, [pathname]);

  return (
    <AppLayout title={pageTitle} description={pageDescription}>
      {children}
    </AppLayout>
  );
} 