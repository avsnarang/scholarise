"use client";

import { StudentStatsCards } from "@/components/students/student-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { StudentDataTable, type Student } from "@/components/students/student-data-table"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileDown } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback } from "react"
import { StudentAdvancedFilters, type AdvancedFilters } from "@/components/students/student-advanced-filters"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { StudentBulkImport } from "@/components/students/student-bulk-import"
import { useToast } from "@/components/ui/use-toast"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { StudentDataTableWrapper } from "@/components/students/student-data-table-wrapper"
import { StudentFilter } from "@/components/students/student-filter-adapter"

export default function StudentsPage() {
  const [filters, setFilters] = useState<AdvancedFilters>({
    conditions: [
      {
        id: "default-active-filter",
        field: "isActive",
        operator: "equals",
        value: "true",
      }
    ],
    logicOperator: "and",
  });
  
  // Pagination state
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState(50);

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  const utils = api.useContext();

  // API query with pagination
  const { data: studentsData, isLoading } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
    limit: pageSize,
    cursor,
    filters: filters?.conditions?.reduce((acc, condition) => {
      if (condition.field && condition.value !== undefined) {
        acc[condition.field] = condition.value;
      }
      return acc;
    }, {} as Record<string, any>) || undefined
  });

  // Transform data to match the Student type
  const students: Student[] = (studentsData?.items || []).map(student => {
    try {
      // Check if student has the required fields
      if (!student?.firstName || !student?.lastName) {
        console.warn('Missing required fields in student data:', student);
        // Provide default values for missing fields
        return {
          id: student?.id || 'unknown-id',
          admissionNumber: student?.admissionNumber || '',
          firstName: student?.firstName || 'Unknown',
          lastName: student?.lastName || 'Unknown',
          email: student?.email || undefined,
          phone: student?.phone || undefined,
          gender: student?.gender || undefined,
          dateOfBirth: student?.dateOfBirth || new Date(),
          isActive: student?.isActive !== undefined ? student.isActive : true,
          class: student?.class ? {
            name: student.class.name || '',
            section: student.class.section || ''
          } : undefined,
          parent: student?.parent ? {
            fatherName: student.parent.fatherName || undefined,
            motherName: student.parent.motherName || undefined,
            guardianName: student.parent.guardianName || undefined,
            fatherMobile: student.parent.fatherMobile || undefined,
            motherMobile: student.parent.motherMobile || undefined,
            fatherEmail: student.parent.fatherEmail || undefined,
            motherEmail: student.parent.motherEmail || undefined,
            guardianEmail: student.parent.guardianEmail || undefined
          } : undefined
        };
      }
      
      // Extract class details if available
      let classInfo = undefined;
      if (student.class) {
        classInfo = {
          name: student.class.name,
          section: student.class.section
        };
      }

      // Extract parent information if available
      let parentInfo = undefined;
      if (student.parent) {
        parentInfo = {
          fatherName: student.parent.fatherName || undefined,
          motherName: student.parent.motherName || undefined,
          guardianName: student.parent.guardianName || undefined,
          fatherMobile: student.parent.fatherMobile || undefined,
          motherMobile: student.parent.motherMobile || undefined,
          fatherEmail: student.parent.fatherEmail || undefined,
          motherEmail: student.parent.motherEmail || undefined,
          guardianEmail: student.parent.guardianEmail || undefined
        };
      }

      return {
        id: student.id,
        admissionNumber: student.admissionNumber || '',
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email || undefined,
        phone: student.phone || undefined,
        gender: student.gender || undefined,
        dateOfBirth: student.dateOfBirth,
        isActive: student.isActive,
        class: classInfo,
        parent: parentInfo
      };
    } catch (error) {
      console.error('Error transforming student data:', error, student);
      // Return fallback data so the UI doesn't crash
      return {
        id: student?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        admissionNumber: 'ERROR',
        firstName: 'Data',
        lastName: 'Error',
        dateOfBirth: new Date(),
        isActive: false,
        gender: ''
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
    if (studentsData?.nextCursor) {
      setCursor(studentsData.nextCursor);
    }
  }, [studentsData?.nextCursor]);

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

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    void utils.student.getAll.invalidate();
    void utils.student.getStats.invalidate();
    toast({
      title: "Import successful",
      description: "Students have been imported successfully",
      variant: "success"
    });
  };

  return (
    <PageWrapper
      title="Students"
      subtitle="Manage all students in your institution"
      action={
        <div className="flex gap-2">
          <StudentBulkImport onSuccess={handleBulkImportSuccess} />
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/students/create">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Student</span>
            </Button>
          </Link>
        </div>
      }
    >
      <StudentStatsCards sessionId={currentSessionId || undefined} />

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Students</h2>
          <StudentFilter 
            filters={filters} 
            onFilterChange={handleFilterChange} 
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No students found. Try adjusting your filters.
          </div>
        ) : (
          <div>
            <StudentDataTableWrapper
              data={studentsData?.items || []}
            />
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing up to {pageSize} students per page
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
                    disabled={!studentsData?.nextCursor} // Only enable if there's a next page
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
  )
}
