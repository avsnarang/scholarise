"use client"

import * as React from "react"
import {
  Users,
  GraduationCap,
  Building,
  Bus,
  CreditCard,
  FileText,
  Settings,
  Bell,
  LayoutDashboard,
  HelpCircle,
  School,
  ChevronsUpDown,
  ChevronDown,
  AlertCircle,
  Clock,
  LogOut,
  User,
  Settings2,
  BadgeCheck,
} from "lucide-react"
import { useClerk } from "@clerk/nextjs"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuGroup,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { usePathname } from "next/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});
  const { isMobile } = useSidebar();
  const { signOut } = useClerk();

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
  const selectedBranch = React.useMemo(() => {
    // Ensure branches is an array before using find on it
    const branchesArray = Array.isArray(branches) ? branches : [];
    return branchesArray.find((branch: Branch) => branch.id === currentBranchId);
  }, [branches, currentBranchId]);

  // Add usePathname hook
  const pathname = usePathname();

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
      href: "/attendance",
      icon: Clock,
      children: [
        {
          title: "Dashboard",
          href: "/attendance",
        },
        {
          title: "Mark Attendance",
          href: "/attendance/mark",
        },
        {
          title: "Student Attendance",
          href: "/attendance/students",
        },
        {
          title: "Attendance Reports",
          href: "/attendance/reports",
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
          title: "Subjects",
          href: "/settings/subjects",
        },
        {
          title: "Users",
          href: "/settings/users",
        },
        {
          title: "Attendance Configuration",
          href: "/settings/attendance-config",
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
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const handleSignOut = async () => {
    try {
      // Sign out with redirect to login page
      await signOut({ redirectUrl: "/login" });
    } catch (error) {
      console.error("Error signing out:", error);
      // Fallback: redirect to login page even if there's an error
      window.location.href = "/login";
    }
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
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-gray-500 text-xs">
                  Select Branch
                </DropdownMenuLabel>
                {isLoadingBranches ? (
                  <div className="p-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full mt-1" />
                  </div>
                ) : branches.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                    No branches found
                  </div>
                ) : (
                  // Ensure branches is an array before using map
                  (Array.isArray(branches) ? branches : []).map((branch: Branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => setCurrentBranchId(branch.id)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border border-gray-200">
                        <School className="size-3.5 shrink-0" />
                      </div>
                      <span className="font-medium">{branch.code}</span>
                      <span className="flex-1 text-gray-500">{branch.name}</span>
                      {currentBranchId === branch.id && (
                        <DropdownMenuShortcut>✓</DropdownMenuShortcut>
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
                  <div className="group relative flex flex-col">
                    {/* Main menu item */}
                    <div className="relative">
                      <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                          className="relative pr-8"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                        </SidebarMenuButton>
                      </Link>
                      
                      {/* Dropdown button with high z-index to stay on top */}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none z-30">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleExpand(item.title);
                          }}
                          className={`
                            h-7 w-7 flex items-center justify-center rounded-[6px]
                            transition-all duration-200 pointer-events-auto
                            ${expandedItems[item.title] 
                              ? "bg-[#00501B] text-white shadow-sm" 
                              : "text-muted-foreground/70 hover:text-white hover:bg-[#00501B]/90 hover:shadow-sm"}
                          `}
                          aria-label={`Toggle ${item.title} submenu`}
                        >
                    <ChevronDown
                            className={`h-4 w-4 transition-transform duration-300 ${
                        expandedItems[item.title] ? "rotate-180" : ""
                      }`}
                    />
                        </button>
                      </div>
                    </div>

                    {/* Submenu as sibling of main menu item */}
                  {expandedItems[item.title] && (
                      <div className="w-full mt-1">
                        <SidebarMenuSub className="pl-4 ml-2 border-l border-primary/20 overflow-visible">
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(child.href)}
                                className="hover:bg-transparent relative z-20"
                          >
                                <Link href={child.href} className="group transition-all duration-200 hover:pl-1">
                                  <span className={isActive(child.href) ? "font-medium text-primary" : "font-normal"}>{child.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                      </div>
                  )}
                  </div>
                </>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={item.title}
                >
                  <Link href={item.href} className="group transition-all duration-200">
                    <item.icon className="h-4 w-4 transition-colors duration-200 group-hover:text-primary" />
                    <span className="transition-all duration-200 group-hover:pl-0.5">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* Secondary navigation */}
        <div className="mt-6">
          <h3 className="mb-2 px-4 text-xs font-semibold text-gray-500">Resources</h3>
          <SidebarMenu>
            {secondaryItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={item.title}
                >
                  <Link href={item.href} className="group transition-all duration-200">
                    <item.icon className="h-4 w-4 transition-colors duration-200 group-hover:text-primary" />
                    <span className="transition-all duration-200 group-hover:pl-0.5">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {user ? (
                    <>
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src="" alt={user.name || "User"} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.name || "User"}</span>
                        <span className="truncate text-xs text-muted-foreground">{user.email || ""}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4" />
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="grid flex-1 gap-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <ChevronsUpDown className="ml-auto size-4 opacity-30" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src="" alt={user?.name || "User"} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.name || "User"}</span>
                      <span className="truncate text-xs">{user?.email || ""}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Staff Permissions
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
