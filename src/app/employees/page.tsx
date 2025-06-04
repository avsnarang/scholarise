"use client";

import { useState, useCallback } from "react";
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
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const utils = api.useContext();

  // Helper function to get branch ID from user context or URL
  const getBranchFilterParam = () => {
    // This would ideally come from user context or URL params
    return undefined;
  };

  // Fetch employees with pagination
  const { data: employeesData, isLoading } = api.employee.getAll.useQuery({
    limit: pageSize,
    cursor,
    branchId: getBranchFilterParam(),
  });

  // Transform API data to component format
  const employees: Employee[] = (employeesData?.items || []).map(employeeData => {
    try {
      return {
        id: employeeData.id,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        designation: employeeData.designation,
        department: employeeData.department || undefined,
        isActive: employeeData.isActive,
      };
    } catch (error) {
      console.error('Error transforming employee data:', error, employeeData);
      // Return fallback data so the UI doesn't crash
      return {
        id: employeeData?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        firstName: 'Data',
        lastName: 'Error',
        designation: 'Error',
        isActive: false
      };
    }
  });

  // Handle pagination
  const goToNextPage = useCallback(() => {
    if (employeesData?.nextCursor) {
      setCursor(employeesData.nextCursor);
    }
  }, [employeesData?.nextCursor]);

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

  // Get employee stats from the API or use default values
  const { data: employeeStats, isLoading: isLoadingStats } = api.employee.getStats.useQuery({
    branchId: getBranchFilterParam()
  });

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    void utils.employee.getAll.invalidate();
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
          <Link href="/employees/create">
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

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Employees</h2>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No employees found.
          </div>
        ) : (
          <div>
            <EmployeeDataTable data={employees} />
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing up to {pageSize} employees per page
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
                    disabled={!employeesData?.nextCursor} // Only enable if there's a next page
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