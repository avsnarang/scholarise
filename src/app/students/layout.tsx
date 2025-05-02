"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [pageTitle, setPageTitle] = useState("Students");
  const [pageDescription, setPageDescription] = useState("Manage students in ScholaRise ERP");

  useEffect(() => {
    // Set title and description based on the pathname
    if (pathname.includes("/students/create")) {
      setPageTitle("Add New Student");
      setPageDescription("Register a new student in ScholaRise ERP");
      document.title = "Add New Student | ScholaRise ERP";
    } else if (pathname.includes("/students/") && pathname.includes("/edit")) {
      setPageTitle("Edit Student");
      setPageDescription("Edit student information");
      document.title = "Edit Student | ScholaRise ERP";
    } else if (pathname.includes("/students/") && pathname.split("/").length > 2) {
      setPageTitle("Student Details");
      setPageDescription("View detailed student information");
      document.title = "Student Details | ScholaRise ERP";
    } else {
      setPageTitle("Students");
      setPageDescription("Manage students in ScholaRise ERP");
      document.title = "Students | ScholaRise ERP";
    }
  }, [pathname]);

  return (
    <AppLayout title={pageTitle} description={pageDescription}>
      {children}
    </AppLayout>
  );
}
