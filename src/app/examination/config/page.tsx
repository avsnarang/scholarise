"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Calendar,
  ClipboardCheck,
  FileText,
  BarChart3,
  Target,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const examinationGroups = [
  {
    title: "Assessment Configuration",
    description: "Manage assessment schemas, grading, and evaluation settings",
    items: [
      {
        title: "Assessment Schemas",
        description: "Create and manage assessment evaluation schemas",
        icon: <ClipboardCheck className="h-6 w-6" />,
        href: "/examination/assessment-schemas",
        disabled: false,
      },
      {
        title: "Grade Configuration",
        description: "Setup grading scales and grade boundaries",
        icon: <Target className="h-6 w-6" />,
        href: "/examination/grade-scales",
        disabled: false,
      },
      {
        title: "Term Configuration",
        description: "Configure academic terms and evaluation periods",
        icon: <Calendar className="h-6 w-6" />,
        href: "/examination/config/terms",
        disabled: false,
      },
    ],
  },

  {
    title: "Score & Results",
    description: "Enter scores, view results, and generate reports",
    items: [
      {
        title: "Score Entry",
        description: "Enter and manage student assessment scores",
        icon: <FileText className="h-6 w-6" />,
        href: "/examination/score-entry",
        disabled: false,
      },
      {
        title: "Results & Analytics",
        description: "View student results and performance analytics",
        icon: <BarChart3 className="h-6 w-6" />,
        href: "/examination/results-dashboard",
        disabled: false,
      },
      {
        title: "Report Cards",
        description: "Generate PDF report cards using templates",
        icon: <FileText className="h-6 w-6" />,
        href: "/examination/report-cards",
        disabled: false,
      },
      {
        title: "Reports",
        description: "Generate examination reports and transcripts",
        icon: <FileText className="h-6 w-6" />,
        href: "/examination/reports",
        disabled: false,
      },
    ],
  },
];

export default function ExaminationConfigPage() {
  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Examination Configuration</h1>
          <p className="mt-2 text-gray-500">
            Configure and manage all examination-related settings and processes
          </p>
        </div>

        <div className="space-y-8">
          {examinationGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{group.title}</h2>
                <p className="text-sm text-gray-500">{group.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((item, itemIndex) => (
                  <Card 
                    key={itemIndex} 
                    className={`overflow-hidden transition-all duration-200 ${
                      item.disabled 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-md hover:border-[#00501B]/30 cursor-pointer'
                    }`}
                  >
                    {item.disabled ? (
                      <div className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-md font-medium">
                            {item.title}
                          </CardTitle>
                          <div className="text-[#00501B] bg-[#00501B]/10 p-2 rounded-full">
                            {item.icon}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription>{item.description}</CardDescription>
                          <div className="mt-3">
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              Coming Soon
                            </span>
                          </div>
                        </CardContent>
                      </div>
                    ) : (
                      <Link href={item.href} className="h-full block">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-md font-medium">
                            {item.title}
                          </CardTitle>
                          <div className="text-[#00501B] bg-[#00501B]/10 p-2 rounded-full">
                            {item.icon}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription>{item.description}</CardDescription>
                        </CardContent>
                      </Link>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
} 