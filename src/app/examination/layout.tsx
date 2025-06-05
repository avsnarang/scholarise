"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/examination",
    description: "Overview of examination activities",
  },
  {
    title: "Exam Types",
    href: "/examination/exam-types",
    description: "Manage exam types (Unit Test, Mid Term, Final, etc.)",
  },
  {
    title: "Exam Configuration",
    href: "/examination/exam-config",
    description: "Configure exams for classes and subjects",
  },
  {
    title: "Date Sheet",
    href: "/examination/schedule",
    description: "Create and manage exam schedules",
  },
  {
    title: "Seating Plans",
    href: "/examination/seating-plans",
    description: "Generate and manage exam seating arrangements",
  },
  {
    title: "Marks Entry",
    href: "/examination/marks-entry",
    description: "Enter and manage exam marks",
  },
  {
    title: "Assessment Categories",
    href: "/examination/assessment-categories",
    description: "Manage assessment types (Subject Enrichment, Projects, etc.)",
  },
  {
    title: "Assessment Configuration",
    href: "/examination/assessment-config",
    description: "Configure assessments for classes",
  },
  {
    title: "Assessment Marks",
    href: "/examination/assessment-marks",
    description: "Enter assessment marks and comments",
  },
  {
    title: "Grade Scales",
    href: "/examination/grade-scales",
    description: "Configure grading scales and ranges",
  },
  {
    title: "Reports",
    href: "/examination/reports",
    description: "View exam reports and analytics",
  },
];

interface ExaminationLayoutProps {
  children: React.ReactNode;
}

export default function ExaminationLayout({ children }: ExaminationLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Examination</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage exams and assessments
          </p>
        </div>
        
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <NavigationItem key={item.href} {...item} />
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function NavigationItem({ title, href, description }: {
  title: string;
  href: string;
  description: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/examination" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "block p-3 rounded-lg transition-colors",
        isActive
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      <div className="font-medium">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </Link>
  );
} 