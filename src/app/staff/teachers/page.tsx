"use client";

import { TeacherStatsCards } from "@/components/teachers/teacher-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { TeacherDataTable, type Teacher } from "@/components/teachers/teacher-data-table"
import { TeacherBulkImport } from "@/components/teachers/teacher-bulk-import"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileDown } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback, useEffect, useMemo } from "react"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { useToast } from "@/components/ui/use-toast"

export default function TeachersPage() {
  // State management
  const [currentTeachers, setCurrentTeachers] = useState<Teacher[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]); // Store cursors for each page
  const [searchTerm, setSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [allTeachersSelected, setAllTeachersSelected] = useState(false);
  const [allTeacherIds, setAllTeacherIds] = useState<string[]>([]);
  const [isPaginating, setIsPaginating] = useState(false);
  const [paginatingDirection, setPaginatingDirection] = useState<'previous' | 'next' | null>(null);
  const [estimatedTotalPages, setEstimatedTotalPages] = useState(1);

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { toast } = useToast();
  const utils = api.useContext();

  // Memoize branch ID to prevent re-renders
  const branchId = useMemo(() => getBranchFilterParam(), [getBranchFilterParam]);

  // Debounce search to prevent excessive resets
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API query with pagination
  const { data: teachersData, isLoading, refetch } = api.teacher.getAll.useQuery({
    branchId: branchId,
    limit: pageSize,
    cursor: cursors[currentPage - 1],
    search: debouncedSearchTerm || undefined,
    advancedFilters: {
      conditions: [
        {
          id: "default-active-filter",
          field: "isActive",
          operator: "equals",
          value: true,
        }
      ],
      logicOperator: "and",
    }
  });

  // API query for fetching all teacher IDs (used for select all functionality)
  const { data: allTeacherIdsData } = api.teacher.getAll.useQuery({
    branchId: branchId,
    search: debouncedSearchTerm || undefined,
    advancedFilters: {
      conditions: [
        {
          id: "default-active-filter",
          field: "isActive",
          operator: "equals",
          value: true,
        }
      ],
      logicOperator: "and",
    },
    limit: 1000 // Get a large number to simulate getting all IDs
  }, {
    enabled: true,
  });

  // Calculate pagination parameters (estimate since we don't have totalCount)
  const hasNextPage = teachersData?.nextCursor !== undefined;
  const hasPreviousPage = currentPage > 1;
  const totalCount = currentTeachers.length; // Show current page count

  // Transform teacher data
  const transformTeacherData = useCallback((teacher: any): Teacher => {
    try {
      return {
        id: teacher.id,
        employeeCode: teacher.employeeCode || '',
        firstName: teacher.firstName || 'Unknown',
        lastName: teacher.lastName || 'Unknown',
        email: teacher.email || undefined,
        phone: teacher.phone || undefined,
        qualification: teacher.qualification || undefined,
        specialization: teacher.specialization || undefined,
        joinDate: teacher.joinDate ? teacher.joinDate.toISOString() : undefined,
        isActive: teacher.isActive !== undefined ? teacher.isActive : true,
        branch: teacher.branch
      };
    } catch (error) {
      console.error('Error transforming teacher data:', error, teacher);
      return {
        id: teacher?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        employeeCode: 'ERROR',
        firstName: 'Data',
        lastName: 'Error',
        isActive: false
      };
    }
  }, []);

  // Update currentTeachers when data loads
  useEffect(() => {
    if (teachersData?.items) {
      const transformedTeachers = teachersData.items.map(transformTeacherData);
      setCurrentTeachers(transformedTeachers);
      
      // Store next cursor for pagination
      if (teachersData.nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[currentPage] = teachersData.nextCursor;
          return newCursors;
        });
      }
      
      // Update estimated total pages based on whether we have more data
      if (teachersData.nextCursor) {
        setEstimatedTotalPages(Math.max(currentPage + 1, estimatedTotalPages));
      }
      
      // Reset pagination loading state
      setIsPaginating(false);
      setPaginatingDirection(null);
    }
  }, [teachersData?.items, teachersData?.nextCursor, currentPage, transformTeacherData, estimatedTotalPages]);

  // Update all teacher IDs when data loads
  useEffect(() => {
    if (allTeacherIdsData?.items) {
      const ids = allTeacherIdsData.items.map(teacher => teacher.id);
      setAllTeacherIds(ids);
    }
  }, [allTeacherIdsData?.items]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCursors([undefined]); // Reset cursors
    setRowSelection({});
    setAllTeachersSelected(false);
    setIsPaginating(false); // Reset pagination state
    setPaginatingDirection(null); // Reset pagination direction
    setEstimatedTotalPages(1); // Reset estimated total pages
  }, [debouncedSearchTerm, branchId, pageSize]);

  // API mutations
  const deleteTeacherMutation = api.teacher.delete.useMutation({
    onSuccess: () => {
      void refetch();
      toast({ title: "Teacher deleted", description: "Teacher record has been successfully deleted.", variant: "success" });
    },
  });

  const updateTeacherStatusMutation = api.teacher.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      void refetch();
      toast({ title: "Status updated", description: "Teacher status has been updated successfully.", variant: "success" });
    },
  });

  const deleteMultipleTeachersMutation = api.teacher.bulkDelete.useMutation({
    onSuccess: (data) => {
      void refetch();
      toast({ 
        title: "Teachers Deleted", 
        description: `Teachers have been successfully deleted.`, 
        variant: "success" 
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Deletion Failed",
        description: error.message || "An unexpected error occurred while deleting teachers.",
        variant: "destructive",
      });
    },
  });

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle select all teachers (entire dataset)
  const handleSelectAllTeachers = () => {
    setAllTeachersSelected(true);
    setRowSelection({});
  };

  // Handle deselect all teachers
  const handleDeselectAllTeachers = () => {
    setAllTeachersSelected(false);
    setRowSelection({});
  };

  // Get selected teacher IDs
  const getSelectedTeacherIds = () => {
    if (allTeachersSelected) {
      return allTeacherIds;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  };

  // Get selected count
  const getSelectedCount = () => {
    if (allTeachersSelected) {
      return allTeacherIds.length;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]).length;
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      setIsPaginating(true);
      setPaginatingDirection('previous');
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setIsPaginating(true);
      setPaginatingDirection('next');
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setCursors([undefined]); // Reset cursors
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    try {
      await deleteMultipleTeachersMutation.mutateAsync({ ids });
      setRowSelection({});
      setAllTeachersSelected(false);
    } catch (error) {
      console.error('Error deleting teachers:', error);
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (ids: string[], isActive: boolean) => {
    try {
      await updateTeacherStatusMutation.mutateAsync({ ids, isActive });
      setRowSelection({});
      setAllTeachersSelected(false);
    } catch (error) {
      console.error('Error updating teacher status:', error);
    }
  };

  // Get teacher stats from the API or use default values
  const { data: teacherStats, isLoading: isLoadingStats } = api.teacher.getStats.useQuery({
    branchId: branchId
  });

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    void refetch();
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
          <Link href="/staff/teachers/create">
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

      <div className="mt-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">All Teachers</h2>
            <p className="text-muted-foreground">
              {isLoading ? 'Loading...' : `Showing ${currentTeachers.length} teachers on page ${currentPage}`}
            </p>
          </div>
        </div>

        {/* Teacher Data Table */}
        <TeacherDataTable
          data={currentTeachers}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={estimatedTotalPages}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          isPaginating={isPaginating}
          paginatingDirection={paginatingDirection}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          allTeachersSelected={allTeachersSelected}
          onSelectAllTeachers={handleSelectAllTeachers}
          onDeselectAllTeachers={handleDeselectAllTeachers}
          selectedCount={getSelectedCount()}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
        />
      </div>
    </PageWrapper>
  );
}
