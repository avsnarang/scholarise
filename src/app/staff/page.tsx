"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { api } from "@/utils/api";
import {
  Users,
  GraduationCap,
  Briefcase,
  Clock,
  UserPlus,
  FileText,
  BarChart2,
  ChevronsUp,
  CalendarDays,
  Settings,
  Building,
  UserCheck,
  Award
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";

const staffGroups = [
  {
    title: "Staff Management",
    description: "Manage teaching and non-teaching staff",
    items: [
      {
        title: "Teachers",
        description: "Manage academic teaching staff",
        icon: <GraduationCap className="h-6 w-6" />,
        href: "/staff/teachers",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Employees",
        description: "Manage non-teaching staff",
        icon: <Briefcase className="h-6 w-6" />,
        href: "/staff/employees",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Add New Staff",
        description: "Create new staff profiles",
        icon: <UserPlus className="h-6 w-6" />,
        href: "/staff/create",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Departments",
        description: "Manage staff departments",
        icon: <Building className="h-6 w-6" />,
        href: "/staff/departments/list",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Designations",
        description: "Manage staff positions and titles",
        icon: <Award className="h-6 w-6" />,
        href: "/staff/designations/list",
        roles: ["admin", "superadmin"],
      },
    ],
  },
  {
    title: "Reports & Analysis",
    description: "Staff reports and analytical tools",
    items: [
      {
        title: "Staff Overview",
        description: "View comprehensive staff statistics",
        icon: <Users className="h-6 w-6" />,
        href: "/staff/overview",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Attendance Reports",
        description: "View staff attendance statistics",
        icon: <UserCheck className="h-6 w-6" />,
        href: "/attendance/reports/staff",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Performance Analytics",
        description: "View staff performance metrics",
        icon: <BarChart2 className="h-6 w-6" />,
        href: "/staff/analytics",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Department Reports",
        description: "View department-wise staff distribution",
        icon: <Building className="h-6 w-6" />,
        href: "/staff/departments",
        roles: ["admin", "superadmin"],
      },
    ],
  },
  {
    title: "Administration",
    description: "Staff administration and policies",
    items: [
      {
        title: "Salary Management",
        description: "Manage staff salaries and payments",
        icon: <ChevronsUp className="h-6 w-6" />,
        href: "/salary",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Leave Management",
        description: "Manage staff leave requests",
        icon: <CalendarDays className="h-6 w-6" />,
        href: "/leave",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Staff Settings",
        description: "Configure staff-related settings",
        icon: <Settings className="h-6 w-6" />,
        href: "/settings/staff",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Certifications",
        description: "Manage staff certifications and qualifications",
        icon: <Award className="h-6 w-6" />,
        href: "/staff/certifications",
        roles: ["admin", "superadmin"],
        disabled: true,
      },
    ],
  },
];

export default function StaffDashboardPage() {
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin } = useUserRole();
  
  console.log("Staff Dashboard - Role checks:", { 
    isTeacher, 
    isEmployee, 
    isAdmin, 
    isSuperAdmin 
  });

  // Get teacher stats
  const { data: teacherStats, isLoading: isLoadingTeachers } = api.teacher.getStats.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Get employee stats
  const { data: employeeStats, isLoading: isLoadingEmployees } = api.employee.getStats.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Calculate combined stats
  const totalTeachers = teacherStats?.totalTeachers || 0;
  const activeTeachers = teacherStats?.activeTeachers || 0;
  const totalEmployees = employeeStats?.totalEmployees || 0;
  const activeEmployees = employeeStats?.activeEmployees || 0;
  const totalStaff = totalTeachers + totalEmployees;
  
  // Sample percentage change - in a real app, this would come from historical data
  const totalStaffChange = 5.2;
  const averageTenure = 3.8;

  // Helper function to check if user has access to an item
  const hasAccess = (allowedRoles: string[]) => {
    if (isSuperAdmin) return true;
    if (isAdmin && allowedRoles.includes("admin")) return true;
    if (isTeacher && allowedRoles.includes("teacher")) return true;
    if (isEmployee && allowedRoles.includes("employee")) return true;
    return false;
  };

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Staff Dashboard</h1>
          <p className="mt-2 text-gray-500">
            Manage and monitor all staff in your institution
          </p>
        </div>

        <div className="space-y-8">
          {staffGroups.map((group, groupIndex) => {
            // Filter items based on user role
            const accessibleItems = group.items.filter(item => hasAccess(item.roles));
            
            // Skip rendering the entire group if no accessible items
            if (accessibleItems.length === 0) return null;
            
            return (
              <div key={groupIndex} className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{group.title}</h2>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {accessibleItems.map((item, itemIndex) => (
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
            );
          })}
        </div>
        
        {/* SuperAdmin Dashboard Section */}
        {isSuperAdmin && (
          <div className="space-y-6 mt-8">
            <div>
              <h2 className="text-xl font-semibold border-b pb-2">Staff Overview</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Teaching Staff</span>
                    <GraduationCap className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">{totalTeachers}</div>
                    <p className="text-sm text-gray-500 mt-2">Total Teachers</p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-medium">{activeTeachers}</div>
                        <div className="text-xs text-gray-500">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">{totalTeachers - activeTeachers}</div>
                        <div className="text-xs text-gray-500">Inactive</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Non-Teaching Staff</span>
                    <Briefcase className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">{totalEmployees}</div>
                    <p className="text-sm text-gray-500 mt-2">Total Employees</p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-medium">{activeEmployees}</div>
                        <div className="text-xs text-gray-500">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">{totalEmployees - activeEmployees}</div>
                        <div className="text-xs text-gray-500">Inactive</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Average Tenure</span>
                    <Clock className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-amber-500">{averageTenure}</div>
                    <p className="text-sm text-gray-500 mt-2">Years</p>
                    <div className="mt-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">Staff retention rate</div>
                        <div className="text-xs text-gray-500">87% annual retention</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-4">
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Staff Distribution by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-gray-500">Interactive charts will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
} 