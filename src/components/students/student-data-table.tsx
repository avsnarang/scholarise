"use client"

import { useState, useMemo, useEffect } from "react"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
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
import { useActionPermissions } from "@/utils/permission-utils"
import { useRouter } from "next/navigation"
import React from "react"
import { usePopup } from "@/components/ui/custom-popup"

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
    displayOrder?: number
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
  academicSessionId?: string
  academicSession?: {
    id: string
  }
}

interface StudentDataTableProps {
  data: Student[]
  onRowSelectionChange?: (selectedIds: string[], isSelectAllActive: boolean, allMatchingFilters?: boolean) => void
  pageSize?: number
  onPageSizeChange?: (value: string) => void
  pageCount?: number
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void
  currentSortBy?: string
  currentSortOrder?: "asc" | "desc"
  totalStudentsCount?: number;
  currentFilters?: Record<string, any>;
  currentBranchId?: string | null;
  currentSessionId?: string | null;
  currentSearchTerm?: string | null;
}

export function StudentDataTable({ 
  data, 
  onRowSelectionChange, 
  pageSize = 10, 
  onPageSizeChange,
  pageCount,
  onSortChange,
  currentSortBy,
  currentSortOrder,
  totalStudentsCount = 0,
  currentFilters,
  currentBranchId,
  currentSessionId,
  currentSearchTerm,
}: StudentDataTableProps) {
  const [pageLevelSelection, setPageLevelSelection] = React.useState<Record<string, boolean>>({});
  const [isSelectAllActive, setIsSelectAllActive] = React.useState<boolean>(false);

  const { toast } = useToast()
  const { confirm: generalConfirm } = usePopup()
  const statusChangeConfirm = useStatusChangeConfirm()
  const deleteConfirm = useDeleteConfirm()
  const router = useRouter()
  
  // Get permissions for the students module
  const { canView, canEdit, canDelete } = useActionPermissions("students")

  // API mutations
  const trpc = api.useUtils()

  const deleteStudentMutation = api.student.delete.useMutation({
    onSuccess: () => {
      void trpc.student.getAll.invalidate()
      void trpc.student.getStats.invalidate()
      setPageLevelSelection({})
      setIsSelectAllActive(false)
      toast({ title: "Student deleted", description: "Student record has been successfully deleted.", variant: "success" });
    },
  })

  const deleteMultipleStudentsMutation = api.student.bulkDelete.useMutation({
    onSuccess: (data) => {
      void trpc.student.getAll.invalidate()
      void trpc.student.getStats.invalidate()
      toast({ 
        title: "Students Deleted", 
        description: `${data.count} student(s) have been successfully deleted.`, 
        variant: "success" 
      });
      setPageLevelSelection({});
      setIsSelectAllActive(false);
      if (onRowSelectionChange) {
        onRowSelectionChange([], false); 
      }
    },
    onError: (error) => {
      toast({
        title: "Bulk Deletion Failed",
        description: error.message || "An unexpected error occurred while deleting students.",
        variant: "destructive",
      });
    },
  });

  // Function to fetch all student IDs based on current filters
  const fetchAllStudentIds = async (): Promise<string[]> => {
    try {
      // This is a known pattern for direct tRPC query calls from the client.
      const result = await trpc.client.student.getAll.query({
        branchId: currentBranchId,
        sessionId: currentSessionId,
        filters: currentFilters,
        search: currentSearchTerm,
        fetchAllIds: true,
        // sortBy and sortOrder are not strictly necessary for fetching IDs for deletion
        // but can be included if the backend expects them or for consistency.
      });

      // Assuming the backend returns { itemIds: string[], isIdList: true, ... } when fetchAllIds is true
      if (result && result.isIdList && Array.isArray(result.itemIds)) {
        return result.itemIds;
      }
      console.warn("fetchAllStudentIds did not return the expected structure for IDs list.", result);
      return [];
    } catch (error) {
      console.error("Error fetching all student IDs:", error);
      toast({ 
        title: "Fetch Error", 
        description: "Could not fetch all student IDs for the bulk operation. Please try again.", 
        variant: "destructive" 
      });
      return [];
    }
  };

  const handleBulkDelete = async () => {
    if (!isSelectAllActive && Object.keys(pageLevelSelection).length === 0) {
      toast({ title: "No students selected", description: "Please select students to delete.", variant: "destructive" });
      return;
    }

    let studentIdsToDelete: string[] = [];
    let confirmationMessage = "";

    if (isSelectAllActive) {
      // Fetch all IDs matching the current filters from the backend
      toast({ title: "Processing...", description: "Fetching all matching students for deletion. This may take a moment.", variant: "info"});
      studentIdsToDelete = await fetchAllStudentIds();
      if (studentIdsToDelete.length === 0) {
        toast({ title: "No Students Found", description: "No students match the current filters for bulk deletion, or there was an issue fetching them.", variant: "warning" });
        return;
      }
      confirmationMessage = `Are you sure you want to delete all ${studentIdsToDelete.length} students matching the current filters? This action cannot be undone.`;
    } else {
      studentIdsToDelete = Object.entries(pageLevelSelection)
        .filter(([,isSelected]) => isSelected)
        .map(([rowIndexString]) => data[parseInt(rowIndexString, 10)]?.id)
        .filter((id): id is string => id !== null);
      
      if (studentIdsToDelete.length === 0) {
        toast({ title: "No students selected", description: "Please select students on the page to delete.", variant: "destructive" });
        return;
      }
      confirmationMessage = `Are you sure you want to delete ${studentIdsToDelete.length} student(s) on this page? This action cannot be undone.`;
    }

    generalConfirm(
      "Confirm Bulk Deletion",
      confirmationMessage,
      async () => {
        try {
          await deleteMultipleStudentsMutation.mutateAsync({ ids: studentIdsToDelete });
          // onSuccess is handled by the mutation definition, including toast and cache invalidation
        } catch (error) {
          // onError is also handled by the mutation definition
          // Additional client-side error logging or specific UI updates can go here if needed
          console.error("Error during bulk delete onConfirm logic (already handled by mutation):", error);
          // No need for a generic toast here as the mutation has its own error handling with toast.
        }
      },
    );
  };

  React.useEffect(() => {
    let currentSelectedIds: string[] = [];
    if (isSelectAllActive) {
    } else {
      currentSelectedIds = Object.entries(pageLevelSelection)
        .filter(([, isSelected]) => isSelected)
        .map(([rowIndexString]) => {
          const rowIndex = parseInt(rowIndexString, 10);
          return data[rowIndex]?.id;
        })
        .filter((id): id is string => id !== null);
      
      if (currentSelectedIds.length > 0 && isSelectAllActive) {
        setIsSelectAllActive(false);
        return;
      }
    }

    if (onRowSelectionChange) {
      onRowSelectionChange(currentSelectedIds, isSelectAllActive);
    }
  }, [pageLevelSelection, isSelectAllActive, data, onRowSelectionChange]);

  React.useEffect(() => {
    setPageLevelSelection({});
  }, [data]);

  // Format date helper function (Re-adding)
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Calculate age helper function (Re-adding)
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

  const columns: ColumnDef<Student>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            isSelectAllActive ? true :
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => { 
            if (isSelectAllActive && !value) {
              setIsSelectAllActive(false);
              setPageLevelSelection({});
            } else if (value && !isSelectAllActive && totalStudentsCount > 0 && Object.keys(pageLevelSelection).length === 0) {
                table.toggleAllPageRowsSelected(!!value);
                setIsSelectAllActive(false);
            } else {
                 table.toggleAllPageRowsSelected(!!value);
                 setIsSelectAllActive(false);
            }
          }}
          aria-label="Select all on page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={isSelectAllActive ? true : row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
            setIsSelectAllActive(false);
          }}
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
          onClick={() => {
            const newSortOrder = column.getIsSorted() === "asc" ? "desc" : "asc";
            if (onSortChange) {
              onSortChange("admissionNumber", newSortOrder);
            }
          }}
          className="font-medium"
        >
          Admission No.
          {currentSortBy === "admissionNumber" && (
            <ArrowUpDown className={`ml-2 h-4 w-4 ${currentSortOrder === "desc" ? "rotate-180" : ""}`} />
          )}
          {currentSortBy !== "admissionNumber" && (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
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
          onClick={() => {
            const newSortOrder = column.getIsSorted() === "asc" ? "desc" : "asc";
             if (onSortChange) {
              onSortChange("firstName", newSortOrder);
            }
          }}
          className="font-medium"
        >
          Student Name
          {currentSortBy === "firstName" && (
            <ArrowUpDown className={`ml-2 h-4 w-4 ${currentSortOrder === "desc" ? "rotate-180" : ""}`} />
          )}
          {currentSortBy !== "firstName" && (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
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
      id: "class",
      accessorKey: "class.name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const newSortOrder = column.getIsSorted() === "asc" ? "desc" : "asc";
            if (onSortChange) {
              onSortChange("class", newSortOrder);
            }
          }}
          className="font-medium"
        >
          Class
          {currentSortBy === "class" && (
            <ArrowUpDown className={`ml-2 h-4 w-4 ${currentSortOrder === "desc" ? "rotate-180" : ""}`} />
          )}
          {currentSortBy !== "class" && (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className="font-medium">
            {student.class?.name || "-"}
            {student.class?.section ? ` - ${student.class.section}` : ""}
          </div>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const classA = rowA.original.class;
        const classB = rowB.original.class;

        // Handle cases where class object or displayOrder might be undefined
        const displayOrderA = classA?.displayOrder;
        const displayOrderB = classB?.displayOrder;

        if (displayOrderA === undefined && displayOrderB === undefined) return 0;
        if (displayOrderA === undefined) return 1; // undefined displayOrder goes to the end
        if (displayOrderB === undefined) return -1; // undefined displayOrder goes to the end

        if (displayOrderA < displayOrderB) return -1;
        if (displayOrderA > displayOrderB) return 1;
        
        return 0; // displayOrders are equal
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
                <svg className="w-3 h-3 flex-shrink-0 dark:text-[#7aad8c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <a href={`tel:${student.phone}`} className="text-blue-600 hover:underline dark:text-[#7aad8c]">
                  {student.phone}
                </a>
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0 dark:text-[#e2bd8c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
        
        // If user doesn't have view permission, don't show any actions
        if (!canView()) return null;

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
              
              {/* View details - always available if user has view permission */}
              <DropdownMenuItem 
                onClick={() => router.push(`/students/${student.id}`)}
                className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                View details
              </DropdownMenuItem>
              
              {/* Edit - requires EDIT_STUDENT permission */}
              {canEdit() && (
                <DropdownMenuItem 
                  onClick={() => router.push(`/students/${student.id}/edit`)}
                  className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4 dark:text-[#e2bd8c]" />
                  Edit
                </DropdownMenuItem>
              )}
              
              {/* Delete - requires DELETE_STUDENT permission */}
              {canDelete() && (
                <DropdownMenuItem
                  onClick={() => {
                    deleteConfirm("student", async () => {
                      try {
                        await deleteStudentMutation.mutateAsync({ id: student.id });
                      } catch (error) {
                        console.error("Error deleting student:", error);
                        toast({
                          title: "Deletion Error",
                          description: "Could not delete student. Please try again.",
                          variant: "destructive",
                        });
                      }
                    });
                  }}
                  className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] text-red-600 dark:text-red-400 cursor-pointer"
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
  ], [canView, canEdit, canDelete, generalConfirm, statusChangeConfirm, toast, router, trpc.student.getAll, trpc.student.getStats, deleteStudentMutation, totalStudentsCount])

  // tanstack table sorting state
  const [sorting, setSorting] = React.useState<SortingState>(() => [
    { id: currentSortBy || "firstName", desc: currentSortOrder === 'desc' }
  ]);

  useEffect(() => {
    if (currentSortBy && currentSortOrder) {
      setSorting([{ id: currentSortBy, desc: currentSortOrder === 'desc' }]);
    } else {
      // Default sort or clear sort
      setSorting([{ id: "firstName", desc: false}]); 
    }
  }, [currentSortBy, currentSortOrder]);

  const numPageSelected = React.useMemo(() => {
    return Object.values(pageLevelSelection).filter(Boolean).length;
  }, [pageLevelSelection]);

  // Determine if the actions bar should be visible
  const showBulkActionsBar = isSelectAllActive || numPageSelected > 0;
  const showInfoBar = !showBulkActionsBar && totalStudentsCount > 0;

  return (
    <div className="space-y-4">
      {(showBulkActionsBar || showInfoBar) && (
        <div className="mb-4 p-3 bg-muted dark:bg-muted/50 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm font-medium flex-1">
            {isSelectAllActive 
              ? `All ~${totalStudentsCount} students selected.` 
              : numPageSelected > 0 
                ? `${numPageSelected} student(s) selected on this page.`
                : showInfoBar ? `Total ${totalStudentsCount} students matching filters.` : ""
            }
            
            {/* "Select all X students" Link */}
            {!isSelectAllActive && totalStudentsCount > 0 && numPageSelected < totalStudentsCount && (
              <Button 
                variant="link"
                className="ml-1 p-0 h-auto text-sm"
                onClick={() => {
                  setIsSelectAllActive(true);
                  setPageLevelSelection({}); 
                }}
              >
                (Select all ~{totalStudentsCount})
              </Button>
            )}

            {/* "Clear selection" Link */}
            {isSelectAllActive && (
              <Button 
                variant="link"
                className="ml-1 p-0 h-auto text-sm"
                onClick={() => {
                  setIsSelectAllActive(false);
                }}
              >
                (Clear selection)
              </Button>
            )}
          </div>

          {showBulkActionsBar && (
            <div className="space-x-2 flex-shrink-0">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => console.log("Exporting selected: isSelectAllActive?", isSelectAllActive, "pageSelection: ", pageLevelSelection)}
                disabled={!isSelectAllActive && numPageSelected === 0}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" /> 
                Export Selected
              </Button>
              {canDelete() && (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={(!isSelectAllActive && numPageSelected === 0) || deleteMultipleStudentsMutation.isPending}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Search by name..."
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        pageCount={pageCount}
        sorting={sorting}
        onSortingChange={(updater) => {
          const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
          setSorting(newSorting);
          if (onSortChange && newSorting.length > 0) {
            const sort = newSorting[0];
            onSortChange(sort?.id || '', sort?.desc ? 'desc' : 'asc');
          } else if (onSortChange) {
            onSortChange("firstName", "asc");
          }
        }}
        rowSelection={isSelectAllActive ? {} : pageLevelSelection}
        onRowSelectionChange={(updater) => {
            setIsSelectAllActive(false);
            setPageLevelSelection(updater);
        }}
      />
    </div>
  )
}
