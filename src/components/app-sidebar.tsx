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
  ChevronRight,
  AlertCircle,
  Clock,
  LogOut,
  User,
  Settings2,
  BadgeCheck,
  Calendar,
  DollarSign,
  BookOpen,
  Plus,
} from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { type Prisma } from "@prisma/client"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { Permission, Role } from "@/types/permissions"
import { navItemPermissions, moduleViewPermissions } from "@/utils/rbac"
import { api } from "@/utils/api"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import { useSession } from "@clerk/nextjs"
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
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

export * from "@/components/ui/app-sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { signOut } = useClerk();

  // Fetch branches from API
  const { data: branches = [], isLoading: isLoadingBranches } = api.branch.getAll.useQuery();
  const { currentBranchId, setCurrentBranchId } = useBranchContext();
  const { user } = useAuth();
  const { canAccess, isSuperAdmin, can } = usePermissions();

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

  const [forceAdminMode, setForceAdminMode] = React.useState(false);
  
  // Check for force admin mode in localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isForceAdmin = localStorage.getItem('forceAdmin') === 'true';
      setForceAdminMode(isForceAdmin);
      
      // For debugging
      if (isForceAdmin) {
        console.log("Force admin mode active in sidebar");
      }
    }
  }, []);

  const toggleExpand = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Data for menu items
  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permissions: navItemPermissions.dashboard,
    },
    {
      title: "Admissions",
      href: "/admissions/dashboard",
      icon: School,
      permissions: navItemPermissions.admission,
      children: [
        {
          title: "Dashboard",
          href: "/admissions/dashboard",
          permissions: navItemPermissions.admission,
        },
        {
          title: "Leads",
          href: "/admissions/leads",
          permissions: navItemPermissions.admission,
        },
        {
          title: "Applications",
          href: "/admissions/applications",
          permissions: navItemPermissions.admission,
        },
        {
          title: "Staff",
          href: "/admissions/staff",
          permissions: navItemPermissions.admission,
        },
        {
          title: "Settings",
          href: "/admissions/settings",
          permissions: navItemPermissions.admission,
        },
      ],
    },
    {
      title: "Students",
      href: "/students/dashboard",
      icon: GraduationCap,
      permissions: navItemPermissions.students,
      children: [
        {
          title: "All Students",
          href: "/students",
          permissions: navItemPermissions.students,
        },
        {
          title: "Assign Roll Numbers",
          href: "/students/assign-roll-number",
          permissions: navItemPermissions.students,
        },
        {
          title: "Transfer Certificates",
          href: "/students/transfer",
          permissions: navItemPermissions.transfer,
        },
      ],
    },
    {
      title: "Money Collection",
      href: "/money-collection",
      icon: CreditCard,
      permissions: navItemPermissions.moneyCollection,
      children: [
        {
          title: "All Collections",
          href: "/money-collection",
          permissions: [Permission.VIEW_MONEY_COLLECTION],
        },
        {
          title: "New Collection",
          href: "/money-collection/new",
          permissions: [Permission.CREATE_MONEY_COLLECTION],
        },
      ],
    },
    {
      title: "Staff",
      href: "/staff",
      icon: Users,
      permissions: [
        ...new Set([
          ...navItemPermissions.teachers,
          ...navItemPermissions.employees,
        ]),
      ],
      children: [
        {
          title: "Teachers",
          href: "/teachers",
          permissions: navItemPermissions.teachers,
        },
        {
          title: "Add Teacher",
          href: "/teachers/create",
          permissions: navItemPermissions.createTeacher,
        },
        {
          title: "Employees",
          href: "/employees",
          permissions: navItemPermissions.employees,
        },
        {
          title: "Add Employee",
          href: "/employees/create",
          permissions: navItemPermissions.createEmployee,
        },
        {
          title: "Departments",
          href: "/departments/list",
          permissions: navItemPermissions.departments,
        },
        {
          title: "Designations",
          href: "/designations/list",
          permissions: navItemPermissions.designations,
        },
      ],
    },
    {
      title: "Classes",
      href: "/classes",
      icon: Building,
      permissions: navItemPermissions.classes,
      children: [
        {
          title: "All Classes",
          href: "/classes",
          permissions: navItemPermissions.classes,
        },
        {
          title: "Class Students",
          href: "/classes/students",
          permissions: navItemPermissions.classStudents,
        },
      ],
    },
    {
      title: "Attendance",
      href: "/attendance",
      icon: Clock,
      permissions: navItemPermissions.attendance,
      children: [
        {
          title: "Dashboard",
          href: "/attendance",
          permissions: navItemPermissions.attendance,
        },
        {
          title: "Mark Attendance",
          href: "/attendance/mark",
          permissions: navItemPermissions.markAttendance,
        },
        {
          title: "Student Attendance",
          href: "/attendance/students",
          permissions: navItemPermissions.attendance,
        },
        {
          title: "Attendance Reports",
          href: "/attendance/reports",
          permissions: navItemPermissions.attendanceReports,
        },
      ],
    },
    {
      title: "Leave Management",
      href: "/leaves/dashboard",
      icon: Calendar,
      permissions: navItemPermissions.leaves,
      children: [
        {
          title: "Dashboard",
          href: "/leaves/dashboard",
          permissions: navItemPermissions.leaves,
        },
        {
          title: "Leave Applications",
          href: "/leaves",
          permissions: navItemPermissions.leaveApplications,
        },
        {
          title: "Leave Policies",
          href: "/leaves?tab=policies",
          permissions: navItemPermissions.leavePolicies,
        },
      ],
    },
    {
      title: "Salary Management",
      href: "/salary",
      icon: DollarSign,
      permissions: navItemPermissions.salary,
      children: [
        {
          title: "Overview",
          href: "/salary",
          permissions: navItemPermissions.salary,
        },
        {
          title: "Salary Structures",
          href: "/salary/structures",
          permissions: navItemPermissions.salaryStructures,
        },
        {
          title: "Teacher Salaries",
          href: "/salary/teachers/assign",
          permissions: navItemPermissions.teacherSalaries,
        },
        {
          title: "Employee Salaries",
          href: "/salary/employees/assign",
          permissions: navItemPermissions.employeeSalaries,
        },
        {
          title: "Salary Increments",
          href: "/salary/increments",
          permissions: navItemPermissions.salaryIncrements,
        },
        {
          title: "Increment History",
          href: "/salary/increments/history",
          permissions: navItemPermissions.salaryIncrements,
        },
        {
          title: "Process Payments",
          href: "/salary/payments",
          permissions: navItemPermissions.salaryPayments,
        },
      ],
    },
    {
      title: "Question Papers",
      href: "/question-papers",
      icon: BookOpen,
      permissions: navItemPermissions.questionPapers,
      children: [
        {
          title: "Dashboard",
          href: "/question-papers",
          permissions: navItemPermissions.questionPapers,
        },
        {
          title: "Create Blueprint",
          href: "/question-papers/blueprints/create",
          permissions: navItemPermissions.createQuestionPaper,
        },
        {
          title: "Create Question Paper",
          href: "/question-papers/create",
          permissions: navItemPermissions.createQuestionPaper,
        },
        {
          title: "All Question Papers",
          href: "/question-papers/list",
          permissions: navItemPermissions.questionPapers,
        },
      ],
    },
    {
      title: "Transport",
      href: "/transport",
      icon: Bus,
      permissions: navItemPermissions.transport,
      children: [
        {
          title: "Routes",
          href: "/transport/routes",
          permissions: navItemPermissions.transportRoutes,
        },
        {
          title: "Stops",
          href: "/transport/stops",
          permissions: navItemPermissions.transportStops,
        },
        {
          title: "Assignments",
          href: "/transport/assignments",
          permissions: navItemPermissions.transportAssignments,
        },
      ],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      permissions: navItemPermissions.settings,
      children: [
        {
          title: "Branches",
          href: "/settings/branches",
          permissions: navItemPermissions.branches,
        },
        {
          title: "Academic Sessions",
          href: "/settings/academic-sessions",
          permissions: navItemPermissions.academicSessions,
        },
        {
          title: "Subjects",
          href: "/settings/subjects",
          permissions: navItemPermissions.subjects,
        },
        {
          title: "Users",
          href: "/settings/users",
          permissions: navItemPermissions.users,
        },
        {
          title: "User Roles",
          href: "/settings/roles",
          permissions: navItemPermissions.users,
        },
        {
          title: "Attendance Configuration",
          href: "/settings/attendance-config",
          permissions: navItemPermissions.attendanceConfig,
        },
        {
          title: "AI Configuration",
          href: "/settings/ai-configuration",
          permissions: navItemPermissions.questionPapers,
        },
      ],
    },
  ];

  const secondaryItems = [
    {
      title: "Fees",
      href: "/fees",
      icon: CreditCard,
      permissions: navItemPermissions.fees,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
      permissions: navItemPermissions.reports,
    },
    {
      title: "Help",
      href: "/help",
      icon: HelpCircle,
      permissions: [], // Empty array means everyone can access
    },
  ];

  // Revise the filteredNavItems logic to be completely generic for any module

  // Fully generic approach to checking permissions for menu items
  const filteredNavItems = isSuperAdmin || forceAdminMode
    ? navItems  // Superadmin or force mode sees everything
    : navItems.filter(item => {
        // Generic approach: First check module view permission based on module title
        const viewPermission = moduleViewPermissions[item.title];
        
        if (viewPermission) {
          // Check permission directly using can() 
          const hasViewPermission = can(viewPermission);
          console.log(`Module ${item.title}: view permission (${viewPermission}): ${hasViewPermission}`);
          
          if (hasViewPermission) {
            return true;
          }
        }
        
        // If no match in moduleViewPermissions mapping or permission check failed,
        // fall back to standard permission checks from the navItemPermissions
        const hasPermissionViaStandard = canAccess(item.permissions);
        
        // Also check if any child items are accessible
        const hasPermissionViaChildren = item.children?.some(child => canAccess(child.permissions));
        
        const shouldShow = hasPermissionViaStandard || hasPermissionViaChildren;
        console.log(`Module ${item.title}: standard permission check result: ${shouldShow}`);
        
        return shouldShow;
      }).map(item => {
        // If the item has children, filter those too
        if (item.children) {
          return {
            ...item,
            children: item.children.filter(child => {
              const hasChildPermission = canAccess(child.permissions);
              
              // For debugging
              if (!hasChildPermission) {
                console.log(`Child item ${child.title} (of ${item.title}) filtered out: insufficient permissions`);
              }
              
              return hasChildPermission;
            })
          };
        }
        return item;
      });

  const filteredSecondaryItems = isSuperAdmin || forceAdminMode
    ? secondaryItems  // Superadmin or force mode sees everything
    : secondaryItems.filter(item => 
        !item.permissions.length || canAccess(item.permissions)
      );

  // Add a check to determine if a submenu item is enabled based on permissions
  const isMenuItemEnabled = (permissions: Permission[]): boolean => {
    if (isSuperAdmin || forceAdminMode) return true;
    
    // Check if the permissions array contains any create/edit permissions
    // If it has only VIEW permissions, we'll show the item but disable interactions
    return canAccess(permissions);
  };

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
                  (Array.isArray(branches) ? branches : [])
                    // Filter out headquarters branch for non-superadmins
                    .filter(branch => branch.id !== 'headquarters' || isSuperAdmin)
                    .map((branch: Branch) => (
                      <DropdownMenuItem
                        key={branch.id}
                        onClick={() => setCurrentBranchId(branch.id)}
                        className={`gap-2 p-2 ${branch.id === 'headquarters' ? 'bg-red-50 hover:bg-red-100' : ''}`}
                      >
                        <div className={`flex size-6 items-center justify-center rounded-md border border-gray-200 ${branch.id === 'headquarters' ? 'border-red-200 bg-red-100' : ''}`}>
                          <School className={`size-3.5 shrink-0 ${branch.id === 'headquarters' ? 'text-red-800' : ''}`} />
                        </div>
                        <span className={`font-medium ${branch.id === 'headquarters' ? 'text-red-800' : ''}`}>{branch.code}</span>
                        <span className={`flex-1 ${branch.id === 'headquarters' ? 'text-red-800' : 'text-gray-500'}`}>{branch.name}</span>
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
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            {filteredNavItems.map((item) => (
              <div key={item.title} className="relative">
                <SidebarMenuItem>
                  <Link href={item.href} className="flex-1">
                    <SidebarMenuButton 
                      className={`${!isCollapsed && item.children && item.children.length > 0 ? 'pr-10' : ''}`}
                      isActive={isActive(item.href)}
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                  
                  {!isCollapsed && item.children && item.children.length > 0 && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                      <button
                        onClick={(e) => toggleExpand(item.title, e)}
                        className={`
                          h-7 w-7 flex items-center justify-center rounded-md 
                          hover:bg-sidebar-accent text-sidebar-foreground
                          transition-all duration-200
                          ${expandedItems[item.title] ? "bg-sidebar-accent" : ""}
                        `}
                        aria-label={`Toggle ${item.title} submenu`}
                      >
                        <ChevronRight 
                          className={`h-4 w-4 transition-transform duration-200 ${
                            expandedItems[item.title] ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </SidebarMenuItem>
                
                {!isCollapsed && item.children && item.children.length > 0 && (
                  <div className={`overflow-hidden transition-all duration-200 ${
                    expandedItems[item.title] ? 'max-h-96' : 'max-h-0'
                  }`}>
                    <SidebarMenuSub>
                      {item.children.map((child) => {
                        // Check if this item should be disabled (greyed out)
                        const isEnabled = isMenuItemEnabled(child.permissions);
                        // Special handling for attendance items
                        const isAttendanceItem = item.title === "Attendance";
                        // If it's attendance and user only has VIEW_ATTENDANCE, 
                        // only the dashboard should be enabled
                        const isAttendanceDashboard = isAttendanceItem && child.title === "Dashboard";
                        const showDisabled = 
                          (isAttendanceItem && !isAttendanceDashboard && 
                          !canAccess([Permission.MARK_ATTENDANCE]) && 
                          !canAccess([Permission.MARK_SELF_ATTENDANCE]) &&
                          !canAccess([Permission.MARK_ALL_STAFF_ATTENDANCE])) ||
                          (!isEnabled);

                        return (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(child.href)}
                              className={showDisabled ? 'pointer-events-none opacity-50' : ''}
                            >
                              <Link 
                                href={showDisabled ? "#" : child.href}
                                onClick={e => showDisabled && e.preventDefault()}
                              >
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </div>
                )}
              </div>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Secondary navigation */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarMenu>
            {filteredSecondaryItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <Link href={item.href} className="flex-1">
                  <SidebarMenuButton isActive={isActive(item.href)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
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
