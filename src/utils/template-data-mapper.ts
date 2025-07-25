export interface DataFieldOption {
  value: string;
  label: string;
  description: string;
  category: 'student' | 'parent' | 'financial' | 'academic' | 'other';
}

export interface TemplateDataMapping {
  variableName: string;
  dataField: string;
  fallbackValue?: string;
}

export const AVAILABLE_DATA_FIELDS: DataFieldOption[] = [
  // Student Data - Always refers to the child, even when messaging parents
  { value: 'student_name', label: 'Student Name', description: 'Full name of the student (child\'s name even when messaging parents)', category: 'student' },
  { value: 'student_first_name', label: 'Student First Name', description: 'Student\'s first name only', category: 'student' },
  { value: 'student_admission_number', label: 'Admission Number', description: 'Student\'s admission/enrollment number', category: 'student' },
  { value: 'student_roll_number', label: 'Roll Number', description: 'Student\'s roll number', category: 'student' },
  { value: 'student_class', label: 'Class Name', description: 'Student\'s current class (always child\'s class, even when messaging parents)', category: 'academic' },
  { value: 'student_section', label: 'Section Name', description: 'Student\'s current section (always child\'s section, even when messaging parents)', category: 'academic' },
  { value: 'class', label: 'Class', description: 'Student\'s class - shorthand (always child\'s class, even when messaging parents)', category: 'academic' },
  { value: 'section', label: 'Section', description: 'Student\'s section - shorthand (always child\'s section, even when messaging parents)', category: 'academic' },
  { value: 'class_and_section', label: 'Class & Section', description: 'Student\'s class and section combined - always child\'s info (e.g., "Class 5 - A")', category: 'academic' },
  
  // Contact Person Data
  { value: 'contact_person_name', label: 'Contact Person Name', description: 'Name of the person receiving the message (student/father/mother/teacher/employee)', category: 'parent' },
  { value: 'parent_name', label: 'Parent Name', description: 'Name of the parent (backward compatibility)', category: 'parent' },
  { value: 'father_name', label: 'Father Name', description: 'Student father name', category: 'parent' },
  { value: 'mother_name', label: 'Mother Name', description: 'Student mother name', category: 'parent' },
  { value: 'guardian_name', label: 'Guardian Name', description: 'Student guardian name', category: 'parent' },
  
  // Staff Data (for teacher/employee messaging)
  { value: 'first_name', label: 'First Name', description: 'First name of the contact person (teacher/employee)', category: 'other' },
  { value: 'last_name', label: 'Last Name', description: 'Last name of the contact person (teacher/employee)', category: 'other' },
  { value: 'employee_code', label: 'Employee Code', description: 'Employee/Teacher ID code', category: 'other' },
  { value: 'designation', label: 'Designation', description: 'Job title/position of the staff member', category: 'other' },
  
  // Financial Data
  { value: 'total_fee_due', label: 'Total Fee Due', description: 'Total outstanding fee amount', category: 'financial' },
  { value: 'fee_due_amount', label: 'Current Due Amount', description: 'Current term fee due', category: 'financial' },
  { value: 'fee_due_date', label: 'Fee Due Date', description: 'Next payment due date', category: 'financial' },
  { value: 'last_payment_date', label: 'Last Payment Date', description: 'Date of last fee payment', category: 'financial' },
  { value: 'next_installment', label: 'Next Installment Amount', description: 'Next installment amount', category: 'financial' },
  
  // Academic Data
  { value: 'academic_session', label: 'Academic Session', description: 'Current academic year/session', category: 'academic' },
  { value: 'current_term', label: 'Current Term', description: 'Current academic term', category: 'academic' },
  { value: 'attendance_percentage', label: 'Attendance %', description: 'Student attendance percentage', category: 'academic' },
  { value: 'last_exam_result', label: 'Last Exam Result', description: 'Latest examination result', category: 'academic' },
  
  // Other Data
  { value: 'school_name', label: 'School Name', description: 'Name of the institution', category: 'other' },
  { value: 'branch_name', label: 'Branch Name', description: 'School branch name', category: 'other' },
  { value: 'current_date', label: 'Current Date', description: 'Today\'s date', category: 'other' },
  { value: 'recipient_phone', label: 'Phone Number', description: 'Recipient phone number', category: 'other' },
  { value: 'custom_value', label: 'Custom Value', description: 'Enter a custom value', category: 'other' },
];

export const DATA_FIELD_CATEGORIES = {
  student: { label: 'Student Information', color: 'blue' },
  parent: { label: 'Contact Person & Parent Information', color: 'green' },
  financial: { label: 'Financial Information', color: 'red' },
  academic: { label: 'Academic Information', color: 'purple' },
  other: { label: 'Other Information', color: 'gray' }
};

/**
 * Extract actual data from recipient based on data field mapping
 */
