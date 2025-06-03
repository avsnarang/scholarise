"use client";

import { StudentStatsCards } from "@/components/students/student-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { StudentDataTable, type Student } from "@/components/students/student-data-table"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileDown, FileText } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback, useEffect, useMemo } from "react"
import { StudentAdvancedFilters, type AdvancedFilters } from "@/components/students/student-advanced-filters"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { StudentBulkImport } from "@/components/students/student-bulk-import"
import { useToast } from "@/components/ui/use-toast"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { StudentDataTableWrapper } from "@/components/students/student-data-table-wrapper"
import { StudentFilter } from "@/components/students/student-filter-adapter"
import { useActionPermissions } from "@/utils/permission-utils"
import { Permission } from "@/types/permissions"

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
  
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>("class");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  const utils = api.useContext();

  const { hasPermission } = useActionPermissions("students");
  const canManageTC = hasPermission(Permission.MANAGE_TRANSFER_CERTIFICATES);

  const { data: studentsData, isLoading } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
    limit: pageSize,
    cursor,
    sortBy,
    sortOrder,
    filters: filters?.conditions?.reduce((acc, condition) => {
      if (condition.field && condition.value !== undefined) {
        acc[condition.field] = condition.value;
      }
      return acc;
    }, {} as Record<string, any>) || undefined
  });

  useEffect(() => {
    utils.student.getAll.invalidate();
    setCursor(undefined);
    setCurrentPage(1);
    setCursorHistory([undefined]);
  }, [currentSessionId, getBranchFilterParam, utils.student.getAll, sortBy, sortOrder]);

  const pageCount = useMemo(() => {
    if (studentsData?.totalCount && pageSize > 0) {
      return Math.ceil(studentsData.totalCount / pageSize);
    }
    return 0;
  }, [studentsData?.totalCount, pageSize]);

  const students: Student[] = (studentsData?.items || []).map((student: any) => {
    try {
      if (!student?.firstName || !student?.lastName) {
        console.warn('Missing required fields in student data:', student);
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
          class: student?.section?.class ? {
            name: student.section.class.name || '',
            section: student.section.name || ''
          } : undefined,
          parent: student?.parent ? {
            name: student.parent.fatherName || student.parent.motherName || student.parent.guardianName || '',
            phone: student.parent.fatherMobile || student.parent.motherMobile || student.parent.guardianMobile || '',
            email: student.parent.fatherEmail || student.parent.motherEmail || student.parent.guardianEmail || ''
          } : undefined,
          rollNumber: student.rollNumber?.toString() || null,
        };
      }
      
      return {
        ...student,
        class: student?.section?.class ? {
          name: student.section.class.name || '',
          section: student.section.name || ''
        } : undefined,
        parent: student.parent ? {
          name: student.parent.fatherName || student.parent.motherName || student.parent.guardianName || '',
          phone: student.parent.fatherMobile || student.parent.motherMobile || student.parent.guardianMobile || '',
          email: student.parent.fatherEmail || student.parent.motherEmail || student.parent.guardianEmail || ''
        } : undefined,
        rollNumber: student.rollNumber?.toString() || null,
      };
    } catch (error) {
      console.error('Error transforming student data:', error, student);
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

  const handleFilterChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
    setCursor(undefined);
    setCurrentPage(1);
    setCursorHistory([undefined]);
  };

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCursor(undefined);
    setCurrentPage(1);
    setCursorHistory([undefined]);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    let newNumericSize;
    const BACKEND_MAX_LIMIT = 500;
    if (value === "all") {
      if (studentsData?.totalCount !== undefined && studentsData.totalCount > 0) {
        newNumericSize = Math.min(studentsData.totalCount, BACKEND_MAX_LIMIT);
      } else {
        newNumericSize = BACKEND_MAX_LIMIT;
      }
    } else {
      newNumericSize = parseInt(value, 10);
    }
    if (isNaN(newNumericSize) || newNumericSize <= 0) {
      newNumericSize = 10;
    } else {
      newNumericSize = Math.min(newNumericSize, BACKEND_MAX_LIMIT);
    }
    newNumericSize = Math.max(1, newNumericSize);
    console.log("[StudentsPage] handlePageSizeChange - input value:", value, "calculated newNumericSize:", newNumericSize);
    setPageSize(newNumericSize);
    setCursor(undefined);
    setCurrentPage(1);
    setCursorHistory([undefined]);
  }, [studentsData?.totalCount]);

  const goToNextPage = useCallback(() => {
    if (studentsData?.nextCursor) {
      setCursor(studentsData.nextCursor);
      setCursorHistory(prev => [...prev, studentsData.nextCursor]);
      setCurrentPage(prev => prev + 1);
    }
  }, [studentsData?.nextCursor]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newHistory = [...cursorHistory];
      newHistory.pop();
      setCursorHistory(newHistory);
      setCursor(newHistory[newHistory.length - 1]);
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage, cursorHistory]);

  const handleBulkImportSuccess = () => {
    void utils.student.getAll.invalidate();
    void utils.student.getStats.invalidate();
    toast({
      title: "Import successful",
      description: "Students have been imported successfully",
      variant: "success"
    });
  };

  // Placeholder for handling row selection changes from StudentDataTableWrapper
  const handleStudentRowSelection = (selectedIds: string[], isSelectAllActive: boolean) => {
    // console.log("Selected Student IDs:", selectedIds);
    // console.log("Is Select All Active:", isSelectAllActive);
    // Here you would typically update some state to manage selected students for bulk actions on the page
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
          {canManageTC && (
            <Link href="/students/tc">
              <Button variant="glowing-secondary" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Transfer Certificate</span>
              </Button>
            </Link>
          )}
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

        {isLoading && !studentsData ? (
          <div className="py-8 text-center text-gray-500">
            Loading students...
          </div>
        ) : students.length === 0 && !isLoading ? (
          <div className="py-8 text-center text-gray-500">
            No students found. Try adjusting your filters.
          </div>
        ) : (
          <div>
            <StudentDataTableWrapper
              data={studentsData?.items || []}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageCount={pageCount}
              onSortChange={handleSortChange}
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              totalStudentsCount={studentsData?.totalCount || 0}
              onRowSelectionChange={handleStudentRowSelection}
              currentBranchId={getBranchFilterParam() || null}
              currentSessionId={currentSessionId || null}
              currentFilters={filters?.conditions?.reduce((acc, condition) => {
                if (condition.field && condition.value !== undefined) {
                  acc[condition.field] = condition.value;
                }
                return acc;
              }, {} as Record<string, any>) || {}}
              currentSearchTerm={null}
            />
            <div className="mt-4 flex items-center justify-end">
              { (studentsData?.totalCount ?? 0) > 0 && pageCount > 1 && (
                  <div className="flex items-center gap-2">
                      <Button 
                          onClick={goToPreviousPage} 
                          disabled={currentPage === 1}
                          variant="outline" 
                          size="sm"
                      >
                          Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {pageCount}
                      </span>
                      <Button 
                          onClick={goToNextPage} 
                          disabled={!studentsData?.nextCursor}
                          variant="outline" 
                          size="sm"
                      >
                          Next
                      </Button>
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
