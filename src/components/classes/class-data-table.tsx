"use client"

import { useState, useCallback, useEffect } from "react"
import { Edit, Eye, MoreHorizontal, Trash, Users, Loader2, UserCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils"
import { api } from "@/utils/api"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { EditClassModal } from "@/components/classes/edit-class-modal"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { useActionPermissions } from "@/utils/permission-utils"

// Define the Section type for the data table
export type SectionTableData = {
  id: string
  name: string
  capacity: number
  isActive: boolean
  displayOrder?: number
  classId: string
  teacherId?: string | null
  class: {
    id: string
    name: string
    isActive: boolean
    displayOrder?: number
    grade?: number
  }
  teacher?: {
    id: string
    firstName: string
    lastName: string
  } | null
  _count?: {
    students: number
  }
  studentCount?: number
}

// Skeleton loader component
const SectionSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 p-4 border-b">
      <div className="w-4 h-4 bg-muted rounded"></div>
      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
        <div className="h-4 bg-muted rounded w-24"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="h-3 bg-muted rounded w-16"></div>
        </div>
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-4 bg-muted rounded w-20"></div>
        <div className="flex items-center space-x-2">
          <div className="h-5 bg-muted rounded w-12"></div>
        </div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
  </div>
)

interface SectionDataTableProps {
  data: SectionTableData[]
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
  allSectionsSelected: boolean
  onSelectAllSections: () => void
  onDeselectAllSections: () => void
  selectedCount: number
  onBulkDelete: (ids: string[]) => void
  onBulkStatusUpdate: (ids: string[], status: boolean) => void
}

