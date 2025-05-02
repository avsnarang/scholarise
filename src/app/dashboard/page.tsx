"use client";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { api } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchContext } from "@/hooks/useBranchContext";
import { BarChart3, GraduationCap } from "lucide-react";
import { StudentsDataTable } from "@/components/students-data-table";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { currentBranchId } = useBranchContext();
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  
  // Use the student.getAll API that's available in the system
  const { data: studentData } = api.student.getAll.useQuery(
    { 
      branchId: currentBranchId || "",
      limit: 10,
      filters: {
        isActive: "true"
      }
    },
    { 
      enabled: !!currentBranchId,
    }
  );
  
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

  return (
    <PageWrapper>
      {/* Dashboard Title with accent color */}
      <div className="mb-6">
        <h1 className="text-[#00501B] dark:text-[#7aad8c] text-2xl font-bold mb-2 flex items-center">
          <span className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></span>
          ScholaRise Dashboard
        </h1>
      </div>
      
      <SectionCards />
      
      {/* Chart Section with accent border */}
      <div className="mt-8 border-t-2 border-[#00501B]/10 dark:border-[#7aad8c]/20 pt-4">
        <div className="flex items-center mb-3">
          <BarChart3 className="mr-2 h-5 w-5 text-[#A65A20] dark:text-[#e2bd8c]" />
          <h2 className="text-lg font-medium text-[#00501B] dark:text-[#7aad8c]">Student Performance Metrics</h2>
        </div>
        <div className="rounded-md overflow-hidden border border-[#00501B]/10 dark:border-[#303030] shadow-sm dark:shadow-md dark:shadow-black/5">
          <ChartAreaInteractive />
        </div>
      </div>
      
      {/* Top Student Section with accent styling */}
      <div className="mt-8 rounded-md overflow-hidden border border-[#00501B]/10 dark:border-[#303030] shadow-sm dark:shadow-md dark:shadow-black/5">
        <div className="bg-gradient-to-r from-[#00501B]/5 to-transparent dark:from-[#7aad8c]/10 dark:to-transparent p-4 flex items-center">
          <GraduationCap className="mr-2 h-5 w-5 text-[#A65A20] dark:text-[#e2bd8c]" />
          <h2 className="text-lg font-medium text-[#00501B] dark:text-[#7aad8c]">Top Performing Students</h2>
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
