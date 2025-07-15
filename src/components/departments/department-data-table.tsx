"use client"

import { useState, useCallback, useEffect } from "react"
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash, UserCheck, UserX, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils"
import { api } from "@/utils/api"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Define the Department type
export type Department = {
  id: string
  name: string
  code: string
  type: string
  description?: string
  isActive: boolean
  branch?: {
    name: string
  }
}

// Skeleton loader component
const DepartmentSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 p-4 border-b">
      <div className="w-4 h-4 bg-muted rounded"></div>
      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
        <div className="h-4 bg-muted rounded w-24"></div>
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-32"></div>
        <div className="h-5 bg-muted rounded w-16"></div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
  </div>
)

interface DepartmentDataTableProps {
  data: Department[]
  isLoading?: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  totalCount: number
  currentPage: number
  totalPages: number
  onPreviousPage: () => void
  onNextPage: () => void
  isPaginating?: boolean
  paginatingDirection?: 'previous' | 'next' | null
  rowSelection: Record<string, boolean>
  onRowSelectionChange: (selection: Record<string, boolean>) => void
  allDepartmentsSelected: boolean
  onSelectAllDepartments: () => void
  onDeselectAllDepartments: () => void
  selectedCount: number
  onBulkDelete: (ids: string[]) => void
  onBulkStatusUpdate: (ids: string[], status: boolean) => void
}

export function DepartmentDataTable({
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
  allDepartmentsSelected,
  onSelectAllDepartments,
  onDeselectAllDepartments,
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate
}: DepartmentDataTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // API mutations
  const utils = api.useContext()
  
  const deleteDepartmentMutation = api.department.delete.useMutation({
    onSuccess: () => {
      void utils.department.getAll.invalidate()
      void utils.department.getStats.invalidate()
      toast({
        title: "Department deleted",
        description: "Department has been successfully deleted.",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error deleting department",
        description: error.message,
        variant: "destructive"
      })
    }
  })
  
  const toggleStatusMutation = api.department.update.useMutation({
    onSuccess: () => {
      void utils.department.getAll.invalidate()
      void utils.department.getStats.invalidate()
      toast({
        title: "Status updated",
        description: "Department status has been updated successfully.",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Handle department actions
  const handleDepartmentAction = (action: string, department: Department) => {
    switch (action) {
      case 'view':
        router.push(`/staff/departments/${department.id}`)
        break
      case 'edit':
        router.push(`/staff/departments/${department.id}/edit`)
        break
      case 'delete':
        deleteConfirm(
          "department",
          () => {
            deleteDepartmentMutation.mutate({ id: department.id })
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "department",
          true,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: department.id, 
              name: department.name,
              type: department.type,
              description: department.description,
              isActive: true 
            })
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "department",
          false,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: department.id, 
              name: department.name,
              type: department.type,
              description: department.description,
              isActive: false 
            })
          }
        )
        break
    }
  }

  // Get selected department IDs
  const getSelectedDepartmentIds = () => {
    if (allDepartmentsSelected) {
      return data.map(department => department.id)
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id])
  }

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    const selectedIds = getSelectedDepartmentIds()
    
    switch (action) {
      case 'delete':
        deleteConfirm(
          "department",
          () => {
            onBulkDelete(selectedIds)
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "department",
          true,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, true)
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "department",
          false,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, false)
          }
        )
        break
    }
  }

  // Department row actions component
  const DepartmentRowActions = ({ department }: { department: Department }) => (
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
        <DropdownMenuItem onClick={() => handleDepartmentAction('edit', department)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDepartmentAction(department.isActive ? 'deactivate' : 'activate', department)}
        >
          {department.isActive ? (
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
          onClick={() => handleDepartmentAction('delete', department)}
          className="text-red-600 dark:text-red-400"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Department row component with animation
  const DepartmentRow = ({ department, index }: { department: Department, index: number }) => (
    <div 
      className={cn(
        "flex items-center space-x-4 p-4 border-b transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Checkbox
        checked={allDepartmentsSelected || rowSelection[department.id] || false}
        onCheckedChange={(checked) => {
          if (allDepartmentsSelected) {
            onDeselectAllDepartments()
          } else {
            onRowSelectionChange({
              ...rowSelection,
              [department.id]: checked as boolean
            })
          }
        }}
        aria-label={`Select ${department.name}`}
      />
      
      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
        <div className="font-medium text-sm">
          {department.name}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {department.code}
        </div>
        
        <div className="text-sm">
          <Badge variant="outline" className="text-xs">
            {department.type}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {department.description ? (
            <span className="line-clamp-2">{department.description}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={department.isActive ? "success" : "secondary"}>
            {department.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      
      <DepartmentRowActions department={department} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search departments..."
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
              {selectedCount} department{selectedCount > 1 ? 's' : ''} selected
            </span>
            {!allDepartmentsSelected && (
              <Button
                variant="link"
                size="sm"
                onClick={onSelectAllDepartments}
                className="h-auto p-0 text-primary"
              >
                Select all departments
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
              checked={allDepartmentsSelected || (data.length > 0 && data.every(department => rowSelection[department.id]))}
              onCheckedChange={(checked) => {
                if (checked) {
                  const newSelection: Record<string, boolean> = {}
                  data.forEach(department => {
                    newSelection[department.id] = true
                  })
                  onRowSelectionChange(newSelection)
                } else {
                  onRowSelectionChange({})
                  onDeselectAllDepartments()
                }
              }}
              aria-label="Select all departments on this page"
            />
          </div>
          <div className="flex-1 grid grid-cols-5 gap-4">
            <div>Name</div>
            <div>Code</div>
            <div>Type</div>
            <div>Description</div>
            <div>Status</div>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Department Rows */}
        {isLoading && data.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <DepartmentSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-0 border rounded-lg overflow-hidden">
            {data.map((department, index) => (
              <DepartmentRow key={department.id} department={department} index={index} />
            ))}
            
            {/* Loading More Skeletons */}
            {isLoading && !isPaginating && (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, index) => (
                  <DepartmentSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            {isLoading && data.length === 0 ? (
              'Loading departments...'
            ) : (
              <>
                Showing <span className="font-medium">{data.length}</span> of{" "}
                <span className="font-medium">{totalCount}</span> departments
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

        {/* No Departments Found */}
        {!isLoading && data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No departments found matching your criteria.
          </div>
        )}
      </div>
    </div>
  )
} 