export function extractRecipientData(recipient: any, dataField: string, fallbackValue?: string): string {
  // Add debugging for student data extraction issues
  if (dataField.startsWith('student_') || dataField === 'class' || dataField === 'section') {
    console.log(`🔍 Template Data Debug - ${dataField}:`, {
      dataField,
      hasRecipient: !!recipient,
      hasAdditional: !!recipient?.additional,
      hasStudent: !!recipient?.additional?.student,
      studentData: recipient?.additional?.student,
      recipientStructure: {
        id: recipient?.id,
        name: recipient?.name,
        type: recipient?.type,
        className: recipient?.className,
        additionalKeys: recipient?.additional ? Object.keys(recipient.additional) : [],
      }
    });
  }

  switch (dataField) {
    // Student data - ALWAYS refers to the child, even when messaging parents
    case 'student_name':
      return recipient.additional?.student?.name || fallbackValue || '';
    case 'student_first_name':
      return recipient.additional?.student?.firstName || recipient.additional?.firstName || fallbackValue || '';
    case 'student_admission_number':
      return recipient.additional?.student?.admissionNumber || fallbackValue || '';
    case 'student_roll_number':
      return recipient.additional?.student?.rollNumber?.toString() || fallbackValue || '';
    case 'student_class':
    case 'class':
      // Always refers to the student's class, even when messaging parents
      return recipient.additional?.student?.class?.name || recipient.className || fallbackValue || '';
    case 'student_section':
    case 'section':
      // Always refers to the student's section, even when messaging parents
      return recipient.additional?.student?.section?.name || fallbackValue || '';
    case 'class_and_section':
      // Combines student's class and section (e.g., "Class 5 - A")
      // Always refers to the student's class and section, even when messaging parents
      const className = recipient.additional?.student?.class?.name || recipient.className || '';
      const sectionName = recipient.additional?.student?.section?.name || '';
      if (className && sectionName) {
        return `${className} - ${sectionName}`;
      } else if (className) {
        return className;
      }
      return fallbackValue || '';
    
    // Contact Person data (the actual person the phone number belongs to)
    case 'contact_person_name':
    case 'parent_name':
      return recipient.additional?.contactPersonName || recipient.name || fallbackValue || '';
    case 'father_name':
      return recipient.additional?.parent?.fatherName || fallbackValue || '';
    case 'mother_name':
      return recipient.additional?.parent?.motherName || fallbackValue || '';
    case 'guardian_name':
      return recipient.additional?.parent?.guardianName || fallbackValue || '';
    
    // Staff data (for teachers and employees)
    case 'first_name':
      return recipient.additional?.firstName || fallbackValue || '';
    case 'last_name':
      return recipient.additional?.lastName || fallbackValue || '';
    case 'employee_code':
      return recipient.additional?.employeeCode || fallbackValue || '';
    case 'designation':
      return recipient.additional?.designation || fallbackValue || '';
    
    // Financial data
    case 'total_fee_due':
      return recipient.additional?.totalFeeDue || recipient.additional?.feeAmount || fallbackValue || '0';
    case 'fee_due_amount':
      return recipient.additional?.currentDue || recipient.additional?.feeAmount || fallbackValue || '0';
    case 'fee_due_date':
      return recipient.additional?.dueDate || recipient.additional?.feeDueDate || fallbackValue || '';
    case 'last_payment_date':
      return recipient.additional?.lastPaymentDate || fallbackValue || '';
    case 'next_installment':
      return recipient.additional?.nextInstallment || fallbackValue || '0';
    
    // Academic data
    case 'academic_session':
      return recipient.additional?.academicSession || recipient.additional?.session || fallbackValue || '';
    case 'current_term':
      return recipient.additional?.currentTerm || recipient.additional?.term || fallbackValue || '';
    case 'attendance_percentage':
      return recipient.additional?.attendancePercentage || fallbackValue || '';
    case 'last_exam_result':
      return recipient.additional?.lastExamResult || fallbackValue || '';
    
    // Other data
    case 'school_name':
      return recipient.additional?.schoolName || recipient.additional?.branchName || fallbackValue || '';
    case 'branch_name':
      return recipient.additional?.branchName || fallbackValue || '';
    case 'current_date':
      return new Date().toLocaleDateString();
    case 'recipient_phone':
      return recipient.phone || fallbackValue || '';
    case 'custom_value':
      return fallbackValue || '';
    
    default:
      return fallbackValue || '';
  }
}

/**
 * Build template parameters from data mappings and recipients
 */
export function buildTemplateParameters(
  recipients: any[],
  dataMappings: TemplateDataMapping[]
): Record<string, Record<string, string>> {
  const recipientParameters: Record<string, Record<string, string>> = {};
  
  recipients.forEach(recipient => {
    const parameters: Record<string, string> = {};
    
    dataMappings.forEach(mapping => {
      const value = extractRecipientData(recipient, mapping.dataField, mapping.fallbackValue);
      parameters[mapping.variableName] = value;
    });
    
    recipientParameters[recipient.id] = parameters;
  });
  
  return recipientParameters;
}

/**
 * Get a preview of what data would be populated for first recipient
 */
export function getTemplateDataPreview(
  recipients: any[],
  dataMappings: TemplateDataMapping[]
): Record<string, string> {
  if (recipients.length === 0 || dataMappings.length === 0) return {};
  
  const firstRecipient = recipients[0];
  const preview: Record<string, string> = {};
  
  dataMappings.forEach(mapping => {
    const value = extractRecipientData(firstRecipient, mapping.dataField, mapping.fallbackValue);
    preview[mapping.variableName] = value;
  });
  
  return preview;
}

/**
 * Validate that all required mappings are configured
 */
export function validateDataMappings(
  templateVariables: string[],
  dataMappings: TemplateDataMapping[]
): { isValid: boolean; missingVariables: string[] } {
  const mappedVariables = dataMappings.map(m => m.variableName);
  const missingVariables = templateVariables.filter(v => !mappedVariables.includes(v));
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
} 