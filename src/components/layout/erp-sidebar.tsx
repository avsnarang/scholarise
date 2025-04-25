import { useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Bus,
  CreditCard,
  FileText,
  Settings,
  ChevronRight,
  Building,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHasRole } from "@/hooks/useHasRole";
import { UserButton } from "@clerk/nextjs";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  children?: SidebarItem[];
  roles?: string[];
}

interface ERPSidebarProps {
  isOpen: boolean;
}

export function ERPSidebar({ isOpen }: ERPSidebarProps) {
  const router = useRouter();
  const { } = useAuth(); // Auth is still needed for protected routes
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const { state } = useSidebar();
  
  // Call useHasRole at the top level for each possible role
  const isSuperAdmin = useHasRole('SuperAdmin');
  const isAdmin = useHasRole('Admin');
  const isTeacher = useHasRole('Teacher');
  const isEmployee = useHasRole('Employee');
  const isParent = useHasRole('Parent');
  const isStudent = useHasRole('Student');

  // Function to check if user has any of the required roles
  const hasRequiredRole = useCallback((roles?: string[]) => {
    if (!roles) return true; // No roles specified, show to everyone

    return roles.some(role => {
      switch (role) {
        case 'SuperAdmin': return isSuperAdmin;
        case 'Admin': return isAdmin;
        case 'Teacher': return isTeacher;
        case 'Employee': return isEmployee;
        case 'Parent': return isParent;
        case 'Student': return isStudent;
        default: return false;
      }
    });
  }, [isSuperAdmin, isAdmin, isTeacher, isEmployee, isParent, isStudent]);

  const sidebarItems: SidebarItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <BookOpen className="h-5 w-5" />,
      // Dashboard is accessible to all roles
    },
    {
      title: "Students",
      href: "/students",
      icon: <GraduationCap className="h-5 w-5" />,
      // Accessible to administrators, teachers, and staff
      roles: ["SuperAdmin", "Admin", "Teacher", "Employee"],
      children: [
        {
          title: "All Students",
          href: "/students",
          icon: <ChevronRight className="h-4 w-4" />,
        },
        {
          title: "Assign Roll Numbers",
          href: "/assign-roll-number",
          icon: <ChevronRight className="h-4 w-4" />,
          roles: ["SuperAdmin", "Admin", "Teacher"],
        },
        {
          title: "Admission",
          href: "/students/admission",
          icon: <ChevronRight className="h-4 w-4" />,
          // Only admins can admit students
          roles: ["SuperAdmin", "Admin", "Employee"],
        },
        {
          title: "Transfer Certificate",
          href: "/students/transfer",
          icon: <ChevronRight className="h-4 w-4" />,
          // Only admins can manage transfer certificates
          roles: ["SuperAdmin", "Admin", "Employee"],
        },
      ],
    },
    {
      title: "Teachers",
      href: "/teachers",
      icon: <Users className="h-5 w-5" />,
      // Only administrators can manage teachers
      roles: ["SuperAdmin", "Admin", "Employee"],
    },
    {
      title: "Employees",
      href: "/employees",
      icon: <Users className="h-5 w-5" />,
      // Only administrators can manage employees
      roles: ["SuperAdmin", "Admin"],
    },
    {
      title: "Classes",
      href: "/classes",
      icon: <Building className="h-5 w-5" />,
      // Accessible to administrators and teachers
      roles: ["SuperAdmin", "Admin", "Teacher", "Employee"],
    },
    {
      title: "Transport",
      href: "/transport",
      icon: <Bus className="h-5 w-5" />,
      // Transport management for administrators and staff
      roles: ["SuperAdmin", "Admin", "Employee"],
      children: [
        {
          title: "Routes",
          href: "/transport/routes",
          icon: <ChevronRight className="h-4 w-4" />,
        },
        {
          title: "Stops",
          href: "/transport/stops",
          icon: <ChevronRight className="h-4 w-4" />,
        },
        {
          title: "Assignments",
          href: "/transport/assignments",
          icon: <ChevronRight className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Fees",
      href: "/fees",
      icon: <CreditCard className="h-5 w-5" />,
      // Only administrators and finance staff can manage fees
      roles: ["SuperAdmin", "Admin", "Employee"],
    },
    {
      title: "Reports",
      href: "/reports",
      icon: <FileText className="h-5 w-5" />,
      // Reports accessible to administrators and teachers
      roles: ["SuperAdmin", "Admin", "Teacher", "Employee"],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      // Only SuperAdmin and Admin can access settings
      roles: ["SuperAdmin", "Admin"],
      children: [
        {
          title: "Branches",
          href: "/settings/branches",
          icon: <ChevronRight className="h-4 w-4" />,
          roles: ["SuperAdmin"],
        },
        {
          title: "Academic Sessions",
          href: "/settings/academic-sessions",
          icon: <ChevronRight className="h-4 w-4" />,
          roles: ["SuperAdmin", "Admin"],
        },
        {
          title: "Roles",
          href: "/settings/roles",
          icon: <ChevronRight className="h-4 w-4" />,
          roles: ["SuperAdmin"],
        },
        {
          title: "Groups",
          href: "/settings/groups",
          icon: <ChevronRight className="h-4 w-4" />,
          roles: ["SuperAdmin", "Admin"],
        },
        {
          title: "Users",
          href: "/settings/users",
          icon: <ChevronRight className="h-4 w-4" />,
          roles: ["SuperAdmin", "Admin"],
        },
      ],
    },
  ];

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const isActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-14 items-center border-b border-gray-100">
        <div className="flex items-center ml-2">
          <div className="flex items-center justify-center bg-[#00501B] rounded-md h-9 w-9">
            <span className="text-sm font-bold text-white">SR</span>
          </div>
          <span className="ml-2 text-base font-semibold text-gray-900">ScholaRise</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {sidebarItems
            .filter(item => hasRequiredRole(item.roles))
            .map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.children ? (
                  <>
                    <SidebarMenuButton 
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                      onClick={() => toggleExpand(item.title)}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>

                    {expandedItems[item.title] && (
                      <SidebarMenuSub>
                        {item.children
                          .filter(child => hasRequiredRole(child.roles))
                          .map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                href={child.href}
                                isActive={isActive(child.href)}
                              >
                                {child.icon}
                                <span>{child.title}</span>
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
                    tooltip={item.title}
                  >
                    <a href={item.href}>
                      {item.icon}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="flex items-center justify-between p-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 relative hover:bg-[#F0F9F1] hover:text-[#00501B]"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-[#A65A20]"></span>
            <span className="sr-only">Notifications</span>
          </button>
          
          <UserButton />
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
} 