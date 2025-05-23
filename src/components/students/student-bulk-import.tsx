import { useState, useRef } from "react";
import { Upload, X, AlertCircle, Check, Download } from "lucide-react";
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
import { downloadStudentImportTemplate } from "@/utils/export";

interface StudentBulkImportProps {
  onSuccess: () => void;
}

export function StudentBulkImport({ onSuccess }: StudentBulkImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { branchId } = useGlobalBranchFilter();

  // Mutation for bulk importing students
  const bulkImportMutation = api.student.bulkImport.useMutation({
    onSuccess: () => {
      toast({
        title: "Import successful",
        description: `Successfully imported ${previewData.length} students`,
        variant: "success",
      });
      setIsOpen(false);
      setFile(null);
      setPreviewData([]);
      setValidationErrors([]);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import students",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationErrors([]);

    // Parse CSV file
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
          setValidationErrors(["CSV file is empty"]);
          setPreviewData([]);
          return;
        }

        // Extract headers (first row)
        const headers = parsedRows[0];

        if (!headers || headers.length === 0) {
          setValidationErrors(["CSV file has no headers"]);
          setPreviewData([]);
          return;
        }

        // Required headers
        const requiredHeaders = ["firstName", "lastName", "gender", "dateOfBirth"];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

        if (missingHeaders.length > 0) {
          setValidationErrors([`Missing required headers: ${missingHeaders.join(", ")}`]);
          setPreviewData([]);
          return;
        }

        // Parse data rows
        const parsedData = [];
        const errors = [];

        for (let i = 1; i < parsedRows.length; i++) {
          const values = parsedRows[i];

          if (!values || values.length === 0 || (values.length === 1 && !values[0])) {
            continue; // Skip empty rows
          }

          if (values.length !== headers.length) {
            errors.push(`Row ${i}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
            continue;
          }

          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Basic validation for required fields
          if (!rowData.firstName) {
            errors.push(`Row ${i}: First name is required`);
          }
          if (!rowData.lastName) {
            errors.push(`Row ${i}: Last name is required`);
          }
          if (!rowData.gender || !["Male", "Female", "Other"].includes(rowData.gender)) {
            errors.push(`Row ${i}: Gender must be Male, Female, or Other`);
          }
          if (!rowData.dateOfBirth) {
            errors.push(`Row ${i}: Date of birth is required`);
          } else {
            // Validate date format
            try {
              const date = new Date(rowData.dateOfBirth);
              if (isNaN(date.getTime())) {
                errors.push(`Row ${i}: Invalid date format for date of birth. Use YYYY-MM-DD format`);
              }
            } catch (error) {
              errors.push(`Row ${i}: Invalid date format for date of birth. Use YYYY-MM-DD format`);
            }
          }

          // Validate email format if provided
          if (rowData.email && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(rowData.email))) {
            errors.push(`Row ${i}: Invalid email format`);
          }

          // Validate personal email format if provided
          if (rowData.personalEmail && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(rowData.personalEmail))) {
            errors.push(`Row ${i}: Invalid personal email format`);
          }

          // Validate date of admission format if provided
          if (rowData.dateOfAdmission) {
            try {
              const date = new Date(rowData.dateOfAdmission);
              if (isNaN(date.getTime())) {
                errors.push(`Row ${i}: Invalid date format for date of admission. Use YYYY-MM-DD format`);
              }
            } catch (error) {
              errors.push(`Row ${i}: Invalid date format for date of admission. Use YYYY-MM-DD format`);
            }
          }

          // Validate admission number format if provided
          if (rowData.admissionNumber) {
            if (!/^\d+$/.test(rowData.admissionNumber)) {
              errors.push(`Row ${i}: Admission number should contain only digits`);
            }
          }

          // Validate branch code if provided
          if (rowData.branchCode) {
            const validBranchCodes = ['PS', 'JUN', 'MAJ'];
            if (!validBranchCodes.includes(rowData.branchCode)) {
              errors.push(`Row ${i}: Branch code should be one of: PS, JUN, MAJ`);
            }
          }

          // Validate parent date fields
          const parentDateFields = [
            { field: 'fatherDob', label: 'father date of birth' },
            { field: 'motherDob', label: 'mother date of birth' },
            { field: 'guardianDob', label: 'guardian date of birth' },
            { field: 'parentAnniversary', label: 'parent anniversary' }
          ];

          parentDateFields.forEach(({ field, label }) => {
            if (rowData[field]) {
              try {
                const date = new Date(rowData[field]);
                if (isNaN(date.getTime())) {
                  errors.push(`Row ${i}: Invalid date format for ${label}. Use YYYY-MM-DD format`);
                }
              } catch (error) {
                errors.push(`Row ${i}: Invalid date format for ${label}. Use YYYY-MM-DD format`);
              }
            }
          });

          // Validate parent email fields
          const parentEmailFields = [
            { field: 'fatherEmail', label: 'father email' },
            { field: 'motherEmail', label: 'mother email' },
            { field: 'guardianEmail', label: 'guardian email' }
          ];

          parentEmailFields.forEach(({ field, label }) => {
            if (rowData[field] && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(rowData[field]))) {
              errors.push(`Row ${i}: Invalid email format for ${label}`);
            }
          });

          // Validate sibling relationship type if sibling admission number is provided
          if (rowData.siblingAdmissionNumber && !rowData.siblingRelationshipType) {
            errors.push(`Row ${i}: Sibling relationship type is required when sibling admission number is provided`);
          }

          if (rowData.siblingRelationshipType && !['brother', 'sister', 'twin', 'step-sibling', 'other'].includes(rowData.siblingRelationshipType.toLowerCase())) {
            errors.push(`Row ${i}: Sibling relationship type must be one of: brother, sister, twin, step-sibling, other`);
          }

          parsedData.push(rowData);
        }

        setPreviewData(parsedData);
        setValidationErrors(errors);
      } catch (error) {
        setValidationErrors(["Failed to parse CSV file. Please check the format."]);
        setPreviewData([]);
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || validationErrors.length > 0 || previewData.length === 0) return;

    setIsUploading(true);
    try {
      await bulkImportMutation.mutateAsync({
        students: previewData,
        branchId: branchId || undefined,
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
  };

  return (
    <>
      <Button
        variant="ghost"
        className="h-10 px-3 flex items-center gap-2 text-gray-600 hover:text-[#00501B] hover:bg-[#00501B]/5 transition-all duration-200"
        onClick={() => setIsOpen(true)}
      >
        <Upload className="h-4 w-4" />
        <span className="font-medium">Import CSV</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import students. The file should include columns for firstName, lastName, gender, and dateOfBirth.
            </DialogDescription>
          </DialogHeader>

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
                    id="csv-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("csv-upload")?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Select CSV File
                  </Button>
                  {file && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{file.name}</span>
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

                <Button
                  variant="outline"
                  onClick={downloadStudentImportTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="rounded-md bg-blue-50 p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      CSV Format Requirements
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>Required fields (marked with *): firstName, lastName, gender, dateOfBirth</li>
                        <li>Gender must be one of: Male, Female, Other</li>
                        <li>All date fields must use format: YYYY-MM-DD (e.g., 2010-05-15)</li>
                        <li>First row must contain column headers</li>
                        <li>Download the template for a complete list of supported fields</li>
                        <li>You can leave optional fields blank if not needed</li>
                        <li>admissionNumber is optional - if not provided, it will be auto-generated</li>
                        <li>branchCode should be one of: PS (Paonta Sahib), JUN (Juniors), MAJ (Majra)</li>
                        <li>For recognisedByStateBoard field, use "Yes"/"No" or "true"/"false"</li>
                        <li>Parent information (father, mother, guardian) will create a linked parent record</li>
                        <li>siblingAdmissionNumber must be an existing student's admission number</li>
                        <li>siblingRelationshipType should be: brother, sister, twin, step-sibling, or other</li>
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

            {previewData.length > 0 && validationErrors.length === 0 && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Ready to Import
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      {previewData.length} students will be imported
                    </div>
                  </div>
                </div>
              </div>
            )}

            {previewData.length > 0 && (
              <div className="max-h-[300px] overflow-auto rounded-md border">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                    <tr>
                      {previewData[0] && Object.keys(previewData[0]).map((header) => (
                        <th key={header} className="px-4 py-2 text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value, colIndex) => (
                          <td key={colIndex} className="px-4 py-2 text-sm">
                            {value === null || value === undefined ? '' : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {previewData.length > 5 && previewData[0] && (
                      <tr>
                        <td
                          colSpan={Object.keys(previewData[0]).length}
                          className="px-4 py-2 text-center text-sm text-gray-500"
                        >
                          ... and {previewData.length - 5} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                !file ||
                validationErrors.length > 0 ||
                previewData.length === 0 ||
                isUploading
              }
              className="bg-[#00501B] hover:bg-[#00501B]/90"
            >
              {isUploading ? "Importing..." : "Import Students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
