"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [pageTitle, setPageTitle] = useState("Employees");
  const [pageDescription, setPageDescription] = useState("Manage employees in ScholaRise ERP");

  useEffect(() => {
    // Set title and description based on the pathname
    if (pathname.includes("/employees/create")) {
      setPageTitle("Add New Employee");
      setPageDescription("Register a new employee in ScholaRise ERP");
      document.title = "Add New Employee | ScholaRise ERP";
    } else if (pathname.includes("/employees/") && pathname.includes("/edit")) {
      setPageTitle("Edit Employee");
      setPageDescription("Edit employee information");
      document.title = "Edit Employee | ScholaRise ERP";
    } else if (pathname.includes("/employees/") && pathname.split("/").length > 2) {
      setPageTitle("Employee Details");
      setPageDescription("View detailed employee information");
      document.title = "Employee Details | ScholaRise ERP";
    } else {
      setPageTitle("Employees");
      setPageDescription("Manage employees in ScholaRise ERP");
      document.title = "Employees | ScholaRise ERP";
    }
  }, [pathname]);

  return (
    <AppLayout title={pageTitle} description={pageDescription}>
      {children}
    </AppLayout>
  );
} 