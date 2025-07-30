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
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  GraduationCap,
  ClipboardList,
  MapPin,
  AlertCircle,
  TrendingUp,
  FileText,
  PlusCircle,
  Eye
} from "lucide-react";
import Link from "next/link";
import { formatIndianNumber } from "@/lib/utils";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";
import { useAuth } from "@/hooks/useAuth";

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

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: number;
  color?: string;
}

function StatsCard({ title, value, description, icon, loading = false, trend, color = "text-[#00501B]" }: StatsCardProps) {
  if (loading) {
    return (
      <Card className="shadow-sm border border-[#00501B]/10">
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-[#00501B]/10 hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold mt-1">{typeof value === 'number' ? formatIndianNumber(value) : value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center mt-2">
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1 rotate-180" />
                )}
                <span className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <div className={`mt-1 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeacherDashboardContent() {
  const { teacherId, isTeacher, teacher: teacherProfile, isSuperAdmin } = useUserRole();
  const { isSuperAdmin: isPermissionsSuperAdmin } = usePermissions();
  const { currentSessionId } = useAcademicSessionContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Check if user is superadmin
  const isEffectiveSuperAdmin = isSuperAdmin || isPermissionsSuperAdmin;

  // Debug logging
  console.log("Teacher Dashboard Debug:", {
    teacherId,
    isTeacher,
    hasTeacherData: !!teacherProfile,
    currentSessionId,
    userId: user?.id,
    userRole: user?.role,
    userRoles: user?.roles
  });

  // Also check the teacher query independently for debugging
  const { data: teacherDebugData, error: teacherDebugError } = api.teacher.getByUserId.useQuery(
    { userId: user?.id || "" },
    { 
      enabled: !!user?.id,
      refetchOnWindowFocus: false,
    }
  );

  console.log("Teacher Debug Query:", {
    teacherDebugData,
    teacherDebugError,
    queryEnabled: !!user?.id
  });

  // Determine if we should run the dashboard query
  const shouldFetchDashboard = (!!teacherId && isTeacher) || (isEffectiveSuperAdmin && !!teacherId);
  
  // Fetch teacher dashboard data - only when we have valid parameters
  const { data: dashboardData, isLoading, error } = api.teacher.getDashboardData.useQuery(
    {
      teacherId: teacherId || "invalid", // This will only be called when enabled=true, so teacherId will exist
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: shouldFetchDashboard,
      refetchOnWindowFocus: false,
    }
  );

  // Enhanced error logging
  if (error) {
    console.error("Teacher Dashboard Error:", {
      error,
      errorMessage: error?.message || "Unknown error",
      errorData: error?.data,
      teacherId,
      isTeacher,
      currentSessionId
    });
    
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Error Loading Dashboard</h3>
          <p className="text-gray-600">There was an error loading your dashboard data. Please try again later.</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Debug Info (Development Only)</summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded max-w-md overflow-auto">
                {JSON.stringify({
                  teacherId,
                  isTeacher,
                  hasTeacherData: !!teacherProfile,
                  currentSessionId,
                  userId: user?.id,
                  errorMessage: error?.message || "Unknown error",
                  errorData: error?.data,
                  teacherDebugData,
                  teacherDebugError: (teacherDebugError as any)?.message
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // Show loading if we don't have teacher ID yet but we should (only for actual teachers, not superadmins)
  if (isTeacher && !teacherId && !isEffectiveSuperAdmin) {
    // Check if the teacher query has completed to determine if it's a missing record issue
    if (teacherDebugData === null && !teacherDebugError) {
      // User is marked as teacher but no teacher record exists
      return (
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold text-gray-900">Teacher Profile Not Found</h3>
            <p className="text-gray-600 mt-2">
              You are registered as a teacher, but your teacher profile is not set up in the system.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Please contact your administrator to create your teacher profile.
            </p>
            <div className="mt-4 space-y-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to Main Dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/staff/teachers">View All Teachers</Link>
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Debug Info (Development Only)</summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded max-w-md overflow-auto">
                  {JSON.stringify({
                    userId: user?.id,
                    isTeacher,
                    teacherId,
                    teacherDebugData,
                    teacherDebugError: (teacherDebugError as any)?.message,
                    solution: "Create a Teacher record with clerkId = " + user?.id
                  }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // Still loading teacher data
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Loading Teacher Profile</h3>
          <p className="text-gray-600">Please wait while we load your teacher information...</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Debug Info (Development Only)</summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded max-w-md overflow-auto">
                {JSON.stringify({
                  userId: user?.id,
                  isTeacher,
                  teacherId,
                  teacherDebugData,
                  teacherDebugError: (teacherDebugError as any)?.message
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // Special case for superadmins without teacher records
  if (isEffectiveSuperAdmin && !teacherId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <GraduationCap className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Teacher Dashboard Preview</h3>
          <p className="text-gray-600">As a super administrator, you can view the teacher dashboard layout, but you don't have teacher-specific data.</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/staff/teachers">View All Teachers</Link>
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Debug Info (Development Only)</summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded max-w-md overflow-auto">
                {JSON.stringify({
                  userId: user?.id,
                  isTeacher,
                  isSuperAdmin,
                  isPermissionsSuperAdmin,
                  isEffectiveSuperAdmin,
                  teacherId,
                  teacherDebugData,
                  teacherDebugError: (teacherDebugError as any)?.message
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <GraduationCap className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
          <p className="text-gray-600">Your teacher profile is not yet set up or you don't have any assigned classes.</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Debug Info (Development Only)</summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded max-w-md overflow-auto">
                {JSON.stringify({
                  teacherId,
                  isTeacher,
                  hasTeacherData: !!teacherProfile,
                  currentSessionId,
                  queryEnabled: !!teacherId && isTeacher,
                  userId: user?.id,
                  teacherDebugData,
                  teacherDebugError: (teacherDebugError as any)?.message
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  const { teacher, stats, sections, subjectAssignments, recentLeaveApplications, studentAttendanceSummary, todayAttendance } = dashboardData;

  // Prepare attendance chart data
  const attendanceChartData = studentAttendanceSummary ? [
    { name: "Present", value: studentAttendanceSummary.PRESENT || 0 },
    { name: "Absent", value: studentAttendanceSummary.ABSENT || 0 },
    { name: "Late", value: studentAttendanceSummary.LATE || 0 },
    { name: "Half Day", value: studentAttendanceSummary.HALF_DAY || 0 },
  ].filter(item => item.value > 0) : [];

  const totalStudentAttendance = attendanceChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#00501B] to-[#00501B]/80 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {teacher.firstName}!</h1>
            <p className="text-white/80 mt-1">
              {teacher.designation && `${teacher.designation} • `}
              {teacher.employeeCode && `ID: ${teacher.employeeCode}`}
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
          title="My Students"
          value={stats.totalStudents}
          description="Across all sections"
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="My Classes"
          value={stats.totalClasses}
          description="Assigned sections"
          icon={<GraduationCap className="h-6 w-6" />}
        />
        <StatsCard
          title="Subjects"
          value={stats.totalSubjects}
          description="Teaching assignments"
          icon={<BookOpen className="h-6 w-6" />}
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
            <Link href="/attendance/students">
              <Button 
                variant="outline" 
                className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#00501B] hover:text-white transition-colors"
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Student Attendance</span>
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
            <Link href="/question-papers">
              <Button 
                variant="outline" 
                className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-[#00501B] hover:text-white transition-colors"
              >
                <FileText className="h-5 w-5" />
                <span className="text-sm">Question Papers</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#00501B]"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Classes
          </TabsTrigger>
          <TabsTrigger 
            value="attendance" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#00501B]"
          >
            <Clock className="w-4 h-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger 
            value="leaves" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#00501B]"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Leaves
          </TabsTrigger>
        </TabsList>

        {/* Classes Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assigned Sections */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">My Sections</CardTitle>
                <CardDescription>Classes and sections assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                {sections.length > 0 ? (
                  <div className="space-y-3">
                    {sections.map((section: any) => (
                      <div key={section.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium">{section.className} - {section.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatIndianNumber(section.studentCount)} students
                          </p>
                        </div>
                        <Link href={`/attendance/students?section=${section.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No sections assigned yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Subject Assignments */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Subject Assignments</CardTitle>
                <CardDescription>Subjects you are teaching</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {subjectAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium">{assignment.subjectName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {assignment.className} • {assignment.sectionName}
                          </p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No subject assignments found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Student Attendance */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Today's Student Attendance</CardTitle>
                <CardDescription>Attendance summary for your classes</CardDescription>
              </CardHeader>
              <CardContent>
                {totalStudentAttendance > 0 ? (
                  <div className="space-y-4">
                    <VerticalBarChart
                      data={attendanceChartData}
                      index="name"
                      categories={["value"]}
                      colors={["green"]}
                      valueFormatter={(value: number) => `${formatIndianNumber(value)}`}
                      className="h-64"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      {attendanceChartData.map((item, index) => (
                        <div key={index} className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-2xl font-bold">{formatIndianNumber(item.value)}</div>
                          <div className="text-sm text-muted-foreground">{item.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No attendance data for today yet.</p>
                    <Link href="/attendance/students">
                      <Button className="mt-4" size="sm">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Mark Student Attendance
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Attendance Status */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">My Attendance</CardTitle>
                <CardDescription>Your attendance status and history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">Today's Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {todayAttendance ? `Marked at ${new Date(todayAttendance.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Not marked yet'}
                      </p>
                    </div>
                    {todayAttendance ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">This Week</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatIndianNumber(stats.weekAttendanceCount)} days marked
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-[#00501B]">
                      {formatIndianNumber(stats.weekAttendanceCount)}/7
                    </div>
                  </div>

                  {!todayAttendance && (
                    <Link href="/attendance/mark">
                      <Button className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        Mark My Attendance
                      </Button>
                    </Link>
                  )}
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
                <CardDescription>Your leave allocation and usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Allocated</span>
                    <span className="text-lg font-bold">{formatIndianNumber(stats.totalLeaveBalance)} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Used</span>
                    <span className="text-lg font-bold text-red-500">{formatIndianNumber(stats.usedLeave)} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Remaining</span>
                    <span className="text-lg font-bold text-green-500">
                      {formatIndianNumber(stats.totalLeaveBalance - stats.usedLeave)} days
                    </span>
                  </div>
                  
                  {stats.pendingApplications > 0 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Pending Applications
                        </span>
                      </div>
                      <span className="text-lg font-bold text-yellow-600">
                        {formatIndianNumber(stats.pendingApplications)}
                      </span>
                    </div>
                  )}
                </div>
                
                <Link href="/leaves/application">
                  <Button className="w-full mt-4">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Apply for Leave
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card className="shadow-sm border border-[#00501B]/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Applications</CardTitle>
                <CardDescription>Your latest leave applications</CardDescription>
              </CardHeader>
              <CardContent>
                {recentLeaveApplications.length > 0 ? (
                  <div className="space-y-3">
                    {recentLeaveApplications.map((application: any) => (
                      <div key={application.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {new Date(application.startDate).toLocaleDateString('en-IN')} - {new Date(application.endDate).toLocaleDateString('en-IN')}
                          </span>
                          <Badge 
                            variant={
                              application.status === 'APPROVED' ? 'default' :
                              application.status === 'REJECTED' ? 'destructive' : 'secondary'
                            }
                          >
                            {application.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{application.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No leave applications found.</p>
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

export default function TeacherDashboard() {
  const { isTeacher, teacherId, isSuperAdmin } = useUserRole();
  const { isSuperAdmin: isPermissionsSuperAdmin } = usePermissions();

  // Allow access for teachers or superadmins
  const hasAccess = isTeacher || isSuperAdmin || isPermissionsSuperAdmin;
  const effectiveTeacherId = teacherId || "superadmin-access";

  // Check if user has access (teacher or superadmin)
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
          <p className="text-gray-600">This dashboard is only available for teachers and administrators. Please contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // If superadmin but no teacher record, show a special message
  if ((isSuperAdmin || isPermissionsSuperAdmin) && !isTeacher && !teacherId) {
    return (
      <div className="w-full p-6 bg-white min-h-screen">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">Super Admin Access</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            You're viewing this as a super administrator. This dashboard is designed for teachers.
          </p>
        </div>
        <TeacherDashboardContent />
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white min-h-screen">
      <TeacherDashboardContent />
    </div>
  );
} 