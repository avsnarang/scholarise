"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Award,
  PlusCircle,
  BarChart,
  Users,
  Briefcase,
  Layers,
  Settings,
  GraduationCap,
  FileText
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";

const designationGroups = [
  {
    title: "Designation Management",
    description: "Create and manage staff job titles and positions",
    items: [
      {
        title: "All Designations",
        description: "View and manage all staff designations",
        icon: <Award className="h-6 w-6" />,
        href: "/designations/list",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Add Designation",
        description: "Create a new staff designation",
        icon: <PlusCircle className="h-6 w-6" />,
        href: "/designations/create",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Position Hierarchy",
        description: "Manage reporting structure",
        icon: <Layers className="h-6 w-6" />,
        href: "/designations/hierarchy",
        roles: ["admin", "superadmin"],
        disabled: true,
      },
    ],
  },
  {
    title: "Designation Categories",
    description: "Manage different types of designations",
    items: [
      {
        title: "Teaching Positions",
        description: "Manage academic teaching positions",
        icon: <GraduationCap className="h-6 w-6" />,
        href: "/designations/teaching",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Administrative Positions",
        description: "Manage administrative positions",
        icon: <Briefcase className="h-6 w-6" />,
        href: "/designations/administrative",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Job Descriptions",
        description: "Manage job descriptions for positions",
        icon: <FileText className="h-6 w-6" />,
        href: "/designations/job-descriptions",
        roles: ["admin", "superadmin"],
        disabled: true,
      },
    ],
  },
  {
    title: "Analytics & Settings",
    description: "Designation analytics and configuration",
    items: [
      {
        title: "Designation Distribution",
        description: "View staff distribution by designation",
        icon: <BarChart className="h-6 w-6" />,
        href: "/designations/analytics",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Designation Settings",
        description: "Configure designation settings",
        icon: <Settings className="h-6 w-6" />,
        href: "/settings/designations",
        roles: ["admin", "superadmin"],
      },
    ],
  },
];

// Sample designation data for demo purposes
const sampleDesignations = [
  { id: 1, title: "Principal", category: "Administrative", staffCount: 1, level: "Senior" },
  { id: 2, title: "Vice Principal", category: "Administrative", staffCount: 2, level: "Senior" },
  { id: 3, title: "Head of Department", category: "Academic", staffCount: 6, level: "Senior" },
  { id: 4, title: "Senior Teacher", category: "Academic", staffCount: 12, level: "Senior" },
  { id: 5, title: "Teacher", category: "Academic", staffCount: 25, level: "Mid" },
  { id: 6, title: "Junior Teacher", category: "Academic", staffCount: 18, level: "Junior" },
  { id: 7, title: "Administrative Officer", category: "Administrative", staffCount: 5, level: "Mid" },
  { id: 8, title: "Accountant", category: "Administrative", staffCount: 3, level: "Mid" },
  { id: 9, title: "IT Specialist", category: "Administrative", staffCount: 4, level: "Mid" },
  { id: 10, title: "Office Assistant", category: "Administrative", staffCount: 6, level: "Junior" },
];

export default function DesignationsPage() {
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin } = useUserRole();
  
  console.log("Designations Page - Role checks:", { 
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

  // Count designations by category and level
  const academicCount = sampleDesignations.filter(d => d.category === "Academic").length;
  const adminCount = sampleDesignations.filter(d => d.category === "Administrative").length;
  const totalStaff = sampleDesignations.reduce((sum, desig) => sum + desig.staffCount, 0);
  
  // Count by level
  const seniorCount = sampleDesignations.filter(d => d.level === "Senior").reduce((sum, d) => sum + d.staffCount, 0);
  const midCount = sampleDesignations.filter(d => d.level === "Mid").reduce((sum, d) => sum + d.staffCount, 0);
  const juniorCount = sampleDesignations.filter(d => d.level === "Junior").reduce((sum, d) => sum + d.staffCount, 0);

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Designation Management</h1>
          <p className="mt-2 text-gray-500">
            Create, manage and monitor staff designations across your institution
          </p>
        </div>

        <div className="space-y-8">
          {designationGroups.map((group, groupIndex) => {
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
              <h2 className="text-xl font-semibold border-b pb-2">Designation Overview</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Total Designations</span>
                    <Award className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">{sampleDesignations.length}</div>
                    <p className="text-sm text-gray-500 mt-2">Active Designations</p>
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
                    <span>Staff by Level</span>
                    <Layers className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-[#00501B]">{totalStaff}</div>
                    <p className="text-sm text-gray-500 mt-2">Staff Members</p>
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-medium">{seniorCount}</div>
                        <div className="text-xs text-gray-500">Senior</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">{midCount}</div>
                        <div className="text-xs text-gray-500">Mid-level</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-medium">{juniorCount}</div>
                        <div className="text-xs text-gray-500">Junior</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Position Distribution</span>
                    <Users className="h-5 w-5 text-[#00501B]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-amber-500">
                      {Math.round((totalStaff / sampleDesignations.length) * 10) / 10}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Avg. Staff per Designation</p>
                    <div className="mt-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">Most common: Teacher ({sampleDesignations.find(d => d.title === "Teacher")?.staffCount})</div>
                        <div className="text-xs text-gray-500">Last updated 2 days ago</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-4">
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Designation Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-gray-500">Designation distribution chart will appear here</p>
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