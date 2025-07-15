"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { FileDown, PlusCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/utils/api";
import { EmployeeDataTable } from "@/components/employees/employee-data-table";
import { EmployeeBulkImport } from "@/components/employees/employee-bulk-import";
import type { Employee } from "@/components/employees/employee-data-table";
import { EmployeeStatsCards } from "@/components/employees/employee-stats-cards";
import { useToast } from "@/components/ui/use-toast";

export default function EmployeesPage() {
  // State management
  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]); // Store cursors for each page
  const [searchTerm, setSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [allEmployeesSelected, setAllEmployeesSelected] = useState(false);
  const [allEmployeeIds, setAllEmployeeIds] = useState<string[]>([]);
  const [isPaginating, setIsPaginating] = useState(false);
  const [paginatingDirection, setPaginatingDirection] = useState<'previous' | 'next' | null>(null);
  const [lastKnownTotalPages, setLastKnownTotalPages] = useState(0);

  const { toast } = useToast();
  const utils = api.useContext();

  // Helper function to get branch ID from user context or URL - memoized to prevent re-renders
  const branchId = useMemo(() => {
    // This would ideally come from user context or URL params
    return undefined;
  }, []);

  // Debounce search to prevent excessive resets
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch employees with pagination
  const { data: employeesData, isLoading, refetch } = api.employee.getAll.useQuery({
    limit: pageSize,
    cursor: cursors[currentPage - 1],
    branchId: branchId,
    search: debouncedSearchTerm || undefined,
    isActive: true // Default filter for active employees
  });

  // API query for fetching all employee IDs (used for select all functionality)
  const { data: allEmployeeIdsData } = api.employee.getAll.useQuery({
    branchId: branchId,
    search: debouncedSearchTerm || undefined,
    isActive: true,
  }, {
    enabled: true,
  });

  // Calculate pagination parameters
  const currentTotalPages = Math.ceil((employeesData?.items.length || 0) / pageSize);
  const totalPages = isPaginating && lastKnownTotalPages > 1 ? lastKnownTotalPages : currentTotalPages;
  const totalCount = employeesData?.items.length || 0;

  // Transform API data to component format
  const transformEmployeeData = useCallback((employee: any): Employee => {
    try {
      return {
        id: employee.id,
        firstName: employee.firstName || 'Unknown',
        lastName: employee.lastName || 'Unknown',
        email: employee.email || employee.personalEmail || undefined,
        phone: employee.phone || undefined,
        designation: employee.designation || 'Unknown',
        department: employee.department || undefined,
        isActive: employee.isActive !== undefined ? employee.isActive : true,
        employeeCode: employee.employeeCode || undefined,
        joinDate: employee.joinDate ? employee.joinDate.toISOString() : undefined,
      };
    } catch (error) {
      console.error('Error transforming employee data:', error, employee);
      // Return fallback data so the UI doesn't crash
      return {
        id: employee?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        firstName: 'Data',
        lastName: 'Error',
        designation: 'Error',
        isActive: false
      };
    }
  }, []);

  // Update currentEmployees when data loads
  useEffect(() => {
    if (employeesData?.items) {
      const transformedEmployees = employeesData.items.map(transformEmployeeData);
      setCurrentEmployees(transformedEmployees);
      
      // Store next cursor for pagination
      if (employeesData.nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[currentPage] = employeesData.nextCursor;
          return newCursors;
        });
      }
      
      // Update last known total pages when we have valid data
      if (employeesData.items.length !== undefined) {
        const newTotalPages = Math.ceil(employeesData.items.length / pageSize);
        setLastKnownTotalPages(newTotalPages);
      }
      
      // Reset pagination loading state
      setIsPaginating(false);
      setPaginatingDirection(null);
    }
  }, [employeesData?.items, employeesData?.nextCursor, currentPage, pageSize, transformEmployeeData]);

  // Update all employee IDs when data loads
  useEffect(() => {
    if (allEmployeeIdsData?.items) {
      setAllEmployeeIds(allEmployeeIdsData.items.map(item => item.id));
    }
  }, [allEmployeeIdsData?.items]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCursors([undefined]); // Reset cursors
    setRowSelection({});
    setAllEmployeesSelected(false);
    setIsPaginating(false); // Reset pagination state
    setPaginatingDirection(null); // Reset pagination direction
    setLastKnownTotalPages(0); // Reset last known total pages
  }, [debouncedSearchTerm, branchId, pageSize]);

  // API mutations
  const deleteEmployeeMutation = api.employee.delete.useMutation({
    onSuccess: () => {
      void refetch();
      toast({ title: "Employee deleted", description: "Employee record has been successfully deleted.", variant: "success" });
    },
  });

  // Note: Employee router doesn't have bulkUpdateStatus, using toggleStatus for individual updates
  // const updateEmployeeStatusMutation = api.employee.bulkUpdateStatus.useMutation({
  //   onSuccess: () => {
  //     void refetch();
  //     toast({ title: "Status updated", description: "Employee status has been updated successfully.", variant: "success" });
  //   },
  // });

  const deleteMultipleEmployeesMutation = api.employee.bulkDelete.useMutation({
    onSuccess: (data) => {
      void refetch();
      toast({ 
        title: "Employees Deleted", 
        description: "Employees have been successfully deleted.", 
        variant: "success" 
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk Deletion Failed",
        description: error.message || "An unexpected error occurred while deleting employees.",
        variant: "destructive",
      });
    },
  });

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle select all employees (entire dataset)
  const handleSelectAllEmployees = () => {
    setAllEmployeesSelected(true);
    setRowSelection({});
  };

  // Handle deselect all employees
  const handleDeselectAllEmployees = () => {
    setAllEmployeesSelected(false);
    setRowSelection({});
  };

  // Get selected employee IDs
  const getSelectedEmployeeIds = () => {
    if (allEmployeesSelected) {
      return allEmployeeIds;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  };

  // Get selected count
  const getSelectedCount = () => {
    if (allEmployeesSelected) {
      return allEmployeeIds.length;
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
    if (currentPage < totalPages) {
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
      await deleteMultipleEmployeesMutation.mutateAsync({ ids });
      setRowSelection({});
      setAllEmployeesSelected(false);
    } catch (error) {
      console.error('Error deleting employees:', error);
    }
  };

  // Handle bulk status update - disabled until bulkUpdateStatus is added to employee router
  const handleBulkStatusUpdate = async (ids: string[], isActive: boolean) => {
    toast({
      title: "Feature Unavailable",
      description: "Bulk status update is not yet implemented for employees.",
      variant: "destructive",
    });
    // try {
    //   await updateEmployeeStatusMutation.mutateAsync({ ids, isActive });
    //   setRowSelection({});
    //   setAllEmployeesSelected(false);
    // } catch (error) {
    //   console.error('Error updating employee status:', error);
    // }
  };

  // Get employee stats from the API or use default values
  const { data: employeeStats, isLoading: isLoadingStats } = api.employee.getStats.useQuery({
    branchId: branchId
  });

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    void refetch();
    void utils.employee.getStats.invalidate();
    toast({
      title: "Import Completed",
      description: "Employees have been imported successfully.",
      variant: "success",
    });
  };

  return (
    <PageWrapper
      title="Employees"
      subtitle="Manage all employees in your institution"
      action={
        <div className="flex gap-2">
          <EmployeeBulkImport onSuccess={handleBulkImportSuccess} />
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/staff/employees/create">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Employee</span>
            </Button>
          </Link>
        </div>
      }
    >
      <EmployeeStatsCards 
        totalEmployees={employeeStats?.totalEmployees || 0}
        totalEmployeesChange={5.0} // Sample value, replace with actual data if available
        activeEmployees={employeeStats?.activeEmployees || 0}
        activeEmployeesChange={3.2} // Sample value
        departmentCount={employeeStats?.departmentCount || 0}
        departmentChange={0.8} // Sample value
        averageTenure={2.5} // Sample value
        tenureChange={1.5} // Sample value
      />

      <div className="mt-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">All Employees</h2>
            <p className="text-muted-foreground">
              {isLoading ? 'Loading...' : `Showing ${currentEmployees.length} of ${totalCount} employees`}
            </p>
          </div>
        </div>

        {/* Employee Data Table */}
        <EmployeeDataTable
          data={currentEmployees}
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
          allEmployeesSelected={allEmployeesSelected}
          onSelectAllEmployees={handleSelectAllEmployees}
          onDeselectAllEmployees={handleDeselectAllEmployees}
          selectedCount={getSelectedCount()}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
        />
      </div>
    </PageWrapper>
  );
} 