"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  Row,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EllipsisIcon,
  ListFilterIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdvancedFilter } from "@/components/ui/advanced-filter"
import type { FilterCategory } from "@/components/ui/advanced-filter"
import type { Filter as UIFilter } from "@/components/ui/filters"
import { FilterOperator } from "@/components/ui/filters"

// Props interface for the generic data table
interface AdvancedDataTableProps<T> {
  data?: T[]
  columns: ColumnDef<T>[]
  fetchUrl?: string
  onAddClick?: () => void
  onDeleteRows?: (selectedRows: Row<T>[]) => void
  onRowAction?: (action: string, row: Row<T>) => void
  title?: string
  description?: string
  addButtonText?: string
  deleteButtonText?: string
  searchPlaceholder?: string
  searchColumns?: (keyof T)[]
  filterCategories?: FilterCategory[][]
  filterConfigs?: {
    column: string;
    title: string;
    options: {
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[];
  }[];
  enableRowSelection?: boolean
  enableSearch?: boolean
  enableColumnVisibility?: boolean
  enablePagination?: boolean
  enableAdvancedFilter?: boolean
  initialPageSize?: number
  pageSizeOptions?: number[]
  customRowActions?: (row: Row<T>) => ReactNode
  className?: string
  onFiltersChange?: (filters: UIFilter[]) => void
}

// Default row actions component
function DefaultRowActions<T>({ 
  row, 
  onRowAction 
}: { 
  row: Row<T>
  onRowAction?: (action: string, row: Row<T>) => void 
}) {
  const handleAction = (action: string) => {
    if (onRowAction) {
      onRowAction(action, row)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none"
            aria-label="Actions"
          >
            <EllipsisIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleAction('edit')}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('duplicate')}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('archive')}>
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-destructive focus:text-destructive"
          onClick={() => handleAction('delete')}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple pagination component since we can't import the full one
function SimplePagination({ children }: { children: React.ReactNode }) {
  return <nav className="flex items-center space-x-2" role="navigation" aria-label="pagination">{children}</nav>
}

function PaginationContent({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center space-x-1">{children}</div>
}

function PaginationItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export default function AdvancedDataTable<T extends Record<string, any>>({
  data: initialData = [],
  columns: userColumns,
  fetchUrl,
  onAddClick,
  onDeleteRows,
  onRowAction,
  title,
  description,
  addButtonText = "Add item",
  deleteButtonText = "Delete",
  searchPlaceholder = "Search...",
  searchColumns = [],
  filterCategories = [],
  filterConfigs = [],
  enableRowSelection = true,
  enableSearch = true,
  enableColumnVisibility = true,
  enablePagination = true,
  enableAdvancedFilter = true,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  customRowActions,
  className,
  onFiltersChange,
}: AdvancedDataTableProps<T>) {
  const id = useId()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [data, setData] = useState<T[]>(initialData)
  const [advancedFilters, setAdvancedFilters] = useState<UIFilter[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Build columns with selection and actions
  const columns = useMemo(() => {
    const finalColumns: ColumnDef<T>[] = []

    // Add selection column if enabled
    if (enableRowSelection) {
      finalColumns.push({
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
        size: 28,
        enableSorting: false,
        enableHiding: false,
      })
    }

    // Add user columns
    finalColumns.push(...userColumns)

    // Add actions column if custom actions or row action handler provided
    if (customRowActions || onRowAction) {
      finalColumns.push({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => customRowActions 
          ? customRowActions(row) 
          : <DefaultRowActions row={row} onRowAction={onRowAction} />,
        size: 60,
        enableHiding: false,
        enableSorting: false,
      })
    }

    return finalColumns
  }, [userColumns, enableRowSelection, customRowActions, onRowAction])

  // Data fetching effect
  useEffect(() => {
    if (initialData?.length) {
      setData(initialData)
    } else if (fetchUrl && typeof fetchUrl === 'string') {
      async function fetchData(url: string) {
        try {
          const res = await fetch(url)
          const fetchedData = await res.json()
          setData(Array.isArray(fetchedData) ? fetchedData : [])
        } catch (error) {
          console.error('Error fetching data:', error)
          setData([])
        }
      }
      fetchData(fetchUrl)
    }
  }, [initialData, fetchUrl])

  // Filter the data based on advanced filters
  const filteredData = useMemo(() => {
    if (!advancedFilters.length) return data

    return data.filter((item) => {
      return advancedFilters.every((filter) => {
        const filterType = filter.type as string
        const filterValue = filter.value[0]?.toLowerCase() || ''
        
        // Find the corresponding field in the data
        const itemValue = String(item[filterType as keyof T] || '').toLowerCase()
        
        switch (filter.operator) {
          case FilterOperator.IS:
            return itemValue === filterValue
          case FilterOperator.INCLUDE:
            return itemValue.includes(filterValue)
          default:
            return itemValue === filterValue
        }
      })
    })
  }, [data, advancedFilters])

  // Handle row deletion
  const handleDeleteRows = () => {
    const selectedRows = table.getSelectedRowModel().rows
    
    if (onDeleteRows) {
      onDeleteRows(selectedRows)
    } else {
      // Default behavior - remove from local state
      const updatedData = filteredData.filter(
        (item) => !selectedRows.some((row) => row.original === item)
      )
      setData(updatedData)
    }
    
    table.resetRowSelection()
  }

  // Handle filter changes
  const handleAdvancedFiltersChange = (filters: UIFilter[]) => {
    setAdvancedFilters(filters)
    if (onFiltersChange) {
      onFiltersChange(filters)
    }
  }

  // Initialize table
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    ...(enablePagination && {
      getPaginationRowModel: getPaginationRowModel(),
      onPaginationChange: setPagination,
    }),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      ...(enablePagination && { pagination }),
      columnFilters,
      columnVisibility,
    },
  })

