import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TCData {
  tcNumber: string;
  issueDate: Date;
  reason?: string;
  remarks?: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    dateOfBirth: Date;
    gender: string;
    class?: {
      name: string;
      section: string;
    };
    parent?: {
      fatherName?: string;
      motherName?: string;
      guardianName?: string;
    };
    branch: {
      name: string;
      address?: string;
      city?: string;
      state?: string;
    };
    dateOfAdmission: Date;
  };
}

// Helper function to wrap text
const wrapText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const testWidth = doc.getTextWidth(testLine);
    
    if (testWidth > maxWidth && i > 0) {
      doc.text(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  doc.text(line.trim(), x, currentY);
  return currentY + lineHeight;
};

export const generateTransferCertificatePDF = (tcData: TCData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - (2 * margin);

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text('TRANSFER CERTIFICATE', pageWidth / 2, 20, { align: 'center' });

  // School info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(tcData.student.branch.name, pageWidth / 2, 32, { align: 'center' });
  
  let currentY = 38;
  if (tcData.student.branch.address) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const address = `${tcData.student.branch.address}${tcData.student.branch.city ? ', ' + tcData.student.branch.city : ''}${tcData.student.branch.state ? ', ' + tcData.student.branch.state : ''}`;
    doc.text(address, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }

  // TC Number and Date
  currentY += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`TC No: ${tcData.tcNumber}`, margin, currentY);
  doc.text(`Date: ${tcData.issueDate.toLocaleDateString()}`, pageWidth - margin - 50, currentY);

  // Main content
  currentY += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const lineHeight = 5;

  // Student details
  const studentName = `${tcData.student.firstName} ${tcData.student.lastName}`;
  const parentName = tcData.student.parent?.fatherName || 
                    tcData.student.parent?.motherName || 
                    tcData.student.parent?.guardianName || 
                    'N/A';

  // Main certification text with proper wrapping
  const certificationText = `This is to certify that ${studentName}, ${tcData.student.gender === 'Male' ? 'son' : 'daughter'} of ${parentName}, was a bonafide student of this institution.`;
  currentY = wrapText(doc, certificationText, margin, currentY, contentWidth, lineHeight);
  currentY += 2;

  // Student details in a structured format
  const studentDetails = [
    `Admission Number: ${tcData.student.admissionNumber}`,
    `Date of Birth: ${tcData.student.dateOfBirth.toLocaleDateString()}`,
    `Class: ${tcData.student.class?.name || 'N/A'} ${tcData.student.class?.section || ''}`,
    `Date of Admission: ${tcData.student.dateOfAdmission.toLocaleDateString()}`,
    `Date of Leaving: ${tcData.issueDate.toLocaleDateString()}`,
  ];

  studentDetails.forEach((detail) => {
    currentY = wrapText(doc, detail, margin, currentY, contentWidth, lineHeight);
  });

  currentY += 3;

  // Reason for leaving
  if (tcData.reason) {
    const reasonText = `Reason for leaving: ${tcData.reason}`;
    currentY = wrapText(doc, reasonText, margin, currentY, contentWidth, lineHeight);
  } else {
    currentY = wrapText(doc, 'The student has left the school on his/her own accord.', margin, currentY, contentWidth, lineHeight);
  }

  currentY += 6;

  // Character certificate
  doc.setFont("helvetica", "bold");
  doc.text('CHARACTER CERTIFICATE:', margin, currentY);
  currentY += lineHeight;
  doc.setFont("helvetica", "normal");
  currentY = wrapText(doc, 'The student\'s character and conduct have been satisfactory during the period of study in this institution.', margin, currentY, contentWidth, lineHeight);

  currentY += 6;

  // Additional remarks
  if (tcData.remarks) {
    doc.setFont("helvetica", "bold");
    doc.text('REMARKS:', margin, currentY);
    currentY += lineHeight;
    doc.setFont("helvetica", "normal");
    currentY = wrapText(doc, tcData.remarks, margin, currentY, contentWidth, lineHeight);
    currentY += 3;
  }

  // Academic performance table
  currentY += 3;
  doc.setFont("helvetica", "bold");
  doc.text('ACADEMIC RECORD:', margin, currentY);
  currentY += 5;

  // Use the autoTable function directly with compact styling
  autoTable(doc, {
    startY: currentY,
    head: [['Class', 'Session', 'Result', 'Percentage/Grade']],
    body: [
      [tcData.student.class?.name || 'N/A', new Date().getFullYear().toString(), 'Pass', 'As per records'],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185], 
      textColor: 255,
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
  });

  // Get the Y position after the table
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Final statements
  doc.setFont("helvetica", "normal");
  const finalStatements = [
    '• The student is eligible for admission to any school/college.',
    '• No dues are pending against the student.',
    '• All school property has been returned.',
  ];

  finalStatements.forEach((statement) => {
    currentY = wrapText(doc, statement, margin, currentY, contentWidth, lineHeight);
  });

  // Signature section - compact layout
  currentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  // Two column layout for signatures
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;
  
  doc.text('Principal\'s Signature:', leftColX, currentY);
  doc.text('Date:', rightColX, currentY);
  
  // Signature lines
  doc.line(leftColX, currentY + 10, leftColX + 70, currentY + 10);
  doc.line(rightColX, currentY + 10, rightColX + 50, currentY + 10);

  currentY += 18;
  doc.text('School Seal:', leftColX, currentY);

  // Draw a smaller box for school seal
  doc.rect(leftColX, currentY + 3, 40, 20);
  doc.setFontSize(7);
  doc.text('(School Seal)', leftColX + 8, currentY + 15);

  // Footer - compact
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const footerY = pageHeight - 15;
  doc.text('This is a computer generated Transfer Certificate', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, footerY + 4, { align: 'center' });

  // Page border
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  return doc;
}; 