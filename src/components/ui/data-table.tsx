"use client"

import * as React from "react"
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[] // This will be the data for the CURRENT page
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
  onPageSizeChange?: (value: string) => void
  pageCount?: number // Total number of pages from server
  sorting?: SortingState // Added: Controlled sorting state
  onSortingChange?: (updater: SortingState | ((old: SortingState) => SortingState)) => void // Added: Handler for sorting changes
  // Props for controlled row selection by parent
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (updater: React.SetStateAction<Record<string, boolean>>) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize = 10,
  onPageSizeChange,
  pageCount = -1, // Default to -1 if not provided, react-table can handle this
  sorting, // Added
  onSortingChange, // Added
  rowSelection, // Controlled row selection state from parent
  onRowSelectionChange, // Handler for selection changes from parent
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0, // Controlled by parent via cursor logic, this is for display
    pageSize: pageSize,
  });
  const [error, setError] = React.useState<string | null>(null);

  // Validate data and columns before rendering
  React.useEffect(() => {
    try {
      for (const column of columns) {
        const columnAny = column as any;
        if (columnAny.accessorKey && typeof columnAny.accessorKey === 'string') {
          const accessorKey = columnAny.accessorKey;
          const missingData = data.some((row: any) => {
            const path = accessorKey.split('.');
            let value = row;
            for (const key of path) {
              if (value === null || value === undefined) return true;
              value = value[key];
              if (value === undefined) return true;
            }
            return false;
          });
          if (missingData) {
            console.warn(`Some data is missing the field: ${accessorKey}`);
          }
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error in DataTable validation:', err);
      setError(`Error initializing table: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [data, columns]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: onSortingChange, // Use the passed prop for sorting changes
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onRowSelectionChange, // Directly use the prop
    onPaginationChange: setPagination, // Allows table to update its local pagination state
    manualPagination: true, // Crucial for server-side pagination
    pageCount: pageCount,   // Provide the total page count from server
    state: {
      sorting: sorting, // Use the passed prop for sorting state
      columnFilters,
      columnVisibility,
      rowSelection: rowSelection, // Use the controlled rowSelection prop
      pagination, // Use the local pagination state for pageIndex and pageSize
    },
  });

  // Sync pageSize prop with table's internal state if prop changes
  React.useEffect(() => {
    // table.setPageSize(pageSize); // This is handled by parent via onPageSizeChange now
    // The pagination state has pageSize, which is initialized by the pageSize prop.
    // If the pageSize prop to DataTable changes, we need to update the pagination state.
    setPagination(prev => ({
        ...prev,
        pageSize: pageSize
    }));
  }, [pageSize]);

  // If there's an error, show a message
  if (error) {
    return (
      <div className="w-full p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">
        <p className="font-medium">Error loading table</p>
        <p className="text-sm">{error}</p>
        <p className="text-sm mt-2">Please check the browser console for more details.</p>
      </div>
    );
  }

  // Function to handle search input changes - it can search by ID, accessorKey, or accessorFn
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    
    // If we have a direct column match, use it
    const column = table.getColumn(searchKey || "");
    
    if (column) {
      column.setFilterValue(value);
    } else {
      // Otherwise, try to find a column with matching accessorKey or accessorFn
      // This handles cases where column ID doesn't match accessorKey
      console.warn(`Column with id '${searchKey}' not found. Using global filter instead.`);
      
      // Set a global filter if searchKey isn't found as a column ID
      table.setGlobalFilter(value);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={handleSearchChange}
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header as any,
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell as any,
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
          {table.getFilteredRowModel().rows.length} row(s) selected on this page.
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                if (onPageSizeChange) {
                  onPageSizeChange(value);
                } else {
                  const newPageSize = value === "all" ? data.length : Number(value);
                  table.setPageSize(newPageSize); 
                }
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

          {pageCount === -1 && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
