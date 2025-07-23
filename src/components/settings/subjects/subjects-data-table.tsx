"use client";

import { useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { 
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye, MoreHorizontal, PlusIcon, Edit, GripVertical, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { SubjectFormModal } from "./subject-form-modal";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  isOptional: boolean;
  displayOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  classes?: Array<{
    id: string;
    classId: string;
    class: {
      id: string;
      name: string;
    };
  }>;
}

export function SubjectsDataTable() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const utils = api.useUtils();
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<Subject | null>(null);
  const [dragOverItem, setDragOverItem] = useState<Subject | null>(null);

  // Fetch subjects data with class information
  const { data: subjectsData, isLoading } = api.subject.getAll.useQuery({
    branchId: currentBranchId || undefined,
    includeClasses: true,
  });

  const subjects = (subjectsData?.items || []) as Subject[];

  // Toggle subject status mutation
  const toggleStatusMutation = api.subject.toggleStatus.useMutation({
    onSuccess: async () => {
      await utils.subject.getAll.invalidate();
      toast({
        title: "Success",
        description: "Subject status updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subject status.",
        variant: "destructive",
      });
    },
  });

  // Delete subject mutation
  const deleteSubjectMutation = api.subject.delete.useMutation({
    onSuccess: async () => {
      await utils.subject.getAll.invalidate();
      toast({
        title: "Success",
        description: "Subject deleted successfully.",
      });
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

  // Reorder subjects mutation
  const reorderSubjectsMutation = api.subject.reorder.useMutation({
    onSuccess: async () => {
      await utils.subject.getAll.invalidate();
      toast({
        title: "Success",
        description: "Subjects reordered successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder subjects.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (subjectToDelete) {
      deleteSubjectMutation.mutate({ id: subjectToDelete.id });
    }
  };

  const handleToggleStatus = (subject: Subject) => {
    toggleStatusMutation.mutate({
      id: subject.id,
      isActive: !subject.isActive,
    });
  };

  const handleModalSuccess = () => {
    // No manual refetch needed - mutations handle cache invalidation
    setIsModalOpen(false);
    setEditingSubjectId(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, subject: Subject) => {
    setDraggedItem(subject);
    e.dataTransfer.effectAllowed = "move";
    
    // Create a drag image showing the subject name
    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      background: white;
      border: 1px solid #00501B;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #00501B;
      box-shadow: 0 4px 12px rgba(0, 80, 27, 0.15);
      z-index: 1000;
      white-space: nowrap;
      max-width: 300px;
    `;
    dragImage.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: #00501B; border-radius: 2px;">
          <div style="width: 3px; height: 3px; background: white; border-radius: 50%; margin: 1px;"></div>
          <div style="width: 3px; height: 3px; background: white; border-radius: 50%; margin: 1px;"></div>
        </div>
        <span>${subject.name}</span>
        ${subject.code ? `<span style="font-size: 12px; color: #666; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${subject.code}</span>` : ''}
      </div>
    `;
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 150, 25);
    
    // Clean up drag image after drag starts
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, subject: Subject) => {
    e.preventDefault();
    if (draggedItem && draggedItem.id !== subject.id) {
      setDragOverItem(subject);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're leaving the row entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverItem(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetSubject: Subject) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetSubject.id) {
      handleDragEnd();
      return;
    }

    const draggedIndex = subjects.findIndex(s => s.id === draggedItem.id);
    const targetIndex = subjects.findIndex(s => s.id === targetSubject.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    // Create new array with reordered items
    const newSubjects = [...subjects];
    const [removed] = newSubjects.splice(draggedIndex, 1);
    if (removed) {
      newSubjects.splice(targetIndex, 0, removed);
    }

    // Update display orders based on new positions
    const subjectOrders = newSubjects.map((subject, index) => ({
      id: subject.id,
      displayOrder: index,
    }));

    // Call the reorder mutation
    reorderSubjectsMutation.mutate({ subjectOrders });
    handleDragEnd();
  };

  const columns: ColumnDef<Subject>[] = [
    {
      id: "dragHandle",
      header: "",
      cell: ({ row }) => (
        <div
          className={`flex items-center justify-center cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${
            draggedItem?.id === row.original.id ? 'opacity-50' : ''
          } ${
            dragOverItem?.id === row.original.id ? 'bg-[#00501B]/10 dark:bg-[#7aad8c]/10' : ''
          }`}
          title="Drag to reorder subjects"
        >
          <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
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
          className="h-auto p-0 font-semibold"
        >
          Subject Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => {
        const code = row.getValue("code") as string;
        return code ? (
          <Badge variant="outline" className="font-mono text-xs bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            {code}
          </Badge>
        ) : (
          <span className="text-gray-500 dark:text-gray-400 text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "isOptional",
      header: "Type",
      cell: ({ row }) => {
        const isOptional = row.getValue("isOptional");
        return (
          <Badge
            variant="outline"
            className={isOptional
              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
              : "bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/20"
            }
          >
            {isOptional ? "Optional" : "Compulsory"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value === "all" ? true : row.getValue(id) === (value === "optional");
      },
    },
    {
      id: "classesAssigned",
      header: "Classes Assigned",
      cell: ({ row }) => {
        const subject = row.original;
        const classes = subject.classes || [];
        
        if (classes.length === 0) {
          return (
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
              No classes assigned
            </Badge>
          );
        }

        // Show first 2 classes directly
        const visibleClasses = classes.slice(0, 2);
        const remainingCount = classes.length - 2;

        return (
          <div className="flex flex-wrap gap-1 items-center">
            {visibleClasses.map((classMapping) => (
              <Badge 
                key={classMapping.id} 
                variant="outline" 
                className="text-xs bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/20"
              >
                {classMapping.class.name}
              </Badge>
            ))}
            
            {remainingCount > 0 && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="text-xs border-dashed border-[#00501B]/30 text-[#00501B] cursor-pointer hover:bg-[#00501B]/5 dark:border-[#7aad8c]/30 dark:text-[#7aad8c] dark:hover:bg-[#7aad8c]/5"
                  >
                    +{remainingCount} more
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        Assigned Classes
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {classes.length} {classes.length === 1 ? 'class' : 'classes'} assigned
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {classes.map((classMapping) => (
                        <Badge 
                          key={classMapping.id} 
                          variant="outline" 
                          className="text-xs bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20 justify-center py-1 px-2 truncate dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/20"
                          title={classMapping.class.name}
                        >
                          {classMapping.class.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700 font-medium">
                      Total: {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive");
        return (
          <Badge
            variant="outline"
            className={isActive
              ? "bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/20"
              : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value === "all" ? true : row.getValue(id) === (value === "true");
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div className="text-sm text-muted-foreground">
            {date.toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const subject = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingSubjectId(subject.id);
                setIsModalOpen(true);
              }}
              className="h-8 px-2 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/10"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setEditingSubjectId(subject.id);
                    setIsModalOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Subject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleToggleStatus(subject)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {subject.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSubjectToDelete(subject);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Create table instance
  const table = useReactTable({
    data: subjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
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
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">All Subjects</h2>
          <p className="text-sm text-muted-foreground">
            Manage and organize your institution's subjects
          </p>
        </div>
        <Button
          className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
          onClick={() => {
            setEditingSubjectId(null);
            setIsModalOpen(true);
          }}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Info about drag and drop */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
          <GripVertical className="h-4 w-4" />
          <span>Click and drag any row to reorder subjects according to your preference. The order will be saved automatically.</span>
        </div>
      </div>

      {/* Custom Draggable Data Table */}
      <div className="w-full">
        <div className="flex items-center py-4 gap-2">
          <Input
            placeholder="Search subjects..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => table.getColumn("name")?.setFilterValue(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value: boolean) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup: any) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header: any) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`cursor-grab active:cursor-grabbing transition-all ${
                      draggedItem?.id === row.original.id 
                        ? 'opacity-50 scale-95' 
                        : ''
                    } ${
                      dragOverItem?.id === row.original.id 
                        ? 'bg-[#00501B]/5 border-[#00501B]/20 dark:bg-[#7aad8c]/5 dark:border-[#7aad8c]/20' 
                        : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.original)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, row.original)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => {
                  const newPageSize = value === "all" ? subjects.length : Number(value);
                  table.setPageSize(newPageSize); 
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 50, 100, 200, 500].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                  <SelectItem key="all" value="all">
                    All
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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

      {/* Subject Form Modal */}
      <SubjectFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        subjectId={editingSubjectId}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
} 