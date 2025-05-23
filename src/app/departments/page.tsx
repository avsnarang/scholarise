"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Building,
  FolderPlus,
  LineChart,
  Users,
  BookOpen,
  ClipboardList,
  Settings,
  LayoutGrid
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";

const departmentGroups = [
  {
    title: "Department Management",
    description: "Create and manage academic and administrative departments",
    items: [
      {
        title: "All Departments",
        description: "View and manage all departments",
        icon: <Building className="h-6 w-6" />,
        href: "/departments/list",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Add Department",
        description: "Create a new department",
        icon: <FolderPlus className="h-6 w-6" />,
        href: "/departments/create",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Department Structure",
        description: "View organizational hierarchy",
        icon: <LayoutGrid className="h-6 w-6" />,
        href: "/departments/structure",
        roles: ["admin", "superadmin"],
        disabled: true,
      },
    ],
  },
  {
    title: "Reports & Analysis",
    description: "Department reports and analytical tools",
    items: [
      {
        title: "Department Staff",
        description: "Staff distribution across departments",
        icon: <Users className="h-6 w-6" />,
        href: "/departments/staff",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Department Performance",
        description: "Performance metrics by department",
        icon: <LineChart className="h-6 w-6" />,
        href: "/departments/performance",
        roles: ["admin", "superadmin"],
        disabled: true,
      },
      {
        title: "Resource Allocation",
        description: "View resource distribution by department",
        icon: <ClipboardList className="h-6 w-6" />,
        href: "/departments/resources",
        roles: ["admin", "superadmin"],
        disabled: true,
      },
    ],
  },
  {
    title: "Administration",
    description: "Department settings and configuration",
    items: [
      {
        title: "Department Settings",
        description: "Configure department settings",
        icon: <Settings className="h-6 w-6" />,
        href: "/settings/departments",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Academic Departments",
        description: "Manage subject and course allocations",
        icon: <BookOpen className="h-6 w-6" />,
        href: "/departments/academic",
        roles: ["admin", "superadmin"],
      },
    ],
  },
];

// Sample department data for demo purposes
const sampleDepartments = [
  { id: 1, name: "Mathematics", staffCount: 12, headOfDepartment: "Dr. Smith", type: "Academic" },
  { id: 2, name: "Science", staffCount: 15, headOfDepartment: "Prof. Johnson", type: "Academic" },
  { id: 3, name: "English", staffCount: 10, headOfDepartment: "Dr. Williams", type: "Academic" },
  { id: 4, name: "Administration", staffCount: 8, headOfDepartment: "Mrs. Davis", type: "Administrative" },
  { id: 5, name: "Finance", staffCount: 5, headOfDepartment: "Mr. Brown", type: "Administrative" },
  { id: 6, name: "IT Services", staffCount: 7, headOfDepartment: "Ms. Miller", type: "Administrative" },
];

export default function DepartmentsPage() {
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin } = useUserRole();
  
  console.log("Departments Page - Role checks:", { 
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

  // Count departments by type
  const academicCount = sampleDepartments.filter(d => d.type === "Academic").length;
  const adminCount = sampleDepartments.filter(d => d.type === "Administrative").length;
  const totalStaff = sampleDepartments.reduce((sum, dept) => sum + dept.staffCount, 0);

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Department Management</h1>
          <p className="mt-2 text-gray-500">
            Create, manage and monitor departments across your institution
          </p>
        </div>

        <div className="space-y-8">
          {departmentGroups.map((group, groupIndex) => {
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
        
        {/* Admin/SuperAdmin Dashboard Section */}
        {(isAdmin || isSuperAdmin) && (
          <div className="space-y-6 mt-8">
            <div>
              <h2 className="text-xl font-semibold border-b pb-2">Department Overview</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Total Departments</span>
                    <Building className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">{sampleDepartments.length}</div>
                    <p className="text-sm text-gray-500 mt-2">Active Departments</p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-medium">{academicCount}</div>
                        <div className="text-xs text-gray-500">Academic</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">{adminCount}</div>
                        <div className="text-xs text-gray-500">Administrative</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Staff Distribution</span>
                    <Users className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">{totalStaff}</div>
                    <p className="text-sm text-gray-500 mt-2">Total Staff</p>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-medium">{Math.round(totalStaff / sampleDepartments.length)}</div>
                        <div className="text-xs text-gray-500">Avg. Per Dept</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">{Math.max(...sampleDepartments.map(d => d.staffCount))}</div>
                        <div className="text-xs text-gray-500">Largest Dept</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Department Heads</span>
                    <Users className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-amber-500">{sampleDepartments.length}</div>
                    <p className="text-sm text-gray-500 mt-2">Department Heads</p>
                    <div className="mt-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">All departments have assigned heads</div>
                        <div className="text-xs text-gray-500">Updated 3 days ago</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-4">
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Recent Department Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-gray-500">Updates to department structure will appear here</p>
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