"use client"

import { useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash, UserCheck, UserX } from "lucide-react"
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

interface TeacherDataTableProps {
  data: Teacher[]
  onRowSelectionChange?: (selectedRows: string[]) => void
}

export function TeacherDataTable({ data, onRowSelectionChange }: TeacherDataTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const { toast } = useToast()
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // API mutations
  const utils = api.useContext()
  
  const deleteTeacherMutation = api.teacher.delete.useMutation({
    onSuccess: () => {
      void utils.teacher.getAll.invalidate()
      void utils.teacher.getStats.invalidate()
    },
  })
  
  const toggleStatusMutation = api.teacher.toggleStatus.useMutation({
    onSuccess: () => {
      void utils.teacher.getAll.invalidate()
      void utils.teacher.getStats.invalidate()
    },
  })

  // Handle row selection change
  const handleRowSelectionChange = (rowIds: string[]) => {
    setSelectedRows(rowIds)
    if (onRowSelectionChange) {
      onRowSelectionChange(rowIds)
    }
  }

  const columns: ColumnDef<Teacher>[] = [
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
      accessorKey: "employeeCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Employee Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("employeeCode")}</div>
      ),
    },
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          First Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "lastName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Last Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "qualification",
      header: "Qualification",
      cell: ({ row }) => {
        const qualification = row.getValue("qualification") as string | null | undefined;
        return <div>{qualification || "-"}</div>
      },
    },
    {
      accessorKey: "specialization",
      header: "Specialization",
      cell: ({ row }) => {
        const specialization = row.getValue("specialization") as string | null | undefined;
        return <div>{specialization || "-"}</div>
      },
    },
    {
      accessorKey: "branch.name",
      header: "Branch",
      cell: ({ row }) => {
        const teacher = row.original
        return <div>{teacher.branch?.name || "-"}</div>
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive
        return (
          <Badge variant={isActive ? "outline" : "secondary"} className={isActive ? "bg-green-50 text-green-700 hover:bg-green-50" : "bg-gray-100 text-gray-500 hover:bg-gray-100"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const teacher = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href={`/teachers/${teacher.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/teachers/${teacher.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  statusChangeConfirm("teacher", !teacher.isActive, 1, async () => {
                    try {
                      await toggleStatusMutation.mutateAsync({
                        id: teacher.id,
                        isActive: !teacher.isActive
                      })
                      toast({
                        title: `Teacher ${teacher.isActive ? "deactivated" : "activated"}`,
                        description: `Teacher has been ${teacher.isActive ? "deactivated" : "activated"} successfully.`,
                        variant: "success"
                      })
                    } catch (error) {
                      console.error(`Error ${teacher.isActive ? "deactivating" : "activating"} teacher:`, error)
                      toast({
                        title: "Error",
                        description: `Failed to ${teacher.isActive ? "deactivate" : "activate"} teacher. Please try again.`,
                        variant: "destructive"
                      })
                    }
                  })
                }}
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
                onClick={() => {
                  deleteConfirm("teacher", async () => {
                    try {
                      await deleteTeacherMutation.mutateAsync({ id: teacher.id })
                      toast({
                        title: "Teacher deleted",
                        description: "Teacher has been successfully deleted.",
                        variant: "success"
                      })
                    } catch (error) {
                      console.error("Error deleting teacher:", error)
                      toast({
                        title: "Error",
                        description: "Failed to delete teacher. Please try again.",
                        variant: "destructive"
                      })
                    }
                  })
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <DataTable 
      columns={columns} 
      data={data} 
      searchKey="firstName"
      searchPlaceholder="Search teachers..."
    />
  )
}
