"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  BookOpen,
  Users,
  Table,
  PlusCircle,
  Settings,
  UserCheck,
  School,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const subjectModules = [
  {
    title: "Manage Subjects",
    description: "Create, edit, and manage school subjects including optional subjects",
    icon: <BookOpen className="h-6 w-6" />,
    href: "/subjects/manage",
    disabled: false,
  },
  {
    title: "Teacher Assignments",
    description: "Assign teachers to subjects for different classes and sections",
    icon: <Users className="h-6 w-6" />,
    href: "/subjects/teacher-assignments",
    disabled: false,
  },
  {
    title: "Class Subject Mapping",
    description: "Assign mandatory subjects to entire classes",
    icon: <School className="h-6 w-6" />,
    href: "/subjects/class-mapping",
    disabled: false,
  },
  {
    title: "Student Subject Mapping",
    description: "Map optional subjects to individual students",
    icon: <UserCheck className="h-6 w-6" />,
    href: "/subjects/student-mapping",
    disabled: false,
  },
  {
    title: "Class Subject Overview",
    description: "View subject mappings for students in each class and section",
    icon: <Table className="h-6 w-6" />,
    href: "/subjects/class-overview",
    disabled: false,
  },
];

export default function SubjectsPage() {
  return (
    <PageWrapper
      title="Subjects"
      subtitle="Manage subjects, student mappings, and class assignments"
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold">Subject Management</h2>
          <p className="text-sm text-gray-500">
            Comprehensive subject management for your institution
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {subjectModules.map((module, index) => (
            <Link
              key={index}
              href={module.disabled ? "#" : module.href}
              className={`block ${
                module.disabled
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <Card className="h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00501B]/10 text-[#00501B]">
                      {module.icon}
                    </div>
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {module.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
} 