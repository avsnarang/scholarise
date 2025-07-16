"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen,
  Building,
  Bus,
  Calendar,
  ChevronsUpDown,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Frame,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Map,
  PieChart,
  Plus,
  School,
  Settings,
  Users,
  type LucideIcon
} from "lucide-react";
import type { Icon } from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/utils/api";

// This is sample data with appropriate types
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard as unknown as LucideIcon,
    },
    {
      title: "Admissions",
      url: "/admissions/dashboard",
      icon: School as unknown as LucideIcon,
      items: [
        {
          title: "Dashboard",
          url: "/admissions/dashboard",
        },
        {
          title: "Leads",
          url: "/admissions/leads",
        },
        {
          title: "Applications",
          url: "/admissions/applications",
        },
        {
          title: "Staff",
          url: "/admissions/staff",
        },
        {
          title: "Settings",
          url: "/admissions/settings",
        },
      ],
    },
    {
      title: "Students",
      url: "/students/dashboard",
      icon: GraduationCap as unknown as LucideIcon,
      items: [
        {
          title: "All Students",
          url: "/students",
        },
        {
          title: "Assign Roll Numbers",
          url: "/students/assign-roll-number",
        },
        {
          title: "Transfer Certificates",
          url: "/students/transfer",
        },
      ],
    },
    {
      title: "Staff",
      url: "/staff",
      icon: Users as unknown as LucideIcon,
      items: [
        {
          title: "Teachers",
          url: "/staff/teachers",
        },
        {
          title: "Add Teacher",
          url: "/staff/teachers/create",
        },
        {
          title: "Employees",
          url: "/staff/employees",
        },
        {
          title: "Add Employee",
          url: "/staff/employees/create",
        },
        {
          title: "Departments",
          url: "/departments/list",
        },
        {
          title: "Designations",
          url: "/designations/list",
        },
      ],
    },
    {
      title: "Classes",
      url: "/classes",
      icon: Building as unknown as LucideIcon,
      items: [
        {
          title: "All Classes",
          url: "/classes",
        },
        {
          title: "Class Students",
          url: "/classes/students",
        },
      ],
    },
    {
      title: "Attendance",
      url: "/attendance",
      icon: Clock as unknown as LucideIcon,
      items: [
        {
          title: "Dashboard",
          url: "/attendance",
        },
        {
          title: "Mark Attendance",
          url: "/attendance/mark",
        },
        {
          title: "Student Attendance",
          url: "/attendance/students",
        },
        {
          title: "Attendance Reports",
          url: "/attendance/reports",
        },
      ],
    },
    {
      title: "Leave Management",
      url: "/leaves/dashboard",
      icon: Calendar as unknown as LucideIcon,
      items: [
        {
          title: "Leave Applications",
          url: "/leaves/application",
        },
        {
          title: "Leave Policies",
          url: "/leaves/policies",
        },
      ],
    },
    {
      title: "Salary Management",
      url: "/salary",
      icon: DollarSign as unknown as LucideIcon,
      items: [
        {
          title: "Overview",
          url: "/salary",
        },
        {
          title: "Salary Structures",
          url: "/salary/structures",
        },
        {
          title: "Teacher Salaries",
          url: "/salary/teachers/assign",
        },
        {
          title: "Employee Salaries",
          url: "/salary/employees/assign",
        },
        {
          title: "Salary Increments",
          url: "/salary/increments",
        },
        {
          title: "Increment History",
          url: "/salary/increments/history",
        },
        {
          title: "Process Payments",
          url: "/salary/payments",
        },
      ],
    },
    {
      title: "Question Papers",
      url: "/question-papers",
      icon: BookOpen as unknown as LucideIcon,
      items: [
        {
          title: "Dashboard",
          url: "/question-papers",
        },
        {
          title: "Create Blueprint",
          url: "/question-papers/blueprints/create",
        },
        {
          title: "Create Question Paper",
          url: "/question-papers/create",
        },
        {
          title: "All Question Papers",
          url: "/question-papers/list",
        },
      ],
    },
    {
      title: "Transport",
      url: "/transport",
      icon: Bus as unknown as LucideIcon,
      items: [
        {
          title: "Routes",
          url: "/transport/routes",
        },
        {
          title: "Stops",
          url: "/transport/stops",
        },
        {
          title: "Assignments",
          url: "/transport/assignments",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings as unknown as LucideIcon,
      items: [
        {
          title: "Branches",
          url: "/settings/branches",
        },
        {
          title: "Academic Sessions",
          url: "/settings/academic-sessions",
        },
        {
          title: "Subjects",
          url: "/settings/subjects",
        },
        {
          title: "Users",
          url: "/settings/users",
        },
        {
          title: "User Roles",
          url: "/settings/roles",
        },
        {
          title: "Attendance Configuration",
          url: "/settings/attendance-config",
        },
        {
          title: "AI Configuration",
          url: "/settings/ai-configuration",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Fees",
      url: "/fees",
      icon: CreditCard as LucideIcon,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: FileText as LucideIcon,
    },
    {
      name: "Help",
      url: "/help",
      icon: HelpCircle as LucideIcon,
    },
  ],
};

// Branch Switcher component that uses real API data
function BranchSwitcher() {
  const { isMobile } = useSidebar();
  const { data: branches = [], isLoading } = api.branch.getUserBranches.useQuery();
  const [activeBranch, setActiveBranch] = useState<any>(null);

  // Set the first branch as active when data loads
  useEffect(() => {
    if (branches && branches.length > 0 && !activeBranch) {
      setActiveBranch(branches[0]);
    }
  }, [branches, activeBranch]);

  // If still loading or no branches, show a loading state
  if (isLoading || !activeBranch) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">ScholaRise</span>
              <span className="truncate text-xs">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  ScholaRise
                </span>
                <span className="truncate text-xs">{activeBranch.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Branches
            </DropdownMenuLabel>
            {branches.map((branch: any, index: number) => (
              <DropdownMenuItem
                key={branch.id}
                onClick={() => setActiveBranch(branch)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Building className="size-4 shrink-0" />
                </div>
                {branch.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add branch</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Demo page showing the modern sidebar
export default function SidebarDemo() {
  return (
    <div className="flex flex-col w-full h-screen font-inter">
      <div className="flex flex-1 overflow-hidden">
        <SidebarProvider>
          <AppSidebar />
        
          {/* Main Content Area */}
          <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold mb-4">Modern Sidebar Demo</h1>
              <p className="text-muted-foreground mb-6">
                This is a demonstration of the redesigned sidebar component with improved visual design, animations, and interactions.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <h3 className="text-lg font-semibold mb-2">Card {i + 1}</h3>
                    <p className="text-sm text-muted-foreground">This is a sample card in the dashboard.</p>
                    <div className="h-20 w-full rounded-md bg-muted/50 mt-4 animate-pulse"></div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                  <h3 className="text-lg font-semibold mb-2">Key Features of the Redesigned Sidebar</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-4">
                    <li className="flex items-center py-1.5">
                      <div className="size-2 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">Modern collapsible sidebar</span>
                    </li>
                    <li className="flex items-center py-1.5">
                      <div className="size-2 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">Branch switching functionality</span>
                    </li>
                    <li className="flex items-center py-1.5">
                      <div className="size-2 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">Projects section with actions</span>
                    </li>
                    <li className="flex items-center py-1.5">
                      <div className="size-2 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">User profile and settings</span>
                    </li>
                    <li className="flex items-center py-1.5">
                      <div className="size-2 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">Collapsible navigation sections</span>
                    </li>
                    <li className="flex items-center py-1.5">
                      <div className="size-2 rounded-full bg-primary mr-2"></div>
                      <span className="text-sm">Clean, minimal UI design</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}

// AppSidebar component using the components and data from above
function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BranchSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Add this to your global CSS file
/*
.sidebar-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.sidebar-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.sidebar-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}

.dark .sidebar-scrollbar {
  scrollbar-color: #3f3f46 transparent;
}

.dark .sidebar-scrollbar::-webkit-scrollbar-thumb {
  background-color: #3f3f46;
}

@layer base {
  :root {
    --font-inter: 'Inter', sans-serif;
  }
  
  .font-inter {
    font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
}
*/ 