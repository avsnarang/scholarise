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
    { key: 'fatherWorkplace', label: 'fatherWorkplace' },
    { key: 'fatherDesignation', label: 'fatherDesignation' },
    { key: 'fatherMobile', label: 'fatherMobile' },
    { key: 'fatherEmail', label: 'fatherEmail' },

    // Mother's information
    { key: 'motherName', label: 'motherName' },
    { key: 'motherDob', label: 'motherDob' },
    { key: 'motherEducation', label: 'motherEducation' },
    { key: 'motherOccupation', label: 'motherOccupation' },
    { key: 'motherWorkplace', label: 'motherWorkplace' },
    { key: 'motherDesignation', label: 'motherDesignation' },
    { key: 'motherMobile', label: 'motherMobile' },
    { key: 'motherEmail', label: 'motherEmail' },

    // Guardian's information
    { key: 'guardianName', label: 'guardianName' },
    { key: 'guardianDob', label: 'guardianDob' },
    { key: 'guardianEducation', label: 'guardianEducation' },
    { key: 'guardianOccupation', label: 'guardianOccupation' },
    { key: 'guardianWorkplace', label: 'guardianWorkplace' },
    { key: 'guardianDesignation', label: 'guardianDesignation' },
    { key: 'guardianMobile', label: 'guardianMobile' },
    { key: 'guardianEmail', label: 'guardianEmail' },

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
      dateOfBirth: '2010-05-15', // YYYY-MM-DD format

      // School information
      admissionNumber: '1001', // Optional: If not provided, will be auto-generated
      branchCode: 'PS', // PS for Paonta Sahib, JUN for Juniors, MAJ for Majra
      dateOfAdmission: '2023-04-01',

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
      fatherDob: '1975-03-10',
      fatherEducation: "Bachelor's",
      fatherOccupation: 'Software Engineer',
      fatherWorkplace: 'Tech Solutions Inc.',
      fatherDesignation: 'Senior Developer',
      fatherMobile: '9876543200',
      fatherEmail: 'robert.doe@example.com',

      // Mother's information
      motherName: 'Sarah Doe',
      motherDob: '1978-07-15',
      motherEducation: "Master's",
      motherOccupation: 'Teacher',
      motherWorkplace: 'Delhi Public School',
      motherDesignation: 'Senior Teacher',
      motherMobile: '9876543201',
      motherEmail: 'sarah.doe@example.com',

      // Guardian's information (if different from parents)
      guardianName: '',
      guardianDob: '',
      guardianEducation: '',
      guardianOccupation: '',
      guardianWorkplace: '',
      guardianDesignation: '',
      guardianMobile: '',
      guardianEmail: '',

      // Additional parent information
      parentAnniversary: '2000-05-20',
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
      dateOfBirth: '2011-08-22',

      // School information
      admissionNumber: '2001', // Optional: If not provided, will be auto-generated
      branchCode: 'JUN', // PS for Paonta Sahib, JUN for Juniors, MAJ for Majra
      dateOfAdmission: '2023-04-01',

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
      fatherDob: '1972-11-05',
      fatherEducation: 'Doctorate',
      fatherOccupation: 'Doctor',
      fatherWorkplace: 'City Hospital',
      fatherDesignation: 'Chief Physician',
      fatherMobile: '9876543202',
      fatherEmail: 'michael.smith@example.com',

      // Mother's information
      motherName: 'Emily Smith',
      motherDob: '1975-09-18',
      motherEducation: "Master's",
      motherOccupation: 'Accountant',
      motherWorkplace: 'ABC Accounting Firm',
      motherDesignation: 'Senior Accountant',
      motherMobile: '9876543203',
      motherEmail: 'emily.smith@example.com',

      // Guardian's information
      guardianName: 'Thomas Smith',
      guardianDob: '1970-04-12',
      guardianEducation: "Bachelor's",
      guardianOccupation: 'Business Owner',
      guardianWorkplace: 'Smith Enterprises',
      guardianDesignation: 'CEO',
      guardianMobile: '9876543204',
      guardianEmail: 'thomas.smith@example.com',

      // Additional parent information
      parentAnniversary: '1998-12-10',
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
