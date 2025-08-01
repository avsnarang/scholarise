import * as XLSX from 'xlsx';
import { exportToCSV, downloadString } from './export';

// Define all possible student fields that can be exported
export interface StudentExportField {
  key: string;
  label: string;
  category: string;
}

export const STUDENT_EXPORT_FIELDS: StudentExportField[] = [
  // Basic Information
  { key: 'admissionNumber', label: 'Admission Number', category: 'Basic' },
  { key: 'firstName', label: 'First Name', category: 'Basic' },
  { key: 'lastName', label: 'Last Name', category: 'Basic' },
  { key: 'fullName', label: 'Full Name', category: 'Basic' },
  { key: 'gender', label: 'Gender', category: 'Basic' },
  { key: 'dateOfBirth', label: 'Date of Birth', category: 'Basic' },
  { key: 'age', label: 'Age', category: 'Basic' },
  { key: 'isActive', label: 'Status', category: 'Basic' },

  // Contact Information
  { key: 'email', label: 'Email', category: 'Contact' },
  { key: 'personalEmail', label: 'Personal Email', category: 'Contact' },
  { key: 'phone', label: 'Phone', category: 'Contact' },
  { key: 'address', label: 'Address', category: 'Contact' },

  // Academic Information
  { key: 'className', label: 'Class', category: 'Academic' },
  { key: 'sectionName', label: 'Section', category: 'Academic' },
  { key: 'rollNumber', label: 'Roll Number', category: 'Academic' },
  { key: 'dateOfAdmission', label: 'Date of Admission', category: 'Academic' },
  { key: 'joinDate', label: 'Join Date', category: 'Academic' },

  // Personal Details
  { key: 'bloodGroup', label: 'Blood Group', category: 'Personal' },
  { key: 'religion', label: 'Religion', category: 'Personal' },
  { key: 'nationality', label: 'Nationality', category: 'Personal' },
  { key: 'caste', label: 'Caste', category: 'Personal' },
  { key: 'aadharNumber', label: 'Aadhar Number', category: 'Personal' },
  { key: 'udiseId', label: 'UDISE ID', category: 'Personal' },

  // Address Details
  { key: 'permanentAddress', label: 'Permanent Address', category: 'Address' },
  { key: 'permanentCity', label: 'Permanent City', category: 'Address' },
  { key: 'permanentState', label: 'Permanent State', category: 'Address' },
  { key: 'permanentCountry', label: 'Permanent Country', category: 'Address' },
  { key: 'permanentZipCode', label: 'Permanent Zip Code', category: 'Address' },
  { key: 'correspondenceAddress', label: 'Correspondence Address', category: 'Address' },
  { key: 'correspondenceCity', label: 'Correspondence City', category: 'Address' },
  { key: 'correspondenceState', label: 'Correspondence State', category: 'Address' },
  { key: 'correspondenceCountry', label: 'Correspondence Country', category: 'Address' },
  { key: 'correspondenceZipCode', label: 'Correspondence Zip Code', category: 'Address' },

  // Previous School
  { key: 'previousSchool', label: 'Previous School', category: 'Previous School' },
  { key: 'lastClassAttended', label: 'Last Class Attended', category: 'Previous School' },
  { key: 'mediumOfInstruction', label: 'Medium of Instruction', category: 'Previous School' },
  { key: 'recognisedByStateBoard', label: 'Recognised by State Board', category: 'Previous School' },
  { key: 'schoolCity', label: 'Previous School City', category: 'Previous School' },
  { key: 'schoolState', label: 'Previous School State', category: 'Previous School' },
  { key: 'reasonForLeaving', label: 'Reason for Leaving', category: 'Previous School' },

  // Parent/Guardian Information
  { key: 'fatherName', label: 'Father Name', category: 'Parent/Guardian' },
  { key: 'fatherMobile', label: 'Father Mobile', category: 'Parent/Guardian' },
  { key: 'fatherEmail', label: 'Father Email', category: 'Parent/Guardian' },
  { key: 'fatherOccupation', label: 'Father Occupation', category: 'Parent/Guardian' },
  { key: 'fatherEducation', label: 'Father Education', category: 'Parent/Guardian' },
  { key: 'fatherWorkplace', label: 'Father Workplace', category: 'Parent/Guardian' },
  { key: 'fatherDesignation', label: 'Father Designation', category: 'Parent/Guardian' },
  { key: 'fatherDob', label: 'Father Date of Birth', category: 'Parent/Guardian' },

  { key: 'motherName', label: 'Mother Name', category: 'Parent/Guardian' },
  { key: 'motherMobile', label: 'Mother Mobile', category: 'Parent/Guardian' },
  { key: 'motherEmail', label: 'Mother Email', category: 'Parent/Guardian' },
  { key: 'motherOccupation', label: 'Mother Occupation', category: 'Parent/Guardian' },
  { key: 'motherEducation', label: 'Mother Education', category: 'Parent/Guardian' },
  { key: 'motherWorkplace', label: 'Mother Workplace', category: 'Parent/Guardian' },
  { key: 'motherDesignation', label: 'Mother Designation', category: 'Parent/Guardian' },
  { key: 'motherDob', label: 'Mother Date of Birth', category: 'Parent/Guardian' },

  { key: 'guardianName', label: 'Guardian Name', category: 'Parent/Guardian' },
  { key: 'guardianMobile', label: 'Guardian Mobile', category: 'Parent/Guardian' },
  { key: 'guardianEmail', label: 'Guardian Email', category: 'Parent/Guardian' },
  { key: 'guardianOccupation', label: 'Guardian Occupation', category: 'Parent/Guardian' },
  { key: 'guardianEducation', label: 'Guardian Education', category: 'Parent/Guardian' },
  { key: 'guardianWorkplace', label: 'Guardian Workplace', category: 'Parent/Guardian' },
  { key: 'guardianDesignation', label: 'Guardian Designation', category: 'Parent/Guardian' },
  { key: 'guardianDob', label: 'Guardian Date of Birth', category: 'Parent/Guardian' },

  { key: 'parentAnniversary', label: 'Parent Anniversary', category: 'Parent/Guardian' },
  { key: 'monthlyIncome', label: 'Monthly Income', category: 'Parent/Guardian' },
];

