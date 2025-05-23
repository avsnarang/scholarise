"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { LeaveBalanceCard } from "@/components/leaves/leave-balance-card";
import { LeaveApplicationsList } from "@/components/leaves/leave-applications-list";
import { LeavePoliciesList } from "@/components/leaves/leave-policies-list";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  PieChart,
  BarChart2,
} from "lucide-react";

const leaveGroups = [
  {
    title: "Leave Management",
    description: "Manage and track leave applications",
    items: [
      {
        title: "Apply for Leave",
        description: "Submit a new leave application",
        icon: <Calendar className="h-6 w-6" />,
        href: "/leaves",
        roles: ["teacher", "employee"],
      },
      {
        title: "Leave Applications",
        description: "View and manage leave applications",
        icon: <FileText className="h-6 w-6" />,
        href: "/leaves",
        roles: ["teacher", "employee", "admin", "superadmin"],
      },
      {
        title: "Leave Policies",
        description: "Manage leave policies and rules",
        icon: <Users className="h-6 w-6" />,
        href: "/leaves?tab=policies",
        roles: ["admin", "superadmin"],
      },
    ],
  },
  {
    title: "Reports & Analysis",
    description: "View leave statistics and reports",
    items: [
      {
        title: "Leave Analytics",
        description: "Interactive charts and leave trends",
        icon: <BarChart2 className="h-6 w-6" />,
        href: "/leaves/reports/analytics",
        roles: ["admin", "superadmin"],
      },
      {
        title: "Monthly Overview",
        description: "Monthly leave summary reports",
        icon: <PieChart className="h-6 w-6" />,
        href: "/leaves/reports/monthly",
        roles: ["admin", "superadmin"],
      },
    ],
  },
];

export default function LeaveDashboardPage() {
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin, teacherId, employeeId } = useUserRole();
  const { currentBranchId } = useBranchContext();

  // Fetch leave policies
  const { data: policies } = api.leave.getPolicies.useQuery(
    { branchId: currentBranchId || "" },
    { enabled: !!currentBranchId }
  );

  // Fetch leave balance
  const { data: leaveBalance } = api.leave.getLeaveBalance.useQuery(
    {
      teacherId,
      employeeId,
      year: new Date().getFullYear(),
    },
    { enabled: !!(teacherId || employeeId) }
  );

  // Fetch recent applications
  const {
    data: applications,
    isLoading,
    error,
  } = api.leave.getApplications.useQuery(
    { teacherId, employeeId },
    {
      refetchOnWindowFocus: false,
    },
  );

  if (error) {
    console.error("Error fetching applications:", error);
    // Optionally, you can display an error message to the user here
  }

  // Calculate metrics
  const totalPolicies = policies?.length || 0;
  const pendingApplications = applications?.length || 0;
  const totalLeaveDays = leaveBalance?.reduce((sum, balance) => sum + balance.totalDays, 0) || 0;
  const usedLeaveDays = leaveBalance?.reduce((sum, balance) => sum + balance.usedDays, 0) || 0;

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
          <h1 className="text-3xl font-bold text-[#00501B]">Leave Management Dashboard</h1>
          <p className="mt-2 text-gray-500">
            Overview of leave policies, balances, and applications
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPolicies}</div>
              <p className="text-xs text-muted-foreground">
                Active leave policies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApplications}</div>
              <p className="text-xs text-muted-foreground">
                Applications awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeaveDays}</div>
              <p className="text-xs text-muted-foreground">
                Available leave days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used Leave Days</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usedLeaveDays}</div>
              <p className="text-xs text-muted-foreground">
                Leave days utilized
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Leave Balance Cards */}
        {leaveBalance && leaveBalance.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Leave Balances</h2>
              <p className="text-sm text-gray-500">Your current leave balances</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveBalance.map((balance) => (
                <LeaveBalanceCard key={balance.id} balance={balance} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Access Cards */}
        <div className="space-y-8">
          {leaveGroups.map((group, groupIndex) => {
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
                      className="overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#00501B]/30 cursor-pointer"
                    >
                      <a href={item.href} className="h-full block">
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
                      </a>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Applications */}
        {applications && applications.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Recent Applications</h2>
              <p className="text-sm text-gray-500">Latest leave applications</p>
            </div>
            <Card>
              <CardContent className="p-0">
                <LeaveApplicationsList
                  teacherId={teacherId}
                  employeeId={employeeId}
                  isAdmin={isAdmin || isSuperAdmin}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageWrapper>
  );
} 