export function SectionDataTable({
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
  allSectionsSelected,
  onSelectAllSections,
  onDeselectAllSections,
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate
}: SectionDataTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // Get current branch and session context
  const { currentBranchId } = useBranchContext()
  const { currentSessionId } = useAcademicSessionContext()
  
  // Check permissions
  const { canView, canEdit, canDelete } = useActionPermissions("classes")
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  
  // API mutations
  const utils = api.useContext()
  
  const deleteSectionMutation = api.section.delete.useMutation({
    onSuccess: () => {
      void utils.section.getAll.invalidate()
      toast({
        title: "Section deleted",
        description: "Section has been successfully deleted.",
        variant: "success"
      })
    },
    onError: (error) => {
      toast({
        title: "Error deleting section",
        description: error.message,
        variant: "destructive"
      })
    }
  })
  
  const toggleStatusMutation = api.section.toggleStatus.useMutation({
    onSuccess: () => {
      void utils.section.getAll.invalidate()
      toast({
        title: "Status updated",
        description: "Section status has been updated successfully.",
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

  // Handle section actions
  const handleSectionAction = (action: string, section: SectionTableData) => {
    switch (action) {
      case 'view':
        router.push(`/classes/${section.classId}`)
        break
      case 'edit':
        setEditingClassId(section.classId)
        setEditModalOpen(true)
        break
      case 'delete':
        deleteConfirm(
          "section",
          () => {
            deleteSectionMutation.mutate({ id: section.id })
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "section",
          true,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: section.id, 
              isActive: true 
            })
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "section",
          false,
          1,
          () => {
            toggleStatusMutation.mutate({ 
              id: section.id, 
              isActive: false 
            })
          }
        )
        break
      case 'students':
        router.push(`/classes/${section.classId}/students`)
        break
    }
  }

  // Get selected section IDs
  const getSelectedSectionIds = () => {
    if (allSectionsSelected) {
      return data.map(section => section.id)
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id])
  }

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    const selectedIds = getSelectedSectionIds()
    
    switch (action) {
      case 'delete':
        deleteConfirm(
          "section",
          () => {
            onBulkDelete(selectedIds)
          }
        )
        break
      case 'activate':
        statusChangeConfirm(
          "section",
          true,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, true)
          }
        )
        break
      case 'deactivate':
        statusChangeConfirm(
          "section",
          false,
          selectedIds.length,
          () => {
            onBulkStatusUpdate(selectedIds, false)
          }
        )
        break
    }
  }

  // Section row actions component
  const SectionRowActions = ({ section }: { section: SectionTableData }) => (
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
        {canView() && (
          <DropdownMenuItem onClick={() => handleSectionAction('view', section)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}
        {canView() && (
          <DropdownMenuItem onClick={() => handleSectionAction('students', section)}>
            <Users className="mr-2 h-4 w-4" />
            Manage Students
          </DropdownMenuItem>
        )}
        {canEdit() && (
          <DropdownMenuItem onClick={() => handleSectionAction('edit', section)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Class
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={() => handleSectionAction(section.isActive ? 'deactivate' : 'activate', section)}
        >
          {section.isActive ? (
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
        {canDelete() && (
          <DropdownMenuItem
            onClick={() => handleSectionAction('delete', section)}
            className="text-red-600 dark:text-red-400"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Section row component with animation
  const SectionRow = ({ section, index }: { section: SectionTableData, index: number }) => {
    const students = section._count?.students || section.studentCount || 0
    const capacity = section.capacity || 0
    const fillPercentage = capacity ? Math.min(Math.round((students / capacity) * 100), 100) : 0
    
    let progressColor = "bg-green-500"
    let textColor = "text-green-700 dark:text-green-300"
    let bgColor = "bg-green-50 dark:bg-green-900/20"
    
    if (fillPercentage > 90) {
      progressColor = "bg-red-500"
      textColor = "text-red-700 dark:text-red-300"
      bgColor = "bg-red-50 dark:bg-red-900/20"
    } else if (fillPercentage > 75) {
      progressColor = "bg-amber-500"
      textColor = "text-amber-700 dark:text-amber-300"
      bgColor = "bg-amber-50 dark:bg-amber-900/20"
    }

    return (
      <div 
        className={cn(
          "flex items-center space-x-4 p-4 border-b transition-all duration-300 ease-in-out",
          "animate-in fade-in slide-in-from-bottom-2"
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <Checkbox
          checked={allSectionsSelected || rowSelection[section.id] || false}
          onCheckedChange={(checked) => {
            if (allSectionsSelected) {
              onDeselectAllSections()
            } else {
              onRowSelectionChange({
                ...rowSelection,
                [section.id]: checked as boolean
              })
            }
          }}
          aria-label={`Select ${section.class.name} - ${section.name}`}
        />
        
        <div className="flex-1 grid grid-cols-5 gap-4 items-center">
          <div className="flex flex-col">
            <div className="font-medium text-sm">
              {section.class.name} - {section.name}
            </div>
            {section.class.grade && (
              <div className="text-xs text-muted-foreground">
                Grade {section.class.grade}
              </div>
            )}
          </div>
          
          <div className="text-sm">
            {!section.teacher ? (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted border flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">?</span>
                </div>
                <span className="text-muted-foreground">Not assigned</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
                  {section.teacher.firstName?.[0]}{section.teacher.lastName?.[0]}
                </div>
                <span className="text-sm font-medium">
                  {section.teacher.firstName} {section.teacher.lastName}
                </span>
              </div>
            )}
          </div>
          
          <div className="text-sm text-center">
            <span className="font-medium">{capacity}</span>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${bgColor}`}>
                <Users className={`h-3.5 w-3.5 ${textColor}`} />
                <span className={`text-sm font-semibold ${textColor}`}>
                  {students}<span className="text-muted-foreground">/{capacity}</span>
                </span>
              </div>
              {capacity > 0 && (
                <div className="flex flex-col gap-1 min-w-[60px]">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${progressColor} transition-all duration-300`} 
                      style={{ width: `${fillPercentage}%` }} 
                    />
                  </div>
                  <span className="text-xs text-muted-foreground text-center">
                    {fillPercentage}%
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <Badge variant={section.isActive ? "success" : "secondary"}>
              {section.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        
        <SectionRowActions section={section} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search classes..."
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
              {selectedCount} class{selectedCount > 1 ? 'es' : ''} selected
            </span>
            {!allSectionsSelected && (
              <Button
                variant="link"
                size="sm"
                onClick={onSelectAllSections}
                className="h-auto p-0 text-primary"
              >
                Select all classes
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
              checked={allSectionsSelected || (data.length > 0 && data.every(section => rowSelection[section.id]))}
              onCheckedChange={(checked) => {
                if (checked) {
                  const newSelection: Record<string, boolean> = {}
                  data.forEach(section => {
                    newSelection[section.id] = true
                  })
                  onRowSelectionChange(newSelection)
                } else {
                  onRowSelectionChange({})
                  onDeselectAllSections()
                }
              }}
              aria-label="Select all sections on this page"
            />
          </div>
          <div className="flex-1 grid grid-cols-5 gap-4">
            <div>Class Name</div>
            <div>Teacher</div>
            <div className="text-center">Capacity</div>
            <div className="text-center">Enrollment</div>
            <div className="text-center">Status</div>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Section Rows */}
        {isLoading && data.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <SectionSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-0 border rounded-lg overflow-hidden">
            {data.map((section, index) => (
              <SectionRow key={section.id} section={section} index={index} />
            ))}
            
            {/* Loading More Skeletons */}
            {isLoading && !isPaginating && (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SectionSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            {isLoading && data.length === 0 ? (
              'Loading classes...'
            ) : (
              <>
                Showing <span className="font-medium">{data.length}</span> of{" "}
                <span className="font-medium">{totalCount}</span> classes
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

        {/* No Sections Found */}
        {!isLoading && data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No classes found matching your criteria.
          </div>
        )}
      </div>
      
      {/* Edit Class Modal */}
      {editingClassId && currentBranchId && currentSessionId && (
        <EditClassModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setEditingClassId(null)
          }}
          classId={editingClassId}
          branchId={currentBranchId}
          sessionId={currentSessionId}
        />
      )}
    </div>
  )
} 