// Default fields for quick export
export const DEFAULT_EXPORT_FIELDS = [
  'admissionNumber',
  'firstName',
  'lastName',
  'className',
  'sectionName',
  'rollNumber',
  'gender',
  'dateOfBirth',
  'fatherName',
  'fatherMobile',
  'motherName',
  'motherMobile',
  'isActive'
];

// Type for student data from API
export interface StudentExportData {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  personalEmail?: string | null;
  phone?: string | null;
  gender?: string;
  isActive: boolean;
  dateOfBirth: Date;
  dateOfAdmission?: Date | null;
  joinDate: Date;
  rollNumber?: number | null;
  bloodGroup?: string | null;
  religion?: string | null;
  nationality?: string | null;
  caste?: string | null;
  aadharNumber?: string | null;
  udiseId?: string | null;
  address?: string | null;
  permanentAddress?: string | null;
  permanentCity?: string | null;
  permanentState?: string | null;
  permanentCountry?: string | null;
  permanentZipCode?: string | null;
  correspondenceAddress?: string | null;
  correspondenceCity?: string | null;
  correspondenceState?: string | null;
  correspondenceCountry?: string | null;
  correspondenceZipCode?: string | null;
  previousSchool?: string | null;
  lastClassAttended?: string | null;
  mediumOfInstruction?: string | null;
  recognisedByStateBoard?: boolean | null;
  schoolCity?: string | null;
  schoolState?: string | null;
  reasonForLeaving?: string | null;
  class?: {
    name: string;
    section?: string;
  } | null;
  parent?: {
    fatherName?: string | null;
    fatherMobile?: string | null;
    fatherEmail?: string | null;
    fatherOccupation?: string | null;
    fatherEducation?: string | null;
    fatherWorkplace?: string | null;
    fatherDesignation?: string | null;
    fatherDob?: Date | null;
    motherName?: string | null;
    motherMobile?: string | null;
    motherEmail?: string | null;
    motherOccupation?: string | null;
    motherEducation?: string | null;
    motherWorkplace?: string | null;
    motherDesignation?: string | null;
    motherDob?: Date | null;
    guardianName?: string | null;
    guardianMobile?: string | null;
    guardianEmail?: string | null;
    guardianOccupation?: string | null;
    guardianEducation?: string | null;
    guardianWorkplace?: string | null;
    guardianDesignation?: string | null;
    guardianDob?: Date | null;
    parentAnniversary?: Date | null;
    monthlyIncome?: string | null;
  } | null;
}

