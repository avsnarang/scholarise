"use client"

import { useState, useEffect, useMemo } from "react"
import { StudentDataTable, type Student } from "./student-data-table"

interface StudentDataTableWrapperProps {
  data: any[] // Using any to accept potentially malformed data
  onRowSelectionChange?: (selectedIds: string[], isSelectAllActive: boolean) => void
  pageSize?: number // Added pageSize prop
  onPageSizeChange?: (value: string) => void // Added onPageSizeChange prop
  pageCount?: number // Added pageCount prop
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void // Added for sorting
  currentSortBy?: string // Added for sorting
  currentSortOrder?: "asc" | "desc" // Added for sorting
  totalStudentsCount?: number; // Added totalStudentsCount prop
  // New props for filters from StudentDataTable
  currentFilters?: Record<string, any>; 
  currentBranchId?: string | null;
  currentSessionId?: string | null;
  currentSearchTerm?: string | null; 
}

export function StudentDataTableWrapper({ 
  data, 
  onRowSelectionChange,
  pageSize, // Destructure pageSize
  onPageSizeChange, // Destructure onPageSizeChange
  pageCount, // Destructure pageCount
  onSortChange, // Destructure for sorting
  currentSortBy, // Destructure for sorting
  currentSortOrder, // Destructure for sorting
  totalStudentsCount, // Destructure totalStudentsCount
  // Destructure new filter props
  currentFilters,
  currentBranchId,
  currentSessionId,
  currentSearchTerm,
}: StudentDataTableWrapperProps) {
  const [error, setError] = useState<string | null>(null)

  const processedData = useMemo(() => {
    try {
      // Transform and validate the input data
      const validatedData = data.map((item: any, index: number): Student => {
        if (!item) {
          throw new Error(`Null or undefined item at index ${index}`)
        }

        // Validate required fields
        if (!item.id) {
          console.warn(`Item at index ${index} is missing required 'id' field`)
        }
        if (!item.firstName || typeof item.firstName !== 'string') {
          console.warn(`Item at index ${index} is missing or has invalid 'firstName' field`)
        }
        if (!item.lastName || typeof item.lastName !== 'string') {
          console.warn(`Item at index ${index} is missing or has invalid 'lastName' field`)
        }
        
        // Return a validated object with all required fields
        return {
          id: item.id || `auto-id-${index}`,
          admissionNumber: item.admissionNumber || '',
          firstName: item.firstName || 'Unknown',
          lastName: item.lastName || '',
          email: item.email || undefined,
          phone: item.phone || undefined,
          gender: item.gender || undefined,
          isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
          dateOfBirth: item.dateOfBirth instanceof Date ? 
            item.dateOfBirth : 
            (typeof item.dateOfBirth === 'string' ? new Date(item.dateOfBirth) : new Date()),
          class: item.section ? {
            name: item.section.class?.name || '',
            section: item.section.name || '',
            displayOrder: typeof item.section.class?.displayOrder === 'number' ? item.section.class.displayOrder : undefined
          } : undefined,
          parent: item.parent ? {
            fatherName: item.parent.fatherName || undefined,
            motherName: item.parent.motherName || undefined,
            guardianName: item.parent.guardianName || undefined,
            fatherMobile: item.parent.fatherMobile || undefined,
            motherMobile: item.parent.motherMobile || undefined,
            fatherEmail: item.parent.fatherEmail || undefined,
            motherEmail: item.parent.motherEmail || undefined,
            guardianEmail: item.parent.guardianEmail || undefined
          } : undefined
        }
      })

      setError(null) // Clear error if processing succeeds
      return validatedData
    } catch (err) {
      console.error('Error processing student data:', err)
      setError(`Failed to process student data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      // Set empty array to avoid crashing the component
      return []
    }
  }, [data])

  // Clear error if data becomes null or undefined, or on unmount
  useEffect(() => {
    if (!data) {
      setError(null);
    }
  }, [data]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
        <h3 className="font-medium">Error loading student data</h3>
        <p className="text-sm">{error}</p>
        <p className="text-sm mt-2">Check browser console for more details.</p>
      </div>
    )
  }

  return <StudentDataTable 
    data={processedData} 
    onRowSelectionChange={onRowSelectionChange} 
    pageSize={pageSize} 
    onPageSizeChange={onPageSizeChange} 
    pageCount={pageCount} 
    onSortChange={onSortChange}
    currentSortBy={currentSortBy}
    currentSortOrder={currentSortOrder}
    totalStudentsCount={totalStudentsCount}
    // Pass down new filter props
    currentFilters={currentFilters}
    currentBranchId={currentBranchId}
    currentSessionId={currentSessionId}
    currentSearchTerm={currentSearchTerm}
  />
} 