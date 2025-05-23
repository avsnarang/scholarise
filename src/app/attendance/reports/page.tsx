"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart, FileText, BarChart2, CalendarIcon, Calendar } from "lucide-react";
import Link from "next/link";

// TODO: Migrate from attendance/reports.tsx

export default function AttendanceReportsPage() {
  const reportTypes = [
    {
      title: "Staff Reports",
      description: "View and analyze staff attendance records and patterns",
      icon: FileText,
      href: "/attendance/reports/staff",
    },
    {
      title: "Student Reports",
      description: "Track student attendance statistics and trends",
      icon: FileBarChart,
      href: "/attendance/reports/students",
    },
    {
      title: "Analytics Dashboard",
      description: "Interactive charts and attendance trends",
      icon: BarChart2,
      href: "/attendance/reports/analytics",
    },
    {
      title: "Monthly Overview",
      description: "Monthly attendance summary reports",
      icon: Calendar,
      href: "/attendance/reports/monthly",
    },
  ];

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Attendance Reports</h1>
          <p className="mt-2 text-gray-500">
            View and analyze attendance data across your institution
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reportTypes.map((report, index) => (
            <Link key={index} href={report.href}>
              <Card className="h-full transition-all hover:border-[#00501B] hover:shadow-md">
                <CardHeader>
                  <report.icon className="h-8 w-8 text-[#00501B]" />
                  <CardTitle className="mt-4">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={buttonVariants({ variant: "outline", className: "w-full" })}>
                    View Reports
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
