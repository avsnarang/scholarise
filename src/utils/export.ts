import * as XLSX from 'xlsx';

/**
 * Converts an array of objects to a CSV string
 */
export function objectsToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: string; label: string }[]
): string {
  // Create the header row
  const headerRow = headers.map((header) => header.label).join(',');

  // Create the data rows
  const rows = data.map((item) => {
    return headers
      .map((header) => {
        const value = item[header.key];
        // Handle different types of values
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if needed
          const escaped = value.replace(/"/g, '""');
          return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return String(value);
      })
      .join(',');
  });

  // Combine header and rows
  return [headerRow, ...rows].join('\n');
}

/**
 * Downloads a string as a file
 */
export function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to the document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL
  URL.revokeObjectURL(url);
}

/**
 * Downloads a workbook as an Excel file
 */
function downloadExcelWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Exports data to CSV and triggers download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  const csv = objectsToCSV(data, headers);
  downloadString(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Generates and downloads a student import template Excel file with class dropdowns
 */
export function downloadStudentImportExcelTemplate(availableClasses?: Array<{ id: string; classId: string; sectionId: string; name: string; section: string; displayName: string }>): void {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Define the headers for the template
  const headers = [
    // Required fields (marked with *)
    'firstName*',
    'lastName*',
    'gender*',
    'dateOfBirth*',

    // School information
    'admissionNumber',
    'branchCode',
    'classId', // This will reference the specific section ID from the Classes sheet
    'dateOfAdmission',

    // Basic information
    'email',
    'personalEmail',
    'phone',
    'bloodGroup',
    'religion',
    'nationality',
    'caste',
    'aadharNumber',
    'udiseId',
    'username',
    'password',

    // Address information
    'permanentAddress',
    'permanentCity',
    'permanentState',
    'permanentCountry',
    'permanentZipCode',
    'correspondenceAddress',
    'correspondenceCity',
    'correspondenceState',
    'correspondenceCountry',
    'correspondenceZipCode',

    // Previous school information
    'previousSchool',
    'lastClassAttended',
    'mediumOfInstruction',
    'recognisedByStateBoard',
    'schoolCity',
    'schoolState',
    'reasonForLeaving',

    // Father's information
    'fatherName',
    'fatherDob',
    'fatherEducation',
    'fatherOccupation',
    'fatherWorkplace',
    'fatherDesignation',
    'fatherMobile',
    'fatherEmail',
    'fatherAadharNumber',

    // Mother's information
    'motherName',
    'motherDob',
    'motherEducation',
    'motherOccupation',
    'motherWorkplace',
    'motherDesignation',
    'motherMobile',
    'motherEmail',
    'motherAadharNumber',

    // Guardian's information
    'guardianName',
    'guardianDob',
    'guardianEducation',
    'guardianOccupation',
    'guardianWorkplace',
    'guardianDesignation',
    'guardianMobile',
    'guardianEmail',
    'guardianAadharNumber',

    // Additional parent information
    'parentAnniversary',
    'monthlyIncome',
    'parentUsername',
    'parentPassword',

    // Sibling information
    'siblingAdmissionNumber',
    'siblingRelationshipType',
  ];

  // Create sample data with better examples
  const sampleData = [
    {
      // Required fields
      'firstName*': 'John',
      'lastName*': 'Doe',
      'gender*': 'Male', // Must be Male, Female, or Other
      'dateOfBirth*': '15/05/2010', // DD/MM/YYYY format

      // School information
      admissionNumber: '1001', // Optional: If not provided, will be auto-generated
      branchCode: 'PS', // PS for Paonta Sahib, JUN for Juniors, MAJ for Majra
      classId: availableClasses && availableClasses.length > 0 ? availableClasses[0]!.sectionId : 'COPY_FROM_CLASSES_SHEET', // Will reference Classes sheet
      dateOfAdmission: '01/04/2023',

      // Basic information
      email: 'john.doe@example.com',
      personalEmail: 'john.personal@example.com',
      phone: '9876543210',
      bloodGroup: 'O+',
      religion: 'Hindu',
      nationality: 'Indian',
      caste: 'General',
      aadharNumber: '123456789012',
      udiseId: 'UD12345',
      username: 'john.doe',
      password: 'password123',

      // Address information
      permanentAddress: '123 Main St',
      permanentCity: 'Delhi',
      permanentState: 'Delhi',
      permanentCountry: 'India',
      permanentZipCode: '110001',
      correspondenceAddress: '123 Main St',
      correspondenceCity: 'Delhi',
      correspondenceState: 'Delhi',
      correspondenceCountry: 'India',
      correspondenceZipCode: '110001',

      // Previous school information
      previousSchool: 'ABC Public School',
      lastClassAttended: '5th',
      mediumOfInstruction: 'English',
      recognisedByStateBoard: 'Yes',
      schoolCity: 'Mumbai',
      schoolState: 'Maharashtra',
      reasonForLeaving: 'Family relocated',

      // Father's information
      fatherName: 'Robert Doe',
      fatherDob: '10/01/1980',
      fatherEducation: 'Bachelor\'s',
      fatherOccupation: 'Engineer',
      fatherMobile: '9876543200',
      fatherEmail: 'robert.doe@example.com',
      fatherAadharNumber: '123456789013',

      // Mother's information
      motherName: 'Sarah Doe',
      motherDob: '15/03/1982',
      motherEducation: 'Master\'s',
      motherOccupation: 'Teacher',
      motherMobile: '9876543201',
      motherEmail: 'sarah.doe@example.com',
      motherAadharNumber: '123456789014',

      // Guardian's information (if different from parents)
      guardianName: '',
      guardianDob: '',
      guardianEducation: '',
      guardianOccupation: '',
      guardianWorkplace: '',
      guardianDesignation: '',
      guardianMobile: '',
      guardianEmail: '',
      guardianAadharNumber: '',

      // Additional parent information
      parentAnniversary: '20/05/2000',
      monthlyIncome: '150000',
      parentUsername: 'parent.doe',
      parentPassword: 'parentpass123',

      // Sibling information
      siblingAdmissionNumber: '1001', // Admission number of existing sibling
      siblingRelationshipType: 'brother', // brother, sister, twin, step-sibling, other
    },
    {
      // Required fields
      'firstName*': 'Jane',
      'lastName*': 'Smith',
      'gender*': 'Female',
      'dateOfBirth*': '22/08/2011',

      // School information
      admissionNumber: '2001', // Optional: If not provided, will be auto-generated
      branchCode: 'JUN', // PS for Paonta Sahib, JUN for Juniors, MAJ for Majra
      classId: availableClasses && availableClasses.length > 1 ? availableClasses[1]!.sectionId : 'COPY_FROM_CLASSES_SHEET', // Will reference Classes sheet
      dateOfAdmission: '01/04/2023',

      // Basic information
      email: 'jane.smith@example.com',
      personalEmail: 'jane.personal@example.com',
      phone: '9876543211',
      bloodGroup: 'A+',
      religion: 'Christian',
      nationality: 'Indian',
      caste: 'OBC',
      aadharNumber: '123456789013',
      udiseId: 'UD12346',
      username: 'jane.smith',
      password: 'password456',

      // Address information
      permanentAddress: '456 Park Ave',
      permanentCity: 'Bangalore',
      permanentState: 'Karnataka',
      permanentCountry: 'India',
      permanentZipCode: '560001',
      correspondenceAddress: '456 Park Ave',
      correspondenceCity: 'Bangalore',
      correspondenceState: 'Karnataka',
      correspondenceCountry: 'India',
      correspondenceZipCode: '560001',

      // Previous school information
      previousSchool: 'XYZ International School',
      lastClassAttended: '6th',
      mediumOfInstruction: 'English',
      recognisedByStateBoard: 'Yes',
      schoolCity: 'Chennai',
      schoolState: 'Tamil Nadu',
      reasonForLeaving: 'Better educational opportunities',

      // Father's information
      fatherName: 'Michael Smith',
      fatherDob: '05/11/1972',
      fatherEducation: 'Doctorate',
      fatherOccupation: 'Doctor',
      fatherWorkplace: 'City Hospital',
      fatherDesignation: 'Chief Physician',
      fatherMobile: '9876543202',
      fatherEmail: 'michael.smith@example.com',
      fatherAadharNumber: '123456789014',

      // Mother's information
      motherName: 'Emily Smith',
      motherDob: '18/09/1975',
      motherEducation: "Master's",
      motherOccupation: 'Accountant',
      motherWorkplace: 'ABC Accounting Firm',
      motherDesignation: 'Senior Accountant',
      motherMobile: '9876543203',
      motherEmail: 'emily.smith@example.com',
      motherAadharNumber: '123456789015',

      // Guardian's information
      guardianName: 'Thomas Smith',
      guardianDob: '12/04/1970',
      guardianEducation: "Bachelor's",
      guardianOccupation: 'Business Owner',
      guardianWorkplace: 'Smith Enterprises',
      guardianDesignation: 'CEO',
      guardianMobile: '9876543204',
      guardianEmail: 'thomas.smith@example.com',
      guardianAadharNumber: '123456789016',

      // Additional parent information
      parentAnniversary: '10/12/1998',
      monthlyIncome: '200000',
      parentUsername: 'parent.smith',
      parentPassword: 'parentpass456',

      // Sibling information
      siblingAdmissionNumber: '1002',
      siblingRelationshipType: 'sister',
    }
  ];

  // Create the Classes sheet first (to make it more prominent)
  if (availableClasses && availableClasses.length > 0) {
    // Create classes reference data with better formatting
    const classesData = availableClasses.map(cls => ({
      'Class ID (Copy This)': cls.sectionId,
      'Class Name': cls.name,
      'Section': cls.section || '',
      'Full Display Name': cls.displayName,
    }));

    // Add an instruction row at the top of classes sheet
    const classInstructionRow = {
      'Class ID (Copy This)': '👈 COPY THESE CLASS IDs TO StudentData SHEET',
      'Class Name': 'Class names for reference',
      'Section': 'Section info',
      'Full Display Name': 'How it will appear in system',
    };

    // Create classes reference worksheet
    const classesWorksheet = XLSX.utils.json_to_sheet([classInstructionRow, ...classesData]);
    
    // Style the classes sheet
    const classRange = XLSX.utils.decode_range(classesWorksheet['!ref'] || 'A1');
    const classColWidths = [];
    for (let C = classRange.s.c; C <= classRange.e.c; ++C) {
      let maxWidth = 15;
      for (let R = classRange.s.r; R <= classRange.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = classesWorksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, cellLength + 2);
        }
      }
      classColWidths[C] = { wch: Math.min(maxWidth, 50) };
    }
    classesWorksheet['!cols'] = classColWidths;
    
    // Add the classes sheet first to make it more prominent
    XLSX.utils.book_append_sheet(workbook, classesWorksheet, 'Classes');
  }

  // Create the main student data worksheet with proper single header
  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Add instructions in comments or separate rows for better clarity
  if (availableClasses && availableClasses.length > 0) {
    // Add a prominent instruction row ABOVE the headers
    const instructionData = [{
      'firstName*': '📋 INSTRUCTIONS: Fill student data below. For sectionId column, copy exact IDs from "Classes" sheet tab →',
      'lastName*': '',
      'gender*': '',
      'dateOfBirth*': '',
      admissionNumber: '',
      branchCode: '',
      classId: '',
      dateOfAdmission: '',
      email: '',
      personalEmail: '',
      phone: '',
      bloodGroup: '',
      religion: '',
      nationality: '',
      caste: '',
      aadharNumber: '',
      udiseId: '',
      username: '',
      password: '',
      permanentAddress: '',
      permanentCity: '',
      permanentState: '',
      permanentCountry: '',
      permanentZipCode: '',
      correspondenceAddress: '',
      correspondenceCity: '',
      correspondenceState: '',
      correspondenceCountry: '',
      correspondenceZipCode: '',
      previousSchool: '',
      lastClassAttended: '',
      mediumOfInstruction: '',
      recognisedByStateBoard: '',
      schoolCity: '',
      schoolState: '',
      reasonForLeaving: '',
      fatherName: '',
      fatherDob: '',
      fatherEducation: '',
      fatherOccupation: '',
      fatherWorkplace: '',
      fatherDesignation: '',
      fatherMobile: '',
      fatherEmail: '',
      fatherAadharNumber: '',
      motherName: '',
      motherDob: '',
      motherEducation: '',
      motherOccupation: '',
      motherWorkplace: '',
      motherDesignation: '',
      motherMobile: '',
      motherEmail: '',
      motherAadharNumber: '',
      guardianName: '',
      guardianDob: '',
      guardianEducation: '',
      guardianOccupation: '',
      guardianWorkplace: '',
      guardianDesignation: '',
      guardianMobile: '',
      guardianEmail: '',
      guardianAadharNumber: '',
      parentAnniversary: '',
      monthlyIncome: '',
      parentUsername: '',
      parentPassword: '',
      siblingAdmissionNumber: '',
      siblingRelationshipType: '',
    }];

    // Create a new worksheet with instruction + header + data
    const combinedData = [...instructionData, ...sampleData];
    const newWorksheet = XLSX.utils.json_to_sheet(combinedData);

    // Replace the original worksheet
    Object.assign(worksheet, newWorksheet);
  }

  // Auto-size columns for the student data sheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const cellLength = String(cell.v).length;
        maxWidth = Math.max(maxWidth, cellLength);
      }
    }
    colWidths[C] = { wch: Math.min(maxWidth + 2, 50) }; // Cap at 50 characters
  }
  worksheet['!cols'] = colWidths;

  // Add the student data worksheet
  XLSX.utils.book_append_sheet(workbook, worksheet, 'StudentData');

  // Download the Excel file
  downloadExcelWorkbook(workbook, 'student_import_template.xlsx');
}