  return (
    <div className={cn("space-y-4", className)}>
      {/* Title and Description */}
      {(title || description) && (
        <div className="space-y-2">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Search input */}
          {enableSearch && searchColumns.length > 0 && (
            <div className="relative">
              <Input
                id={`${id}-search`}
                ref={inputRef}
                className={cn(
                  "peer min-w-60 ps-9",
                  Boolean(table.getColumn(String(searchColumns[0]))?.getFilterValue()) && "pe-9"
                )}
                value={
                  (table.getColumn(String(searchColumns[0]))?.getFilterValue() ?? "") as string
                }
                onChange={(e) => {
                  const column = table.getColumn(String(searchColumns[0]))
                  column?.setFilterValue(e.target.value)
                }}
                placeholder={searchPlaceholder}
                type="text"
                aria-label="Search"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <ListFilterIcon size={16} aria-hidden="true" />
              </div>
              {Boolean(table.getColumn(String(searchColumns[0]))?.getFilterValue()) && (
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Clear search"
                  onClick={() => {
                    const column = table.getColumn(String(searchColumns[0]))
                    column?.setFilterValue("")
                    if (inputRef.current) {
                      inputRef.current.focus()
                    }
                  }}
                >
                  <CircleXIcon size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Advanced Filter */}
          {enableAdvancedFilter && filterCategories.length > 0 && (
            <AdvancedFilter
              categories={filterCategories}
              filters={advancedFilters}
              onFiltersChange={handleAdvancedFiltersChange}
              placeholder="Search filters..."
              className="flex items-center"
            />
          )}

          {/* Column visibility toggle */}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Columns3Icon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
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
                        onSelect={(event) => event.preventDefault()}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Delete button */}
          {enableRowSelection && table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <TrashIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {deleteButtonText}
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                    aria-hidden="true"
                  >
                    <CircleAlertIcon className="opacity-80" size={16} />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete{" "}
                      {table.getSelectedRowModel().rows.length} selected{" "}
                      {table.getSelectedRowModel().rows.length === 1
                        ? "row"
                        : "rows"}
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRows}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Add button */}
          {onAddClick && (
            <Button variant="outline" onClick={onAddClick}>
              <PlusIcon
                className="-ms-1 opacity-60"
                size={16}
                aria-hidden="true"
              />
              {addButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-background overflow-hidden rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }}
                      className="h-11"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            header.column.getCanSort() &&
                              "flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (
                              header.column.getCanSort() &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault()
                              header.column.getToggleSortingHandler()?.(e)
                            }
                          }}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: (
                              <ChevronUpIcon
                                className="shrink-0 opacity-60"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                            desc: (
                              <ChevronDownIcon
                                className="shrink-0 opacity-60"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
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

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between gap-8">
          {/* Results per page */}
          <div className="flex items-center gap-3">
            <Label htmlFor={`${id}-page-size`} className="max-sm:sr-only">
              Rows per page
            </Label>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger id={`${id}-page-size`} className="w-fit whitespace-nowrap">
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page info */}
          <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
            <p className="text-muted-foreground text-sm whitespace-nowrap" aria-live="polite">
              <span className="text-foreground">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                -
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getRowCount()
                )}
              </span>{" "}
              of{" "}
              <span className="text-foreground">
                {table.getRowCount()}
              </span>
            </p>
          </div>

          {/* Pagination controls */}
          <div>
            <SimplePagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => table.firstPage()}
                    disabled={!table.getCanPreviousPage()}
                    aria-label="Go to first page"
                  >
                    <ChevronFirstIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    aria-label="Go to previous page"
                  >
                    <ChevronLeftIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    aria-label="Go to next page"
                  >
                    <ChevronRightIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => table.lastPage()}
                    disabled={!table.getCanNextPage()}
                    aria-label="Go to last page"
                  >
                    <ChevronLastIcon size={16} aria-hidden="true" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </SimplePagination>
          </div>
        </div>
      )}
    </div>
  )
} 