// Transform student data for export
export function transformStudentDataForExport(student: StudentExportData): Record<string, any> {
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  const formatBoolean = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return value ? 'Yes' : 'No';
  };

  return {
    // Basic Information
    admissionNumber: student.admissionNumber || '',
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
    gender: student.gender || '',
    dateOfBirth: formatDate(student.dateOfBirth),
    age: student.dateOfBirth ? calculateAge(student.dateOfBirth) : '',
    isActive: student.isActive ? 'Active' : 'Inactive',

    // Contact Information
    email: student.email || '',
    personalEmail: student.personalEmail || '',
    phone: student.phone || '',
    address: student.address || '',

    // Academic Information
    className: student.class?.name || '',
    sectionName: student.class?.section || '',
    rollNumber: student.rollNumber || '',
    dateOfAdmission: formatDate(student.dateOfAdmission),
    joinDate: formatDate(student.joinDate),

    // Personal Details
    bloodGroup: student.bloodGroup || '',
    religion: student.religion || '',
    nationality: student.nationality || '',
    caste: student.caste || '',
    aadharNumber: student.aadharNumber || '',
    udiseId: student.udiseId || '',

    // Address Details
    permanentAddress: student.permanentAddress || '',
    permanentCity: student.permanentCity || '',
    permanentState: student.permanentState || '',
    permanentCountry: student.permanentCountry || '',
    permanentZipCode: student.permanentZipCode || '',
    correspondenceAddress: student.correspondenceAddress || '',
    correspondenceCity: student.correspondenceCity || '',
    correspondenceState: student.correspondenceState || '',
    correspondenceCountry: student.correspondenceCountry || '',
    correspondenceZipCode: student.correspondenceZipCode || '',

    // Previous School
    previousSchool: student.previousSchool || '',
    lastClassAttended: student.lastClassAttended || '',
    mediumOfInstruction: student.mediumOfInstruction || '',
    recognisedByStateBoard: formatBoolean(student.recognisedByStateBoard),
    schoolCity: student.schoolCity || '',
    schoolState: student.schoolState || '',
    reasonForLeaving: student.reasonForLeaving || '',

    // Parent/Guardian Information
    fatherName: student.parent?.fatherName || '',
    fatherMobile: student.parent?.fatherMobile || '',
    fatherEmail: student.parent?.fatherEmail || '',
    fatherOccupation: student.parent?.fatherOccupation || '',
    fatherEducation: student.parent?.fatherEducation || '',
    fatherWorkplace: student.parent?.fatherWorkplace || '',
    fatherDesignation: student.parent?.fatherDesignation || '',
    fatherDob: formatDate(student.parent?.fatherDob),

    motherName: student.parent?.motherName || '',
    motherMobile: student.parent?.motherMobile || '',
    motherEmail: student.parent?.motherEmail || '',
    motherOccupation: student.parent?.motherOccupation || '',
    motherEducation: student.parent?.motherEducation || '',
    motherWorkplace: student.parent?.motherWorkplace || '',
    motherDesignation: student.parent?.motherDesignation || '',
    motherDob: formatDate(student.parent?.motherDob),

    guardianName: student.parent?.guardianName || '',
    guardianMobile: student.parent?.guardianMobile || '',
    guardianEmail: student.parent?.guardianEmail || '',
    guardianOccupation: student.parent?.guardianOccupation || '',
    guardianEducation: student.parent?.guardianEducation || '',
    guardianWorkplace: student.parent?.guardianWorkplace || '',
    guardianDesignation: student.parent?.guardianDesignation || '',
    guardianDob: formatDate(student.parent?.guardianDob),

    parentAnniversary: formatDate(student.parent?.parentAnniversary),
    monthlyIncome: student.parent?.monthlyIncome || '',
  };
}

// Export students to CSV
export function exportStudentsToCSV(
  students: StudentExportData[],
  selectedFields: string[] = DEFAULT_EXPORT_FIELDS,
  filename?: string
): void {
  // Transform student data
  const transformedData = students.map(transformStudentDataForExport);

  // Get headers for selected fields
  const headers = selectedFields.map(fieldKey => {
    const field = STUDENT_EXPORT_FIELDS.find(f => f.key === fieldKey);
    return {
      key: fieldKey,
      label: field?.label || fieldKey
    };
  });

  // Generate filename
  const exportFilename = filename || `students_export_${new Date().toISOString().slice(0, 10)}.csv`;

  // Export to CSV
  exportToCSV(transformedData, headers, exportFilename);
}

// Export students to Excel
export function exportStudentsToExcel(
  students: StudentExportData[],
  selectedFields: string[] = DEFAULT_EXPORT_FIELDS,
  filename?: string
): void {
  // Transform student data
  const transformedData = students.map(transformStudentDataForExport);

  // Get headers for selected fields
  const headers = selectedFields.map(fieldKey => {
    const field = STUDENT_EXPORT_FIELDS.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  });

  // Prepare Excel data
  const excelData = transformedData.map(student => 
    selectedFields.map(fieldKey => student[fieldKey] || '')
  );

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet data with headers
  const worksheetData = [headers, ...excelData];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Auto-size columns
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (cell?.v) {
        const cellLength = String(cell.v).length;
        maxWidth = Math.max(maxWidth, cellLength);
      }
    }
    colWidths[C] = { wch: Math.min(maxWidth + 2, 50) };
  }
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Generate filename
  const exportFilename = filename || `students_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, exportFilename);
}

// Group fields by category for the field selection UI
export function getFieldsByCategory(): Record<string, StudentExportField[]> {
  const grouped: Record<string, StudentExportField[]> = {};
  
  STUDENT_EXPORT_FIELDS.forEach(field => {
    if (!grouped[field.category]) {
      grouped[field.category] = [];
    }
    grouped[field.category]?.push(field);
  });
  
  return grouped;
} 