/**
 * Generates and downloads a student import template CSV
 */
export function downloadStudentImportTemplate(): void {
  // Define the headers for the template
  const headers = [
    // Required fields (marked with *)
    { key: 'firstName', label: 'firstName*' },
    { key: 'lastName', label: 'lastName*' },
    { key: 'gender', label: 'gender*' },
    { key: 'dateOfBirth', label: 'dateOfBirth*' },

    // School information
    { key: 'admissionNumber', label: 'admissionNumber' },
    { key: 'branchCode', label: 'branchCode' }, // PS, JUN, MAJ, etc.
    { key: 'classNameInput', label: 'Class Name (e.g. 1-A or I-A)' },
    { key: 'classId_override', label: 'classId_override (optional)' },
    { key: 'dateOfAdmission', label: 'dateOfAdmission' },

    // Basic information
    { key: 'email', label: 'email' },
    { key: 'personalEmail', label: 'personalEmail' },
    { key: 'phone', label: 'phone' },
    { key: 'bloodGroup', label: 'bloodGroup' },
    { key: 'religion', label: 'religion' },
    { key: 'nationality', label: 'nationality' },
    { key: 'caste', label: 'caste' },
    { key: 'aadharNumber', label: 'aadharNumber' },
    { key: 'udiseId', label: 'udiseId' },
    { key: 'username', label: 'username' },
    { key: 'password', label: 'password' },

    // Address information
    { key: 'permanentAddress', label: 'permanentAddress' },
    { key: 'permanentCity', label: 'permanentCity' },
    { key: 'permanentState', label: 'permanentState' },
    { key: 'permanentCountry', label: 'permanentCountry' },
    { key: 'permanentZipCode', label: 'permanentZipCode' },
    { key: 'correspondenceAddress', label: 'correspondenceAddress' },
    { key: 'correspondenceCity', label: 'correspondenceCity' },
    { key: 'correspondenceState', label: 'correspondenceState' },
    { key: 'correspondenceCountry', label: 'correspondenceCountry' },
    { key: 'correspondenceZipCode', label: 'correspondenceZipCode' },

    // Previous school information
    { key: 'previousSchool', label: 'previousSchool' },
    { key: 'lastClassAttended', label: 'lastClassAttended' },
    { key: 'mediumOfInstruction', label: 'mediumOfInstruction' },
    { key: 'recognisedByStateBoard', label: 'recognisedByStateBoard' },
    { key: 'schoolCity', label: 'schoolCity' },
    { key: 'schoolState', label: 'schoolState' },
    { key: 'reasonForLeaving', label: 'reasonForLeaving' },

    // Father's information
    { key: 'fatherName', label: 'fatherName' },
    { key: 'fatherDob', label: 'fatherDob' },
    { key: 'fatherEducation', label: 'fatherEducation' },
    { key: 'fatherOccupation', label: 'fatherOccupation' },
    { key: 'fatherMobile', label: 'fatherMobile' },
    { key: 'fatherEmail', label: 'fatherEmail' },
    { key: 'fatherAadharNumber', label: 'fatherAadharNumber' },

    // Mother's information
    { key: 'motherName', label: 'motherName' },
    { key: 'motherDob', label: 'motherDob' },
    { key: 'motherEducation', label: 'motherEducation' },
    { key: 'motherOccupation', label: 'motherOccupation' },
    { key: 'motherMobile', label: 'motherMobile' },
    { key: 'motherEmail', label: 'motherEmail' },
    { key: 'motherAadharNumber', label: 'motherAadharNumber' },

    // Guardian's information
    { key: 'guardianName', label: 'guardianName' },
    { key: 'guardianDob', label: 'guardianDob' },
    { key: 'guardianEducation', label: 'guardianEducation' },
    { key: 'guardianOccupation', label: 'guardianOccupation' },
    { key: 'guardianMobile', label: 'guardianMobile' },
    { key: 'guardianEmail', label: 'guardianEmail' },
    { key: 'guardianAadharNumber', label: 'guardianAadharNumber' },

    // Additional parent information
    { key: 'parentAnniversary', label: 'parentAnniversary' },
    { key: 'monthlyIncome', label: 'monthlyIncome' },
    { key: 'parentUsername', label: 'parentUsername' },
    { key: 'parentPassword', label: 'parentPassword' },

    // Sibling information
    { key: 'siblingAdmissionNumber', label: 'siblingAdmissionNumber' },
    { key: 'siblingRelationshipType', label: 'siblingRelationshipType' },
  ];

  // Create sample data
  const sampleData = [
    {
      // Required fields
      firstName: 'John',
      lastName: 'Doe',
      gender: 'Male', // Must be Male, Female, or Other
      dateOfBirth: '15/05/2010', // DD/MM/YYYY format

      // School information
      admissionNumber: '1001', // Optional: If not provided, will be auto-generated
      branchCode: 'PS', // PS for Paonta Sahib, JUN for Juniors, MAJ for Majra
      classNameInput: '1-A', // Example class name input
      classId_override: '',
      dateOfAdmission: '01/04/2023',

      // Basic information
      email: 'john.doe@example.com',
      personalEmail: 'john.personal@example.com',
      phone: '9876543210',
      bloodGroup: 'O+',
      religion: 'Hindu',
      nationality: 'Indian',
      caste: 'General',
      aadharNumber: '123456789012',
      udiseId: 'UD12345',
      username: 'john.doe',
      password: 'password123',

      // Address information
      permanentAddress: '123 Main St',
      permanentCity: 'Delhi',
      permanentState: 'Delhi',
      permanentCountry: 'India',
      permanentZipCode: '110001',
      correspondenceAddress: '123 Main St',
      correspondenceCity: 'Delhi',
      correspondenceState: 'Delhi',
      correspondenceCountry: 'India',
      correspondenceZipCode: '110001',

      // Previous school information
      previousSchool: 'ABC Public School',
      lastClassAttended: '5th',
      mediumOfInstruction: 'English',
      recognisedByStateBoard: 'Yes',
      schoolCity: 'Mumbai',
      schoolState: 'Maharashtra',
      reasonForLeaving: 'Family relocated',

      // Father's information
      fatherName: 'Robert Doe',
      fatherDob: '10/01/1980',
      fatherEducation: 'Bachelor\'s',
      fatherOccupation: 'Engineer',
      fatherMobile: '9876543200',
      fatherEmail: 'robert.doe@example.com',
      fatherAadharNumber: '123456789013',

      // Mother's information
      motherName: 'Sarah Doe',
      motherDob: '15/03/1982',
      motherEducation: 'Master\'s',
      motherOccupation: 'Teacher',
      motherMobile: '9876543201',
      motherEmail: 'sarah.doe@example.com',
      motherAadharNumber: '123456789014',

      // Guardian's information (if different from parents)
      guardianName: '',
      guardianDob: '',
      guardianEducation: '',
      guardianOccupation: '',
      guardianMobile: '',
      guardianEmail: '',
      guardianAadharNumber: '',

      // Additional parent information
      parentAnniversary: '20/05/2000',
      monthlyIncome: '150000',
      parentUsername: 'parent.doe',
      parentPassword: 'parentpass123',

      // Sibling information
      siblingAdmissionNumber: '1001', // Admission number of existing sibling
      siblingRelationshipType: 'brother', // brother, sister, twin, step-sibling, other
    },
    {
      // Required fields
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'Female',
      dateOfBirth: '22/08/2011',

      // School information
      admissionNumber: '2001', // Optional: If not provided, will be auto-generated
      branchCode: 'JUN', // PS for Paonta Sahib, JUN for Juniors, MAJ for Majra
      classNameInput: 'II-B', // Example class name input for another student
      classId_override: '',
      dateOfAdmission: '01/04/2023',

      // Basic information
      email: 'jane.smith@example.com',
      personalEmail: 'jane.personal@example.com',
      phone: '9876543211',
      bloodGroup: 'A+',
      religion: 'Christian',
      nationality: 'Indian',
      caste: 'OBC',
      aadharNumber: '123456789013',
      udiseId: 'UD12346',
      username: 'jane.smith',
      password: 'password456',

      // Address information
      permanentAddress: '456 Park Ave',
      permanentCity: 'Bangalore',
      permanentState: 'Karnataka',
      permanentCountry: 'India',
      permanentZipCode: '560001',
      correspondenceAddress: '456 Park Ave',
      correspondenceCity: 'Bangalore',
      correspondenceState: 'Karnataka',
      correspondenceCountry: 'India',
      correspondenceZipCode: '560001',

      // Previous school information
      previousSchool: 'XYZ International School',
      lastClassAttended: '6th',
      mediumOfInstruction: 'English',
      recognisedByStateBoard: 'Yes',
      schoolCity: 'Chennai',
      schoolState: 'Tamil Nadu',
      reasonForLeaving: 'Better educational opportunities',

      // Father's information
      fatherName: 'Michael Smith',
      fatherDob: '05/11/1972',
      fatherEducation: 'Doctorate',
      fatherOccupation: 'Doctor',
      fatherWorkplace: 'City Hospital',
      fatherDesignation: 'Chief Physician',
      fatherMobile: '9876543202',
      fatherEmail: 'michael.smith@example.com',
      fatherAadharNumber: '123456789014',

      // Mother's information
      motherName: 'Emily Smith',
      motherDob: '18/09/1975',
      motherEducation: "Master's",
      motherOccupation: 'Accountant',
      motherWorkplace: 'ABC Accounting Firm',
      motherDesignation: 'Senior Accountant',
      motherMobile: '9876543203',
      motherEmail: 'emily.smith@example.com',
      motherAadharNumber: '123456789015',

      // Guardian's information
      guardianName: 'Thomas Smith',
      guardianDob: '12/04/1970',
      guardianEducation: "Bachelor's",
      guardianOccupation: 'Business Owner',
      guardianWorkplace: 'Smith Enterprises',
      guardianDesignation: 'CEO',
      guardianMobile: '9876543204',
      guardianEmail: 'thomas.smith@example.com',
      guardianAadharNumber: '123456789016',

      // Additional parent information
      parentAnniversary: '10/12/1998',
      monthlyIncome: '200000',
      parentUsername: 'parent.smith',
      parentPassword: 'parentpass456',

      // Sibling information
      siblingAdmissionNumber: '1002',
      siblingRelationshipType: 'sister',
    }
  ];

  // Generate and download the CSV
  exportToCSV(sampleData, headers, 'student_import_template.csv');
}

