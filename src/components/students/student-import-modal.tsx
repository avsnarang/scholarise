"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  FileSpreadsheet, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Info,
  Users,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { parseExcelFile, downloadStudentImportTemplate, downloadStudentImportExcelTemplate } from "@/utils/export"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { api } from "@/utils/api"
import * as XLSX from 'xlsx'

interface StudentImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: any[]) => Promise<void>
}

interface ParsedData {
  headers: string[]
  rows: any[][]
  fileName: string
}

interface ColumnMapping {
  csvColumn: string
  propertyType: string
  isRequired?: boolean
}

// Available property types for student data
const PROPERTY_TYPES = [
  // Required fields
  { value: "firstName", label: "First Name", required: true },
  { value: "lastName", label: "Last Name", required: true },
  { value: "gender", label: "Gender", required: true },
  { value: "dateOfBirth", label: "Date of Birth", required: true },
  
  // School information
  { value: "admissionNumber", label: "Admission Number" },
  { value: "branchCode", label: "Branch Code" },
  { value: "classId", label: "Class ID" },
  { value: "className", label: "Class Name" },
  { value: "sectionName", label: "Section" },
  { value: "dateOfAdmission", label: "Date of Admission" },
  { value: "rollNumber", label: "Roll Number" },
  
  // Basic information
  { value: "email", label: "Email" },
  { value: "personalEmail", label: "Personal Email" },
  { value: "phone", label: "Phone" },
  { value: "bloodGroup", label: "Blood Group" },
  { value: "religion", label: "Religion" },
  { value: "nationality", label: "Nationality" },
  { value: "caste", label: "Caste" },
  { value: "aadharNumber", label: "Aadhar Number" },
  { value: "udiseId", label: "UDISE ID" },
  { value: "username", label: "Username" },
  { value: "password", label: "Password" },
  
  // Address information
  { value: "permanentAddress", label: "Permanent Address" },
  { value: "permanentCity", label: "Permanent City" },
  { value: "permanentState", label: "Permanent State" },
  { value: "permanentCountry", label: "Permanent Country" },
  { value: "permanentZipCode", label: "Permanent Zip Code" },
  { value: "correspondenceAddress", label: "Correspondence Address" },
  { value: "correspondenceCity", label: "Correspondence City" },
  { value: "correspondenceState", label: "Correspondence State" },
  { value: "correspondenceCountry", label: "Correspondence Country" },
  { value: "correspondenceZipCode", label: "Correspondence Zip Code" },
  
  // Previous school information
  { value: "previousSchool", label: "Previous School" },
  { value: "lastClassAttended", label: "Last Class Attended" },
  { value: "mediumOfInstruction", label: "Medium of Instruction" },
  { value: "recognisedByStateBoard", label: "Recognised by State Board" },
  { value: "schoolCity", label: "School City" },
  { value: "schoolState", label: "School State" },
  { value: "reasonForLeaving", label: "Reason for Leaving" },
  
  // Father's information
  { value: "fatherName", label: "Father Name" },
  { value: "fatherDob", label: "Father Date of Birth" },
  { value: "fatherEducation", label: "Father Education" },
  { value: "fatherOccupation", label: "Father Occupation" },
  { value: "fatherWorkplace", label: "Father Workplace" },
  { value: "fatherDesignation", label: "Father Designation" },
  { value: "fatherMobile", label: "Father Mobile" },
  { value: "fatherEmail", label: "Father Email" },
  { value: "fatherAadharNumber", label: "Father Aadhar Number" },
  
  // Mother's information
  { value: "motherName", label: "Mother Name" },
  { value: "motherDob", label: "Mother Date of Birth" },
  { value: "motherEducation", label: "Mother Education" },
  { value: "motherOccupation", label: "Mother Occupation" },
  { value: "motherWorkplace", label: "Mother Workplace" },
  { value: "motherDesignation", label: "Mother Designation" },
  { value: "motherMobile", label: "Mother Mobile" },
  { value: "motherEmail", label: "Mother Email" },
  { value: "motherAadharNumber", label: "Mother Aadhar Number" },
  
  // Guardian's information
  { value: "guardianName", label: "Guardian Name" },
  { value: "guardianDob", label: "Guardian Date of Birth" },
  { value: "guardianEducation", label: "Guardian Education" },
  { value: "guardianOccupation", label: "Guardian Occupation" },
  { value: "guardianWorkplace", label: "Guardian Workplace" },
  { value: "guardianDesignation", label: "Guardian Designation" },
  { value: "guardianMobile", label: "Guardian Mobile" },
  { value: "guardianEmail", label: "Guardian Email" },
  { value: "guardianAadharNumber", label: "Guardian Aadhar Number" },
  { value: "guardianRelationship", label: "Guardian Relationship" },
  
  // Legacy/alternative fields
  { value: "parentPhone", label: "Parent Phone" },
  { value: "parentEmail", label: "Parent Email" },
  { value: "address", label: "Address" },
  
  { value: "skip", label: "Skip Column" },
] as const

