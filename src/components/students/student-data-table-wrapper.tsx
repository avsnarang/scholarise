"use client"

import { useState, useEffect } from "react"
import { StudentDataTable, type Student } from "./student-data-table"

interface StudentDataTableWrapperProps {
  data: any[] // Using any to accept potentially malformed data
  onRowSelectionChange?: (selectedRows: string[]) => void
}

export function StudentDataTableWrapper({ 
  data, 
  onRowSelectionChange 
}: StudentDataTableWrapperProps) {
  const [processedData, setProcessedData] = useState<Student[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
          class: item.class ? {
            name: item.class.name || '',
            section: item.class.section || ''
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

      setProcessedData(validatedData)
      setError(null)
    } catch (err) {
      console.error('Error processing student data:', err)
      setError(`Failed to process student data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      // Set empty array to avoid crashing the component
      setProcessedData([])
    }
  }, [data])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
        <h3 className="font-medium">Error loading student data</h3>
        <p className="text-sm">{error}</p>
        <p className="text-sm mt-2">Check browser console for more details.</p>
      </div>
    )
  }

  return <StudentDataTable data={processedData} onRowSelectionChange={onRowSelectionChange} />
} 