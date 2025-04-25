import * as XLSX from 'xlsx';
import { type Student } from '@/types/student';

export const generateStudentExcel = (student: Student): XLSX.WorkBook => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Personal Information
  const personalData = [
    ['Personal Information', ''],
    ['Name', `${student.firstName} ${student.lastName}`],
    ['Admission Number', student.admissionNumber],
    ['Date of Birth', new Date(student.dateOfBirth).toLocaleDateString()],
    ['Gender', student.gender],
    ['Blood Group', student.bloodGroup || 'N/A'],
    ['Religion', student.religion || 'N/A'],
    ['Nationality', student.nationality || 'N/A'],
    ['Address', student.address || 'N/A'],
    ['Phone', student.phone || 'N/A'],
    ['Email', student.email || 'N/A'],
    ['', ''],
    ['Academic Information', ''],
    ['Class', student.class],
    ['Section', student.section],
    ['Join Date', new Date(student.joinDate).toLocaleDateString()],
    ['', ''],
    ['Parent Information', ''],
    ['Parent Name', student.parentName || 'N/A'],
    ['Parent Phone', student.parentPhone || 'N/A'],
    ['Parent Email', student.parentEmail || 'N/A'],
  ];
  
  const personalWs = XLSX.utils.aoa_to_sheet(personalData);
  XLSX.utils.book_append_sheet(wb, personalWs, 'Student Details');
  
  return wb;
};

export const generateStudentListExcel = (students: Student[]): XLSX.WorkBook => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Create headers
  const headers = ['Admission No.', 'First Name', 'Last Name', 'Class', 'Section', 'Gender', 'Date of Birth', 'Parent Name', 'Phone', 'Email'];
  
  // Create data rows
  const data = students.map(student => [
    student.admissionNumber,
    student.firstName,
    student.lastName,
    student.class,
    student.section,
    student.gender,
    new Date(student.dateOfBirth).toLocaleDateString(),
    student.parentName || 'N/A',
    student.phone || 'N/A',
    student.email || 'N/A',
  ]);
  
  // Combine headers and data
  const wsData = [headers, ...data];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  
  return wb;
};

export const downloadExcel = (wb: XLSX.WorkBook, fileName: string): void => {
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
