"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X, FileDown, FileSpreadsheet, Check, Users } from "lucide-react"
import { 
  STUDENT_EXPORT_FIELDS, 
  DEFAULT_EXPORT_FIELDS, 
  getFieldsByCategory,
  type StudentExportField,
  type StudentExportData,
  exportStudentsToCSV,
  exportStudentsToExcel
} from "@/utils/student-export"

interface StudentExportFieldSelectorProps {
  isOpen: boolean
  onClose: () => void
  students: StudentExportData[]
  title?: string
}

export function StudentExportFieldSelector({ 
  isOpen, 
  onClose, 
  students,
  title = "Export Students"
}: StudentExportFieldSelectorProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_EXPORT_FIELDS)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Basic", "Academic"])
  const [isMounted, setIsMounted] = useState(false)

  const fieldsByCategory = React.useMemo(() => getFieldsByCategory(), [])

  // Filter fields based on search term
  const filteredFieldsByCategory = React.useMemo(() => {
    if (!searchTerm.trim()) return fieldsByCategory

    const filtered: Record<string, StudentExportField[]> = {}
    Object.entries(fieldsByCategory).forEach(([category, fields]) => {
      const matchingFields = fields.filter(field =>
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.key.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (matchingFields.length > 0) {
        filtered[category] = matchingFields
      }
    })
    return filtered
  }, [fieldsByCategory, searchTerm])

  // Track mounted state to prevent state updates after unmount
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
    }
  }, [])

  // Toggle field selection
  const toggleField = (fieldKey: string) => {
    if (!isMounted) return
    setSelectedFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(key => key !== fieldKey)
        : [...prev, fieldKey]
    )
  }

  // Select all fields in a category
  const selectCategoryFields = (category: string, select: boolean) => {
    if (!isMounted) return
    const categoryFields = fieldsByCategory[category]?.map(field => field.key) || []
    
    if (select) {
      setSelectedFields(prev => [...new Set([...prev, ...categoryFields])])
    } else {
      setSelectedFields(prev => prev.filter(key => !categoryFields.includes(key)))
    }
  }

  // Check if all fields in a category are selected
  const isCategoryFullySelected = (category: string): boolean => {
    const categoryFields = fieldsByCategory[category]?.map(field => field.key) || []
    return categoryFields.length > 0 && categoryFields.every(key => selectedFields.includes(key))
  }

  // Check if some fields in a category are selected
  const isCategoryPartiallySelected = (category: string): boolean => {
    const categoryFields = fieldsByCategory[category]?.map(field => field.key) || []
    return categoryFields.some(key => selectedFields.includes(key)) && !isCategoryFullySelected(category)
  }

  // Select all fields
  const selectAllFields = () => {
    if (!isMounted) return
    setSelectedFields(STUDENT_EXPORT_FIELDS.map(field => field.key))
  }

  // Deselect all fields
  const deselectAllFields = () => {
    if (!isMounted) return
    setSelectedFields([])
  }

  // Reset to default fields
  const resetToDefault = () => {
    if (!isMounted) return
    setSelectedFields(DEFAULT_EXPORT_FIELDS)
  }

  // Handle export
  const handleExport = (format: 'csv' | 'excel') => {
    if (!isMounted || selectedFields.length === 0) {
      return
    }

    const filename = `students_export_${new Date().toISOString().slice(0, 10)}`

    if (format === 'csv') {
      exportStudentsToCSV(students, selectedFields, `${filename}.csv`)
    } else {
      exportStudentsToExcel(students, selectedFields, `${filename}.xlsx`)
    }

    handleClose()
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset to defaults when modal closes to prevent state issues
      setSearchTerm("")
      setExpandedCategories(["Basic", "Academic"])
      setSelectedFields(DEFAULT_EXPORT_FIELDS)
    }
  }, [isOpen])

  // Auto-expand categories with search results
  useEffect(() => {
    if (!isMounted) return
    
    if (searchTerm.trim()) {
      const categoriesWithResults = Object.keys(filteredFieldsByCategory)
      setExpandedCategories(categoriesWithResults)
    }
  }, [searchTerm, isMounted]) // Removed filteredFieldsByCategory to prevent infinite loops

  const categoryOrder = ["Basic", "Academic", "Contact", "Personal", "Address", "Previous School", "Parent/Guardian"]

  // Safe close handler
  const handleClose = () => {
    try {
      onClose()
    } catch (error) {
      console.warn('Error closing modal:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the export. {students.length} student(s) will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Quick Actions */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => {
                  if (isMounted) {
                    setSearchTerm(e.target.value)
                  }
                }}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isMounted) {
                      setSearchTerm("")
                    }
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFields}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllFields}
                  className="text-xs"
                >
                  Deselect All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                  className="text-xs"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </div>

          {/* Field Selection */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            <Accordion 
              type="multiple" 
              value={expandedCategories}
              onValueChange={(value) => {
                if (isMounted) {
                  setExpandedCategories(value)
                }
              }}
              className="w-full"
            >
              {categoryOrder.map(category => {
                const fields = filteredFieldsByCategory[category]
                if (!fields || fields.length === 0) return null

                const isFullySelected = isCategoryFullySelected(category)
                const isPartiallySelected = isCategoryPartiallySelected(category)

                return (
                  <AccordionItem key={category} value={category}>
                    <div className="flex items-center px-4 py-3 border-b">
                      <Checkbox
                        checked={isFullySelected}
                        ref={(ref) => {
                          if (ref && isMounted) {
                            try {
                              (ref as any).indeterminate = isPartiallySelected && !isFullySelected
                            } catch (error) {
                              // Ignore ref errors to prevent crashes
                              console.warn('Checkbox ref error:', error)
                            }
                          }
                        }}
                        onCheckedChange={(checked) => 
                          selectCategoryFields(category, !!checked)
                        }
                        className="mr-3"
                      />
                      <AccordionTrigger className="flex-1 hover:no-underline py-0">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{category}</span>
                          <Badge variant="outline" className="text-xs">
                            {fields.filter(field => selectedFields.includes(field.key)).length} / {fields.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fields.map(field => (
                          <div key={field.key} className="flex items-center space-x-3">
                            <Checkbox
                              id={field.key}
                              checked={selectedFields.includes(field.key)}
                              onCheckedChange={() => toggleField(field.key)}
                            />
                            <Label
                              htmlFor={field.key}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {field.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selectedFields.length > 0 
                ? `Ready to export ${students.length} student(s) with ${selectedFields.length} field(s)`
                : "Please select at least one field to export"
              }
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                disabled={selectedFields.length === 0}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={() => handleExport('excel')}
                disabled={selectedFields.length === 0}
                className="gap-2"
                variant="secondary"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 