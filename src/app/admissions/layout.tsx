"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const [pageTitle, setPageTitle] = useState("Admissions");
  const [pageDescription, setPageDescription] = useState("Manage student admissions and inquiries");

  useEffect(() => {
    // Set title and description based on the pathname
    if (pathname.includes("/admissions/dashboard")) {
      setPageTitle("Admissions Dashboard");
      setPageDescription("Overview of admission inquiries, registrations, and analytics");
      document.title = "Admissions Dashboard | ScholaRise ERP";
    } else if (pathname.includes("/admissions/inquiries")) {
      setPageTitle("Admission Inquiries");
      setPageDescription("Manage and track admission inquiries");
      document.title = "Admission Inquiries | ScholaRise ERP";
    } else if (pathname.includes("/admissions/applications")) {
      setPageTitle("Admission Applications");
      setPageDescription("Process and review admission applications");
      document.title = "Admission Applications | ScholaRise ERP";
    } else if (pathname.includes("/admissions/register")) {
      setPageTitle("Student Registration");
      setPageDescription("Register new students for admission");
      document.title = "Student Registration | ScholaRise ERP";
    } else if (pathname.includes("/admissions/staff")) {
      setPageTitle("Admissions Staff");
      setPageDescription("Manage admissions team and assignments");
      document.title = "Admissions Staff | ScholaRise ERP";
    } else if (pathname.includes("/admissions/settings")) {
      setPageTitle("Admissions Settings");
      setPageDescription("Configure admission preferences and requirements");
      document.title = "Admissions Settings | ScholaRise ERP";
    } else {
      setPageTitle("Admissions");
      setPageDescription("Manage student admissions and inquiries");
      document.title = "Admissions | ScholaRise ERP";
    }
  }, [pathname]);

  return (
    <AppLayout title={pageTitle} description={pageDescription}>
      {children}
    </AppLayout>
  );
} 