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
import { useBranchContext } from "@/hooks/useBranchContext";

interface EmployeeBulkImportProps {
  onSuccess: () => void;
}

export function EmployeeBulkImport({ onSuccess }: EmployeeBulkImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'excel'>('csv');
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [extractedHeaders, setExtractedHeaders] = useState<string[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);

  const optionalNullableEmailFields = [
    "email",
    "personalEmail",
    "officialEmail",
  ];

  // Mutation for bulk importing employees
  const bulkImportMutation = api.employee.bulkImport.useMutation({
    onSuccess: (data: { count: number; importMessages: string[] }) => {
      toast({
        title: "Import successful",
        description: `Successfully processed ${data.count} employees. Check console for details.`,
        variant: "success",
      });
      console.log("Bulk Import Server Messages:", data.importMessages);
      setIsOpen(false);
      setFile(null);
      setPreviewData([]);
      setValidationErrors([]);
      onSuccess();
    },
    onError: (error: { message?: string }) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import employees",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationErrors([]);
    setPreviewData([]);
    setExtractedHeaders([]);
    setCurrentRowIndex(0);

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
        // For now, we'll focus on CSV support. Excel support can be added later
        setValidationErrors(["Excel files are not yet supported. Please use CSV format."]);
        return;
      } else {
        // Parse CSV file
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
      const requiredHeaders = ["firstName", "lastName", "designation"];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

      if (missingHeaders.length > 0) {
        setValidationErrors([`Missing required headers: ${missingHeaders.join(", ")}`]);
        setPreviewData([]);
        return;
      }

      // Validate the data
      const errors = validateEmployeeData(parsedData);
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
                  currentValue += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
              } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (currentValue !== '' || row.length > 0) {
                  row.push(currentValue.trim());
                  result.push(row);
                  row = [];
                  currentValue = '';
                }

                if (char === '\r' && nextChar === '\n') {
                  i++;
                }
              } else {
                currentValue += char;
              }
            }

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

          // Normalize headers
          const headers = rawHeaders.map((header, index) => {
            let cleanedHeader = header.trim();
            if (index === 0 && cleanedHeader.charCodeAt(0) === 0xFEFF) {
              cleanedHeader = cleanedHeader.substring(1);
            }
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
              continue;
            }

            if (values.length !== headers.length) {
              continue;
            }

            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              let value: string | null = values[index] || '';
              if (optionalNullableEmailFields.includes(header) && value === '') {
                value = null;
              }
              rowData[header] = value;
            });

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

  const validateEmployeeData = (data: any[]): string[] => {
    const errors: string[] = [];

    data.forEach((employee, index) => {
      const rowNum = index + 1;

      // Basic validation for required fields
      if (!employee.firstName) {
        errors.push(`Row ${rowNum}: First name is required`);
      }
      if (!employee.lastName) {
        errors.push(`Row ${rowNum}: Last name is required`);
      }
      if (!employee.designation) {
        errors.push(`Row ${rowNum}: Designation is required`);
      }
      if (employee.gender && !["Male", "Female", "Other"].includes(employee.gender)) {
        errors.push(`Row ${rowNum}: Gender must be Male, Female, or Other`);
      }

      // Date validation
      if (employee.dateOfBirth) {
        try {
          const parts = employee.dateOfBirth.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
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

      // Email validation
      const emailFields = [
        { field: 'email', label: 'email' },
        { field: 'personalEmail', label: 'personal email' },
        { field: 'officialEmail', label: 'official email' }
      ];

      emailFields.forEach(({ field, label }) => {
        if (employee[field] && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(employee[field]))) {
          errors.push(`Row ${rowNum}: Invalid email format for ${label}`);
        }
      });

      // Aadhar validation
      if (employee.aadharNumber && !/^\d{12}$/.test(employee.aadharNumber)) {
        errors.push(`Row ${rowNum}: Invalid Aadhar number format. Must be exactly 12 digits`);
      }
    });

    return errors;
  };

  const handleImport = async () => {
    if (!file || validationErrors.length > 0 || previewData.length === 0) return;

    if (!currentBranchId) {
      toast({
        title: "Branch not selected",
        description: "Please select a branch before importing.",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    setIsUploading(true);
    try {
      await bulkImportMutation.mutateAsync({
        employees: previewData,
        branchId: currentBranchId,
      });
    } catch (error) {
      console.error("Error importing employees:", error);
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
    setCurrentStep(1);
    setCurrentRowIndex(0);
  };

  const openDialog = () => {
    resetFileInput();
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  const handleNextStep = () => {
    if (file && previewData.length > 0 && validationErrors.length === 0) {
      setCurrentRowIndex(0);
      setCurrentStep(2);
    } else {
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

  const downloadTemplate = () => {
    const headers = [
      'firstName*',
      'lastName*',
      'middleName',
      'dateOfBirth',
      'gender',
      'bloodGroup',
      'maritalStatus',
      'nationality',
      'religion',
      'panNumber',
      'aadharNumber',
      'address',
      'city',
      'state',
      'country',
      'pincode',
      'permanentAddress',
      'permanentCity',
      'permanentState',
      'permanentCountry',
      'permanentPincode',
      'phone',
      'alternatePhone',
      'personalEmail',
      'emergencyContactName',
      'emergencyContactPhone',
      'emergencyContactRelation',
      'qualification',
      'specialization',
      'professionalQualifications',
      'specialCertifications',
      'yearOfCompletion',
      'institution',
      'experience',
      'bio',
      'employeeCode',
      'designation*',
      'department',
      'joinDate',
      'reportingManager',
      'employeeType',
      'previousExperience',
      'previousEmployer',
      'confirmationDate',
      'isActive',
      'salaryStructure',
      'pfNumber',
      'esiNumber',
      'uanNumber',
      'bankName',
      'accountNumber',
      'ifscCode',
      'officialEmail',
      'deviceIssued',
      'accessCardId',
      'softwareLicenses',
      'assetReturnStatus',
      'createUser',
      'email',
      'password',
      'roleId'
    ];

    const csvContent = [
      headers.join(','),
      '// Sample data row - delete this line before importing',
      'Jane,Smith,A,15/05/1988,Female,A+,Single,Indian,Christian,BCDEF5678G,987654321098,456 Oak St,City,State,Country,54321,456 Oak St,City,State,Country,54321,9876543210,9876543211,jane.smith@email.com,John Smith,9876543212,Brother,B.Com,Accounting,MBA,Finance Professional,2012,XYZ University,4 years,Experienced employee,E001,Accountant,Finance,01/01/2021,Manager Name,Full-Time,2 years,Previous Company,01/07/2021,true,Standard,PF002,ESI002,UAN002,XYZ Bank,0987654321,EFGH0123456,jane.smith@company.com,Desktop,AC002,Tally ERP,Allocated,true,jane.smith@company.com,password123,role-id'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'employee_import_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button
        variant="ghost"
        className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/5 transition-all duration-200"
        onClick={openDialog}
      >
        <Upload className="h-4 w-4" />
        <span className="font-medium">Import Employees</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={closeDialog}>
        <DialogContent className={currentStep === 1 ? "sm:max-w-[700px]" : "sm:max-w-[700px] md:max-w-[800px]"}>
          <DialogHeader>
            <DialogTitle>
              {currentStep === 1 ? "Import Employees (Step 1 of 2)" : "Review & Import (Step 2 of 2)"}
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1 
                ? "Upload a CSV file to bulk import employees."
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
                      accept=".csv"
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
                      Select CSV File
                    </Button>
                    {file && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFileInput}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>

                {validationErrors.length > 0 && (
                  <div className="rounded-md bg-red-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <X className="h-5 w-5 text-red-400" />
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

                {previewData.length > 0 && validationErrors.length === 0 && (
                  <div className="rounded-md bg-green-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          File validated successfully
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Found {previewData.length} employees ready for import.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                          <li>Required fields (marked with *): firstName, lastName, designation</li>
                          <li>Gender must be one of: Male, Female, Other (if provided)</li>
                          <li>All date fields must use format: DD/MM/YYYY (e.g., 15/05/1988)</li>
                          <li>Aadhar numbers must be exactly 12 digits (if provided)</li>
                          <li>First row must contain column headers</li>
                          <li>Download the template to see all available fields</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && previewData.length > 0 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Reviewing row {currentRowIndex + 1} of {previewData.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousRow}
                    disabled={currentRowIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextRow}
                    disabled={currentRowIndex === previewData.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                {extractedHeaders.map((header) => (
                  <div key={header} className="grid grid-cols-3 items-center gap-3">
                    <label htmlFor={`input-${header}`} className="text-sm font-medium text-gray-700 col-span-1 truncate" title={header}>
                      {header}
                    </label>
                    <input
                      id={`input-${header}`}
                      type="text"
                      value={previewData[currentRowIndex]?.[header] ?? ''}
                      onChange={(e) => handleDataChange(currentRowIndex, header, e.target.value)}
                      className="col-span-2 w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
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
                  {isUploading ? "Importing..." : "Import Employees"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 