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

// Define the Teacher type
export type Teacher = {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  qualification?: string
  specialization?: string
  joinDate?: string
  isActive: boolean
  branch?: {
    name: string
  }
}

// Skeleton loader component
const TeacherSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 p-4 border-b">
      <div className="w-4 h-4 bg-muted rounded"></div>
      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="flex items-center space-x-2">
          <div className="h-5 bg-muted rounded w-12"></div>
        </div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
  </div>
)

interface TeacherDataTableProps {
  data: Teacher[]
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
  allTeachersSelected: boolean
  onSelectAllTeachers: () => void
  onDeselectAllTeachers: () => void
  selectedCount: number
  onBulkDelete: (ids: string[]) => void
  onBulkStatusUpdate: (ids: string[], status: boolean) => void
}

export function TeacherDataTable({
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
  allTeachersSelected,
  onSelectAllTeachers,
  onDeselectAllTeachers,
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate
}: TeacherDataTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // API mutations
  const utils = api.useContext()
  
  const deleteTeacherMutation = api.teacher.delete.useMutation({
    onSuccess: () => {
      void utils.teacher.getAll.invalidate()
      void utils.teacher.getStats.invalidate()
      toast({
        title: "Teacher deleted",
        description: "Teacher has been successfully deleted.",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error deleting teacher",
        description: error.message,
        variant: "destructive"
      })
    }
  })
  
  const toggleStatusMutation = api.teacher.toggleStatus.useMutation({
    onSuccess: () => {
      void utils.teacher.getAll.invalidate()
      void utils.teacher.getStats.invalidate()
      toast({
        title: "Status updated",
        description: "Teacher status has been updated successfully.",
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

  // Handle teacher actions
  const handleTeacherAction = (action: string, teacher: Teacher) => {
    switch (action) {
      case 'view':
        router.push(`/staff/teachers/${teacher.id}`)
        break
      case 'edit':
        router.push(`/staff/teachers/${teacher.id}/edit`)
        break
      case 'delete':
        deleteConfirm(
          "teacher",
          () => {
            deleteTeacherMutation.mutate({ id: teacher.id })
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "teacher",
          true,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: teacher.id, 
              isActive: true 
            })
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "teacher",
          false,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: teacher.id, 
              isActive: false 
            })
          }
        )
        break
    }
  }

  // Get selected teacher IDs
  const getSelectedTeacherIds = () => {
    if (allTeachersSelected) {
      return data.map(teacher => teacher.id)
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id])
  }

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    const selectedIds = getSelectedTeacherIds()
    
    switch (action) {
      case 'delete':
        deleteConfirm(
          "teacher",
          () => {
            onBulkDelete(selectedIds)
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "teacher",
          true,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, true)
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "teacher",
          false,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, false)
          }
        )
        break
    }
  }

  // Teacher row actions component
  const TeacherRowActions = ({ teacher }: { teacher: Teacher }) => (
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
        <DropdownMenuItem onClick={() => handleTeacherAction('view', teacher)}>
                  <Eye className="mr-2 h-4 w-4" />
          View
              </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleTeacherAction('edit', teacher)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
              </DropdownMenuItem>
              <DropdownMenuItem
          onClick={() => handleTeacherAction(teacher.isActive ? 'deactivate' : 'activate', teacher)}
              >
                {teacher.isActive ? (
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
          onClick={() => handleTeacherAction('delete', teacher)}
          className="text-red-600 dark:text-red-400"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )

  // Teacher row component with animation
  const TeacherRow = ({ teacher, index }: { teacher: Teacher, index: number }) => (
    <div 
      className={cn(
        "flex items-center space-x-4 p-4 border-b transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Checkbox
        checked={allTeachersSelected || rowSelection[teacher.id] || false}
        onCheckedChange={(checked) => {
          if (allTeachersSelected) {
            onDeselectAllTeachers()
          } else {
            onRowSelectionChange({
              ...rowSelection,
              [teacher.id]: checked as boolean
            })
          }
        }}
        aria-label={`Select ${teacher.firstName} ${teacher.lastName}`}
      />
      
      <div className="flex-1 grid grid-cols-6 gap-4 items-center">
        <div className="font-medium text-sm">
          {teacher.employeeCode}
        </div>
        
        <div className="flex flex-col">
          <div className="font-medium text-sm">
            {teacher.firstName} {teacher.lastName}
          </div>
          {teacher.email && (
            <div className="text-xs text-muted-foreground">{teacher.email}</div>
          )}
        </div>
        
        <div className="text-sm">
          {teacher.qualification || <span className="text-muted-foreground">-</span>}
        </div>
        
        <div className="text-sm">
          {teacher.specialization || <span className="text-muted-foreground">-</span>}
        </div>
        
        <div className="text-sm">
          {teacher.phone || teacher.email ? (
            <div className="space-y-1">
              {teacher.phone && (
                <div>
                  <a 
                    href={`tel:${teacher.phone}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {teacher.phone}
                  </a>
                </div>
              )}
              {teacher.email && (
                <div>
                  <a 
                    href={`mailto:${teacher.email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                  >
                    {teacher.email}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={teacher.isActive ? "success" : "secondary"}>
            {teacher.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      
      <TeacherRowActions teacher={teacher} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search teachers..."
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
              {selectedCount} teacher{selectedCount > 1 ? 's' : ''} selected
            </span>
            {!allTeachersSelected && (
              <Button
                variant="link"
                size="sm"
                onClick={onSelectAllTeachers}
                className="h-auto p-0 text-primary"
              >
                Select all teachers
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
              checked={allTeachersSelected || (data.length > 0 && data.every(teacher => rowSelection[teacher.id]))}
              onCheckedChange={(checked) => {
                if (checked) {
                  const newSelection: Record<string, boolean> = {}
                  data.forEach(teacher => {
                    newSelection[teacher.id] = true
                  })
                  onRowSelectionChange(newSelection)
                } else {
                  onRowSelectionChange({})
                  onDeselectAllTeachers()
                }
              }}
              aria-label="Select all teachers on this page"
            />
          </div>
          <div className="flex-1 grid grid-cols-6 gap-4">
            <div>Employee Code</div>
            <div>Name</div>
            <div>Qualification</div>
            <div>Specialization</div>
            <div>Contact Details</div>
            <div>Status</div>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Teacher Rows */}
        {isLoading && data.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <TeacherSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-0 border rounded-lg overflow-hidden">
            {data.map((teacher, index) => (
              <TeacherRow key={teacher.id} teacher={teacher} index={index} />
            ))}
            
            {/* Loading More Skeletons */}
            {isLoading && !isPaginating && (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, index) => (
                  <TeacherSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            {isLoading && data.length === 0 ? (
              'Loading teachers...'
            ) : (
              <>
                Showing <span className="font-medium">{data.length}</span> of{" "}
                <span className="font-medium">{totalCount}</span> teachers
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

        {/* No Teachers Found */}
        {!isLoading && data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No teachers found matching your criteria.
          </div>
        )}
      </div>
    </div>
  )
}
