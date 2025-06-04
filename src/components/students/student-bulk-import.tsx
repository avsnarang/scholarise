import { useState, useRef } from "react";
import { Upload, X, AlertCircle, Check, Download, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { downloadStudentImportTemplate, downloadStudentImportExcelTemplate, parseExcelFile } from "@/utils/export";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentBulkImportProps {
  onSuccess: () => void;
}

export function StudentBulkImport({ onSuccess }: StudentBulkImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'excel'>('excel');
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { branchId } = useGlobalBranchFilter();
  const { currentSessionId } = useAcademicSessionContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [extractedHeaders, setExtractedHeaders] = useState<string[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);

  // Get available classes for reference
  const { data: availableClasses } = api.class.getClassIdsForImport.useQuery(
    { 
      branchId: branchId!, 
      sessionId: currentSessionId! 
    },
    { 
      enabled: !!branchId && !!currentSessionId 
    }
  );

  const optionalNullableEmailFields = [
    "email",
    "personalEmail",
    "fatherEmail",
    "motherEmail",
    "guardianEmail",
  ];

  // Mutation for bulk importing students
  const bulkImportMutation = api.student.bulkImport.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Students imported successfully",
        description: `${data.count} students imported with ${data.errors} errors`,
        variant: "success",
      });
      console.log("Import messages:", data.importMessages);
      setIsOpen(false);
      setFile(null);
      setPreviewData([]);
      setValidationErrors([]);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to import students",
        description: error.message || "An error occurred while importing students",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationErrors([]);
    setPreviewData([]); // Clear previous preview data
    setExtractedHeaders([]); // Clear previous headers
    setCurrentRowIndex(0); // Reset row index

    // Determine file type
    const isExcelFile = selectedFile.name.toLowerCase().endsWith('.xlsx') || selectedFile.name.toLowerCase().endsWith('.xls');
    const isCsvFile = selectedFile.name.toLowerCase().endsWith('.csv');
    
    if (!isExcelFile && !isCsvFile) {
      setValidationErrors(["Please select a CSV or Excel file"]);
      return;
    }

    setFileType(isExcelFile ? 'excel' : 'csv');

    try {
      let parsedData: any[] = [];

      if (isExcelFile) {
        // Parse Excel file
        parsedData = await parseExcelFile(selectedFile);
      } else {
        // Parse CSV file (existing logic)
        parsedData = await parseCsvFile(selectedFile);
      }

      if (parsedData.length === 0) {
        setValidationErrors(["No valid data found in the file"]);
        setPreviewData([]);
        return;
      }

      // Extract headers from the first row
      const headers = Object.keys(parsedData[0] || {});
      setExtractedHeaders(headers);

      // Validate required headers
      const requiredHeaders = ["firstName", "lastName", "gender", "dateOfBirth"];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

      if (missingHeaders.length > 0) {
        setValidationErrors([`Missing required headers: ${missingHeaders.join(", ")}`]);
        setPreviewData([]);
        return;
      }

      // Validate the data
      const errors = validateStudentData(parsedData);
      setValidationErrors(errors);
      setPreviewData(parsedData);

    } catch (error) {
      setValidationErrors([`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setPreviewData([]);
      setExtractedHeaders([]);
    }
  };

  const parseCsvFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvData = event.target?.result as string;

          // Parse CSV with proper handling of quoted values and commas within fields
          const parseCSV = (text: string): string[][] => {
            const result: string[][] = [];
            let row: string[] = [];
            let inQuotes = false;
            let currentValue = '';

            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              const nextChar = text[i + 1];

              if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  // Handle escaped quotes (double quotes)
                  currentValue += '"';
                  i++; // Skip the next quote
                } else {
                  // Toggle quote state
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                // End of field
                row.push(currentValue.trim());
                currentValue = '';
              } else if ((char === '\r' || char === '\n') && !inQuotes) {
                // End of line
                if (currentValue !== '' || row.length > 0) {
                  row.push(currentValue.trim());
                  result.push(row);
                  row = [];
                  currentValue = '';
                }

                // Skip the \n in \r\n
                if (char === '\r' && nextChar === '\n') {
                  i++;
                }
              } else {
                currentValue += char;
              }
            }

            // Handle the last row
            if (currentValue !== '' || row.length > 0) {
              row.push(currentValue.trim());
              result.push(row);
            }

            return result;
          };

          const parsedRows = parseCSV(csvData);

          if (parsedRows.length === 0) {
            reject(new Error("CSV file is empty"));
            return;
          }

          // Extract headers (first row) and normalize them
          const rawHeaders = parsedRows[0];

          if (!rawHeaders || rawHeaders.length === 0) {
            reject(new Error("CSV file has no headers or first row is empty"));
            return;
          }

          // Normalize headers: trim whitespace and remove potential BOM from the first header
          const headers = rawHeaders.map((header, index) => {
            let cleanedHeader = header.trim();
            // Remove BOM from the first header if present (UTF-8 BOM is EF BB BF)
            if (index === 0 && cleanedHeader.charCodeAt(0) === 0xFEFF) {
              cleanedHeader = cleanedHeader.substring(1);
            }
            // Remove trailing asterisk if present (from template labels like "firstName*")
            if (cleanedHeader.endsWith('*')) {
              cleanedHeader = cleanedHeader.slice(0, -1);
            }
            return cleanedHeader;
          });

          // Parse data rows
          const parsedData = [];

          for (let i = 1; i < parsedRows.length; i++) {
            const values = parsedRows[i];

            if (!values || values.length === 0 || (values.length === 1 && !values[0])) {
              continue; // Skip empty rows
            }

            if (values.length !== headers.length) {
              continue; // Skip rows with column count mismatch
            }

            const rowData: Record<string, any> = {}; // Allow null values
            headers.forEach((header, index) => {
              let value: string | null = values[index] || '';
              if (optionalNullableEmailFields.includes(header) && value === '') {
                value = null;
              }
              rowData[header] = value;
            });

            // Only add non-empty rows
            if (Object.values(rowData).some(value => value && String(value).trim())) {
              parsedData.push(rowData);
            }
          }

          resolve(parsedData);
        } catch (error) {
          reject(new Error("Failed to parse CSV file. Please check the format."));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read the file'));
      reader.readAsText(file);
    });
  };

  const validateStudentData = (data: any[]): string[] => {
    const errors: string[] = [];

    data.forEach((student, index) => {
      const rowNum = index + 1;

      // Basic validation for required fields
      if (!student.firstName) {
        errors.push(`Row ${rowNum}: First name is required`);
      }
      if (!student.lastName) {
        errors.push(`Row ${rowNum}: Last name is required`);
      }
      if (!student.gender || !["Male", "Female", "Other"].includes(student.gender)) {
        errors.push(`Row ${rowNum}: Gender must be Male, Female, or Other`);
      }
      if (!student.dateOfBirth) {
        errors.push(`Row ${rowNum}: Date of birth is required`);
      } else {
        // Validate date format
        try {
          const parts = student.dateOfBirth.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
              errors.push(`Row ${rowNum}: Invalid date format for date of birth. Use DD/MM/YYYY format`);
            }
          } else {
            errors.push(`Row ${rowNum}: Invalid date format for date of birth. Use DD/MM/YYYY format`);
          }
        } catch (error) {
          errors.push(`Row ${rowNum}: Invalid date format for date of birth. Use DD/MM/YYYY format`);
        }
      }

      // Validate email format if provided
      if (student.email && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(student.email))) {
        errors.push(`Row ${rowNum}: Invalid email format`);
      }

      // Validate personal email format if provided
      if (student.personalEmail && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(student.personalEmail))) {
        errors.push(`Row ${rowNum}: Invalid personal email format`);
      }

      // Validate sectionId if provided (Excel format)
      if (student.sectionId && availableClasses) {
        const sectionExists = availableClasses.find(cls => cls.sectionId === student.sectionId);
        if (!sectionExists) {
          errors.push(`Row ${rowNum}: Invalid sectionId '${student.sectionId}'. Please use a valid Section ID from the Classes sheet.`);
        }
      }

      // Additional validations...
      const parentEmailFields = [
        { field: 'fatherEmail', label: 'father email' },
        { field: 'motherEmail', label: 'mother email' },
        { field: 'guardianEmail', label: 'guardian email' }
      ];

      parentEmailFields.forEach(({ field, label }) => {
        if (student[field] && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(student[field]))) {
          errors.push(`Row ${rowNum}: Invalid email format for ${label}`);
        }
      });

      // Validate Aadhar number format if provided (12 digits)
      const aadharFields = [
        { field: 'aadharNumber', label: 'student Aadhar number' },
        { field: 'fatherAadharNumber', label: 'father Aadhar number' },
        { field: 'motherAadharNumber', label: 'mother Aadhar number' },
        { field: 'guardianAadharNumber', label: 'guardian Aadhar number' }
      ];

      aadharFields.forEach(({ field, label }) => {
        if (student[field] && !/^\d{12}$/.test(student[field])) {
          errors.push(`Row ${rowNum}: Invalid ${label} format. Aadhar number must be exactly 12 digits`);
        }
      });
    });

    return errors;
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Validation errors",
        description: "Please fix all validation errors before importing",
        variant: "destructive",
      });
      return;
    }

    if (!branchId || !currentSessionId) {
      toast({
        title: "Missing required data",
        description: "Branch and session information is required",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await bulkImportMutation.mutateAsync({
        students: previewData,
        branchId: branchId,
        sessionId: currentSessionId,
      });
    } catch (error) {
      console.error("Error importing students:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    setExtractedHeaders([]);
    setCurrentStep(1); // Reset to first step
    setCurrentRowIndex(0);
  };

  const openDialog = () => {
    resetFileInput(); // Ensure dialog resets when opened
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    // Consider resetting state here if dialog is dismissed without completing
    // resetFileInput(); // or selectively reset parts
  };

  const handleNextStep = () => {
    if (file && previewData.length > 0 && validationErrors.length === 0) {
      setCurrentRowIndex(0); // Ensure we start review from the first row
      setCurrentStep(2);
    } else {
      // This case should ideally be prevented by disabling the button
      toast({
        title: "Cannot proceed",
        description: "Please select a valid file and resolve all validation errors.",
        variant: "destructive",
      });
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const handleDataChange = (rowIndex: number, headerKey: string, value: string) => {
    const updatedData = [...previewData];
    if (updatedData[rowIndex]) {
      let processedValue: string | null = value;
      if (optionalNullableEmailFields.includes(headerKey) && value === '') {
        processedValue = null;
      }
      updatedData[rowIndex] = { ...updatedData[rowIndex], [headerKey]: processedValue };
      setPreviewData(updatedData);
      
      // Re-validate the specific field that changed
      const currentErrors = [...validationErrors];
      const errorIndex = currentErrors.findIndex(err => err.startsWith(`Row ${rowIndex + 1}:`) && err.toLowerCase().includes(headerKey.toLowerCase()));
      if (errorIndex > -1) {
        currentErrors.splice(errorIndex, 1);
      }

      // Perform field-specific validation
      if (optionalNullableEmailFields.includes(headerKey) && value !== null && value !== '' && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(value))) {
        currentErrors.push(`Row ${rowIndex + 1}: Invalid email format for ${headerKey}`);
      } else if (headerKey === 'sectionId' && value && availableClasses) {
        const sectionExists = availableClasses.find(cls => cls.sectionId === value);
        if (!sectionExists) {
          currentErrors.push(`Row ${rowIndex + 1}: Invalid sectionId '${value}'. Please use a valid Section ID from the Classes sheet.`);
        }
      }

      setValidationErrors(currentErrors);
    }
  };

  const goToPreviousRow = () => {
    setCurrentRowIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextRow = () => {
    setCurrentRowIndex((prev) => Math.min(previewData.length - 1, prev + 1));
  };

  const handleDownloadTemplate = (type: 'csv' | 'excel') => {
    if (type === 'excel') {
      downloadStudentImportExcelTemplate(availableClasses);
    } else {
      downloadStudentImportTemplate();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/5 transition-all duration-200"
        onClick={openDialog}
      >
        <Upload className="h-4 w-4" />
        <span className="font-medium">Import Students</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={closeDialog}>
        <DialogContent className={currentStep === 1 ? "sm:max-w-[700px]" : "sm:max-w-[700px] md:max-w-[800px]"}>
          <DialogHeader>
            <DialogTitle>
              {currentStep === 1 ? "Import Students (Step 1 of 2)" : "Review & Import (Step 2 of 2)"}
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1 
                ? "Upload a CSV or Excel file to bulk import students. Excel files provide better class selection with dropdowns."
                : `Reviewing row ${currentRowIndex + 1} of ${previewData.length}. Modify data if needed before importing.`
              }
            </DialogDescription>
          </DialogHeader>

          {currentStep === 1 && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Select File (CSV or Excel)
                    </Button>
                    {file && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {fileType === 'excel' ? (
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {fileType.toUpperCase()}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={resetFileInput} 
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Tabs defaultValue="excel" className="w-auto">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="excel" className="text-xs">Excel Template</TabsTrigger>
                      <TabsTrigger value="csv" className="text-xs">CSV Template</TabsTrigger>
                    </TabsList>
                    <TabsContent value="excel" className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadTemplate('excel')}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Download Excel Template
                      </Button>
                    </TabsContent>
                    <TabsContent value="csv" className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadTemplate('csv')}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                        Download CSV Template
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="rounded-md bg-green-50 p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        🎉 New: Excel Import with Class Reference!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <ul className="list-disc space-y-1 pl-5">
                          <li><strong>Excel Template:</strong> Includes a separate "Classes" sheet with all available class IDs and names</li>
                          <li><strong>Easy Class Selection:</strong> Copy exact Class IDs from the Classes sheet to the sectionId column</li>
                          <li><strong>No Fuzzy Matching:</strong> Eliminates class assignment issues - just copy & paste the Class ID!</li>
                          <li><strong>Visual Reference:</strong> See all available classes and their IDs in one place</li>
                          <li><strong>Step-by-step:</strong> 1) Download template → 2) Check "Classes" sheet → 3) Copy Class IDs to "StudentData" sheet</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-blue-50 p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        File Format Requirements
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc space-y-1 pl-5">
                          <li>Required fields (marked with *): firstName, lastName, gender, dateOfBirth</li>
                          <li>Gender must be one of: Male, Female, Other</li>
                          <li>All date fields must use format: DD/MM/YYYY (e.g., 15/05/2010)</li>
                          <li>Aadhar numbers must be exactly 12 digits (if provided)</li>
                          <li>First row must contain column headers</li>
                          <li><strong>Excel:</strong> Use sectionId column with exact IDs from Classes sheet (copy & paste)</li>
                          <li><strong>CSV:</strong> Use classNameInput (like "1-A") or classId_override for class assignment</li>
                          <li>Delete or clear the instruction row in Excel before importing</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Validation Errors
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc space-y-1 pl-5">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && previewData.length > 0 && extractedHeaders.length > 0 && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <Button onClick={goToPreviousRow} disabled={currentRowIndex === 0} variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  Row {currentRowIndex + 1} of {previewData.length} ({fileType.toUpperCase()})
                </span>
                <Button onClick={goToNextRow} disabled={currentRowIndex >= previewData.length - 1} variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                {extractedHeaders.map((header) => (
                  <div key={header} className="grid grid-cols-3 items-center gap-3">
                    <label htmlFor={`input-${header}`} className="text-sm font-medium text-gray-700 col-span-1 truncate" title={header}>
                      {header}
                      {header === 'sectionId' && fileType === 'excel' && (
                        <span className="text-xs text-green-600 block">Copy from Classes sheet</span>
                      )}
                    </label>
                    {header === 'sectionId' && fileType === 'excel' && availableClasses ? (
                      <div className="col-span-2 space-y-2">
                        <input
                          id={`input-${header}`}
                          type="text"
                          value={previewData[currentRowIndex]?.[header] ?? ''}
                          onChange={(e) => handleDataChange(currentRowIndex, header, e.target.value)}
                          placeholder="Paste Class ID from Classes sheet"
                          className="w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            📋 Show available Class IDs
                          </summary>
                          <div className="mt-1 max-h-24 overflow-y-auto bg-gray-50 p-2 rounded border">
                            {availableClasses.map((cls) => (
                              <div key={cls.id} className="flex justify-between py-1 text-xs">
                                <span className="truncate">{cls.displayName}</span>
                                <code className="bg-blue-100 px-1 rounded text-blue-800 ml-2">{cls.sectionId}</code>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    ) : (
                      <input
                        id={`input-${header}`}
                        type="text"
                        value={previewData[currentRowIndex]?.[header] ?? ''}
                        onChange={(e) => handleDataChange(currentRowIndex, header, e.target.value)}
                        className="col-span-2 rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {currentStep === 1 && (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={!file || previewData.length === 0 || validationErrors.length > 0 || isUploading}
                  className="bg-[#00501B] hover:bg-[#00501B]/90"
                >
                  Next
                </Button>
              </>
            )}
            {currentStep === 2 && (
              <>
                <Button variant="outline" onClick={handlePreviousStep}>
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isUploading || previewData.length === 0}
                  className="bg-[#00501B] hover:bg-[#00501B]/90"
                >
                  {isUploading ? "Importing..." : "Import Students"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