export function StudentImportModal({ 
  isOpen, 
  onClose, 
  onImport 
}: StudentImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing'>('upload')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [useFirstRowAsHeaders, setUseFirstRowAsHeaders] = useState(true)
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMapping>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  
  const { toast } = useToast()
  const { branchId } = useGlobalBranchFilter()
  const { currentSessionId } = useAcademicSessionContext()

  // Get available classes for Excel template
  const { data: availableClasses } = api.class.getClassIdsForImport.useQuery(
    { 
      branchId: branchId!, 
      sessionId: currentSessionId! 
    },
    { 
      enabled: !!branchId && !!currentSessionId 
    }
  )

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep('upload')
      setParsedData(null)
      setColumnMappings({})
      setUseFirstRowAsHeaders(true)
      setIsProcessing(false)
      setImportProgress(0)
    }
  }, [isOpen])

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV or Excel file.",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)

    try {
      let data: any[]
      let headers: string[]
      let rows: any[][]

      if (fileExtension === 'csv') {
        // Parse CSV
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length === 0) {
          throw new Error('CSV file is empty')
        }

        // Parse CSV manually (simple implementation)
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          
          result.push(current.trim())
          return result
        }

        const allRows = lines.map(parseCSVLine)
        headers = allRows[0] || []
        rows = allRows.slice(1)
      } else {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName!]
        
        if (!worksheet) {
          throw new Error('Excel file has no data')
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        if (jsonData.length === 0) {
          throw new Error('Excel file is empty')
        }

        headers = jsonData[0]?.map((h: any) => String(h || '')) || []
        rows = jsonData.slice(1).filter((row: any[]) => row.some((cell: any) => cell !== null && cell !== undefined && cell !== ''))
      }

      if (headers.length === 0) {
        throw new Error('No columns found in file')
      }

      if (rows.length === 0) {
        throw new Error('No data rows found in file')
      }

      setParsedData({
        headers,
        rows,
        fileName: file.name
      })

      // Initialize column mappings
      const initialMappings: Record<string, ColumnMapping> = {}
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim()
        
        // Auto-detect common columns
        let propertyType = "skip"
        if (normalizedHeader.includes('first') && normalizedHeader.includes('name')) {
          propertyType = "firstName"
        } else if (normalizedHeader.includes('last') && normalizedHeader.includes('name')) {
          propertyType = "lastName"
        } else if (normalizedHeader.includes('admission')) {
          propertyType = "admissionNumber"
        } else if (normalizedHeader.includes('email')) {
          propertyType = "email"
        } else if (normalizedHeader.includes('phone') || normalizedHeader.includes('mobile')) {
          propertyType = "phone"
        } else if (normalizedHeader.includes('gender')) {
          propertyType = "gender"
        } else if (normalizedHeader.includes('birth') || normalizedHeader.includes('dob')) {
          propertyType = "dateOfBirth"
        } else if (normalizedHeader.includes('class')) {
          propertyType = "className"
        } else if (normalizedHeader.includes('section')) {
          propertyType = "sectionName"
        } else if (normalizedHeader.includes('roll')) {
          propertyType = "rollNumber"
        } else if (normalizedHeader.includes('father')) {
          propertyType = "fatherName"
        } else if (normalizedHeader.includes('mother')) {
          propertyType = "motherName"
        }
        
        initialMappings[header] = {
          csvColumn: header,
          propertyType,
          isRequired: propertyType === "firstName" || propertyType === "lastName"
        }
      })

      setColumnMappings(initialMappings)
      setStep('mapping')
      
    } catch (error) {
      console.error('Error parsing file:', error)
      toast({
        title: "Error parsing file",
        description: error instanceof Error ? error.message : "Failed to parse the selected file.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }, [toast])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0]!)
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0]!)
    }
  }, [handleFileSelect])

  // Update column mapping
  const updateColumnMapping = (csvColumn: string, propertyType: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [csvColumn]: {
        ...prev[csvColumn]!,
        propertyType,
        isRequired: propertyType === "firstName" || propertyType === "lastName"
      }
    }))
  }

  // Validate mappings
  const validateMappings = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    const usedPropertyTypes = new Set<string>()

    // Check for required fields
    const hasFirstName = Object.values(columnMappings).some(m => m.propertyType === "firstName")
    const hasLastName = Object.values(columnMappings).some(m => m.propertyType === "lastName")

    if (!hasFirstName) errors.push("First Name is required")
    if (!hasLastName) errors.push("Last Name is required")

    // Check for duplicate mappings
    Object.values(columnMappings).forEach(mapping => {
      if (mapping.propertyType !== "skip") {
        if (usedPropertyTypes.has(mapping.propertyType)) {
          errors.push(`${PROPERTY_TYPES.find(p => p.value === mapping.propertyType)?.label} is mapped to multiple columns`)
        }
        usedPropertyTypes.add(mapping.propertyType)
      }
    })

    return { isValid: errors.length === 0, errors }
  }

  // Handle import
  const handleImport = async () => {
    if (!parsedData) return

    const validation = validateMappings()
    if (!validation.isValid) {
      toast({
        title: "Mapping validation failed",
        description: validation.errors.join(", "),
        variant: "destructive"
      })
      return
    }

    setStep('importing')
    setImportProgress(0)

    try {
      // Transform data based on mappings
      const transformedData = parsedData.rows.map((row, rowIndex) => {
        const studentData: Record<string, any> = {}
        
        parsedData.headers.forEach((header, columnIndex) => {
          const mapping = columnMappings[header]
          if (mapping && mapping.propertyType !== "skip") {
            const cellValue = row[columnIndex]
            if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
              studentData[mapping.propertyType] = String(cellValue).trim()
            }
          }
        })

        // Update progress
        setImportProgress(Math.round(((rowIndex + 1) / parsedData.rows.length) * 50))
        
        return studentData
      }).filter(data => Object.keys(data).length > 0)

      // Call the import function
      await onImport(transformedData)
      
      setImportProgress(100)
      
      toast({
        title: "Import successful",
        description: `Successfully imported ${transformedData.length} student(s).`,
        variant: "default"
      })

      // Close modal after a brief delay
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import students.",
        variant: "destructive"
      })
      setStep('mapping')
    }
  }

  // Get preview data for display
  const getPreviewData = () => {
    if (!parsedData) return { headers: [], rows: [] }
    
    const headers = useFirstRowAsHeaders ? parsedData.headers : parsedData.headers.map((_, i) => `Column ${i + 1}`)
    const rows = parsedData.rows.slice(0, 5) // Show first 5 rows
    
    return { headers, rows }
  }

  const previewData = getPreviewData()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Upload Step */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Import CSV into Students
              </DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file to import student data into your system
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col gap-6">
              {/* Template Download Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Download Template</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadStudentImportTemplate()}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadStudentImportExcelTemplate(availableClasses)}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel Template
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Template Information:</p>
                      <ul className="space-y-1">
                        <li>• <strong>Excel Template:</strong> Includes class reference sheet with exact IDs</li>
                        <li>• <strong>CSV Template:</strong> Simple format with all available columns</li>
                        <li>• Required fields: First Name*, Last Name*, Gender*, Date of Birth*</li>
                        <li>• Date format: DD/MM/YYYY (e.g., 15/05/2010)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div className="space-y-4">
                <Label>Upload CSV/Excel</Label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    isDragOver 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-muted">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">
                        {isDragOver ? "Drop your file here" : "Choose a file or drag it here"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Supports CSV, XLS, and XLSX files
                      </p>
                    </div>
                    <div className="relative">
                      <Button variant="outline" disabled={isProcessing}>
                        {isProcessing ? "Processing..." : "Choose file"}
                      </Button>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileInputChange}
                        disabled={isProcessing}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Preview */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Preview
                </h3>
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  {/* Table Header */}
                  <div className="grid grid-cols-6 gap-px bg-background">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="p-3 bg-muted/50">
                        <div className="h-4 bg-muted-foreground/20 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                  {/* Table Rows */}
                  {Array.from({ length: 4 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-6 gap-px bg-background">
                      {Array.from({ length: 6 }).map((_, colIndex) => (
                        <div key={colIndex} className="p-3 bg-background">
                          <div className="h-4 bg-muted-foreground/10 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Supported formats: CSV, Excel (.xlsx, .xls)</span>
                </div>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && parsedData && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('upload')}
                  className="p-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Setup CSV columns</DialogTitle>
                  <DialogDescription>
                    Choose the property type for each column in your CSV file
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Options */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="use-headers"
                  checked={useFirstRowAsHeaders}
                  onCheckedChange={(checked) => setUseFirstRowAsHeaders(!!checked)}
                />
                <Label htmlFor="use-headers" className="text-sm font-medium">
                  Use first row as headers
                </Label>
              </div>

              {/* Mapping Interface */}
              <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
                {/* Left Side - Column Mapping */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-medium">CSV File Columns</h3>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {parsedData.headers.map((header, index) => {
                      const mapping = columnMappings[header]
                      const propertyType = PROPERTY_TYPES.find(p => p.value === mapping?.propertyType)
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm truncate">
                              {header || `column_${index + 1}`}
                            </div>
                          </div>
                          <div className="w-4 text-muted-foreground">→</div>
                          <div className="flex-1">
                            <Select
                              value={mapping?.propertyType || "skip"}
                              onValueChange={(value) => updateColumnMapping(header, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROPERTY_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                      {type.value === "skip" && <X className="h-3 w-3" />}
                                      {"required" in type && type.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                                      <span>{type.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right Side - Data Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{parsedData.fileName}</h3>
                    <Badge variant="outline">
                      {parsedData.rows.length} rows
                    </Badge>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            {previewData.headers.slice(0, 4).map((header, index) => (
                              <th key={index} className="p-2 text-left font-medium">
                                <div className="truncate max-w-24">{header}</div>
                              </th>
                            ))}
                            {previewData.headers.length > 4 && (
                              <th className="p-2 text-left text-muted-foreground">
                                +{previewData.headers.length - 4} more
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b hover:bg-muted/25">
                              {row.slice(0, 4).map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-2">
                                  <div className="truncate max-w-24">
                                    {String(cell || '').trim() || '—'}
                                  </div>
                                </td>
                              ))}
                              {row.length > 4 && (
                                <td className="p-2 text-muted-foreground">
                                  ...
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="w-full flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {parsedData.rows.length} students ready to import
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport}>
                    Import Students
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Importing Students
              </DialogTitle>
              <DialogDescription>
                Please wait while we import your student data...
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Processing student data...</h3>
                  <p className="text-sm text-muted-foreground">
                    {importProgress}% complete
                  </p>
                </div>
              </div>
              
              <div className="w-full max-w-md">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="w-full flex justify-center">
                <p className="text-sm text-muted-foreground">
                  This may take a few moments...
                </p>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
} 