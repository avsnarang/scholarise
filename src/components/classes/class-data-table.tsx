"use client"

import { useState, useCallback, useEffect } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash, UserCheck, UserX, Users } from "lucide-react"
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
import { DataTable } from "@/components/ui/data-table"
import { useToast } from "@/components/ui/use-toast"
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils"
import { api } from "@/utils/api"
import { useRouter } from "next/navigation"
import { useActionPermissions } from "@/utils/permission-utils"
import { Permission } from "@/types/permissions"
import { EditClassModal } from "@/components/classes/edit-class-modal"
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"

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

interface SectionDataTableProps {
  data: SectionTableData[]
  onEdit?: (section: SectionTableData) => void
  onDelete?: (sectionId: string) => void
  isLoading?: boolean
}

export function SectionDataTable({ data, onEdit, onDelete, isLoading }: SectionDataTableProps) {
  const router = useRouter()
  // Selected rows (array of IDs) for external use if needed
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  // Get current branch and session context
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // Delete and toggle status mutations
  const classApi = api.class
  const { toast } = useToast()
  
  // Permissions hooks
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // Check permissions using the hook
  const { canView, canEdit, canDelete } = useActionPermissions("classes")
  
  // Function to check if user can manage students
  const canManageStudents = () => canView() // Use existing permission for now

  // Handle opening edit modal
  const handleEditClass = (classId: string) => {
    setEditingClassId(classId);
    setEditModalOpen(true);
  };

  // Handle closing edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingClassId(null);
  };

  // Delete class mutation
  const deleteClassMutation = classApi.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Class has been deleted successfully.",
        variant: "success",
      })
      window.location.reload()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while deleting the class.",
        variant: "destructive",
      })
    },
  })

  // Toggle class status mutation  
  const toggleStatusMutation = classApi.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Class status updated successfully.",
        variant: "success",
      })
      window.location.reload()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating class status.",
        variant: "destructive",
      })
    },
  })

  const handleDeleteClass = (classId: string) => {
    console.log("Delete class:", classId);
    // This would typically call an API to delete the class
  }

  const handleToggleClassStatus = (id: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({
      id,
      isActive: !currentStatus
    })
  }

  const columns: ColumnDef<SectionTableData>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium h-8 px-2 text-left justify-start w-full"
        >
          Class Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const section = row.original;
        return (
          <div className="flex items-center min-h-[3rem] py-2">
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                {section.class.name} - {section.name}
              </div>
              {section.class.grade && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Grade {section.class.grade}
                </div>
              )}
            </div>
          </div>
        );
      },
      minSize: 200,
    },
    {
      accessorKey: "capacity",
      header: ({ column }) => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-medium h-8 px-2"
          >
            Capacity
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      accessorFn: (row) => row.capacity,
      cell: ({ row }) => {
        const capacity = row.original.capacity;
        return (
          <div className="flex items-center justify-center min-h-[3rem]">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {capacity}
            </span>
          </div>
        );
      },
      size: 100,
    },
    {
      id: "classTeacher",
      header: "Teacher",
      cell: ({ row }) => {
        const sectionItem = row.original
        const teacher = sectionItem.teacher
        
        return (
          <div className="flex items-center min-h-[3rem] py-2">
            {!teacher ? (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">?</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Not assigned</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
                  {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {teacher.firstName} {teacher.lastName}
                </span>
              </div>
            )}
          </div>
        )
      },
      minSize: 180,
    },
    {
      id: "enrollment",
      header: ({ column }) => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-medium h-8 px-2"
          >
            Enrollment
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      accessorFn: (row) => {
        const students = row._count?.students || row.studentCount || 0
        const capacity = row.capacity || 0
        return capacity ? (students / capacity) * 100 : 0
      },
      cell: ({ row }) => {
        const students = row.original._count?.students || row.original.studentCount || 0
        const capacity = row.original.capacity || 0
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
          <div className="flex items-center justify-center min-h-[3rem] py-2">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${bgColor}`}>
                <Users className={`h-3.5 w-3.5 ${textColor}`} />
                <span className={`text-sm font-semibold ${textColor}`}>
                  {students}<span className="text-gray-400 dark:text-gray-500">/{capacity}</span>
                </span>
              </div>
              {capacity > 0 && (
                <div className="flex flex-col gap-1 min-w-[60px]">
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${progressColor} transition-all duration-300`} 
                      style={{ width: `${fillPercentage}%` }} 
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {fillPercentage}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      },
      minSize: 200,
    },
    {
      accessorKey: "isActive",
      header: () => (
        <div className="flex justify-center">
          <span className="font-medium">Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const isActive = row.original.isActive
        return (
          <div className="flex items-center justify-center min-h-[3rem]">
            <Badge 
              variant={isActive ? "outline" : "secondary"} 
              className={isActive
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 font-medium"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 font-medium"}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        )
      },
      size: 100,
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        const sectionItem = row.original

        if (!canEdit()) return null

        return (
          <div className="flex items-center justify-end min-h-[3rem]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 dark:bg-[#252525] dark:border-[#303030]">
                <DropdownMenuLabel className="dark:text-[#e6e6e6] font-semibold">Actions</DropdownMenuLabel>
                
                <DropdownMenuItem 
                  onClick={() => router.push(`/classes/${sectionItem.class.id}`)}
                  className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                  View details
                </DropdownMenuItem>
                
                {canManageStudents() && (
                  <DropdownMenuItem 
                    onClick={() => router.push(`/classes/${sectionItem.class.id}/students`)}
                    className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
                  >
                    <Users className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                    Manage Students
                  </DropdownMenuItem>
                )}
                
                {canEdit() && (
                  <DropdownMenuItem 
                    onClick={() => handleEditClass(sectionItem.class.id)}
                    className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4 dark:text-[#e2bd8c]" />
                    Edit Class
                  </DropdownMenuItem>
                )}
                
                {canDelete() && <DropdownMenuSeparator className="dark:bg-[#303030]" />}
                
                {canDelete() && (
                  <DropdownMenuItem
                    onClick={() => {
                      deleteConfirm("class", () => handleDeleteClass(sectionItem.class.id));
                    }}
                    className="dark:focus:bg-[#303030] text-red-600 dark:text-red-400 cursor-pointer focus:text-red-700 dark:focus:text-red-300"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Class
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      size: 60,
    },
  ]

  // When rowSelection (from TanStack Table) changes, update our selectedRowIds and call the prop
  useEffect(() => {
    const currentSelectedIds = Object.keys(rowSelection).filter(
      (id) => rowSelection[id]
    );
    setSelectedRowIds(currentSelectedIds);
    if (onEdit && currentSelectedIds[0]) {
      onEdit(data.find(item => item.id === currentSelectedIds[0]) as SectionTableData);
    }
    if (onDelete && currentSelectedIds[0]) {
      onDelete(currentSelectedIds[0]);
    }
  }, [rowSelection, onEdit, onDelete, data]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        pageSize={data.length}
        rowSelection={rowSelection} // Pass the state to the DataTable
        onRowSelectionChange={setRowSelection} // Pass the setter to the DataTable
      />
      
      {/* Edit Class Modal */}
      {editingClassId && currentBranchId && currentSessionId && (
        <EditClassModal
          isOpen={editModalOpen}
          onClose={handleCloseEditModal}
          classId={editingClassId}
          branchId={currentBranchId!}
          sessionId={currentSessionId!}
        />
      )}
    </>
  )
} 