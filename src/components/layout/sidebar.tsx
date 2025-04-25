import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
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
  ChevronDown,
  ChevronRight,
  Building,
  Bell,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useHasRole } from "@/hooks/useHasRole";
import { UserButton } from "@clerk/nextjs";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  children?: SidebarItem[];
  roles?: string[];
}

interface SidebarProps {
  isOpen: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ isOpen, onCollapse }: SidebarProps) {
  const router = useRouter();
  const { } = useAuth(); // Auth is still needed for protected routes
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Get collapsed state from localStorage, but allow it to be overridden by props
  const [collapsed, setCollapsed] = useState(() => {
    // Initialize from localStorage if available, otherwise default to false
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      return savedState === 'true';
    }
    return false;
  });

  // Update internal state when the localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const savedState = localStorage.getItem('sidebarCollapsed');
        setCollapsed(savedState === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Simple function to toggle the collapsed state - now just notifies parent
  const toggleCollapsed = () => {
    const newCollapsedState = !collapsed;
    
    // Update local state
    setCollapsed(newCollapsedState);
    
    // Notify parent component
    if (onCollapse) {
      onCollapse(newCollapsedState);
    }
  };

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
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "flex flex-col bg-white shadow-lg",
        "h-screen",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "fixed inset-y-0 left-0 z-40",
        "border-r border-gray-100",
        "transition-all duration-300 ease-in-out transform-gpu"
      )}
      style={{
        width: collapsed ? '4rem' : '14rem',
        overflowX: 'hidden',
        transition: collapsed 
          ? 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          : 'width 0.25s cubic-bezier(0.3, 0, 0.2, 1)'
      }}
    >
      {/* Sidebar header with logo */}
      <div className="flex h-14 items-center justify-center border-b border-gray-100 transition-all duration-300 px-2">
        <div className={cn(
          "flex items-center",
          "transition-all duration-300 ease-in-out",
          collapsed ? "justify-center w-full" : "justify-start w-full"
        )}>
          <div className={cn(
            "flex items-center justify-center bg-[#00501B] rounded-md",
            "h-9 w-9",
            collapsed ? "mx-auto" : "",
            "transition-all duration-300"
          )}>
            <span className="text-sm font-bold text-white">SR</span>
          </div>
          <div className={cn(
            "whitespace-nowrap",
            "overflow-hidden",
            collapsed 
              ? "w-0 opacity-0 transition-all duration-200 ease-out" 
              : "w-auto opacity-100 transition-all duration-300 delay-75 ease-in"
          )}>
            <span className="px-2 text-base font-semibold text-gray-900">ScholaRise</span>
          </div>
        </div>
      </div>

      {/* Sidebar content - scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar transition-all duration-300">
        <nav className="space-y-1 py-2 transition-all duration-300">
          {sidebarItems
            .filter(item => hasRequiredRole(item.roles))
            .map((item) => (
            <div key={item.title} className="px-2">
              {item.children ? (
                <div>
                  <button
                    className={cn(
                      "flex w-full items-center justify-center text-sm font-medium transition-all duration-300 ease-in-out",
                      isActive(item.href)
                        ? "bg-[#00501B] text-white" : "text-gray-700 hover:bg-gray-50 hover:text-[#00501B]",
                      collapsed ? "h-10 w-10 rounded-md mx-auto" : "px-2 py-2 rounded-md justify-between"
                    )}
                    onClick={() => toggleExpand(item.title)}
                  >
                    <div className="flex items-center">
                      <div className="flex h-5 w-5 items-center justify-center">
                        {item.icon}
                      </div>
                      <div className={cn(
                        "whitespace-nowrap",
                        "overflow-hidden",
                        collapsed 
                          ? "w-0 opacity-0 transition-all duration-200 ease-out" 
                          : "w-auto opacity-100 transition-all duration-300 delay-100 ease-in"
                      )}>
                        <span className="px-2">{item.title}</span>
                      </div>
                    </div>
                    {!collapsed && (
                      <div className={cn(
                        "ml-auto",
                        "transition-transform duration-200", 
                        expandedItems[item.title] ? "rotate-90" : "rotate-0"
                      )}>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                  {expandedItems[item.title] && !collapsed && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-2 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                      {item.children
                        .filter(child => hasRequiredRole(child.roles))
                        .map((child, index) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center rounded-md py-1.5 text-sm font-medium",
                            collapsed ? "justify-center px-0" : "px-2",
                            isActive(child.href)
                              ? "bg-[#00501B]/5 text-[#00501B] font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-[#A65A20]",
                            "transition-all duration-300 ease-in-out",
                            "animate-in fade-in slide-in-from-left-1",
                            `delay-[${50 * (index + 1)}ms]`
                          )}
                        >
                          <div className="flex h-4 w-4 items-center justify-center">
                            {child.icon}
                          </div>
                          <span className="ml-3 whitespace-nowrap">
                            {child.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-all duration-300 ease-in-out",
                    isActive(item.href)
                      ? "bg-[#00501B] text-white" : "text-gray-700 hover:bg-gray-50 hover:text-[#00501B]",
                    collapsed 
                      ? "h-10 w-10 rounded-md mx-auto justify-center" 
                      : "px-2 py-2 rounded-md"
                  )}
                  title={collapsed ? item.title : ""}
                >
                  <div className="flex h-5 w-5 items-center justify-center">
                    {item.icon}
                  </div>
                  <div className={cn(
                    "whitespace-nowrap",
                    "overflow-hidden",
                    collapsed 
                      ? "w-0 opacity-0 transition-all duration-200 ease-out" 
                      : "w-auto opacity-100 transition-all duration-300 delay-100 ease-in"
                  )}>
                    <span className="px-2">{item.title}</span>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* User profile and notifications at the bottom */}
      <div className="border-t border-gray-100 p-3 transition-all duration-300">
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          collapsed ? "flex flex-col items-center space-y-3" : "flex items-center justify-between"
        )}>
          {/* Notifications */}
          <button
            type="button"
            className={cn(
              "flex h-8 w-8 min-w-[2rem] items-center justify-center rounded-full text-gray-500 relative",
              "transition-all duration-300 ease-in-out",
              "hover:bg-[#F0F9F1] hover:text-[#00501B] hover:scale-105 active:scale-95"
            )}
            title="Notifications"
          >
            <Bell className="h-4 w-4 transition-transform duration-300" />
            <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-[#A65A20] transition-all duration-300"></span>
            <span className="sr-only">Notifications</span>
          </button>

          {/* User profile */}
          <div className="transition-all duration-300 ease-in-out">
            <UserButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
