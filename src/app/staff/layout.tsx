"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [pageTitle, setPageTitle] = useState("Staff Management");
  const [pageDescription, setPageDescription] = useState("Manage all staff in your institution");

  useEffect(() => {
    // Set title and description based on the pathname
    if (pathname === "/staff") {
      setPageTitle("Staff Dashboard");
      setPageDescription("Overview of all staff in your institution");
      document.title = "Staff Dashboard | ScholaRise ERP";
    } else {
      setPageTitle("Staff Management");
      setPageDescription("Manage all staff in your institution");
      document.title = "Staff Management | ScholaRise ERP";
    }
  }, [pathname]);

  return (
    <AppLayout title={pageTitle} description={pageDescription}>
      {children}
    </AppLayout>
  );
} 