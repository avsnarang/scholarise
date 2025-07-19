"use client"

import { LineChart } from "@/components/LineChart"
import type { TooltipProps } from "@/components/LineChart"
import { cx, formatIndianNumber } from "@/lib/utils"
import { api } from "@/utils/api"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@tremor/react'
import { GraduationCap, Users, School } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClassSummaryData {
  className: string
  totalStudents: number
  sections: number
  averagePerSection: number
}

const valueFormatter = (number: number) => {
  return formatIndianNumber(number)
}

const getClassColors = (classNames: string[]): string[] => {
  const colors = ['green', 'blue', 'amber', 'violet', 'red', 'cyan', 'pink', 'purple'];
  return classNames.map((_, index) => colors[index % colors.length]!);
}

const Tooltip = ({ payload, active, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  // Detect dark mode at render time
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  const headerBg = isDarkMode ? '#7AAD8B' : '#00501B'

  const data = payload.filter(item => (item.value || 0) > 0).map((item) => ({
    className: item.dataKey as string,
    students: item.value || 0,
  }))

  const totalStudents = payload.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <>
      <div 
        className="custom-tooltip-header w-60 rounded-md border border-gray-500/10 px-4 py-1.5 text-sm shadow-md dark:border-gray-400/20"
        style={{ 
          backgroundColor: headerBg,
          background: headerBg
        }}
      >
        <p className="flex items-center justify-between">
          <span className="text-gray-50 dark:text-gray-50">Class</span>
          <span className="font-medium text-gray-50 dark:text-gray-50">
            {label}
          </span>
        </p>
      </div>
      <div className="mt-1 w-60 space-y-1 rounded-md border border-gray-500/10 bg-white px-4 py-2 text-sm shadow-md dark:border-gray-400/20 dark:bg-gray-900">
        <div className="mb-2 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-600">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Total Students
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-50">
            {valueFormatter(totalStudents)}
          </span>
        </div>
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2.5">
            <div className="flex w-full justify-between">
              <span className="text-gray-700 dark:text-gray-300">
                {item.className}
              </span>
              <div className="flex items-center space-x-1">
                <span className="font-medium text-gray-900 dark:text-gray-50">
                  {valueFormatter(item.students)} students
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ClassEnrollmentLineChart() {
  const { currentBranchId } = useBranchContext()
  const { currentSessionId } = useAcademicSessionContext()
  const [viewType, setViewType] = useState<'enrollment' | 'capacity'>('enrollment')

  // Fetch all classes with sections and student counts
  const {
    data: sectionsData,
    isLoading,
    error
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
  )

  // Process data for charts and summary
  const { chartData, summaryData, totalStudents, totalClasses } = useMemo(() => {
    if (!sectionsData) {
      return {
        chartData: [],
        summaryData: [],
        totalStudents: 0,
        totalClasses: 0
      };
    }

    // Group sections by class
    const classMap = new Map<string, {
      id: string;
      name: string;
      students: number;
      sections: number;
      capacity: number;
      isActive: boolean;
      displayOrder: number;
    }>();

    sectionsData.forEach((section: any) => {
      const classId = section.class.id;
      const className = section.class.name;
      const isActive = section.class.isActive;
      const displayOrder = section.class.displayOrder || 999;
      const studentCount = section.studentCount || 0;
      const capacity = section.capacity || 0;

      if (classMap.has(classId)) {
        const existing = classMap.get(classId)!;
        existing.students += studentCount;
        existing.sections += 1;
        existing.capacity += capacity;
      } else {
        classMap.set(classId, {
          id: classId,
          name: className,
          students: studentCount,
          sections: 1,
          capacity: capacity,
          isActive,
          displayOrder,
        });
      }
    });

    const processedClasses = Array.from(classMap.values())
      .filter(cls => cls.isActive)
      .sort((a, b) => {
        // First sort by displayOrder, then by name
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.name.localeCompare(b.name);
      });

    // Prepare chart data
    const chartData = processedClasses.map((cls) => ({
      class: cls.name,
      students: cls.students,
      capacity: cls.capacity,
      utilization: cls.capacity > 0 ? Math.round((cls.students / cls.capacity) * 100) : 0,
    }));

    // Prepare summary data
    const summaryData: ClassSummaryData[] = processedClasses.map((cls) => ({
      className: cls.name,
      totalStudents: cls.students,
      sections: cls.sections,
      averagePerSection: cls.sections > 0 ? Math.round(cls.students / cls.sections) : 0,
    }));

    const totalStudents = processedClasses.reduce((sum, cls) => sum + cls.students, 0);
    const totalClasses = processedClasses.length;

    return {
      chartData,
      summaryData,
      totalStudents,
      totalClasses
    };
  }, [sectionsData]);

  // Skeleton components
  const MetricSkeleton = () => (
    <div className="text-center">
      <div className="mb-1 flex items-center justify-center">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto animate-pulse"></div>
    </div>
  )

  const ChartSkeleton = () => (
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
  )

  const TableSkeleton = () => (
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
      <div className="space-y-2 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-600">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )

  if (!currentBranchId || !currentSessionId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525]">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Please select a branch and academic session to view class enrollment data.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525]">
        <p className="text-center text-red-500 dark:text-red-400">
          Error loading class enrollment data. Please try again.
        </p>
      </div>
    )
  }

  const categories = viewType === 'enrollment' ? ['students'] : ['students', 'capacity'];
  const colors = viewType === 'enrollment' ? ['green'] : ['green', 'blue'];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#3a3a3a] dark:bg-[#252525]">
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-tooltip-header {
            z-index: 1000;
          }
        `
      }} />
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#00501B]/10 dark:bg-[#7AAD8B]/20 p-2">
            <School className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Class Enrollment Overview
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Student distribution across all classes
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewType === 'enrollment' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('enrollment')}
            className="h-8"
          >
            Enrollment
          </Button>
          <Button
            variant={viewType === 'capacity' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewType('capacity')}
            className="h-8"
          >
            Vs Capacity
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="text-center rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="mb-1 flex items-center justify-center">
            <Users className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B] mr-1" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Students</span>
          </div>
          {isLoading ? (
            <MetricSkeleton />
          ) : (
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatIndianNumber(totalStudents)}
            </div>
          )}
        </div>
        
        <div className="text-center rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="mb-1 flex items-center justify-center">
            <School className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B] mr-1" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Classes</span>
          </div>
          {isLoading ? (
            <MetricSkeleton />
          ) : (
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatIndianNumber(totalClasses)}
            </div>
          )}
        </div>
        
        <div className="text-center rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="mb-1 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-[#00501B] dark:text-[#7AAD8B] mr-1" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg per Class</span>
          </div>
          {isLoading ? (
            <MetricSkeleton />
          ) : (
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalClasses > 0 ? formatIndianNumber(Math.round(totalStudents / totalClasses)) : '0'}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <h4 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          {viewType === 'enrollment' ? 'Student Enrollment by Class' : 'Enrollment vs Capacity'}
        </h4>
        
        {isLoading ? (
          <ChartSkeleton />
        ) : chartData.length > 0 ? (
          <div className="h-64">
            <LineChart
              data={chartData}
              index="class"
              categories={categories}
              colors={colors}
              valueFormatter={valueFormatter}
              customTooltip={<Tooltip />}
              className="h-full"
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center">
              <School className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No class enrollment data available
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Table */}
      {!isLoading && summaryData.length > 0 && (
        <div>
          <h4 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            Class Summary
          </h4>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHead className="bg-gray-50 dark:bg-gray-800/50">
                <TableRow>
                  <TableHeaderCell className="text-left">Class</TableHeaderCell>
                  <TableHeaderCell className="text-right">Students</TableHeaderCell>
                  <TableHeaderCell className="text-right">Sections</TableHeaderCell>
                  <TableHeaderCell className="text-right">Avg/Section</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryData.map((item) => (
                  <TableRow key={item.className}>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {item.className}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">
                      {formatIndianNumber(item.totalStudents)}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">
                      {item.sections}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">
                      {formatIndianNumber(item.averagePerSection)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {isLoading && (
        <TableSkeleton />
      )}
    </div>
  )
} 