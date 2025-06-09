"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { 
  ColumnDef, 
  SortingState, 
  ColumnFiltersState 
} from "@tanstack/react-table";
import { 
  flexRender, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  useReactTable
} from "@tanstack/react-table";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { DotsHorizontalIcon, Pencil1Icon, TrashIcon, PlusIcon } from "@radix-ui/react-icons";
import { BookOpenIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function SubjectsDataTable() {
  const router = useRouter();
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Fetch subjects data
  const { data, isLoading, refetch } = api.subject.getAll.useQuery();
  const subjects = data?.items || [];

  // Handle toggle subject status
  const toggleStatus = api.subject.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "The subject status has been updated successfully.",
      });
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subject status.",
        variant: "destructive",
      });
    },
  });

  // Handle delete subject
  const deleteSubject = api.subject.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Subject Deleted",
        description: "The subject has been deleted successfully.",
      });
      void refetch();
      setIsDeleteDialogOpen(false);
      setSubjectToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subject.",
        variant: "destructive",
      });
    },
  });

  const handleToggleStatus = (subject: Subject) => {
    toggleStatus.mutate({
      id: subject.id,
      isActive: !subject.isActive,
    });
  };

  const confirmDelete = (subject: Subject) => {
    setSubjectToDelete(subject);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (subjectToDelete) {
      deleteSubject.mutate({ id: subjectToDelete.id });
    }
  };

  const columns: ColumnDef<Subject>[] = [
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
          className="border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-gray-300"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Subject Name",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">{row.getValue("name")}</div>
          {row.original.code && (
            <div className="text-xs text-[#00501B] bg-[#00501B]/10 px-2 py-1 rounded-md w-fit">
              Code: {row.original.code}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description", 
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          {row.getValue("description") ? (
            <p className="text-sm text-gray-600 line-clamp-2">{row.getValue("description")}</p>
          ) : (
            <span className="text-gray-400 text-sm italic">No description provided</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive");
        return (
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={isActive 
              ? "bg-[#00501B]/10 text-[#00501B] hover:bg-[#00501B]/20 border-[#00501B]/20" 
              : "bg-gray-100 text-gray-600 border-gray-200"
            }
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isActive ? "bg-[#00501B]" : "bg-gray-400"}`} />
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value === "all" ? true : row.getValue(id) === (value === "active");
      },
    },
    {
      header: "Classes",
      cell: ({ row }) => {
        // You might want to add class count here if available in data
        return (
          <div className="text-sm text-gray-500">
            {/* This would show associated class count if available in the data */}
            <span className="bg-[#00501B]/10 text-[#00501B] px-2 py-1 rounded-md text-xs">
              View Classes
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const subject = row.original;

        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/settings/subjects/${subject.id}/edit`)}
              className="h-8 px-2 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/10"
            >
              <Pencil1Icon className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/10">
                  <span className="sr-only">Open menu</span>
                  <DotsHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wide">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => router.push(`/settings/subjects/${subject.id}/edit`)}
                  className="cursor-pointer"
                >
                  <Pencil1Icon className="mr-2 h-4 w-4" />
                  Edit Subject
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleToggleStatus(subject)}
                  className="cursor-pointer"
                >
                  {subject.isActive ? (
                    <>
                      <div className="mr-2 h-4 w-4 rounded-full bg-gray-400" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <div className="mr-2 h-4 w-4 rounded-full bg-[#00501B]" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => confirmDelete(subject)}
                  className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete Subject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: subjects,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading subjects...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search subjects..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm focus:border-[#00501B] focus:ring-[#00501B]"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#00501B] focus:ring-[#00501B]"
            value={(table.getColumn("isActive")?.getFilterValue() as string) ?? "all"}
            onChange={(event) =>
              table.getColumn("isActive")?.setFilterValue(event.target.value)
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Handle bulk actions
              }}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
            </Button>
          </div>
        )}
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
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <BookOpenIcon className="w-8 h-8 text-[#00501B]/60" />
                    <p className="text-muted-foreground">No subjects found</p>
                    {!(table.getColumn("name")?.getFilterValue() as string) && 
                     (table.getColumn("isActive")?.getFilterValue() as string) === "all" && (
                      <Link href="/settings/subjects/create">
                        <Button className="bg-[#00501B] hover:bg-[#00501B]/90 text-white" size="sm">
                          <PlusIcon className="mr-2 h-4 w-4" />
                          Add Subject
                        </Button>
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the subject <strong>"{subjectToDelete?.name}"</strong>? 
              This action cannot be undone and will remove all class and student associations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 