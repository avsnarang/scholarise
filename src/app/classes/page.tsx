"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  School,
  UserCheck,
  BookOpen,
  Target,
  AlertCircle,
  FileDown,
  Filter,
  Building,
  Layers,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";
import { ClassEnrollmentLineChart } from "@/components/ui/class-enrollment-line-chart";
import { formatIndianNumber } from "@/lib/utils";

// Types for dashboard data
interface ClassData {
  id: string;
  name: string;
  studentCount: number;
  capacity: number;
  isActive: boolean;
  sections: Array<{
    id: string;
    name: string;
    studentCount: number;
    capacity: number;
  }>;
}

interface DashboardStats {
  totalClasses: number;
  activeClasses: number;
  totalStudents: number;
  totalSections: number;
  averageStudentsPerClass: number;
  utilizationRate: number;
}

function ClassesDashboard() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // Fetch class statistics
  const {
    data: classStats,
    isLoading: isLoadingStats
  } = api.class.getStats.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch all classes with sections and student counts
  const {
    data: classesData,
    isLoading: isLoadingClasses
  } = api.section.getAll.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
      includeClass: true,
      includeTeacher: true,
      includeStudentCount: true,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Process classes data for charts
  const processedClassesData = useMemo(() => {
    if (!classesData) return [];

    // Group sections by class
    const classMap = new Map<string, {
      id: string;
      name: string;
      studentCount: number;
      sectionsCount: number;
      isActive: boolean;
      displayOrder: number;
    }>();

    classesData.forEach((section: any) => {
      const classId = section.class.id;
      const className = section.class.name;
      const isActive = section.class.isActive;
      const displayOrder = section.class.displayOrder || 999;
      const studentCount = section.studentCount || 0;

      if (classMap.has(classId)) {
        const existing = classMap.get(classId)!;
        existing.studentCount += studentCount;
        existing.sectionsCount += 1;
      } else {
        classMap.set(classId, {
          id: classId,
          name: className,
          studentCount,
          sectionsCount: 1,
          isActive,
          displayOrder,
        });
      }
    });

    return Array.from(classMap.values()).sort((a, b) => {
      // First sort by displayOrder, then by name
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }, [classesData]);

  // Calculate dashboard statistics
  const dashboardStats: DashboardStats = useMemo(() => {
    if (!classStats || !processedClassesData.length) {
      return {
        totalClasses: 0,
        activeClasses: 0,
        totalStudents: 0,
        totalSections: 0,
        averageStudentsPerClass: 0,
        utilizationRate: 0,
      };
    }

    const totalStudents = processedClassesData.reduce((sum, cls) => sum + cls.studentCount, 0);
    const activeClasses = processedClassesData.filter(cls => cls.isActive).length;
    
    return {
      totalClasses: classStats.totalClasses || 0,
      activeClasses: activeClasses,
      totalStudents: totalStudents,
      totalSections: classStats.totalSections || 0,
      averageStudentsPerClass: processedClassesData.length > 0 ? Math.round(totalStudents / processedClassesData.length) : 0,
      utilizationRate: activeClasses > 0 ? Math.round((activeClasses / (classStats.totalClasses || 1)) * 100) : 0,
    };
  }, [classStats, processedClassesData]);

  // Prepare data for vertical bar chart
  const verticalBarChartData = useMemo(() => {
    const filteredClasses = selectedClasses.length > 0 
      ? processedClassesData.filter(cls => selectedClasses.includes(cls.id))
      : processedClassesData;

    return filteredClasses.map((cls) => ({
      name: cls.name,
      value: cls.studentCount,
    }));
  }, [processedClassesData, selectedClasses]);

  // Calculate total students in selected classes
  const totalSelectedStudents = useMemo(() => {
    if (selectedClasses.length === 0) {
      return dashboardStats.totalStudents;
    }
    
    return processedClassesData
      .filter(cls => selectedClasses.includes(cls.id))
      .reduce((sum, cls) => sum + cls.studentCount, 0);
  }, [processedClassesData, selectedClasses, dashboardStats.totalStudents]);

  // Handle export functionality
  const handleExport = () => {
    // Implementation for exporting dashboard data
    console.log("Exporting dashboard data...");
  };

  // Loading skeleton
  const StatCardSkeleton = () => (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525] shadow-md">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-6 w-16" />
    </div>
  );

  if (isLoadingStats || isLoadingClasses) {
    return (
      <PageWrapper 
        title="Classes Dashboard" 
        subtitle="Overview of classes and student enrollment"
        action={
          <Button variant="outline" disabled>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      >
        <div className="space-y-8">
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* Charts skeleton */}
          <div className="space-y-8">
            <Skeleton className="h-[500px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper 
        title="Classes Dashboard" 
        subtitle="Overview of classes and student enrollment"
      >
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <School className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Selection Required</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Please select an academic session and branch from the dropdown above to view the classes dashboard.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      title="Classes Dashboard" 
      subtitle="Comprehensive overview of classes and student enrollment"
      action={
        <Button variant="outline" onClick={handleExport}>
          <FileDown className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Header Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525] shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
                <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:bg-blue-900/30">
                <Target className="h-3 w-3 mr-1" />
                {dashboardStats.activeClasses} Active
              </Badge>
            </div>
            <div className="mb-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Classes</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatIndianNumber(dashboardStats.totalClasses)}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525] shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-900/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                Enrolled
              </Badge>
            </div>
            <div className="mb-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatIndianNumber(dashboardStats.totalStudents)}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525] shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2">
                <UserCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-900/30">
                <Activity className="h-3 w-3 mr-1" />
                Per Class
              </Badge>
            </div>
            <div className="mb-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Students/Class</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatIndianNumber(dashboardStats.averageStudentsPerClass)}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525] shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-2">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <Badge variant="outline" className={`${
                dashboardStats.utilizationRate >= 80 
                  ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-900/30'
                  : dashboardStats.utilizationRate >= 60
                  ? 'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-900/30'
                  : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-700 dark:bg-red-900/30'
              }`}>
                {dashboardStats.utilizationRate >= 80 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {dashboardStats.utilizationRate >= 80 ? 'Excellent' : dashboardStats.utilizationRate >= 60 ? 'Good' : 'Alert'}
              </Badge>
            </div>
            <div className="mb-1">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilization Rate</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {dashboardStats.utilizationRate}%
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:max-w-md h-auto sm:h-12 bg-muted/30 dark:bg-gray-800/50 p-1 rounded-lg gap-1 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-green-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="interactive" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-green-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
              <Activity className="w-4 h-4 mr-2" />
              Interactive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Line Chart - Using same design as finance section */}
            <ClassEnrollmentLineChart />
          </TabsContent>

          <TabsContent value="interactive" className="space-y-6">
            {/* Header with Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 dark:border-[#3a3a3a] shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                      {selectedClasses.length > 0 ? 'Selected Classes' : 'Total Classes'}
                    </div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {selectedClasses.length > 0 ? selectedClasses.length : processedClassesData.length}
                    </div>
                  </div>
                  <div className="rounded-full bg-blue-200 dark:bg-blue-700/50 p-3">
                    <School className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 dark:border-[#3a3a3a] shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                      Total Students
                    </div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {formatIndianNumber(totalSelectedStudents)}
                    </div>
                  </div>
                  <div className="rounded-full bg-green-200 dark:bg-green-700/50 p-3">
                    <Users className="h-6 w-6 text-green-700 dark:text-green-300" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-6 dark:border-[#3a3a3a] shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                      Average per Class
                    </div>
                    <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                      {selectedClasses.length > 0 && totalSelectedStudents > 0 
                        ? formatIndianNumber(Math.round(totalSelectedStudents / selectedClasses.length))
                        : processedClassesData.length > 0 
                        ? formatIndianNumber(Math.round(dashboardStats.totalStudents / processedClassesData.length))
                        : '0'
                      }
                    </div>
                  </div>
                  <div className="rounded-full bg-amber-200 dark:bg-amber-700/50 p-3">
                    <BarChart3 className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Class Selection Interface - Now at the top */}
            {processedClassesData.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525] shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#00501B]/10 dark:bg-[#7AAD8B]/20 p-2">
                      <Filter className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Filter Classes
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Select classes to analyze their student distribution
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {selectedClasses.length > 0 && (
                      <>
                        <Badge variant="secondary" className="px-3 py-1">
                          {selectedClasses.length} selected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClasses([])}
                          className="h-8"
                        >
                          Clear All
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedClasses.length === processedClassesData.length) {
                          setSelectedClasses([]);
                        } else {
                          setSelectedClasses(processedClassesData.map(cls => cls.id));
                        }
                      }}
                      className="h-8"
                    >
                      {selectedClasses.length === processedClassesData.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {processedClassesData.map((cls) => {
                    const isSelected = selectedClasses.includes(cls.id);
                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedClasses(prev => prev.filter(id => id !== cls.id));
                          } else {
                            setSelectedClasses(prev => [...prev, cls.id]);
                          }
                        }}
                        className={`relative group cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                          isSelected 
                            ? 'border-[#00501B] bg-[#00501B]/5 dark:border-[#7AAD8B] dark:bg-[#7AAD8B]/10 shadow-md' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-[#00501B]/50 dark:hover:border-[#7AAD8B]/50 hover:shadow-sm'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`text-lg font-semibold mb-1 ${
                            isSelected 
                              ? 'text-[#00501B] dark:text-[#7AAD8B]' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {cls.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {cls.sectionsCount} section{cls.sectionsCount !== 1 ? 's' : ''}
                          </div>
                          <div className={`text-2xl font-bold ${
                            isSelected 
                              ? 'text-[#00501B] dark:text-[#7AAD8B]' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {formatIndianNumber(cls.studentCount)}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">students</div>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute -top-2 -right-2">
                            <div className="rounded-full bg-[#00501B] dark:bg-[#7AAD8B] p-1">
                              <Target className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicClassesDashboardContent = dynamic(() => Promise.resolve(ClassesDashboard), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ClassesDashboardPage() {
  return <DynamicClassesDashboardContent />;
} 