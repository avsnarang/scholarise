"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
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

// Define the Student type
export type Student = {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  gender?: string
  isActive: boolean
  dateOfBirth: Date
  class?: {
    name: string
    section?: string
  }
  parent?: {
    fatherName?: string
    motherName?: string
    guardianName?: string
    fatherMobile?: string
    motherMobile?: string
    fatherEmail?: string
    motherEmail?: string
    guardianEmail?: string
  }
}

interface StudentDataTableProps {
  data: Student[]
  onRowSelectionChange?: (selectedRows: string[]) => void
}

export function StudentDataTable({ data, onRowSelectionChange }: StudentDataTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const { toast } = useToast()
  const deleteConfirm = useDeleteConfirm()
  const statusChangeConfirm = useStatusChangeConfirm()
  
  // API mutations
  const utils = api.useContext()
  
  const deleteStudentMutation = api.student.delete.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate()
      void utils.student.getStats.invalidate()
    },
  })
  
  const toggleStatusMutation = api.student.toggleStatus.useMutation({
    onSuccess: () => {
      void utils.student.getAll.invalidate()
      void utils.student.getStats.invalidate()
    },
  })

  // Handle row selection change
  const handleRowSelectionChange = (rowIds: string[]) => {
    setSelectedRows(rowIds)
    if (onRowSelectionChange) {
      onRowSelectionChange(rowIds)
    }
  }

  // Format date helper function
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Calculate age helper function
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  const columns: ColumnDef<Student>[] = [
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
      accessorKey: "admissionNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Admission No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("admissionNumber")}</div>
      ),
    },
    {
      id: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Student Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => {
        const student = row.original
        return (
          <div>
            <div className="font-medium">{student.firstName} {student.lastName}</div>
            <div className="text-xs text-muted-foreground">
              {student.gender || ""}
              {student.dateOfBirth && `, ${calculateAge(student.dateOfBirth)} years`}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "class.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Class
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className="font-medium">
            {student.class?.name || "-"} 
            {student.class?.section ? `${student.class.section}` : ""}
          </div>
        )
      },
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className="text-sm space-y-1">
            {student.phone && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <a href={`tel:${student.phone}`} className="text-blue-600 hover:underline dark:text-[#7aad8c]">
                  {student.phone}
                </a>
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <a href={`mailto:${student.email}`} className="text-blue-600 hover:underline truncate max-w-[180px] dark:text-[#e2bd8c]">
                  {student.email}
                </a>
              </div>
            )}
            {!student.phone && !student.email && "-"}
          </div>
        )
      }
    },
    {
      id: "parent",
      header: "Parent Details",
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className="text-sm space-y-1">
            {student.parent ? (
              <div>
                {student.parent.fatherName && (
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-gray-500 min-w-[15px]">F:</span>
                    <span>{student.parent.fatherName}</span>
                    {student.parent.fatherMobile && (
                      <a href={`tel:${student.parent.fatherMobile}`} className="text-blue-600 hover:underline ml-1 dark:text-[#7aad8c]">
                        {student.parent.fatherMobile}
                      </a>
                    )}
                  </div>
                )}
                {student.parent.fatherEmail && (
                  <div className="flex gap-1 items-center ml-4">
                    <svg className="w-3 h-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <a href={`mailto:${student.parent.fatherEmail}`} className="text-blue-600 hover:underline text-xs truncate max-w-[150px] dark:text-[#e2bd8c]">
                      {student.parent.fatherEmail}
                    </a>
                  </div>
                )}
                
                {student.parent.motherName && (
                  <div className="flex gap-1 items-center mt-1">
                    <span className="text-xs text-gray-500 min-w-[15px]">M:</span>
                    <span>{student.parent.motherName}</span>
                    {student.parent.motherMobile && (
                      <a href={`tel:${student.parent.motherMobile}`} className="text-blue-600 hover:underline ml-1 dark:text-[#7aad8c]">
                        {student.parent.motherMobile}
                      </a>
                    )}
                  </div>
                )}
                {student.parent.motherEmail && (
                  <div className="flex gap-1 items-center ml-4">
                    <svg className="w-3 h-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <a href={`mailto:${student.parent.motherEmail}`} className="text-blue-600 hover:underline text-xs truncate max-w-[150px] dark:text-[#e2bd8c]">
                      {student.parent.motherEmail}
                    </a>
                  </div>
                )}
                
                {student.parent.guardianName && (
                  <div className="flex gap-1 items-center mt-1">
                    <span className="text-xs text-gray-500 min-w-[15px]">G:</span>
                    <span>{student.parent.guardianName}</span>
                  </div>
                )}
                {student.parent.guardianEmail && (
                  <div className="flex gap-1 items-center ml-4">
                    <svg className="w-3 h-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <a href={`mailto:${student.parent.guardianEmail}`} className="text-blue-600 hover:underline text-xs truncate max-w-[150px] dark:text-[#e2bd8c]">
                      {student.parent.guardianEmail}
                    </a>
                  </div>
                )}
                {!student.parent.fatherName && !student.parent.motherName && !student.parent.guardianName && 'N/A'}
              </div>
            ) : 'N/A'}
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
        const student = row.original

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
              <DropdownMenuItem asChild className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6]">
                <a href={`/students/${student.id}`} className="dark:text-[#c0c0c0]">
                  <Eye className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                  View details
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6]">
                <a href={`/students/${student.id}/edit`} className="dark:text-[#c0c0c0]">
                  <Edit className="mr-2 h-4 w-4 dark:text-[#e2bd8c]" />
                  Edit
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-[#303030]" />
              <DropdownMenuItem
                onClick={() => {
                  statusChangeConfirm("student", !student.isActive, 1, async () => {
                    try {
                      await toggleStatusMutation.mutateAsync({
                        id: student.id,
                        isActive: !student.isActive
                      })
                      toast({
                        title: `Student ${student.isActive ? "deactivated" : "activated"}`,
                        description: `Student has been ${student.isActive ? "deactivated" : "activated"} successfully.`,
                        variant: "success"
                      })
                    } catch (error) {
                      console.error(`Error ${student.isActive ? "deactivating" : "activating"} student:`, error)
                      toast({
                        title: "Error",
                        description: `Failed to ${student.isActive ? "deactivate" : "activate"} student. Please try again.`,
                        variant: "destructive"
                      })
                    }
                  })
                }}
                className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0]"
              >
                {student.isActive ? (
                  <>
                    <UserX className="mr-2 h-4 w-4 dark:text-[#e2bd8c]" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  deleteConfirm("student", async () => {
                    try {
                      await deleteStudentMutation.mutateAsync({ id: student.id })
                      toast({
                        title: "Student deleted",
                        description: "Student has been successfully deleted.",
                        variant: "success"
                      })
                    } catch (error) {
                      console.error("Error deleting student:", error)
                      toast({
                        title: "Error",
                        description: "Failed to delete student. Please try again.",
                        variant: "destructive"
                      })
                    }
                  })
                }}
                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-[#303030]"
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
      searchPlaceholder="Search students..."
      pageSize={50} // Increase page size to show more students
    />
  )
}
