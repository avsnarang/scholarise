"use client";

import { useState, useCallback, useEffect } from "react";
import { Edit, Eye, MoreHorizontal, Trash, UserCheck, UserX, Loader2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MoveReasonModal } from "@/components/staff/move-reason-modal";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: string;
  designation: string;
  isActive: boolean;
  employeeCode?: string;
  joinDate?: string;
}

// Skeleton loader component
const EmployeeSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 p-4 border-b">
      <div className="w-4 h-4 bg-muted rounded"></div>
      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="flex items-center space-x-2">
          <div className="h-5 bg-muted rounded w-12"></div>
        </div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
  </div>
);

interface EmployeeDataTableProps {
  data: Employee[];
  isLoading?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  isPaginating?: boolean;
  paginatingDirection?: 'previous' | 'next' | null;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (selection: Record<string, boolean>) => void;
  allEmployeesSelected: boolean;
  onSelectAllEmployees: () => void;
  onDeselectAllEmployees: () => void;
  selectedCount: number;
  onBulkDelete: (ids: string[]) => void;
  onBulkStatusUpdate: (ids: string[], status: boolean) => void;
}

export function EmployeeDataTable({
  data,
  isLoading = false,
  searchTerm,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  totalCount,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  isPaginating = false,
  paginatingDirection = null,
  rowSelection,
  onRowSelectionChange,
  allEmployeesSelected,
  onSelectAllEmployees,
  onDeselectAllEmployees,
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate
}: EmployeeDataTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();
  
  // Move modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [employeeToMove, setEmployeeToMove] = useState<Employee | null>(null)
  
  // API mutations
  const utils = api.useContext();
  
  const deleteEmployeeMutation = api.employee.delete.useMutation({
    onSuccess: () => {
      void utils.employee.getAll.invalidate();
      void utils.employee.getStats.invalidate();
      toast({
        title: "Employee deleted",
        description: "Employee has been successfully deleted.",
        variant: "success"
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting employee",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const toggleStatusMutation = api.employee.toggleStatus.useMutation({
    onSuccess: () => {
      void utils.employee.getAll.invalidate();
      void utils.employee.getStats.invalidate();
      toast({
        title: "Status updated",
        description: "Employee status has been updated successfully.",
        variant: "success"
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const moveToTeacherMutation = api.staffMove.moveEmployeeToTeacher.useMutation({
    onSuccess: () => {
      void utils.employee.getAll.invalidate()
      void utils.employee.getStats.invalidate()
      void utils.teacher.getAll.invalidate()
      void utils.teacher.getStats.invalidate()
      toast({
        title: "Employee moved to teacher",
        description: "Employee has been successfully moved to teacher.",
        variant: "success"
      })
      setMoveModalOpen(false)
      setEmployeeToMove(null)
    },
    onError: (error) => {
      toast({
        title: "Error moving employee",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Handle employee actions
  const handleEmployeeAction = (action: string, employee: Employee) => {
    switch (action) {
      case 'view':
        router.push(`/staff/employees/${employee.id}`);
        break;
      case 'edit':
        router.push(`/staff/employees/${employee.id}/edit`);
        break;
      case 'delete':
        deleteConfirm(
          "employee",
          () => {
            deleteEmployeeMutation.mutate({ id: employee.id });
          }
        );
        break;
      case 'activate':
        statusChangeConfirm(
          "employee",
          true,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: employee.id, 
              isActive: true 
            });
          }
        );
        break;
      case 'deactivate':
        statusChangeConfirm(
          "employee",
          false,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: employee.id, 
              isActive: false 
            });
          }
        );
        break;
      case 'move-to-teacher':
        setEmployeeToMove(employee)
        setMoveModalOpen(true)
        break;
    }
  };

  const handleMoveConfirm = (reason: string) => {
    if (employeeToMove) {
      moveToTeacherMutation.mutate({
        employeeId: employeeToMove.id,
        reason: reason
      })
    }
  }

  // Get selected employee IDs
  const getSelectedEmployeeIds = () => {
    if (allEmployeesSelected) {
      return data.map(employee => employee.id);
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    const selectedIds = getSelectedEmployeeIds();
    
    switch (action) {
      case 'delete':
        deleteConfirm(
          "employee",
          () => {
            onBulkDelete(selectedIds);
          }
        );
        break;
      case 'activate':
        statusChangeConfirm(
          "employee",
          true,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, true);
          }
        );
        break;
      case 'deactivate':
        statusChangeConfirm(
          "employee",
          false,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, false);
          }
        );
        break;
    }
  };

  // Employee row actions component
  const EmployeeRowActions = ({ employee }: { employee: Employee }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleEmployeeAction('view', employee)}>
                  <Eye className="mr-2 h-4 w-4" />
          View
              </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEmployeeAction('edit', employee)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleEmployeeAction(employee.isActive ? 'deactivate' : 'activate', employee)}
        >
          {employee.isActive ? (
            <>
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate
            </>
                        )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEmployeeAction('move-to-teacher', employee)}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Move to Teacher
              </DropdownMenuItem>
              <DropdownMenuItem
          onClick={() => handleEmployeeAction('delete', employee)}
          className="text-red-600 dark:text-red-400"
              >
          <Trash className="mr-2 h-4 w-4" />
          Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );

  // Employee row component with animation
  const EmployeeRow = ({ employee, index }: { employee: Employee, index: number }) => (
    <div 
      className={cn(
        "flex items-center space-x-4 p-4 border-b transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Checkbox
        checked={allEmployeesSelected || rowSelection[employee.id] || false}
        onCheckedChange={(checked) => {
          if (allEmployeesSelected) {
            onDeselectAllEmployees();
          } else {
            onRowSelectionChange({
              ...rowSelection,
              [employee.id]: checked as boolean
            });
          }
        }}
        aria-label={`Select ${employee.firstName} ${employee.lastName}`}
      />
      
      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
        <div className="font-medium text-sm">
          {employee.employeeCode || employee.id.slice(0, 8)}
        </div>
        
        <div className="flex flex-col">
          <div className="font-medium text-sm">
            {employee.firstName} {employee.lastName}
          </div>
          {employee.email && (
            <div className="text-xs text-muted-foreground">{employee.email}</div>
          )}
        </div>
        
        <div className="text-sm">
          {employee.designation}
        </div>
        
        <div className="text-sm">
          {employee.phone || employee.email ? (
            <div className="space-y-1">
              {employee.phone && (
                <div>
                  <a 
                    href={`tel:${employee.phone}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {employee.phone}
                  </a>
                </div>
              )}
              {employee.email && (
                <div>
                  <a 
                    href={`mailto:${employee.email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                  >
                    {employee.email}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={employee.isActive ? "success" : "secondary"}>
            {employee.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      
      <EmployeeRowActions employee={employee} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Show:</label>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="w-20 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} employee{selectedCount > 1 ? 's' : ''} selected
            </span>
            {!allEmployeesSelected && (
              <Button
                variant="link"
                size="sm"
                onClick={onSelectAllEmployees}
                className="h-auto p-0 text-primary"
              >
                Select all employees
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('activate')}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('deactivate')}
            >
              <UserX className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="space-y-2">
        {/* Header Row */}
        <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg font-medium text-sm">
          <div className="w-4">
            <Checkbox
              checked={allEmployeesSelected || (data.length > 0 && data.every(employee => rowSelection[employee.id]))}
              onCheckedChange={(checked) => {
                if (checked) {
                  const newSelection: Record<string, boolean> = {};
                  data.forEach(employee => {
                    newSelection[employee.id] = true;
                  });
                  onRowSelectionChange(newSelection);
                } else {
                  onRowSelectionChange({});
                  onDeselectAllEmployees();
                }
              }}
              aria-label="Select all employees on this page"
            />
          </div>
          <div className="flex-1 grid grid-cols-5 gap-4">
            <div>Employee Code</div>
            <div>Name</div>
            <div>Designation</div>
            <div>Contact Details</div>
            <div>Status</div>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Employee Rows */}
        {isLoading && data.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <EmployeeSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-0 border rounded-lg overflow-hidden">
            {data.map((employee, index) => (
              <EmployeeRow key={employee.id} employee={employee} index={index} />
            ))}
            
            {/* Loading More Skeletons */}
            {isLoading && !isPaginating && (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, index) => (
                  <EmployeeSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            {isLoading && data.length === 0 ? (
              'Loading employees...'
            ) : (
              <>
                Showing <span className="font-medium">{data.length}</span> of{" "}
                <span className="font-medium">{totalCount}</span> employees
                {totalPages > 1 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    • {totalCount - data.length} more available
                  </span>
                )}
              </>
            )}
          </div>
          
          {/* Pagination Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={onPreviousPage}
                disabled={currentPage === 1 || isLoading || isPaginating}
                className="min-w-28"
              >
                {isPaginating && paginatingDirection === 'previous' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Previous
                  </>
                ) : (
                  'Previous'
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={onNextPage}
                disabled={currentPage === totalPages || isLoading || isPaginating}
                className="min-w-28"
              >
                {isPaginating && paginatingDirection === 'next' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Next
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* No Employees Found */}
        {!isLoading && data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No employees found matching your criteria.
          </div>
        )}

        {/* Move Reason Modal */}
        <MoveReasonModal
          isOpen={moveModalOpen}
          onClose={() => {
            setMoveModalOpen(false)
            setEmployeeToMove(null)
          }}
          onConfirm={handleMoveConfirm}
          isLoading={moveToTeacherMutation.isPending}
          personName={employeeToMove ? `${employeeToMove.firstName} ${employeeToMove.lastName}` : ""}
          fromType="employee"
          toType="teacher"
        />
      </div>
    </div>
  );
} 