/**
 * Parse Excel file and convert to student data format
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Look for StudentData sheet first, then fall back to first sheet
        let worksheetName = 'StudentData';
        if (!workbook.Sheets[worksheetName]) {
          worksheetName = workbook.SheetNames[0] || '';
        }
        
        if (!worksheetName) {
          reject(new Error('No worksheets found in the Excel file'));
          return;
        }
        
        const worksheet = workbook.Sheets[worksheetName];
        if (!worksheet) {
          reject(new Error('Could not read the worksheet'));
          return;
        }
        
        // Convert to JSON, skip the first row if it contains instructions
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file must contain at least a header row and one data row'));
          return;
        }
        
        // Find the actual header row (skip instruction rows)
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(jsonData.length, 5); i++) { // Check first 5 rows maximum
          const row = jsonData[i] as any[];
          if (row && row.length > 0 && typeof row[0] === 'string') {
            const firstCell = String(row[0]).toLowerCase();
            
            // Skip instruction rows (contain specific instruction keywords)
            if (firstCell.includes('instruction') || firstCell.includes('📋') || firstCell.includes('copy') || firstCell.includes('fill')) {
              continue;
            }
            
            // Check if this looks like a header row (contains required fields)
            if (firstCell.includes('firstname') || firstCell === 'firstName*' || firstCell === 'firstName') {
              headerRowIndex = i;
              headers = row.map(cell => String(cell || '').replace(/\*$/, '')); // Remove asterisks
              break;
            }
          }
        }
        
        if (headerRowIndex === -1 || headers.length === 0) {
          reject(new Error('Could not find header row in Excel file. Make sure the header row contains "firstName" column.'));
          return;
        }

        // Define optional nullable email fields (same as frontend)
        const optionalNullableEmailFields = [
          "email",
          "personalEmail",
          "fatherEmail",
          "motherEmail",
          "guardianEmail",
        ];
        
        // Convert data rows to objects
        const parsedStudents = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue; // Skip empty rows
          
          const studentData: Record<string, any> = {}; // Changed to allow any type including null
          headers.forEach((header, index) => {
            const cellValue = row[index];
            
            // Skip placeholder values
            if (cellValue === 'COPY_FROM_CLASSES_SHEET') {
              studentData[header] = '';
              return;
            }
            
            // Convert Excel dates to DD/MM/YYYY format if needed
            if (header.toLowerCase().includes('date') || header.toLowerCase().includes('dob')) {
              if (typeof cellValue === 'number') {
                // Excel date serial number
                const excelDate = XLSX.SSF.parse_date_code(cellValue);
                if (excelDate) {
                  studentData[header] = `${String(excelDate.d).padStart(2, '0')}/${String(excelDate.m).padStart(2, '0')}/${excelDate.y}`;
                } else {
                  studentData[header] = cellValue ? String(cellValue) : '';
                }
              } else {
                studentData[header] = cellValue ? String(cellValue) : '';
              }
            } else {
              // Handle regular fields
              let processedValue: string | null = cellValue ? String(cellValue) : '';
              
              // Convert empty strings to null for optional nullable email fields
              if (optionalNullableEmailFields.includes(header) && processedValue === '') {
                processedValue = null;
              }
              
              studentData[header] = processedValue;
            }
          });
          
          // Only add non-empty rows
          if (Object.values(studentData).some(value => value && String(value).trim())) {
            parsedStudents.push(studentData);
          }
        }
        
        resolve(parsedStudents);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read the file'));
    reader.readAsArrayBuffer(file);
  });
}
