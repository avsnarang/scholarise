"use client"

import * as React from "react"
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"

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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize = 10
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [error, setError] = React.useState<string | null>(null)

  // Validate data and columns before rendering
  React.useEffect(() => {
    try {
      // Check columns without causing type errors
      for (const column of columns) {
        const columnAny = column as any;
        if (columnAny.accessorKey && typeof columnAny.accessorKey === 'string') {
          const accessorKey = columnAny.accessorKey;
          
          // Check if any data is missing the required field
          const missingData = data.some((row: any) => {
            // Handle nested paths (e.g., "class.name")
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

  // Initialize the table configuration - NOT inside useMemo
  let tableConfig: any = {}; 
  
  try {
    tableConfig = {
      data,
      columns,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
      },
      initialState: {
        pagination: {
          pageSize,
        },
      },
    };
  } catch (err) {
    console.error('Error setting up table config:', err);
    setError(`Table configuration error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    // Set minimum config
    tableConfig = {
      data: [],
      columns: [],
      getCoreRowModel: getCoreRowModel(),
    };
  }

  // Initialize the table - this needs to be at the top level, not in a useMemo
  const table = useReactTable(tableConfig);

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
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
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
    </div>
  )
}
