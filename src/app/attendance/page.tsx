"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Clock,
  UserCheck,
  FileText,
  CalendarCheck,
  BarChart2,
  Users,
  AlertCircle,
  PieChart,
  MapPin,
  Settings,
  FileBarChart,
  Calendar,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";

const attendanceGroups = [
  {
    title: "Daily Attendance",
    description: "Mark and manage daily attendance records",
    items: [
      {
        title: "Mark Attendance",
        description: "Record your daily attendance",
        icon: <Clock className="h-6 w-6" />,
        href: "/attendance/mark",
        roles: ["teacher", "employee", "admin", "superadmin"],
      },
      {
        title: "Student Attendance",
        description: "Mark and track student attendance",
        icon: <UserCheck className="h-6 w-6" />,
        href: "/attendance/students",
        roles: ["teacher", "admin", "superadmin"],
      },
    ],
  },
  {
    title: "Reports & Analysis",
    description: "View and export attendance reports",
    items: [
      {
        title: "Staff Reports",
        description: "View staff attendance records and patterns",
        icon: <FileText className="h-6 w-6" />,
        href: "/attendance/reports/staff",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Student Reports",
        description: "View student attendance statistics",
        icon: <FileBarChart className="h-6 w-6" />,
        href: "/attendance/reports/students",
        roles: ["teacher", "admin", "superadmin"],
      },
      {
        title: "Attendance Analytics",
        description: "Interactive charts and attendance trends",
        icon: <BarChart2 className="h-6 w-6" />,
        href: "/attendance/reports/analytics",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Monthly Overview",
        description: "Monthly attendance summary reports",
        icon: <Calendar className="h-6 w-6" />,
        href: "/attendance/reports/monthly",
        roles: ["admin", "superadmin"],
      },
    ],
  },
  {
    title: "Administration",
    description: "Manage attendance policies and settings",
    items: [
      {
        title: "Manage Exceptions",
        description: "Handle attendance exceptions and requests",
        icon: <AlertCircle className="h-6 w-6" />,
        href: "/attendance/admin/exceptions",
        roles: ["admin", "superadmin"],
        disabled: true,
      },
      {
        title: "Attendance Locations",
        description: "View and manage attendance locations",
        icon: <MapPin className="h-6 w-6" />,
        href: "/settings/attendance-locations",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Location Settings",
        description: "Configure attendance location parameters",
        icon: <Settings className="h-6 w-6" />,
        href: "/settings/location-config",
        roles: ["admin", "superadmin"],
      },
    ],
  },
];

export default function AttendancePage() {
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin } = useUserRole();
  
  console.log("Attendance Dashboard - Role checks:", { 
    isTeacher, 
    isEmployee, 
    isAdmin, 
    isSuperAdmin 
  });

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
          <h1 className="text-3xl font-bold text-[#00501B]">Attendance Dashboard</h1>
          <p className="mt-2 text-gray-500">
            Manage, track, and report on attendance across your institution
          </p>
        </div>

        <div className="space-y-8">
          {attendanceGroups.map((group, groupIndex) => {
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
              <h2 className="text-xl font-semibold border-b pb-2">Administration Dashboard</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Staff Attendance Today</span>
                    <PieChart className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">87%</div>
                    <p className="text-sm text-gray-500 mt-2">Present Rate</p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-medium">45</div>
                        <div className="text-xs text-gray-500">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">7</div>
                        <div className="text-xs text-gray-500">Absent</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Student Attendance</span>
                    <Users className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">92%</div>
                    <p className="text-sm text-gray-500 mt-2">Present Rate</p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-medium">230</div>
                        <div className="text-xs text-gray-500">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">20</div>
                        <div className="text-xs text-gray-500">Absent</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Late Check-ins</span>
                    <Clock className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-amber-500">12</div>
                    <p className="text-sm text-gray-500 mt-2">Late Today</p>
                    <div className="mt-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">8 Teachers, 4 Staff</div>
                        <div className="text-xs text-gray-500">Average delay: 15 minutes</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-4">
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">This Month's Attendance Trend</CardTitle>
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