import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  Building,
  Users,
  UserCheck,
  Settings,
  ChevronRight,
  Calendar
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedPage } from "@/components/auth/protected-page";

type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const SettingsPage: PageWithLayout = () => {
  const settingsItems = [
    {
      title: "Branches",
      description: "Manage school branches and campuses",
      icon: <Building className="h-8 w-8 text-blue-500" />,
      href: "/settings/branches",
    },
    {
      title: "Academic Sessions",
      description: "Manage academic years and sessions",
      icon: <Calendar className="h-8 w-8 text-green-500" />,
      href: "/settings/academic-sessions",
    },
    {
      title: "Roles",
      description: "Configure user roles and permissions",
      icon: <UserCheck className="h-8 w-8 text-purple-500" />,
      href: "/settings/roles",
    },
    {
      title: "Groups",
      description: "Manage user groups and team access",
      icon: <Users className="h-8 w-8 text-indigo-500" />,
      href: "/settings/groups",
    },
    {
      title: "Users",
      description: "Manage system users and access",
      icon: <Users className="h-8 w-8 text-orange-500" />,
      href: "/settings/users",
    },
    {
      title: "System Settings",
      description: "Configure global system settings",
      icon: <Settings className="h-8 w-8 text-gray-500" />,
      href: "/settings/system",
    },
  ];

  return (
    <>
      <Head>
        <title>Settings | ScholaRise</title>
        <meta name="description" content="ScholaRise ERP Settings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ProtectedPage allowedRoles={["SuperAdmin", "Admin"]} fallbackPath="/dashboard" title="Settings">
        <div className="space-y-6">
          <div>
            <p className="text-gray-500">Configure your ScholaRise ERP system</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {settingsItems.map((item) => (
              <Link key={item.title} href={item.href}>
                <div className="flex cursor-pointer items-start gap-4 rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </ProtectedPage>
    </>
  );
};

SettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default SettingsPage;
