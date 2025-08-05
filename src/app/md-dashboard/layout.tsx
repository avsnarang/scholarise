"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [pageTitle, setPageTitle] = useState("Managing Director Dashboard");
  const [pageDescription, setPageDescription] = useState("Comprehensive overview of school operations and performance");

  useEffect(() => {
    // Set title based on the pathname
    if (pathname === "/md-dashboard") {
      setPageTitle("Managing Director Dashboard");
      setPageDescription("Comprehensive overview of school operations and performance");
      document.title = "Managing Director Dashboard | ScholaRise ERP";
    }
  }, [pathname]);

  return (
    <AppLayout title={pageTitle} description={pageDescription}>
      {children}
    </AppLayout>
  );
}