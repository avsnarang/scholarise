"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building,
  ClipboardList,
  MapPin,
  AlertCircle,
  TrendingUp,
  FileText,
  PlusCircle,
  Eye,
  Settings
} from "lucide-react";
import Link from "next/link";
import { formatIndianNumber } from "@/lib/utils";
import VerticalBarChart from "@/components/ui/vertical-bar-chart";
import { useAuth } from "@/hooks/useAuth";

interface StatsCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  color?: string;
}

function StatsCard({ title, value, description, icon, color = "text-[#00501B]" }: StatsCardProps) {
  return (
    <Card className="shadow-sm border border-[#00501B]/10 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`${color} opacity-80`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeDashboardContent() {
  const { employeeId, isEmployee, employee: employeeProfile, isSuperAdmin } = useUserRole();
  const { isSuperAdmin: isPermissionsSuperAdmin } = usePermissions();
  const { currentSessionId } = useAcademicSessionContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Check if user is superadmin
  const isEffectiveSuperAdmin = isSuperAdmin || isPermissionsSuperAdmin;

  // Debug logging
  console.log("Employee Dashboard Debug:", {
    employeeId,
    isEmployee,
    hasEmployeeData: !!employeeProfile,
    currentSessionId,
    userId: user?.id,
    userRole: user?.role,
    userRoles: user?.roles
  });

  // Also check the employee query independently for debugging
  const { data: employeeDebugData, error: employeeDebugError } = api.employee.getByUserId.useQuery(
    { userId: user?.id || "" },
    { 
      enabled: !!user?.id,
      refetchOnWindowFocus: false,
    }
  );

  console.log("Employee Debug Query:", {
    employeeDebugData,
    employeeDebugError,
    queryEnabled: !!user?.id
  });

  // Determine if we should run the dashboard query
  const shouldFetchDashboard = (!!employeeId && isEmployee) || (isEffectiveSuperAdmin && !!employeeId);
  
  // Fetch employee dashboard data - only when we have valid parameters
  const { data: dashboardData, isLoading, error } = api.employee.getDashboardData.useQuery(
    {
      employeeId: employeeId || "invalid", // This will only be called when enabled=true, so employeeId will exist
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: shouldFetchDashboard,
      refetchOnWindowFocus: false,
    }
  );

  console.log("Employee Dashboard Query:", {
    dashboardData,
    isLoading,
    error,
    shouldFetchDashboard,
    employeeId,
    isEmployee
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    console.error("Employee dashboard error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Error Loading Dashboard</h3>
          <p className="text-gray-600">There was an error loading your dashboard data. Please try refreshing the page.</p>
          <p className="text-sm text-red-600 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <Building className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
          <p className="text-gray-600">Your employee profile is not yet set up or you don't have access to dashboard data.</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Debug Info (Development Only)</summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded max-w-md overflow-auto">
                {JSON.stringify({
                  employeeId,
                  isEmployee,
                  hasEmployeeData: !!employeeProfile,
                  currentSessionId,
                  queryEnabled: !!employeeId && isEmployee,
                  userId: user?.id,
                  employeeDebugData,
                  employeeDebugError: (employeeDebugError as any)?.message
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  const { employee, stats, recentLeaveApplications, todayAttendance } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#00501B] to-[#00501B]/80 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {employee.firstName}!</h1>
            <p className="text-white/80 mt-1">
              {employee.designation && `${employee.designation} • `}
              {employee.department && `${employee.department} • `}
              {employee.employeeCode && `ID: ${employee.employeeCode}`}
            </p>
            <div className="flex items-center mt-3 space-x-4">
              {todayAttendance ? (
                <div className="flex items-center text-green-200">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <span className="text-sm">Attendance marked today</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-200">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">Attendance not marked</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-sm">Today's Date</p>
            <p className="text-xl font-semibold">{new Date().toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Department Colleagues"
          value={stats.departmentColleagues}
          description="In your department"
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Department Tasks"
          value={stats.departmentTasks}
          description="Active assignments"
          icon={<ClipboardList className="h-6 w-6" />}
        />
        <StatsCard
          title="Week Attendance"
          value={stats.weekAttendanceCount}
          description="Days this week"
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatsCard
          title="Leave Balance"
          value={stats.totalLeaveBalance - stats.usedLeave}
          description={`${stats.usedLeave} days used`}
          icon={<Calendar className="h-6 w-6" />}
          color="text-[#A65A20]"
        />
      </div>

      {/* Quick Actions */}
      <Card className="shadow-sm border border-[#00501B]/10">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-[#00501B]" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/attendance/mark">
              <Button 
                variant="outline" 
                className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#00501B] hover:text-white transition-colors"
              >
                <MapPin className="h-5 w-5" />
                <span className="text-sm">Mark Attendance</span>
              </Button>
            </Link>
            <Link href="/leaves/application">
              <Button 
                variant="outline" 
                className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#00501B] hover:text-white transition-colors"
              >
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Apply Leave</span>
              </Button>
            </Link>
            <Link href="/staff/employees">
              <Button 
                variant="outline" 
                className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#00501B] hover:text-white transition-colors"
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">View Employees</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button 
                variant="outline" 
                className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#00501B] hover:text-white transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span className="text-sm">Profile Settings</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#00501B]"
          >
            <Building className="w-4 h-4 mr-2" />
            Department
          </TabsTrigger>
          <TabsTrigger 
            value="leaves" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#00501B]"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Leaves
          </TabsTrigger>
        </TabsList>

        {/* Department Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Info */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Department Information</CardTitle>
                <CardDescription>Your department and role details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">Department</h4>
                      <p className="text-sm text-muted-foreground">
                        {employee.department || "Not assigned"}
                      </p>
                    </div>
                    <Building className="h-5 w-5 text-[#00501B]" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">Designation</h4>
                      <p className="text-sm text-muted-foreground">
                        {employee.designation}
                      </p>
                    </div>
                    <Briefcase className="h-5 w-5 text-[#00501B]" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">Colleagues</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatIndianNumber(stats.departmentColleagues)} in your department
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-[#00501B]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Overview */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Attendance Overview</CardTitle>
                <CardDescription>Your attendance summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">Today's Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {todayAttendance ? "Marked" : "Not marked"}
                      </p>
                    </div>
                    {todayAttendance ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">This Week</h4>
                      <p className="text-sm text-muted-foreground">
                        {stats.weekAttendanceCount} days marked
                      </p>
                    </div>
                    <Clock className="h-5 w-5 text-[#00501B]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave Balance */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
                <CardDescription>Your current leave status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Allocated</span>
                    <span className="text-sm font-bold">{stats.totalLeaveBalance} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Used</span>
                    <span className="text-sm font-bold text-red-600">{stats.usedLeave} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Remaining</span>
                    <span className="text-sm font-bold text-green-600">
                      {stats.totalLeaveBalance - stats.usedLeave} days
                    </span>
                  </div>
                  {stats.pendingApplications > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pending Applications</span>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        {stats.pendingApplications}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Leave Applications */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Applications</CardTitle>
                <CardDescription>Your recent leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {recentLeaveApplications.length > 0 ? (
                  <div className="space-y-3">
                    {recentLeaveApplications.map((application: any) => (
                      <div key={application.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium text-sm">
                            {new Date(application.startDate).toLocaleDateString('en-IN')} - {new Date(application.endDate).toLocaleDateString('en-IN')}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {application.reason.substring(0, 30)}{application.reason.length > 30 ? "..." : ""}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            application.status === 'APPROVED' ? 'default' : 
                            application.status === 'REJECTED' ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {application.status}
                        </Badge>
                      </div>
                    ))}
                    <Link href="/leaves/application">
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Apply for Leave
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No recent leave applications</p>
                    <Link href="/leaves/application">
                      <Button variant="outline" size="sm" className="mt-3">
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Apply for Leave
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { isEmployee, employeeId, isSuperAdmin } = useUserRole();
  const { isSuperAdmin: isPermissionsSuperAdmin } = usePermissions();

  // Allow access for employees or superadmins
  const hasAccess = isEmployee || isSuperAdmin || isPermissionsSuperAdmin;
  const effectiveEmployeeId = employeeId || "superadmin-access";

  // Check if user has access (employee or superadmin)
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
          <p className="text-gray-600">This dashboard is only available for employees and administrators. Please contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // If superadmin but no employee record, show a special message
  if ((isSuperAdmin || isPermissionsSuperAdmin) && !isEmployee && !employeeId) {
    return (
      <div className="w-full p-6 bg-white min-h-screen">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">Super Admin Access</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            You're viewing this as a super administrator. This dashboard is designed for employees.
          </p>
        </div>
        <EmployeeDashboardContent />
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white min-h-screen">
      <EmployeeDashboardContent />
    </div>
  );
} 