"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  GraduationCap,
  Briefcase, 
  Building,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  BarChart3,
  PieChart,
  Settings,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  Target,
  Database,
  Shield,
  Globe,
  Calendar,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import { formatIndianNumber, formatIndianCurrency } from "@/lib/utils";
import VerticalBarChart from "@/components/ui/vertical-bar-chart";

interface StatsCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatsCard({ title, value, description, icon, color = "text-[#00501B]", trend }: StatsCardProps) {
  return (
    <Card className="shadow-sm border border-[#00501B]/10 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-muted-foreground">{description}</p>
              {trend && (
                <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
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

export default function ERPManagerDashboard() {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const { isSuperAdmin: isPermissionsSuperAdmin, hasRole } = usePermissions();
  const { currentSessionId } = useAcademicSessionContext();
  const [activeTab, setActiveTab] = useState("overview");

  // Check if user has access (Admin, Super Admin, CBSE In-Charge, or ERP In-Charge role)
  const isCBSEInCharge = hasRole("CBSE In-Charge") || hasRole("cbse_in_charge");
  const isERPInCharge = hasRole("ERP In-Charge") || hasRole("erp_in_charge");
  const hasAccess = isAdmin || isSuperAdmin || isPermissionsSuperAdmin || isCBSEInCharge || isERPInCharge;

  // Fetch ERP Manager dashboard data
  const { data: dashboardData, isLoading, error } = api.dashboard.getERPManagerDashboard.useQuery(
    {
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: hasAccess,
      refetchOnWindowFocus: false,
    }
  );

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
          <p className="text-gray-600">This dashboard is only available for CBSE In-Charge, ERP In-Charge, Administrators, and Super Admins. Please contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    console.error("ERP Manager dashboard error:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Error Loading Dashboard</h3>
          <p className="text-gray-600">There was an error loading the dashboard data. Please try refreshing the page.</p>
          <p className="text-sm text-red-600 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <Database className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
          <p className="text-gray-600">Dashboard data is not available at the moment.</p>
        </div>
      </div>
    );
  }

  const { systemOverview, branchDistribution, todayActivity, financialOverview, systemHealth, departmentDistribution } = dashboardData;

  // Prepare chart data for branch distribution
  const branchChartData = branchDistribution.map(branch => ({
    name: branch.name,
    Students: branch.studentCount,
    Teachers: branch.teacherCount,
    Employees: branch.employeeCount
  }));

  // Prepare department chart data
  const departmentChartData = departmentDistribution.map(dept => ({
    name: dept.department,
    value: dept.count
  }));

  const todayDate = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <div className="w-full p-6 bg-white min-h-screen">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E40AF]/80 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {isCBSEInCharge ? "CBSE In-Charge Dashboard" : 
                 isERPInCharge ? "ERP In-Charge Dashboard" : 
                 "Management Dashboard"}
              </h1>
              <p className="text-white/80 mt-1">Comprehensive system overview and analytics</p>
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center text-blue-200">
                  <Activity className="h-4 w-4 mr-1" />
                  <span className="text-sm">System-wide Analytics</span>
                </div>
                <div className="flex items-center text-blue-200">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="text-sm">Multi-branch Access</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm">Last Updated</p>
              <p className="text-xl font-semibold">{todayDate}</p>
              <p className="text-white/60 text-xs">
                {new Date(dashboardData.lastUpdated).toLocaleTimeString('en-IN', { 
                  hour12: true, 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* System Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Students"
            value={formatIndianNumber(systemOverview.activeStudents)}
            description={`${formatIndianNumber(systemOverview.totalStudents)} total enrolled`}
            icon={<GraduationCap className="h-6 w-6" />}
            trend={{ value: systemOverview.recentEnrollments, isPositive: true }}
          />
          <StatsCard
            title="Total Staff"
            value={formatIndianNumber(systemOverview.totalStaff)}
            description={`${formatIndianNumber(systemOverview.activeTeachers)} teachers, ${formatIndianNumber(systemOverview.activeEmployees)} employees`}
            icon={<Users className="h-6 w-6" />}
            trend={{ value: systemOverview.totalRecentStaff, isPositive: true }}
          />
          <StatsCard
            title="Branches"
            value={systemOverview.totalBranches}
            description="Active locations"
            icon={<Building className="h-6 w-6" />}
            color="text-[#7C3AED]"
          />
          <StatsCard
            title="Classes/Sections"
            value={`${systemOverview.totalClasses}/${systemOverview.totalSections}`}
            description="Active academic units"
            icon={<Target className="h-6 w-6" />}
            color="text-[#DC2626]"
          />
        </div>

        {/* Today's Activity & Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Today's Attendance"
            value={todayActivity.staffAttendance}
            description="Staff members marked"
            icon={<UserCheck className="h-6 w-6" />}
            color="text-[#059669]"
          />
          <StatsCard
            title="New Enrollments"
            value={todayActivity.newEnrollments}
            description="Today's admissions"
            icon={<Users className="h-6 w-6" />}
            color="text-[#0891B2]"
          />
          {financialOverview && (
            <>
              <StatsCard
                title="Fee Collection"
                value={formatIndianCurrency(financialOverview.totalCollected)}
                description="This academic year"
                icon={<DollarSign className="h-6 w-6" />}
                color="text-[#059669]"
              />
              <StatsCard
                title="Active Users"
                value={systemHealth.activeUsers}
                description={`${systemHealth.totalUsers} total users`}
                icon={<Activity className="h-6 w-6" />}
                color="text-[#7C3AED]"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="shadow-sm border border-[#1E40AF]/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Settings className="h-5 w-5 mr-2 text-[#1E40AF]" />
              Management Actions
            </CardTitle>
            <CardDescription>Quick access to key management functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Link href="/students">
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#1E40AF] hover:text-white transition-colors"
                >
                  <GraduationCap className="h-5 w-5" />
                  <span className="text-sm">Students</span>
                </Button>
              </Link>
              <Link href="/staff">
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#1E40AF] hover:text-white transition-colors"
                >
                  <Users className="h-5 w-5" />
                  <span className="text-sm">Staff</span>
                </Button>
              </Link>
              <Link href="/finance">
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#1E40AF] hover:text-white transition-colors"
                >
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm">Finance</span>
                </Button>
              </Link>
              <Link href="/attendance">
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#1E40AF] hover:text-white transition-colors"
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-sm">Attendance</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#1E40AF] hover:text-white transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Settings</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#1E40AF] hover:text-white transition-colors"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-sm">Analytics</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/30">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#1E40AF]"
            >
              <Building className="w-4 h-4 mr-2" />
              Branch Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="departments" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#1E40AF]"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#1E40AF]"
            >
              <Database className="w-4 h-4 mr-2" />
              System Health
            </TabsTrigger>
          </TabsList>

          {/* Branch Analysis Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Branch Distribution Chart */}
              <Card className="shadow-sm border border-[#1E40AF]/10">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Branch-wise Distribution</CardTitle>
                  <CardDescription>Students and staff across branches</CardDescription>
                </CardHeader>
                <CardContent>
                  {branchChartData.length > 0 ? (
                    <VerticalBarChart 
                      data={branchChartData.map(branch => ({
                        name: branch.name,
                        value: branch.Students + branch.Teachers + branch.Employees
                      }))}
                      title="Total Staff by Branch"
                      metricLabel="Total Staff"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No branch data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Branch Performance Table */}
              <Card className="shadow-sm border border-[#1E40AF]/10">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Branch Performance</CardTitle>
                  <CardDescription>Detailed branch statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {branchDistribution.map((branch) => (
                      <div key={branch.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium">{branch.name}</h4>
                          <p className="text-sm text-muted-foreground">Code: {branch.code}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex space-x-4 text-sm">
                            <span className="text-green-600">{formatIndianNumber(branch.studentCount)} students</span>
                            <span className="text-blue-600">{branch.teacherCount} teachers</span>
                            <span className="text-purple-600">{branch.employeeCount} employees</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total staff: {branch.totalStaff}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Distribution */}
              <Card className="shadow-sm border border-[#1E40AF]/10">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Department Distribution</CardTitle>
                  <CardDescription>Employee count by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {departmentDistribution.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Briefcase className="h-5 w-5 text-[#1E40AF]" />
                          <span className="font-medium">{dept.department}</span>
                        </div>
                        <Badge variant="secondary">{dept.count} employees</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Department Insights */}
              <Card className="shadow-sm border border-[#1E40AF]/10">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Department Insights</CardTitle>
                  <CardDescription>Key department metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-900">Largest Department</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        {departmentDistribution.length > 0 && 
                          departmentDistribution.reduce((max, dept) => dept.count > max.count ? dept : max).department
                        } with {departmentDistribution.length > 0 && 
                          departmentDistribution.reduce((max, dept) => dept.count > max.count ? dept : max).count
                        } employees
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Total Departments</span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        {departmentDistribution.length} active departments
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-900">Average Department Size</span>
                      </div>
                      <p className="text-purple-700 text-sm mt-1">
                        {departmentDistribution.length > 0 ? 
                          Math.round(departmentDistribution.reduce((sum, dept) => sum + dept.count, 0) / departmentDistribution.length)
                          : 0} employees per department
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Health Metrics */}
              <Card className="shadow-sm border border-[#1E40AF]/10">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">System Health</CardTitle>
                  <CardDescription>Core system metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Database className="h-5 w-5 text-[#1E40AF]" />
                        <span className="font-medium">Total Users</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {systemHealth.totalUsers}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {systemHealth.activeUsers} active
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building className="h-5 w-5 text-[#1E40AF]" />
                        <span className="font-medium">Active Branches</span>
                      </div>
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        {systemHealth.totalBranches}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-[#1E40AF]" />
                        <span className="font-medium">Academic Sessions</span>
                      </div>
                      <Badge variant="default" className="bg-purple-100 text-purple-800">
                        {systemHealth.activeSessions}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Activity */}
              <Card className="shadow-sm border border-[#1E40AF]/10">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Today's Activity</CardTitle>
                  <CardDescription>Real-time system activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Staff Attendance</span>
                        </div>
                        <span className="text-xl font-bold text-blue-600">
                          {todayActivity.staffAttendance}
                        </span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">Staff members marked attendance today</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">New Enrollments</span>
                        </div>
                        <span className="text-xl font-bold text-green-600">
                          {todayActivity.newEnrollments}
                        </span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">New student enrollments today</p>
                    </div>
                    {financialOverview && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-5 w-5 text-yellow-600" />
                            <span className="font-medium text-yellow-900">Fee Collection</span>
                          </div>
                        </div>
                        <p className="text-yellow-700 text-sm mt-1">
                          {formatIndianCurrency(financialOverview.totalCollected)} collected this year
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 