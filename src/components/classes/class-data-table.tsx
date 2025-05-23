"use client"

import { useState, useCallback, useEffect } from "react"
import type { ColumnDef } from "@tanstack/react-table"
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

// Define the Class type
export type Class = {
  id: string
  name: string
  section: string
  capacity: number
  isActive: boolean
  displayOrder?: number
  teacher?: {
    id: string
    firstName: string
    lastName: string
  }
  _count?: {
    students: number
  }
  studentCount?: number
}

interface ClassDataTableProps {
  data: Class[]
  onRowSelectionChange?: (selectedRows: string[]) => void
  pageSize?: number
}

export function ClassDataTable({ data, onRowSelectionChange, pageSize = 10 }: ClassDataTableProps) {
  const router = useRouter()
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  // Delete and toggle status mutations
  const classApi = api.class
  const { toast } = useToast()
  
  // Permissions hooks
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // Setup permissions
  const { hasPermission } = useActionPermissions("classes")
  const canView = () => {
    return hasPermission(Permission.VIEW_CLASSES)
  }
  
  const canEdit = () => {
    return hasPermission(Permission.EDIT_CLASS)
  }
  
  const canDelete = () => {
    return hasPermission(Permission.DELETE_CLASS)
  }
  
  const canManageStudents = hasPermission(Permission.MANAGE_CLASS_STUDENTS)

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

  const handleDeleteClass = (id: string) => {
    deleteClassMutation.mutate({ id })
  }

  const handleToggleClassStatus = (id: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({
      id,
      isActive: !currentStatus
    })
  }

  const columns: ColumnDef<Class>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Class Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "section",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Section
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      id: "classTeacher",
      header: "Class Teacher",
      cell: ({ row }) => {
        const classItem = row.original
        return (
          <div>
            {classItem.teacher ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-xs font-medium text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
                  {classItem.teacher.firstName?.[0]}{classItem.teacher.lastName?.[0]}
                </div>
                <span>{classItem.teacher.firstName} {classItem.teacher.lastName}</span>
              </div>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                  N/A
                </div>
                <span>Not assigned</span>
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "enrollment",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Enrollment
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => {
        const students = row._count?.students || row.studentCount || 0
        const capacity = row.capacity || 0
        // Return a percentage for sorting
        return capacity ? (students / capacity) * 100 : 0
      },
      cell: ({ row }) => {
        const students = row.original._count?.students || row.original.studentCount || 0
        const capacity = row.original.capacity || 0
        
        // Calculate fill percentage
        const fillPercentage = capacity ? Math.min(Math.round((students / capacity) * 100), 100) : 0
        
        // Determine color based on capacity utilization
        let barColor = "bg-green-500"
        let textColor = "text-green-700 dark:text-green-300"
        if (fillPercentage > 90) {
          barColor = "bg-red-500"
          textColor = "text-red-700 dark:text-red-300"
        } else if (fillPercentage > 75) {
          barColor = "bg-amber-500"
          textColor = "text-amber-700 dark:text-amber-300"
        }
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Users className={`h-3.5 w-3.5 ${textColor}`} />
              <span className={`text-sm font-medium ${textColor}`}>{students}/{capacity || 0}</span>
            </div>
            {capacity > 0 && (
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor}`} style={{ width: `${fillPercentage}%` }} />
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive
        return (
          <Badge variant={isActive ? "outline" : "secondary"} className={isActive
            ? "bg-green-50 text-green-700 hover:bg-green-50 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/30 dark:hover:bg-[#7aad8c]/20"
            : "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-[#303030] dark:text-[#808080] dark:border-[#404040] dark:hover:bg-[#353535]"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const classItem = row.original

        // If user doesn't have view permission, don't show the actions menu
        if (!canView()) return null

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-[#252525] dark:border-[#303030]">
              <DropdownMenuLabel className="dark:text-[#e6e6e6]">Actions</DropdownMenuLabel>
              
              {/* View details - always visible if user can view */}
              <DropdownMenuItem 
                onClick={() => router.push(`/classes/${classItem.id}`)}
                className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                View details
              </DropdownMenuItem>
              
              {/* Manage Students - requires MANAGE_CLASS_STUDENTS permission */}
              {canManageStudents && (
                <DropdownMenuItem 
                  onClick={() => router.push(`/classes/${classItem.id}/students`)}
                  className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                  Manage Students
                </DropdownMenuItem>
              )}
              
              {/* Edit - requires EDIT_CLASS permission */}
              {canEdit() && (
                <DropdownMenuItem 
                  onClick={() => router.push(`/settings/classes/${classItem.id}/edit`)}
                  className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4 dark:text-[#e2bd8c]" />
                  Edit
                </DropdownMenuItem>
              )}
              
              {/* Separator only shown if delete permission exists */}
              {canDelete() && <DropdownMenuSeparator className="dark:bg-[#303030]" />}
              
              {/* Delete - requires DELETE_CLASS permission */}
              {canDelete() && (
                <DropdownMenuItem
                  onClick={() => {
                    deleteConfirm("class", () => handleDeleteClass(classItem.id));
                  }}
                  className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Handle row selection
  const handleSelectionChange = useCallback((rows: string[]) => {
    setSelectedRows(rows);
    if (onRowSelectionChange) {
      onRowSelectionChange(rows);
    }
  }, [onRowSelectionChange]);

  // Set up row selection state for the table
  const [rowSelection, setRowSelection] = useState({});

  // When rowSelection changes, convert it to an array of IDs and call our handler
  useEffect(() => {
    const selectedIds = Object.keys(rowSelection).map(index => {
      return data[parseInt(index)]?.id ?? '';
    }).filter(id => id !== '');
    
    handleSelectionChange(selectedIds);
  }, [rowSelection, data, handleSelectionChange]);

  return (
    <DataTable
      columns={columns}
      data={data}
      pageSize={pageSize}
    />
  )
} 