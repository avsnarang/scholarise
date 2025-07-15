"use client";

import { DepartmentStatsCards } from "@/components/departments/department-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { DepartmentDataTable, type Department } from "@/components/departments/department-data-table"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileDown } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback, useEffect, useMemo } from "react"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { useToast } from "@/components/ui/use-toast"

export default function DepartmentsListPage() {
  // State management
  const [currentDepartments, setCurrentDepartments] = useState<Department[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]); // Store cursors for each page
  const [searchTerm, setSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [allDepartmentsSelected, setAllDepartmentsSelected] = useState(false);
  const [allDepartmentIds, setAllDepartmentIds] = useState<string[]>([]);
  const [isPaginating, setIsPaginating] = useState(false);
  const [paginatingDirection, setPaginatingDirection] = useState<'previous' | 'next' | null>(null);
  const [lastKnownTotalPages, setLastKnownTotalPages] = useState(0);

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
  const { data: departmentsData, isLoading, refetch } = api.department.getAll.useQuery({
    branchId: branchId,
    limit: pageSize,
    cursor: cursors[currentPage - 1],
    search: debouncedSearchTerm || undefined,
  });

  // Calculate pagination parameters
  const departments = departmentsData?.items || [];
  const totalCount = departments.length;
  const hasNextPage = departmentsData?.nextCursor !== undefined;
  const currentTotalPages = Math.ceil(totalCount / pageSize);
  const totalPages = isPaginating && lastKnownTotalPages > 1 ? lastKnownTotalPages : currentTotalPages;

  // Transform department data
  const transformDepartmentData = useCallback((department: any): Department => {
    try {
      return {
        id: department.id,
        name: department.name || 'Unknown',
        code: department.code || 'Unknown',
        type: department.type || 'Other',
        description: department.description || undefined,
        isActive: department.isActive !== undefined ? department.isActive : true,
        branch: department.branch
      };
    } catch (error) {
      console.error('Error transforming department data:', error, department);
      return {
        id: department?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Data Error',
        code: 'ERROR',
        type: 'Other',
        isActive: false
      };
    }
  }, []);

  // Update currentDepartments when data loads
  useEffect(() => {
    if (departmentsData?.items) {
      const transformedDepartments = departmentsData.items.map(transformDepartmentData);
      setCurrentDepartments(transformedDepartments);
      setAllDepartmentIds(transformedDepartments.map(d => d.id));
      
      // Store next cursor for pagination
      if (departmentsData.nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[currentPage] = departmentsData.nextCursor;
          return newCursors;
        });
      }
      
      // Update last known total pages when we have valid data
      const newTotalPages = Math.ceil(transformedDepartments.length / pageSize);
      setLastKnownTotalPages(newTotalPages);
      
      // Reset pagination loading state
      setIsPaginating(false);
      setPaginatingDirection(null);
    }
  }, [departmentsData?.items, departmentsData?.nextCursor, currentPage, pageSize, transformDepartmentData]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCursors([undefined]); // Reset cursors
    setRowSelection({});
    setAllDepartmentsSelected(false);
    setIsPaginating(false); // Reset pagination state
    setPaginatingDirection(null); // Reset pagination direction
    setLastKnownTotalPages(0); // Reset last known total pages
  }, [debouncedSearchTerm, branchId, pageSize]);

  // API mutations
  const deleteDepartmentMutation = api.department.delete.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.department.getStats.invalidate();
      toast({ title: "Department deleted", description: "Department record has been successfully deleted.", variant: "success" });
    },
  });

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle select all departments (entire dataset)
  const handleSelectAllDepartments = () => {
    setAllDepartmentsSelected(true);
    setRowSelection({});
  };

  // Handle deselect all departments
  const handleDeselectAllDepartments = () => {
    setAllDepartmentsSelected(false);
    setRowSelection({});
  };

  // Get selected department IDs
  const getSelectedDepartmentIds = () => {
    if (allDepartmentsSelected) {
      return allDepartmentIds;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  };

  // Get selected count
  const getSelectedCount = () => {
    if (allDepartmentsSelected) {
      return allDepartmentIds.length;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]).length;
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setIsPaginating(true);
      setPaginatingDirection('previous');
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && hasNextPage) {
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

  // Handle bulk delete (simplified version)
  const handleBulkDelete = async (ids: string[]) => {
    try {
      // Delete one by one since bulk delete may not be available
      for (const id of ids) {
        await deleteDepartmentMutation.mutateAsync({ id });
      }
      setRowSelection({});
      setAllDepartmentsSelected(false);
      toast({ 
        title: "Departments Deleted", 
        description: `${ids.length} department(s) have been successfully deleted.`, 
        variant: "success" 
      });
    } catch (error) {
      console.error('Error deleting departments:', error);
      toast({
        title: "Bulk Deletion Failed",
        description: "An error occurred while deleting departments.",
        variant: "destructive",
      });
    }
  };

  // Define update mutation
  const updateDepartmentMutation = api.department.update.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.department.getStats.invalidate();
    },
  });

  // Handle bulk status update (simplified version)
  const handleBulkStatusUpdate = async (ids: string[], isActive: boolean) => {
    try {
      // Update one by one since bulk update may not be available
      for (const id of ids) {
        const department = currentDepartments.find(d => d.id === id);
        if (department) {
          await updateDepartmentMutation.mutateAsync({
            id: department.id,
            name: department.name,
            type: department.type,
            description: department.description,
            isActive: isActive
          });
        }
      }
      setRowSelection({});
      setAllDepartmentsSelected(false);
      toast({ 
        title: "Status Updated", 
        description: `${ids.length} department(s) status has been updated.`, 
        variant: "success" 
      });
    } catch (error) {
      console.error('Error updating department status:', error);
      toast({
        title: "Status Update Failed",
        description: "An error occurred while updating department status.",
        variant: "destructive",
      });
    }
  };

  // Get department stats from the API or use default values
  const { data: departmentStats, isLoading: isLoadingStats } = api.department.getStats.useQuery({
    branchId: branchId
  });

  return (
    <PageWrapper
      title="Departments"
      subtitle="Manage all departments in your institution"
      action={
        <div className="flex gap-2">
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/staff/departments/create">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Department</span>
            </Button>
          </Link>
        </div>
      }
    >
      <DepartmentStatsCards branchId={branchId} />

      <div className="mt-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">All Departments</h2>
            <p className="text-muted-foreground">
              {isLoading ? 'Loading...' : `Showing ${currentDepartments.length} of ${totalCount} departments`}
            </p>
          </div>
        </div>

        {/* Department Data Table */}
        <DepartmentDataTable
          data={currentDepartments}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          isPaginating={isPaginating}
          paginatingDirection={paginatingDirection}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          allDepartmentsSelected={allDepartmentsSelected}
          onSelectAllDepartments={handleSelectAllDepartments}
          onDeselectAllDepartments={handleDeselectAllDepartments}
          selectedCount={getSelectedCount()}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
        />
      </div>
    </PageWrapper>
  );
} 