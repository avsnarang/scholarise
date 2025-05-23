"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  ClipboardList, 
  Settings, 
  UserCircle, 
  BarChart
} from "lucide-react";

export default function AdmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const tabs = [
    {
      value: "/admissions/dashboard",
      label: "Dashboard",
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
    },
    {
      value: "/admissions/leads",
      label: "Leads",
      icon: <Users className="h-4 w-4 mr-2" />,
    },
    {
      value: "/admissions/applications",
      label: "Applications",
      icon: <ClipboardList className="h-4 w-4 mr-2" />,
    },
    {
      value: "/admissions/staff",
      label: "Staff",
      icon: <UserCircle className="h-4 w-4 mr-2" />,
    },
    {
      value: "/admissions/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4 mr-2" />,
    },
  ];

  const getCurrentTab = () => {
    const currentPath = pathname || '';
    const tab = tabs.find((tab) => currentPath.startsWith(tab.value));
    return tab?.value || tabs[0]?.value || '/admissions/dashboard';
  };

  return (
    <AppLayout title="Admissions CRM" description="Manage admissions process">
      <div className="flex flex-col h-full">
        <PageHeader 
          heading="Admissions CRM" 
          description="Manage admissions process"
        />
        
        <Tabs
          value={getCurrentTab()}
          className="mb-4"
          onValueChange={(value) => router.push(value)}
        >
          <TabsList className="grid w-full grid-cols-5 md:w-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center"
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="flex-1">
          {children}
        </div>
      </div>
    </AppLayout>
  );
} 