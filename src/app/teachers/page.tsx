"use client";

import { TeacherStatsCards } from "@/components/teachers/teacher-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { TeacherDataTable, type Teacher } from "@/components/teachers/teacher-data-table"
import { TeacherBulkImport } from "@/components/teachers/teacher-bulk-import"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileDown } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback } from "react"
import { TeacherAdvancedFilters, type AdvancedFilters } from "@/components/teachers/teacher-advanced-filters"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { useToast } from "@/components/ui/use-toast"

export default function TeachersPage() {
  const [filters, setFilters] = useState<AdvancedFilters>({
    conditions: [
      {
        id: "default-active-filter",
        field: "isActive",
        operator: "equals",
        value: true,
      }
    ],
    logicOperator: "and",
  });
  
  // Pagination state
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState(50);

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { toast } = useToast();
  const utils = api.useContext();

  // API query with pagination
  const { data: teachersData, isLoading } = api.teacher.getAll.useQuery({
    branchId: getBranchFilterParam(),
    limit: pageSize,
    cursor,
    advancedFilters: {
      conditions: filters.conditions,
      logicOperator: filters.logicOperator
    }
  });

  // Transform data to match the Teacher type
  const teachers: Teacher[] = (teachersData?.items || []).map(teacherData => {
    try {
      // Use type assertion to handle the API response type
      const teacher = teacherData as any;
      
      // Check if teacher has the required fields
      if (!teacher?.firstName || !teacher?.lastName) {
        console.warn('Missing required fields in teacher data:', teacher);
        // Provide default values for missing fields
        return {
          id: teacher?.id || 'unknown-id',
          employeeCode: teacher?.employeeCode || '',
          firstName: teacher?.firstName || 'Unknown',
          lastName: teacher?.lastName || 'Unknown',
          email: teacher?.email || undefined,
          phone: teacher?.phone || undefined,
          qualification: teacher?.qualification || undefined,
          specialization: teacher?.specialization || undefined,
          joinDate: teacher?.joinDate ? teacher.joinDate.toISOString() : undefined,
          isActive: teacher?.isActive !== undefined ? teacher.isActive : true,
          branch: teacher?.branch ? {
            name: teacher.branch.name || ''
          } : undefined
        };
      }
      
      return {
        id: teacher.id,
        employeeCode: teacher.employeeCode || '',
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email || undefined,
        phone: teacher.phone || undefined,
        qualification: teacher.qualification || undefined,
        specialization: teacher.specialization || undefined,
        joinDate: teacher.joinDate ? teacher.joinDate.toISOString() : undefined,
        isActive: teacher.isActive,
        branch: teacher.branch
      };
    } catch (error) {
      console.error('Error transforming teacher data:', error, teacherData);
      // Return fallback data so the UI doesn't crash
      return {
        id: teacherData?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        employeeCode: 'ERROR',
        firstName: 'Data',
        lastName: 'Error',
        isActive: false
      };
    }
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
    // Reset pagination when filters change
    setCursor(undefined);
  };

  // Handle pagination
  const goToNextPage = useCallback(() => {
    if (teachersData?.nextCursor) {
      setCursor(teachersData.nextCursor);
    }
  }, [teachersData?.nextCursor]);

  const goToPreviousPage = useCallback(() => {
    // Since this is cursor-based pagination, going back is complex
    // We'll reset to the first page in this implementation
    setCursor(undefined);
  }, []);

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCursor(undefined); // Reset to first page
  };

  // Get teacher stats from the API or use default values
  const { data: teacherStats, isLoading: isLoadingStats } = api.teacher.getStats.useQuery({
    branchId: getBranchFilterParam()
  });

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    void utils.teacher.getAll.invalidate();
    void utils.teacher.getStats.invalidate();
    toast({
      title: "Import Completed",
      description: "Teachers have been imported successfully.",
      variant: "success",
    });
  };

  return (
    <PageWrapper
      title="Teachers"
      subtitle="Manage all teachers in your institution"
      action={
        <div className="flex gap-2">
          <TeacherBulkImport onSuccess={handleBulkImportSuccess} />
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/teachers/create">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Teacher</span>
            </Button>
          </Link>
        </div>
      }
    >
      <TeacherStatsCards 
        totalTeachers={teacherStats?.totalTeachers || 0}
        totalTeachersChange={5.0} // Sample value, replace with actual data if available
        activeTeachers={teacherStats?.activeTeachers || 0}
        activeTeachersChange={3.2} // Sample value
        averageExperience={7.5} // Sample value
        experienceChange={0.8} // Sample value
        certifiedTeachers={teacherStats?.activeTeachers ? Math.round(teacherStats.activeTeachers * 0.9) : 0} // Sample value (90% of active)
        certifiedTeachersChange={4.5} // Sample value
      />

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Teachers</h2>
          <TeacherAdvancedFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading teachers...
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No teachers found. Try adjusting your filters.
          </div>
        ) : (
          <div>
            <TeacherDataTable data={teachers} />
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing up to {pageSize} teachers per page
              </div>
              <div className="flex items-center gap-4">
                <select 
                  className="border rounded p-1 text-sm"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={!cursor} // Only enable if we're not on the first page
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!teachersData?.nextCursor} // Only enable if there's a next page
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
