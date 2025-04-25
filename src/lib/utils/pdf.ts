import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { type Student } from '@/types/student';

// Add the missing type for jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

export const generateStudentPDF = (student: Student): jsPDF => {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.text('Student Details', 105, 15, { align: 'center' });

  // Add school logo and info
  doc.setFontSize(12);
  doc.text('ScholaRise ERP', 105, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Generated on: ' + new Date().toLocaleDateString(), 105, 30, { align: 'center' });

  // Add student photo placeholder
  doc.rect(20, 40, 30, 40);
  doc.setFontSize(8);
  doc.text('Student Photo', 35, 60, { align: 'center' });

  // Add student basic info
  doc.setFontSize(12);
  doc.text('Personal Information', 20, 90);
  doc.setFontSize(10);

  const personalInfo = [
    ['Name', `${student.firstName} ${student.lastName}`],
    ['Admission Number', student.admissionNumber],
    ['Date of Birth', new Date(student.dateOfBirth).toLocaleDateString()],
    ['Gender', student.gender],
    ['Blood Group', student.bloodGroup ?? 'N/A'],
    ['Religion', student.religion ?? 'N/A'],
    ['Nationality', student.nationality ?? 'N/A'],
    ['Address', student.address ?? 'N/A'],
    ['Phone', student.phone ?? 'N/A'],
    ['Email', student.email ?? 'N/A'],
  ];

  doc.autoTable({
    startY: 95,
    head: [['Field', 'Value']],
    body: personalInfo,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });

  // Add academic info
  const lastAutoTable = doc as unknown as { lastAutoTable: { finalY: number } };
  const currentY = lastAutoTable.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text('Academic Information', 20, currentY);
  doc.setFontSize(10);

  const academicInfo = [
    ['Class', student.class],
    ['Section', student.section],
    ['Join Date', new Date(student.joinDate).toLocaleDateString()],
  ];

  doc.autoTable({
    startY: currentY + 5,
    head: [['Field', 'Value']],
    body: academicInfo,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });

  // Add parent info
  const lastAutoTableParent = doc as unknown as { lastAutoTable: { finalY: number } };
  const parentY = lastAutoTableParent.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text('Parent Information', 20, parentY);
  doc.setFontSize(10);

  const parentInfo = [
    ['Parent Name', student.parentName ?? 'N/A'],
    ['Parent Phone', student.parentPhone ?? 'N/A'],
    ['Parent Email', student.parentEmail ?? 'N/A'],
  ];

  doc.autoTable({
    startY: parentY + 5,
    head: [['Field', 'Value']],
    body: parentInfo,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 20, right: 20 },
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      'Page ' + i + ' of ' + pageCount,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'ScholaRise ERP - Confidential',
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  return doc;
};

export const generateStudentListPDF = (students: Student[]): jsPDF => {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.text('Student List', 105, 15, { align: 'center' });

  // Add school info
  doc.setFontSize(12);
  doc.text('ScholaRise ERP', 105, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Generated on: ' + new Date().toLocaleDateString(), 105, 30, { align: 'center' });

  // Prepare data for table
  const tableData = students.map(student => [
    student.admissionNumber,
    `${student.firstName} ${student.lastName}`,
    `${student.class} ${student.section}`,
    student.gender,
    student.parentName ?? 'N/A',
    student.phone ?? 'N/A',
  ]);

  // Add table
  doc.autoTable({
    startY: 40,
    head: [['Admission No.', 'Name', 'Class', 'Gender', 'Parent', 'Contact']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 10, right: 10 },
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      'Page ' + i + ' of ' + pageCount,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'ScholaRise ERP - Confidential',
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  return doc;
};
