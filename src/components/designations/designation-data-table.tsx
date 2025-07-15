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

// Define the Designation type
export type Designation = {
  id: string
  title: string
  code: string
  category: string
  level: string
  description?: string
  isActive: boolean
  branch?: {
    name: string
  }
}

// Skeleton loader component
const DesignationSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 p-4 border-b">
      <div className="w-4 h-4 bg-muted rounded"></div>
      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-4 bg-muted rounded w-24"></div>
        <div className="h-5 bg-muted rounded w-16"></div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
  </div>
)

interface DesignationDataTableProps {
  data: Designation[]
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
  allDesignationsSelected: boolean
  onSelectAllDesignations: () => void
  onDeselectAllDesignations: () => void
  selectedCount: number
  onBulkDelete: (ids: string[]) => void
  onBulkStatusUpdate: (ids: string[], status: boolean) => void
}

export function DesignationDataTable({
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
  allDesignationsSelected,
  onSelectAllDesignations,
  onDeselectAllDesignations,
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate
}: DesignationDataTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // API mutations
  const utils = api.useContext()
  
  const deleteDesignationMutation = api.designation.delete.useMutation({
    onSuccess: () => {
      void utils.designation.getAll.invalidate()
      void utils.designation.getStats.invalidate()
      toast({
        title: "Designation deleted",
        description: "Designation has been successfully deleted.",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error deleting designation",
        description: error.message,
        variant: "destructive"
      })
    }
  })
  
  const toggleStatusMutation = api.designation.update.useMutation({
    onSuccess: () => {
      void utils.designation.getAll.invalidate()
      void utils.designation.getStats.invalidate()
      toast({
        title: "Status updated",
        description: "Designation status has been updated successfully.",
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

  // Handle designation actions
  const handleDesignationAction = (action: string, designation: Designation) => {
    switch (action) {
      case 'view':
        router.push(`/staff/designations/${designation.id}`)
        break
      case 'edit':
        router.push(`/staff/designations/${designation.id}/edit`)
        break
      case 'delete':
        deleteConfirm(
          "designation",
          () => {
            deleteDesignationMutation.mutate({ id: designation.id })
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "designation",
          true,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: designation.id, 
              title: designation.title,
              category: designation.category,
              level: designation.level,
              description: designation.description,
              isActive: true 
            })
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "designation",
          false,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: designation.id, 
              title: designation.title,
              category: designation.category,
              level: designation.level,
              description: designation.description,
              isActive: false 
            })
          }
        )
        break
    }
  }

  // Get selected designation IDs
  const getSelectedDesignationIds = () => {
    if (allDesignationsSelected) {
      return data.map(designation => designation.id)
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id])
  }

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    const selectedIds = getSelectedDesignationIds()
    
    switch (action) {
      case 'delete':
        deleteConfirm(
          "designation",
          () => {
            onBulkDelete(selectedIds)
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "designation",
          true,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, true)
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "designation",
          false,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, false)
          }
        )
        break
    }
  }

  // Designation row actions component
  const DesignationRowActions = ({ designation }: { designation: Designation }) => (
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
        <DropdownMenuItem onClick={() => handleDesignationAction('edit', designation)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDesignationAction(designation.isActive ? 'deactivate' : 'activate', designation)}
        >
          {designation.isActive ? (
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
          onClick={() => handleDesignationAction('delete', designation)}
          className="text-red-600 dark:text-red-400"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Designation row component with animation
  const DesignationRow = ({ designation, index }: { designation: Designation, index: number }) => (
    <div 
      className={cn(
        "flex items-center space-x-4 p-4 border-b transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Checkbox
        checked={allDesignationsSelected || rowSelection[designation.id] || false}
        onCheckedChange={(checked) => {
          if (allDesignationsSelected) {
            onDeselectAllDesignations()
          } else {
            onRowSelectionChange({
              ...rowSelection,
              [designation.id]: checked as boolean
            })
          }
        }}
        aria-label={`Select ${designation.title}`}
      />
      
      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
        <div className="font-medium text-sm">
          {designation.title}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {designation.code}
        </div>
        
        <div className="text-sm">
          <Badge variant="outline" className="text-xs">
            {designation.category}
          </Badge>
        </div>
        
        <div className="text-sm">
          <Badge variant="outline" className="text-xs">
            {designation.level}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {designation.description ? (
            <span className="line-clamp-2">{designation.description}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={designation.isActive ? "success" : "secondary"}>
            {designation.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      
      <DesignationRowActions designation={designation} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search designations..."
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
              {selectedCount} designation{selectedCount > 1 ? 's' : ''} selected
            </span>
            {!allDesignationsSelected && (
              <Button
                variant="link"
                size="sm"
                onClick={onSelectAllDesignations}
                className="h-auto p-0 text-primary"
              >
                Select all designations
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
              checked={allDesignationsSelected || (data.length > 0 && data.every(designation => rowSelection[designation.id]))}
              onCheckedChange={(checked) => {
                if (checked) {
                  const newSelection: Record<string, boolean> = {}
                  data.forEach(designation => {
                    newSelection[designation.id] = true
                  })
                  onRowSelectionChange(newSelection)
                } else {
                  onRowSelectionChange({})
                  onDeselectAllDesignations()
                }
              }}
              aria-label="Select all designations on this page"
            />
          </div>
          <div className="flex-1 grid grid-cols-6 gap-4">
            <div>Title</div>
            <div>Code</div>
            <div>Category</div>
            <div>Level</div>
            <div>Description</div>
            <div>Status</div>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Designation Rows */}
        {isLoading && data.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <DesignationSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-0 border rounded-lg overflow-hidden">
            {data.map((designation, index) => (
              <DesignationRow key={designation.id} designation={designation} index={index} />
            ))}
            
            {/* Loading More Skeletons */}
            {isLoading && !isPaginating && (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, index) => (
                  <DesignationSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            {isLoading && data.length === 0 ? (
              'Loading designations...'
            ) : (
              <>
                Showing <span className="font-medium">{data.length}</span> of{" "}
                <span className="font-medium">{totalCount}</span> designations
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

        {/* No Designations Found */}
        {!isLoading && data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No designations found matching your criteria.
          </div>
        )}
      </div>
    </div>
  )
} 