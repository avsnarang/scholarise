"use client";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { api } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchContext } from "@/hooks/useBranchContext";
import { BarChart3, GraduationCap, Users, BookOpen, CalendarClock, Building2 } from "lucide-react";
import { StudentsDataTable } from "@/components/students-data-table";
import { useState, useEffect, useMemo, memo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Constants
const HQ_BRANCH_ID = "headquarters"; // This should match what you set in the database

export default function Dashboard() {
  const { currentBranchId } = useBranchContext();
  const { isSuperAdmin } = usePermissions();
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [isHeadquarters, setIsHeadquarters] = useState(false);
  const [selectedAcademicSessionId, setSelectedAcademicSessionId] = useState<string | undefined>(undefined);
  
  // Check if current branch is headquarters
  useEffect(() => {
    setIsHeadquarters(currentBranchId === HQ_BRANCH_ID);
  }, [currentBranchId]);
  
  // Fetch student data with optional branch filter
  const { data: studentData } = api.student.getAll.useQuery(
    { 
      branchId: isHeadquarters ? undefined : currentBranchId || "",
      limit: 10,
      filters: {
        isActive: "true"
      }
    },
    { 
      enabled: !!currentBranchId,
    }
  );
  
  // Optimize data fetching with SWR
  const { data: allBranchesStats, error: statsError, isLoading: isLoadingStats } = api.dashboard.getAllBranchesStats.useQuery(
    { academicSessionId: selectedAcademicSessionId },
    { 
      enabled: isHeadquarters && isSuperAdmin,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
    }
  );
  
  // Set initial academic session when data is loaded
  useEffect(() => {
    if (allBranchesStats?.academicSessions?.length && !selectedAcademicSessionId) {
      // Find active session or use the most recent one
      const activeSession = allBranchesStats.academicSessions.find(session => session.isActive);
      setSelectedAcademicSessionId(activeSession?.id || allBranchesStats.academicSessions[0]?.id);
    }
  }, [allBranchesStats, selectedAcademicSessionId]);

  // Process the student data when it's available
  useEffect(() => {
    setIsLoadingStudents(true);
    
    if (studentData) {
      try {
        // Transform the response into the format expected by StudentsDataTable
        const students = studentData.items || [];
        const formattedData = students.map((student: any) => ({
          id: student.id,
          header: `${student.firstName} ${student.lastName}`,
          type: student.class?.name || "N/A",
          status: student.isActive ? "Active" : "Inactive",
          target: `${student.academicPerformance || 90}%`,
          limit: `${student.attendanceRate || 95}%`,
          reviewer: student.class?.teacher?.firstName 
            ? `${student.class.teacher.firstName} ${student.class.teacher.lastName}`
            : "N/A" 
        }));
        
        setTopStudents(formattedData);
      } catch (error) {
        console.error("Error processing student data:", error);
      }
      
      setIsLoadingStudents(false);
    }
  }, [studentData]);

  // Headquarters Analytics component (superadmin only)
  const HeadquartersAnalytics = () => {
    if (!isHeadquarters || !isSuperAdmin) return null;
    
    // Handle loading state
    if (isLoadingStats) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-16 mb-2" />
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    
    // Handle error state
    if (statsError) {
      return (
        <div className="rounded-md bg-red-50 p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Unable to load headquarters data</h3>
          <p className="text-sm text-red-700">
            There was an error fetching the statistics. Please try again later or contact support.
          </p>
        </div>
      );
    }
    
    // Default data if API returns nothing
    const stats = allBranchesStats || {
      branchCount: 0,
      branches: [],
      totalStudents: 0,
      activeStudents: 0,
      academicYearStudents: 0,
      inactiveStudents: 0,
      totalTeachers: 0,
      activeTeachers: 0,
      teachersInCurrentSession: 0,
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      studentsByBranch: [],
      staffByBranch: [],
      enrollmentTrends: [],
      classDistribution: [],
      academicSessions: [],
      currentAcademicSessionId: null
    };

    return (
      <div className="space-y-6">
        {/* Academic Session Selector */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Dashboard Overview</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Academic Year:</span>
            <select 
              className="px-2 py-1 border rounded-md text-sm"
              value={selectedAcademicSessionId}
              onChange={(e) => setSelectedAcademicSessionId(e.target.value)}
            >
              {stats.academicSessions?.map((session: { id: string; name: string; isActive: boolean }) => (
                <option key={session.id} value={session.id}>
                  {session.name} {session.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      
        {/* Branch Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-[#A65A20]" />
                Branches
              </CardTitle>
              <CardDescription>Branch performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats.branchCount || 0}</div>
              <div className="space-y-4">
                {stats.branches && stats.branches.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {stats.branches.map((branch: any, idx: number) => {
                      // Find student data for this branch
                      const branchData = stats.studentsByBranch?.find(b => b.branchId === branch.id);
                      const studentCount = branchData?.academicYearStudents || 0;
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm items-center">
                            <span className="font-medium truncate max-w-[140px]">{branch.name}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{studentCount}</span>
                              <GraduationCap className="h-3 w-3 text-[#A65A20]" />
                            </div>
                          </div>
                          <Progress 
                            value={studentCount > 0 ? 100 : 0} 
                            className="h-1.5 bg-gray-100" 
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-2">No branch data available</div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <GraduationCap className="h-4 w-4 mr-2 text-[#A65A20]" />
                Students
              </CardTitle>
              <CardDescription>Student enrollment data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-2">
                <div className="text-3xl font-bold">{stats.totalStudents || 0}</div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Current Academic Year</span>
                  <span className="text-lg font-semibold text-[#00501B]">{stats.academicYearStudents || 0}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Active</div>
                  <div className="text-xl font-semibold">{stats.activeStudents || 0}</div>
                  <Progress 
                    value={
                      stats.totalStudents ? 
                      (stats.activeStudents / stats.totalStudents) * 100 : 0
                    } 
                    className="h-1.5 bg-gray-100" 
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">In Current Session</div>
                  <div className="text-xl font-semibold">{stats.academicYearStudents || 0}</div>
                  <Progress 
                    value={
                      stats.activeStudents ? 
                      (stats.academicYearStudents / stats.activeStudents) * 100 : 0
                    } 
                    className="h-1.5 bg-gray-100" 
                  />
                </div>
              </div>
              
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2 border rounded-md p-2 bg-gray-50">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Avg. Class Size</div>
                  <div className="text-lg font-medium">
                    {stats.academicYearStudents && stats.classDistribution?.reduce((sum, c) => sum + c.count, 0) 
                      ? Math.round(stats.academicYearStudents / stats.classDistribution?.reduce((sum, c) => sum + c.count, 0))
                      : 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Student Retention</div>
                  <div className="text-lg font-medium">
                    {stats.totalStudents ? 
                      `${Math.round((stats.activeStudents / stats.totalStudents) * 100)}%` : 
                      '0%'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Users className="h-4 w-4 mr-2 text-[#A65A20]" />
                Staff
              </CardTitle>
              <CardDescription>Teacher & employee stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-2">
                <div className="text-3xl font-bold">
                  {(stats.totalTeachers || 0) + (stats.totalEmployees || 0)}
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Teaching Staff</span>
                  <span className="text-lg font-semibold text-[#00501B]">{stats.teachersInCurrentSession || 0}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Teachers</div>
                  <div className="text-xl font-semibold">{stats.activeTeachers || 0}</div>
                  <Progress 
                    value={
                      stats.totalTeachers && stats.totalEmployees ? 
                      (stats.activeTeachers / (stats.totalTeachers + stats.totalEmployees)) * 100 : 50
                    } 
                    className="h-1.5 bg-gray-100" 
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Admin Staff</div>
                  <div className="text-xl font-semibold">{stats.activeEmployees || 0}</div>
                  <Progress 
                    value={
                      stats.totalTeachers && stats.totalEmployees ? 
                      (stats.activeEmployees / (stats.totalTeachers + stats.totalEmployees)) * 100 : 50
                    } 
                    className="h-1.5 bg-gray-100" 
                  />
                </div>
              </div>
              
              {/* Staff KPIs */}
              <div className="grid grid-cols-2 gap-2 border rounded-md p-2 bg-gray-50">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Teacher Utilization</div>
                  <div className="text-lg font-medium">
                    {stats.activeTeachers 
                      ? `${Math.round((stats.teachersInCurrentSession / stats.activeTeachers) * 100)}%` 
                      : '0%'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Student:Teacher</div>
                  <div className="text-lg font-medium">
                    {stats.teachersInCurrentSession
                      ? `${(stats.academicYearStudents / stats.teachersInCurrentSession).toFixed(1)}:1`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Additional Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Branch Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-[#A65A20]" />
                Branch Performance
              </CardTitle>
              <CardDescription>
                Key metrics across branches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.studentsByBranch && stats.studentsByBranch.length > 0 ? (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  {/* Student enrollment by branch */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-[#00501B]">Enrollment Distribution</h3>
                    <div className="rounded-md border p-3 bg-gray-50/50 space-y-2">
                      {stats.studentsByBranch.map((branch: any, idx: number) => {
                        const percent = stats.totalStudents 
                          ? Math.round((branch.totalStudents / stats.totalStudents) * 100) 
                          : 0;
                        return (
                          <div key={`enroll-${idx}`} className="flex items-center gap-2">
                            <div className="w-28 text-xs truncate">
                              {branch.branchName}
                            </div>
                            <div className="flex-grow">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-[#00501B] h-1.5 rounded-full" 
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-xs tabular-nums">{branch.academicYearStudents} / {branch.totalStudents}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Teacher distribution by branch */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-[#00501B]">Teaching Staff</h3>
                    <div className="rounded-md border p-3 bg-gray-50/50 space-y-2">
                      {stats.staffByBranch.map((branch: any, idx: number) => {
                        // Calculate percent of teachers assigned to classes
                        const utilization = branch.teacherCount > 0 
                          ? (branch.teachersInCurrentSession / branch.teacherCount) * 100 
                          : 0;
                        
                        return (
                          <div key={`teach-${idx}`} className="flex items-center gap-2">
                            <div className="w-28 text-xs truncate">
                              {branch.branchName}
                            </div>
                            <div className="flex-grow">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-[#A65A20] h-1.5 rounded-full" 
                                  style={{ width: `${utilization}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-xs tabular-nums">{branch.teachersInCurrentSession} / {branch.teacherCount}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Student-Teacher Ratio Table */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-[#00501B]">Student-Teacher Ratio</h3>
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-5 text-xs font-medium bg-gray-100 p-2">
                        <div className="col-span-2">Branch</div>
                        <div className="text-center">Students</div>
                        <div className="text-center">Teachers</div>
                        <div className="text-right">Ratio</div>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {stats.studentsByBranch.map((branch: any, idx: number) => {
                          // Find matching staff branch
                          const staffBranch = stats.staffByBranch.find((b: any) => b.branchId === branch.branchId);
                          if (!staffBranch) return null;
                          
                          const ratio = staffBranch.teachersInCurrentSession > 0 
                            ? (branch.academicYearStudents / staffBranch.teachersInCurrentSession).toFixed(1) 
                            : 'N/A';
                          
                          const ratioClass = 
                            parseFloat(ratio) > 30 ? 'text-red-600' :
                            parseFloat(ratio) > 20 ? 'text-[#A65A20]' :
                            'text-[#00501B]';
                            
                          return (
                            <div key={`ratio-${idx}`} className="grid grid-cols-5 text-xs p-2 border-t">
                              <div className="col-span-2 truncate">{branch.branchName}</div>
                              <div className="text-center">{branch.academicYearStudents}</div>
                              <div className="text-center">{staffBranch.teachersInCurrentSession}</div>
                              <div className={`text-right font-medium ${ratioClass}`}>
                                {ratio !== 'N/A' ? `${ratio}:1` : ratio}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No branch data available
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Enrollment Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <GraduationCap className="h-4 w-4 mr-2 text-[#A65A20]" />
                Enrollment Analytics
              </CardTitle>
              <CardDescription>
                Student enrollment trends and insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Yearly Trends */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-[#00501B]">Year-over-Year Growth</h3>
                {stats.enrollmentTrends && stats.enrollmentTrends.length > 0 ? (
                  <div className="space-y-1">
                    {stats.enrollmentTrends.map((yearData: any, idx: number) => {
                      // Calculate growth percentage if not the first year
                      const prevYear = idx < stats.enrollmentTrends.length - 1 ? stats.enrollmentTrends[idx + 1] : null;
                      const growthPercent = prevYear ? ((yearData.count - prevYear.count) / prevYear.count) * 100 : null;
                      
                      const max = Math.max(...stats.enrollmentTrends.map(d => d.count));
                      const widthPercent = max > 0 ? (yearData.count / max) * 100 : 0;
                      
                      return (
                        <div key={idx} className="mb-3">
                          <div className="flex justify-between items-center mb-1 text-sm">
                            <div className="font-medium">{yearData.year}</div>
                            <div className="flex items-center gap-2">
                              <span>{yearData.count}</span>
                              {growthPercent !== null && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-sm ${
                                  growthPercent > 0 
                                    ? 'bg-green-50 text-[#00501B]' 
                                    : growthPercent < 0 
                                      ? 'bg-red-50 text-red-600' 
                                      : 'bg-gray-50 text-gray-600'
                                }`}>
                                  {growthPercent > 0 ? '+' : ''}{growthPercent.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="bg-[#00501B] h-2 rounded-full" 
                              style={{ width: `${widthPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No enrollment trend data available
                  </div>
                )}
              </div>
              
              {/* Class Distribution */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-[#00501B]">Class Distribution</h3>
                {stats.classDistribution && stats.classDistribution.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {stats.classDistribution
                      .sort((a, b) => b.studentCount - a.studentCount)
                      .slice(0, 6)
                      .map((classData: any, idx: number) => (
                      <div key={idx} className="border rounded p-2 flex flex-col">
                        <div className="text-xs text-muted-foreground">Grade {classData.className}</div>
                        <div className="flex items-end justify-between mt-1">
                          <div className="text-lg font-medium">{classData.studentCount}</div>
                          <div className="text-xs">
                            {classData.count} section{classData.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                          <div 
                            className="bg-[#A65A20]/70 h-1 rounded-full" 
                            style={{ 
                              width: `${Math.max(...stats.classDistribution.map((d: any) => d.studentCount)) > 0 
                                ? (classData.studentCount / Math.max(...stats.classDistribution.map((d: any) => d.studentCount))) * 100 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No class distribution data available
                  </div>
                )}
              </div>
              
              {/* Key Insights */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-[#00501B]">Key Insights</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border rounded p-2 bg-gray-50">
                    <div className="text-xs text-muted-foreground">Largest Class</div>
                    <div className="font-medium mt-1">
                      {stats.classDistribution?.length > 0 
                        ? `Grade ${stats.classDistribution.reduce((prev, current) => 
                            (current.studentCount > prev.studentCount) ? current : prev
                          ).className}` 
                        : 'N/A'}
                    </div>
                  </div>
                  
                  <div className="border rounded p-2 bg-gray-50">
                    <div className="text-xs text-muted-foreground">Teacher Coverage</div>
                    <div className="font-medium mt-1">
                      {stats.activeTeachers && stats.teachersInCurrentSession
                        ? `${Math.round((stats.teachersInCurrentSession / stats.activeTeachers) * 100)}%`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <PageWrapper>
      {/* Dashboard Title with accent color */}
      <div className="mb-6">
        <h1 className="text-[#00501B] dark:text-[#7aad8c] text-2xl font-bold mb-2 flex items-center">
          <span className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></span>
          {isHeadquarters && isSuperAdmin ? "Headquarters Dashboard" : "ScholaRise Dashboard"}
        </h1>
        {isHeadquarters && isSuperAdmin && (
          <p className="text-muted-foreground ml-5">
            Consolidated view of all branch data and analytics
          </p>
        )}
      </div>
      
      {/* Render HeadquartersAnalytics for HQ branch or SectionCards for other branches */}
      {isHeadquarters && isSuperAdmin ? (
        <HeadquartersAnalytics />
      ) : (
        <SectionCards />
      )}
      
      {/* Chart Section with accent border */}
      <div className="mt-8 border-t-2 border-[#00501B]/10 dark:border-[#7aad8c]/20 pt-4">
        <div className="flex items-center mb-3">
          <BarChart3 className="mr-2 h-5 w-5 text-[#A65A20] dark:text-[#e2bd8c]" />
          <h2 className="text-lg font-medium text-[#00501B] dark:text-[#7aad8c]">
            {isHeadquarters && isSuperAdmin ? "Organization-Wide Performance Metrics" : "Student Performance Metrics"}
          </h2>
        </div>
        <div className="rounded-md overflow-hidden border border-[#00501B]/10 dark:border-[#303030] shadow-sm dark:shadow-md dark:shadow-black/5">
          <ChartAreaInteractive />
        </div>
      </div>
      
      {/* Top Student Section with accent styling */}
      <div className="mt-8 rounded-md overflow-hidden border border-[#00501B]/10 dark:border-[#303030] shadow-sm dark:shadow-md dark:shadow-black/5">
        <div className="bg-gradient-to-r from-[#00501B]/5 to-transparent dark:from-[#7aad8c]/10 dark:to-transparent p-4 flex items-center">
          <GraduationCap className="mr-2 h-5 w-5 text-[#A65A20] dark:text-[#e2bd8c]" />
          <h2 className="text-lg font-medium text-[#00501B] dark:text-[#7aad8c]">
            {isHeadquarters && isSuperAdmin ? "Top Performing Students Across All Branches" : "Top Performing Students"}
          </h2>
        </div>
        <div className="p-4 dark:bg-[#252525]">
          {isLoadingStudents ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full dark:bg-[#303030]" />
              <Skeleton className="h-10 w-full dark:bg-[#303030]" />
              <Skeleton className="h-10 w-full dark:bg-[#303030]" />
              <Skeleton className="h-10 w-full dark:bg-[#303030]" />
              <Skeleton className="h-10 w-full dark:bg-[#303030]" />
            </div>
          ) : (
            <StudentsDataTable data={topStudents || []} />
          )}
        </div>
      </div>
      
      {/* Bottom accent bar */}
      <div className="mt-12 mb-6">
        <div className="flex h-1.5">
          <div className="bg-[#00501B] dark:bg-[#7aad8c] w-1/2 rounded-l-full"></div>
          <div className="bg-[#A65A20] dark:bg-[#e2bd8c] w-1/2 rounded-r-full"></div>
        </div>
      </div>
    </PageWrapper>
  );
}
