"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/utils/api";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Phone,
  MessageSquarePlus,
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { FeedbackFormModal } from "./feedback-form-modal";
import { FeedbackHistoryModal } from "./feedback-history-modal";
import { cn } from "@/lib/utils";

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    name: string;
    class?: {
      name: string;
    };
  };
  parent?: {
    fatherName?: string;
    motherName?: string;
    fatherMobile?: string;
    motherMobile?: string;
  };
  courtesyCallFeedbacks?: {
    callDate: Date;
  }[];
}

interface CourtesyCallsDataTableProps {
  students: Student[];
  isLoading?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewAll?: boolean;
  pageSize?: number;
}

export function CourtesyCallsDataTable({
  students = [],
  isLoading = false,
  canAdd = true,
  canEdit = false,
  canDelete = false,
  canViewAll = false,
  pageSize: initialPageSize = 10,
}: CourtesyCallsDataTableProps) {
  const { toast } = useToast();
  const utils = api.useContext();
  
  // State for modals
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<any>(null);
  
  // State for table
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // API calls with proper cache invalidation
  const createFeedbackMutation = api.courtesyCalls.create.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries to refresh data
      void utils.courtesyCalls.getAll.invalidate();
      void utils.courtesyCalls.getByStudentId.invalidate();
      void utils.courtesyCalls.getStats.invalidate();
      void utils.courtesyCalls.getTeacherStudents.invalidate();
    },
  });
  
  const updateFeedbackMutation = api.courtesyCalls.update.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries to refresh data
      void utils.courtesyCalls.getAll.invalidate();
      void utils.courtesyCalls.getByStudentId.invalidate();
      void utils.courtesyCalls.getStats.invalidate();
      void utils.courtesyCalls.getTeacherStudents.invalidate();
    },
  });
  
  const deleteFeedbackMutation = api.courtesyCalls.delete.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries to refresh data
      void utils.courtesyCalls.getAll.invalidate();
      void utils.courtesyCalls.getByStudentId.invalidate();
      void utils.courtesyCalls.getStats.invalidate();
      void utils.courtesyCalls.getTeacherStudents.invalidate();
    },
  });

  // Get feedback history for selected student
  const {
    data: feedbackHistory,
    isLoading: isLoadingHistory,
  } = api.courtesyCalls.getByStudentId.useQuery(
    { studentId: selectedStudent?.id || "" },
    { enabled: !!selectedStudent?.id && historyModalOpen }
  );

  const handleAddFeedback = (student: Student) => {
    setSelectedStudent(student);
    setEditingFeedback(null);
    setFeedbackModalOpen(true);
  };

  const handleEditFeedback = (feedback: any) => {
    setEditingFeedback(feedback);
    setFeedbackModalOpen(true);
  };

  const handleViewHistory = (student: Student) => {
    setSelectedStudent(student);
    setHistoryModalOpen(true);
  };

  const handleSubmitFeedback = async (data: any) => {
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "No student selected",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingFeedback) {
        await updateFeedbackMutation.mutateAsync({
          id: editingFeedback.id,
          ...data,
        });
        toast({
          title: "Success",
          description: "Feedback updated successfully",
        });
      } else {
        await createFeedbackMutation.mutateAsync({
          studentId: selectedStudent.id,
          ...data,
        });
        toast({
          title: "Success",
          description: "Feedback created successfully",
        });
      }
      setFeedbackModalOpen(false);
      setEditingFeedback(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save feedback",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await deleteFeedbackMutation.mutateAsync({ id: feedbackId });
      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete feedback",
        variant: "destructive",
      });
    }
  };

  const getMotherPhone = (student: Student) => {
    return student.parent?.motherMobile || "Not available";
  };

  const columns: ColumnDef<Student>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'admissionNumber',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Admission No.
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-foreground">
            {row.getValue("admissionNumber")}
          </div>
        ),
      },
      {
        accessorKey: 'name',
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Student Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-foreground">
              {row.original.firstName} {row.original.lastName}
            </div>
            {row.original.section?.class?.name && (
              <div className="text-sm text-muted-foreground">
                {row.original.section.class.name} - {row.original.section.name}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'fatherName',
        accessorFn: (row) => row.parent?.fatherName || "",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Father's Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-foreground">
            {row.original.parent?.fatherName || (
              <span className="text-muted-foreground italic">Not available</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'motherName',
        accessorFn: (row) => row.parent?.motherName || "",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Mother's Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-foreground">
            {row.original.parent?.motherName || (
              <span className="text-muted-foreground italic">Not available</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'fatherPhone',
        accessorFn: (row) => row.parent?.fatherMobile || "",
        header: "Father's Phone",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-foreground">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">
              {row.original.parent?.fatherMobile || (
                <span className="text-muted-foreground italic">Not available</span>
              )}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'motherPhone',
        accessorFn: (row) => row.parent?.motherMobile || "",
        header: "Mother's Phone",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-foreground">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">
              {getMotherPhone(row.original) !== "Not available" ? (
                getMotherPhone(row.original)
              ) : (
                <span className="text-muted-foreground italic">Not available</span>
              )}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'lastSubmitted',
        accessorFn: (row) => row.courtesyCallFeedbacks?.[0]?.callDate || null,
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Last Submitted
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const lastFeedback = row.original.courtesyCallFeedbacks?.[0];
          return (
            <div className="text-foreground">
              {lastFeedback ? (
                <div className="space-y-1">
                  <div className="text-sm">
                    {new Date(lastFeedback.callDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(lastFeedback.callDate).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground italic text-sm">No feedback yet</span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {canAdd && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddFeedback(row.original);
                }}
                className="h-8 w-8 p-0"
              >
                <MessageSquarePlus className="h-4 w-4" />
                <span className="sr-only">Add Feedback</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewHistory(row.original);
              }}
              className="h-8 w-8 p-0"
            >
              <History className="h-4 w-4" />
              <span className="sr-only">View History</span>
            </Button>
          </div>
        ),
      },
    ],
    [canAdd, handleAddFeedback, handleViewHistory, getMotherPhone]
  );

  const table = useReactTable({
    data: students,
    columns,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const safeValue = String(row.getValue(columnId) || "").toLowerCase();
      return safeValue.includes(String(filterValue).toLowerCase());
    },
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
  });

  return (
    <div className="w-full space-y-4">
      {/* Search and Info */}
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {Object.keys(rowSelection).length > 0 && (
            <span>
              {Object.keys(rowSelection).length} of {table.getFilteredRowModel().rows.length} row(s) selected
            </span>
          )}
          <span>
            {table.getFilteredRowModel().rows.length} student(s) total
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => row.toggleSelected(!row.getIsSelected())}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">Loading students...</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No students found.</span>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-6 lg:gap-8">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <FeedbackFormModal
        isOpen={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false);
          setEditingFeedback(null);
        }}
        student={selectedStudent}
        existingFeedback={editingFeedback}
        onSubmit={handleSubmitFeedback}
        isLoading={
          createFeedbackMutation.isPending || updateFeedbackMutation.isPending
        }
      />

      <FeedbackHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        feedbackHistory={(feedbackHistory?.items || []).map((item: any) => ({
          ...item,
          purpose: item.purpose || undefined
        }))}
        isLoading={isLoadingHistory}
        canEdit={canEdit}
        canDelete={canDelete}
        canViewAll={canViewAll}
        onEdit={handleEditFeedback}
        onDelete={handleDeleteFeedback}
        isDeleting={deleteFeedbackMutation.isPending}
      />
    </div>
  );
} 