"use client"

import * as React from "react"
import {
  Users,
  GraduationCap,
  BookOpen,
  Building,
  Bus,
  CreditCard,
  FileText,
  Settings,
  Bell,
  LayoutDashboard,
  HelpCircle,
  School,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  AlertCircle,
  Clock,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAuth } from "@/hooks/useAuth"
import { api } from "@/utils/api"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

// Create proper icon components compatible with the navigation components
// Use proper SVGSVGElement props to match Lucide icon signatures
const IconWrapper = ({ component: Icon }: { component: React.ComponentType<any> }) => 
  React.createElement(Icon, { className: "h-4 w-4" });

// This is sample data.
const data = {
  user: {
    name: "Admin",
    email: "admin@scholarise.com",
    avatar: "/avatars/admin.jpg",
  },
  teams: [
    {
      name: "ScholaRise",
      logo: School,
      plan: "Paonta Sahib",
    },
    {
      name: "ScholaRise",
      logo: School,
      plan: "Juniors",
    },
    {
      name: "ScholaRise",
      logo: School,
      plan: "Majra",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Students",
      url: "/students",
      icon: GraduationCap,
      items: [
        {
          title: "All Students",
          url: "/students",
        },
        {
          title: "Admission",
          url: "/students/admission",
        },
        {
          title: "Transfer Certificates",
          url: "/students/transfer",
        },
      ],
    },
    {
      title: "Teachers",
      url: "/teachers",
      icon: Users,
      items: [
        {
          title: "All Teachers",
          url: "/teachers",
        },
        {
          title: "Add Teacher",
          url: "/teachers/create",
        },
      ],
    },
    {
      title: "Classes",
      url: "/classes",
      icon: Building,
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
      title: "Transport",
      url: "/transport",
      icon: Bus,
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
      icon: Settings,
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
          title: "Users",
          url: "/settings/users",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Fees",
      url: "/fees",
      icon: CreditCard,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      name: "Help",
      url: "/help",
      icon: HelpCircle,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});
  const { isMobile } = useSidebar();
  
  // Fetch branches from API
  const { data: branches = [], isLoading: isLoadingBranches } = api.branch.getAll.useQuery();
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const { user } = useAuth();
  
  // Define Branch type based on the API response
  type Branch = {
    id: string;
    name: string;
    code: string;
  };
  
  // Find the selected branch using currentBranchId
  const selectedBranch = React.useMemo(() => 
    branches.find((branch: Branch) => branch.id === currentBranchId),
    [branches, currentBranchId]
  );

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Data for menu items
  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Students",
      href: "/students",
      icon: GraduationCap,
      children: [
        {
          title: "All Students",
          href: "/students",
        },
        {
          title: "Admission",
          href: "/students/admission",
        },
        {
          title: "Transfer Certificates",
          href: "/students/transfer",
        },
      ],
    },
    {
      title: "Teachers",
      href: "/teachers",
      icon: Users,
      children: [
        {
          title: "All Teachers",
          href: "/teachers",
        },
        {
          title: "Add Teacher",
          href: "/teachers/create",
        },
      ],
    },
    {
      title: "Classes",
      href: "/classes",
      icon: Building,
      children: [
        {
          title: "All Classes",
          href: "/classes",
        },
        {
          title: "Class Students",
          href: "/classes/students",
        },
      ],
    },
    {
      title: "Attendance",
      href: "/attendance-marker",
      icon: Clock,
      children: [
        {
          title: "Mark Attendance",
          href: "/attendance-marker",
        },
        {
          title: "View Records",
          href: "/attendance-records",
        },
        {
          title: "Configure Locations",
          href: "/settings/location-config",
        },
      ],
    },
    {
      title: "Transport",
      href: "/transport",
      icon: Bus,
      children: [
        {
          title: "Routes",
          href: "/transport/routes",
        },
        {
          title: "Stops",
          href: "/transport/stops",
        },
        {
          title: "Assignments",
          href: "/transport/assignments",
        },
      ],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      children: [
        {
          title: "Branches",
          href: "/settings/branches",
        },
        {
          title: "Academic Sessions",
          href: "/settings/academic-sessions",
        },
        {
          title: "Users",
          href: "/settings/users",
        },
      ],
    },
  ];

  const secondaryItems = [
    {
      title: "Fees",
      href: "/fees",
      icon: CreditCard,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
    },
    {
      title: "Help",
      href: "/help",
      icon: HelpCircle,
    },
  ];

  // Function to check if a route is active
  const isActive = (href: string) => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    return false;
  };

  return (
    <Sidebar 
      className="border-r dark:border-sidebar-border shadow-sm max-h-screen overflow-hidden dark:shadow-none"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground dark:hover:bg-sidebar-accent/30"
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground dark:bg-primary/20 flex aspect-square size-8 items-center justify-center rounded-lg">
                    {isLoadingBranches ? (
                      <Skeleton className="h-4 w-4 rounded-full dark:bg-gray-600" />
                    ) : (
                      <School className="size-4 dark:text-primary" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium dark:text-foreground">ScholaRise</span>
                    {isLoadingBranches ? (
                      <Skeleton className="h-3 w-16 dark:bg-gray-600" />
                    ) : (
                      <span className="truncate text-xs dark:text-muted-foreground">{selectedBranch?.name || "Select Branch"}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 dark:text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-white dark:bg-[#252525] dark:border-[#303030]"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-gray-500 text-xs dark:text-[#c0c0c0]">
                  Select Branch
                </DropdownMenuLabel>
                {isLoadingBranches ? (
                  <div className="p-2">
                    <Skeleton className="h-8 w-full bg-white dark:bg-gray-600" />
                    <Skeleton className="h-8 w-full mt-1 bg-white dark:bg-gray-600" />
                  </div>
                ) : branches.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted-foreground dark:text-foreground/70">
                    <AlertCircle className="h-4 w-4 mx-auto mb-2 dark:text-foreground/70" />
                    No branches found
                  </div>
                ) : (
                  branches.map((branch: Branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => setCurrentBranchId(branch.id)}
                      className="gap-2 p-2 dark:hover:bg-[#303030] dark:focus:bg-[#303030] dark:text-[#e6e6e6]"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border border-gray-200 dark:border-[#303030] dark:bg-[#303030]/50">
                        <School className="size-3.5 shrink-0 dark:text-[#7aad8c]" />
                      </div>
                      <span className="font-medium dark:text-[#e6e6e6]">{branch.code}</span>
                      <span className="flex-1 text-gray-500 dark:text-[#c0c0c0]">{branch.name}</span>
                      {currentBranchId === branch.id && (
                        <DropdownMenuShortcut className="dark:text-[#7aad8c]">✓</DropdownMenuShortcut>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.children ? (
                <>
                  <SidebarMenuButton 
                    isActive={isActive(item.href)}
                    className={`
                      ${isActive(item.href) ? 'dark:text-primary dark:hover:text-primary' : 'dark:text-foreground dark:hover:text-foreground/90'} 
                      hover:bg-accent/20 dark:hover:bg-sidebar-accent/40
                    `}
                    tooltip={item.title}
                    onClick={() => toggleExpand(item.title)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${
                        expandedItems[item.title] ? "rotate-180" : ""
                      }`} 
                    />
                  </SidebarMenuButton>

                  {expandedItems[item.title] && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(child.href)}
                          >
                            <Link href={child.href}>
                              <span>{child.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  className={`
                    ${isActive(item.href) ? 'dark:text-primary dark:hover:text-primary' : 'dark:text-foreground dark:hover:text-foreground/90'} 
                    hover:bg-accent/20 dark:hover:bg-sidebar-accent/40
                  `}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* Secondary navigation */}
        <div className="mt-6">
          <h3 className="mb-2 px-4 text-xs font-semibold text-gray-500 dark:text-foreground/50">Resources</h3>
          <SidebarMenu>
            {secondaryItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  className={`
                    ${isActive(item.href) ? 'dark:text-primary dark:hover:text-primary' : 'dark:text-foreground dark:hover:text-foreground/90'} 
                    hover:bg-accent/20 dark:hover:bg-sidebar-accent/40
                  `}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-sidebar-accent/20 dark:text-primary text-primary/80">
              {user.name ? (
                <span className="text-sm font-medium">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              ) : (
                <Users className="h-4 w-4 text-gray-500 dark:text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium dark:text-foreground">{user.name || "User"}</span>
              <span className="text-xs text-gray-500 dark:text-muted-foreground">{user.email || ""}</span>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <Skeleton className="h-10 w-full dark:bg-gray-600" />
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

