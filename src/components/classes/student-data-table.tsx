"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { 
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Search, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Define the Student type
export type Student = {
  id: string
  firstName: string
  lastName: string
  admissionNumber: string
  isActive: boolean
}

interface StudentDataTableProps {
  data: Student[]
  onRowSelectionChange?: (selectedRows: string[]) => void
  initialPageSize?: number
}

export function StudentDataTable({ 
  data, 
  onRowSelectionChange, 
  initialPageSize = 10 
}: StudentDataTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const router = useRouter()
  
  // Set up initial states
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")
  
  // Handle row selection change
  const handleRowSelectionChange = (rowIds: string[]) => {
    setSelectedRows(rowIds)
    if (onRowSelectionChange) {
      onRowSelectionChange(rowIds)
    }
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
        const student = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
              {student.firstName?.[0]}{student.lastName?.[0]}
            </div>
            <div>
              <div className="font-medium">{student.firstName} {student.lastName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{student.admissionNumber}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <Badge variant={isActive ? "outline" : "secondary"} className={isActive
            ? "bg-green-50 text-green-700 hover:bg-green-50 dark:bg-[#7aad8c]/10 dark:text-[#7aad8c] dark:border-[#7aad8c]/30 dark:hover:bg-[#7aad8c]/20"
            : "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-[#303030] dark:text-[#808080] dark:border-[#404040] dark:hover:bg-[#353535]"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const student = row.original;

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
              <DropdownMenuItem 
                onClick={() => router.push(`/students/${student.id}`)}
                className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4 dark:text-[#7aad8c]" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push(`/students/${student.id}/edit`)}
                className="dark:focus:bg-[#303030] dark:focus:text-[#e6e6e6] dark:text-[#c0c0c0] cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4 dark:text-[#e2bd8c]" />
                Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ]

  // Set up the table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const safeValue = String(row.getValue(columnId) || "").toLowerCase()
      return safeValue.includes(String(filterValue).toLowerCase())
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        <div className="relative w-64 group">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Search students..."
            className="w-full pl-9 pr-4 border-gray-300 dark:border-gray-700 focus:border-[#00501B] dark:focus:border-[#7aad8c] focus:ring-[#00501B]/10 dark:focus:ring-[#7aad8c]/10 transition-all dark:bg-gray-800 dark:text-gray-200"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      </div>
      
      <div className="rounded-md border dark:border-gray-700">
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
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground dark:text-gray-400">
          Showing {table.getFilteredRowModel().rows.length === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )} of {table.getFilteredRowModel().rows.length} students
        </div>
        
        <div className="flex items-center gap-4">
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              if (value === "all") {
                table.setPageSize(data.length);
              } else {
                table.setPageSize(Number(value));
              }
            }}
          >
            <SelectTrigger className="h-8 w-[100px] dark:bg-[#252525] dark:border-[#303030] dark:text-[#e6e6e6]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#252525] dark:border-[#303030]">
              {[10, 50, 100, 200, 500].map((pageSize) => (
                <SelectItem 
                  key={pageSize} 
                  value={pageSize.toString()}
                  className="dark:text-[#e6e6e6] dark:focus:bg-[#303030]"
                >
                  {pageSize} per page
                </SelectItem>
              ))}
              <SelectItem 
                key="all"
                value="all"
                className="dark:text-[#e6e6e6] dark:focus:bg-[#303030]"
              >
                All
              </SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0 dark:bg-[#252525] dark:border-[#303030] dark:text-[#e6e6e6]"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <div className="text-sm text-muted-foreground dark:text-gray-400">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0 dark:bg-[#252525] dark:border-[#303030] dark:text-[#e6e6e6]"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 