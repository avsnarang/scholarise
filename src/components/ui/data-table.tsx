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
import { ChevronDown, ChevronLeft, ChevronRight, Filter, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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

export interface FilterOption {
  label: string;
  value: string;
  icon?: string; // Optional emoji or icon
}

export interface DataTableFilter {
  key: string; // The field key to filter on
  label: string; // Display label for the filter
  type: 'select';
  options: FilterOption[];
  placeholder?: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[] // This will be the data for the CURRENT page
  searchKey?: string
  searchPlaceholder?: string
  filters?: DataTableFilter[] // Custom filters
  pageSize?: number
  onPageSizeChange?: (value: string) => void
  pageCount?: number // Total number of pages from server
  sorting?: SortingState // Added: Controlled sorting state
  onSortingChange?: (updater: SortingState | ((old: SortingState) => SortingState)) => void // Added: Handler for sorting changes
  // Props for controlled row selection by parent
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (updater: React.SetStateAction<Record<string, boolean>>) => void;
  // Server-side pagination support
  pagination?: PaginationState;
  onPaginationChange?: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  filters = [],
  pageSize = 50,
  onPageSizeChange,
  pageCount = -1, // Default to -1 if not provided, react-table can handle this
  sorting, // Added
  onSortingChange, // Added
  rowSelection, // Controlled row selection state from parent
  onRowSelectionChange, // Handler for selection changes from parent
  pagination: externalPagination, // Server-side pagination state
  onPaginationChange, // Server-side pagination change handler
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [customFilters, setCustomFilters] = React.useState<Record<string, string>>({})
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0, // Controlled by parent via cursor logic, this is for display
    pageSize: pageSize,
  });

  // Use external pagination if provided, otherwise use internal
  const pagination = externalPagination || internalPagination;
  const setPagination = onPaginationChange || setInternalPagination;
  const [error, setError] = React.useState<string | null>(null);

  // Filter handlers
  const handleFilterChange = (filterKey: string, value: string) => {
    setCustomFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilter = (filterKey: string) => {
    setCustomFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setCustomFilters({});
  };

  // Apply custom filters to data
  const filteredData = React.useMemo(() => {
    if (Object.keys(customFilters).length === 0) return data;
    
    return data.filter(item => {
      return Object.entries(customFilters).every(([key, value]) => {
        if (!value || value === 'all') return true;
        
        // Get nested property value
        const itemValue = key.split('.').reduce((obj: any, k) => obj?.[k], item);
        
        // Convert to string for comparison
        const itemValueStr = String(itemValue || '').toLowerCase();
        const filterValueStr = String(value).toLowerCase();
        
        return itemValueStr === filterValueStr;
      });
    });
  }, [data, customFilters]);

  // Get active filters for display
  const activeFilters = React.useMemo(() => {
    return Object.entries(customFilters)
      .filter(([_, value]) => value && value !== 'all')
      .map(([key, value]) => {
        const filter = filters.find(f => f.key === key);
        const option = filter?.options.find(opt => opt.value === value);
        return {
          key,
          label: filter?.label || key,
          value,
          displayValue: option?.label || value
        };
      });
  }, [customFilters, filters]);

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
    data: filteredData,
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
    // Only update internal pagination if not using external pagination
    if (!externalPagination) {
      setInternalPagination(prev => ({
        ...prev,
        pageSize: pageSize
      }));
    }
  }, [pageSize, externalPagination]);

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
        
        {/* Custom Filters */}
        {filters.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`border-dashed ${activeFilters.length > 0 ? "border-solid bg-accent" : ""}`}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-4 text-xs px-1">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 z-[60]" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFilters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-6 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {filters.map((filter) => (
                  <div key={filter.key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {filter.label}
                    </label>
                    <Select
                      value={customFilters[filter.key] || "all"}
                      onValueChange={(value) => handleFilterChange(filter.key, value === "all" ? "" : value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={filter.placeholder || `All ${filter.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.icon && <span className="mr-2">{option.icon}</span>}
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear filters button */}
        {activeFilters.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 px-3"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}

        {/* Active filters display */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="h-6 text-xs gap-1"
              >
                {filter.label}: {filter.displayValue}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter(filter.key)}
                  className="h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
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

          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {pageCount === -1 ? table.getPageCount() : pageCount}
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
  )
}
