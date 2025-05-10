"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Building,
  Calendar,
  MapPin,
  BookOpen,
  Settings,
  School,
  Users,
  CreditCard,
  Bell,
  Shield,
  UserCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const settingsGroups = [
  {
    title: "School Management",
    description: "Manage your school's branches, classes, and academic sessions",
    items: [
      {
        title: "Branches",
        description: "Manage school branches and locations",
        icon: <Building className="h-6 w-6" />,
        href: "/settings/branches",
      },
      {
        title: "Academic Sessions",
        description: "Configure academic years and terms",
        icon: <Calendar className="h-6 w-6" />,
        href: "/settings/academic-sessions",
      },
      {
        title: "Classes",
        description: "Manage school classes and sections",
        icon: <School className="h-6 w-6" />,
        href: "/settings/classes",
      },
      {
        title: "Subjects",
        description: "Manage school subjects and curriculum",
        icon: <BookOpen className="h-6 w-6" />,
        href: "/settings/subjects",
      },
    ],
  },
  {
    title: "Attendance",
    description: "Configure attendance settings and policies",
    items: [
      {
        title: "Attendance Configuration",
        description: "Manage attendance locations, devices, windows, and types",
        icon: <Settings className="h-6 w-6" />,
        href: "/settings/attendance-config",
      },
    ],
  },
  {
    title: "User Management",
    description: "Manage users, roles, and permissions",
    items: [
      {
        title: "Users & Permissions",
        description: "Manage user accounts and access rights",
        icon: <Shield className="h-6 w-6" />,
        href: "/settings/users",
        disabled: true,
      },
      {
        title: "Staff Profiles",
        description: "Manage teacher and staff profiles",
        icon: <UserCircle className="h-6 w-6" />,
        href: "/settings/staff",
        disabled: true,
      },
    ],
  },
  {
    title: "System Configuration",
    description: "Configure system-wide settings",
    items: [
      {
        title: "Notifications",
        description: "Configure notification preferences",
        icon: <Bell className="h-6 w-6" />,
        href: "/settings/notifications",
        disabled: true,
      },
      {
        title: "Billing & Subscription",
        description: "Manage billing and subscription details",
        icon: <CreditCard className="h-6 w-6" />,
        href: "/settings/billing",
        disabled: true,
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Settings</h1>
          <p className="mt-2 text-gray-500">
            Configure and manage your school's settings and preferences
          </p>
        </div>

        <div className="space-y-8">
          {settingsGroups.map((group, groupIndex) => (
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
