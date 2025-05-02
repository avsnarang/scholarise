"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [pageTitle, setPageTitle] = useState("Teachers");
  const [pageDescription, setPageDescription] = useState("Manage teachers in ScholaRise ERP");

  useEffect(() => {
    // Set title and description based on the pathname
    if (pathname.includes("/teachers/create")) {
      setPageTitle("Add New Teacher");
      setPageDescription("Register a new teacher in ScholaRise ERP");
      document.title = "Add New Teacher | ScholaRise ERP";
    } else if (pathname.includes("/teachers/") && pathname.includes("/edit")) {
      setPageTitle("Edit Teacher");
      setPageDescription("Edit teacher information");
      document.title = "Edit Teacher | ScholaRise ERP";
    } else if (pathname.includes("/teachers/") && pathname.split("/").length > 2) {
      setPageTitle("Teacher Details");
      setPageDescription("View detailed teacher information");
      document.title = "Teacher Details | ScholaRise ERP";
    } else {
      setPageTitle("Teachers");
      setPageDescription("Manage teachers in ScholaRise ERP");
      document.title = "Teachers | ScholaRise ERP";
    }
  }, [pathname]);

  return (
    <AppLayout title={pageTitle} description={pageDescription}>
      {children}
    </AppLayout>
  );
}
