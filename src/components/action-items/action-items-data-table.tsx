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
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  ArrowUpDown,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";
import { ActionItemDetailsModal } from "./action-item-details-modal";
import { UpdateActionItemModal } from "./update-action-item-modal";

type ActionItem = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "REJECTED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | null;
  completedAt: Date | null;
  verifiedAt: Date | null;
  completionNotes: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
  };
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    rollNumber: number | null;
    section: {
      name: string;
      class: {
        name: string;
      };
    } | null;
  };
  courtesyCallFeedback: {
    id: string;
    callDate: Date;
    purpose: string | null;
    feedback: string;
    followUp?: string | null;
    callerType: "TEACHER" | "HEAD";
  };
  verifiedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
  } | null;
  branch: {
    id: string;
    name: string;
  };
};

interface ActionItemsDataTableProps {
  showTeacherView?: boolean;
  assignedToId?: string;
  studentId?: string;
  courtesyCallFeedbackId?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "VERIFIED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "MEDIUM":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "LOW":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Clock className="h-3 w-3" />;
    case "IN_PROGRESS":
      return <User className="h-3 w-3" />;
    case "COMPLETED":
      return <CheckCircle className="h-3 w-3" />;
    case "VERIFIED":
      return <CheckCircle className="h-3 w-3" />;
    case "REJECTED":
      return <XCircle className="h-3 w-3" />;
    case "CANCELLED":
      return <XCircle className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

export function ActionItemsDataTable({ 
  showTeacherView = false, 
  assignedToId, 
  studentId, 
  courtesyCallFeedbackId 
}: ActionItemsDataTableProps) {
  const { can } = usePermissions();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "REJECTED" | "CANCELLED" | "ALL" | "">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT" | "ALL" | "">("ALL");
  const [selectedActionItem, setSelectedActionItem] = useState<ActionItem | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Query parameters
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    assignedToId,
    studentId,
    status: statusFilter && statusFilter !== "ALL" ? statusFilter : undefined,
    priority: priorityFilter && priorityFilter !== "ALL" ? priorityFilter : undefined,
    courtesyCallFeedbackId,
  };

  const { data, isLoading, refetch } = api.actionItems.getAll.useQuery(queryParams);

  const deleteActionItem = api.actionItems.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const columns = useMemo(() => {
    const cols: ColumnDef<any>[] = [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <div className="font-medium truncate">{row.getValue("title")}</div>
            <div className="text-xs text-muted-foreground truncate">
              {row.original.description}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "student",
        header: "Student",
        cell: ({ row }) => {
          const student = row.original.student;
          return (
            <div className="min-w-[150px]">
              <div className="font-medium">
                {student.firstName} {student.lastName}
              </div>
              <div className="text-xs text-muted-foreground">
                {student.admissionNumber} • {student.section?.class.name}-{student.section?.name}
                {student.rollNumber && ` • Roll: ${student.rollNumber}`}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <Badge className={getPriorityColor(row.getValue("priority"))}>
            {row.getValue("priority")}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={getStatusColor(row.getValue("status"))}>
            <span className="flex items-center gap-1">
              {getStatusIcon(row.getValue("status"))}
              {row.getValue("status")}
            </span>
          </Badge>
        ),
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Due Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const dueDate = row.getValue("dueDate") as Date | null;
          if (!dueDate) return <span className="text-muted-foreground">-</span>;
          
          const isOverdue = dueDate < new Date() && 
            !["COMPLETED", "VERIFIED", "CANCELLED"].includes(row.original.status);
          
          return (
            <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
              {isOverdue && <AlertTriangle className="h-3 w-3" />}
              {format(dueDate, "MMM dd, yyyy")}
            </div>
          );
        },
      },
    ];

    // Add assigned teacher column for admin view
    if (!showTeacherView) {
      cols.splice(2, 0, {
        accessorKey: "assignedTo",
        header: "Assigned To",
        cell: ({ row }) => {
          const teacher = row.original.assignedTo;
          return (
            <div className="min-w-[120px]">
              <div className="font-medium">
                {teacher.firstName} {teacher.lastName}
              </div>
              {teacher.employeeCode && (
                <div className="text-xs text-muted-foreground">
                  {teacher.employeeCode}
                </div>
              )}
            </div>
          );
        },
      });
    }

    // Add actions column
    cols.push({
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedActionItem(row.original);
              setDetailsModalOpen(true);
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            
            {can(Permission.COMPLETE_ACTION_ITEM) && 
             row.original.status !== "VERIFIED" && 
             row.original.status !== "CANCELLED" && (
              <DropdownMenuItem onClick={() => {
                setSelectedActionItem(row.original);
                setUpdateModalOpen(true);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Update Status
              </DropdownMenuItem>
            )}
            
            {can(Permission.DELETE_ACTION_ITEM) && (
              <DropdownMenuItem
                onClick={() => {
                  if (confirm("Are you sure you want to delete this action item?")) {
                    deleteActionItem.mutate({ id: row.original.id });
                  }
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });

    return cols;
  }, [showTeacherView, can, deleteActionItem]);

  const table = useReactTable({
    data: data?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: data?.totalPages || 0,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search action items..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "ALL" ? "" : value as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value === "ALL" ? "" : value as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priority</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No action items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {data?.totalCount ? (
            <>
              Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
              {Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                data.totalCount
              )}{" "}
              of {data.totalCount} entries
            </>
          ) : (
            "No entries"
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
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
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {pagination.pageIndex + 1} of {data?.totalPages || 1}
          </div>
          <div className="flex items-center space-x-2">
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
      {selectedActionItem && (
        <>
          <ActionItemDetailsModal
            actionItem={selectedActionItem}
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
          />
          <UpdateActionItemModal
            actionItem={selectedActionItem}
            open={updateModalOpen}
            onOpenChange={setUpdateModalOpen}
            onSuccess={() => {
              refetch();
              setUpdateModalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}