// Template Variables System for WhatsApp Templates

export interface TemplateVariable {
  key: string;
  name: string;
  description: string;
  category: string;
  example: string;
  dataType: 'text' | 'number' | 'date' | 'phone' | 'email';
  required?: boolean;
}

export interface VariableCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  variables: TemplateVariable[];
}

// Pre-defined ERP Variables
export const ERP_VARIABLES: VariableCategory[] = [
  {
    id: 'student',
    name: 'Student Details',
    description: 'Student information and academic details',
    icon: '👨‍🎓',
    variables: [
      {
        key: 'student_name',
        name: 'Student Name',
        description: 'Full name of the student',
        category: 'student',
        example: 'John Doe',
        dataType: 'text',
        required: true
      },
      {
        key: 'student_first_name',
        name: 'Student First Name',
        description: 'First name of the student',
        category: 'student',
        example: 'John',
        dataType: 'text'
      },
      {
        key: 'student_admission_number',
        name: 'Admission Number',
        description: 'Student admission/roll number',
        category: 'student',
        example: 'ADM-2024-001',
        dataType: 'text'
      },
      {
        key: 'student_class',
        name: 'Class',
        description: 'Student class',
        category: 'student',
        example: '10th Grade',
        dataType: 'text'
      },
      {
        key: 'student_section',
        name: 'Section',
        description: 'Student section',
        category: 'student',
        example: 'Section A',
        dataType: 'text'
      },
      {
        key: 'student_roll_number',
        name: 'Roll Number',
        description: 'Student roll number in class',
        category: 'student',
        example: '15',
        dataType: 'number'
      }
    ]
  },
  {
    id: 'parent',
    name: 'Parent Details',
    description: 'Parent and guardian contact information',
    icon: '👨‍👩‍👧‍👦',
    variables: [
      {
        key: 'parent_name',
        name: 'Parent Name',
        description: 'Primary parent/guardian name',
        category: 'parent',
        example: 'Mr. Robert Doe',
        dataType: 'text'
      },
      {
        key: 'father_name',
        name: 'Father Name',
        description: 'Father\'s full name',
        category: 'parent',
        example: 'Mr. Robert Doe',
        dataType: 'text'
      },
      {
        key: 'mother_name',
        name: 'Mother Name',
        description: 'Mother\'s full name',
        category: 'parent',
        example: 'Mrs. Sarah Doe',
        dataType: 'text'
      },
      {
        key: 'parent_phone',
        name: 'Parent Phone',
        description: 'Primary parent contact number',
        category: 'parent',
        example: '+91-9876543210',
        dataType: 'phone'
      },
      {
        key: 'parent_email',
        name: 'Parent Email',
        description: 'Parent email address',
        category: 'parent',
        example: 'parent@example.com',
        dataType: 'email'
      }
    ]
  },
  {
    id: 'academic',
    name: 'Academic Details',
    description: 'Academic session, terms, and examination information',
    icon: '📚',
    variables: [
      {
        key: 'academic_session',
        name: 'Academic Session',
        description: 'Current academic year',
        category: 'academic',
        example: '2024-25',
        dataType: 'text'
      },
      {
        key: 'term_name',
        name: 'Term Name',
        description: 'Current term/semester',
        category: 'academic',
        example: 'Term 1',
        dataType: 'text'
      },
      {
        key: 'exam_name',
        name: 'Examination Name',
        description: 'Name of the examination',
        category: 'academic',
        example: 'Mid-Term Examination',
        dataType: 'text'
      },
      {
        key: 'subject_name',
        name: 'Subject Name',
        description: 'Subject name',
        category: 'academic',
        example: 'Mathematics',
        dataType: 'text'
      },
      {
        key: 'marks_obtained',
        name: 'Marks Obtained',
        description: 'Marks scored by student',
        category: 'academic',
        example: '85',
        dataType: 'number'
      },
      {
        key: 'total_marks',
        name: 'Total Marks',
        description: 'Maximum marks for the test',
        category: 'academic',
        example: '100',
        dataType: 'number'
      },
      {
        key: 'percentage',
        name: 'Percentage',
        description: 'Percentage scored',
        category: 'academic',
        example: '85%',
        dataType: 'text'
      },
      {
        key: 'grade',
        name: 'Grade',
        description: 'Grade obtained',
        category: 'academic',
        example: 'A+',
        dataType: 'text'
      }
    ]
  },
  {
    id: 'fee',
    name: 'Fee Details',
    description: 'Fee structure, payments, and due amounts',
    icon: '💰',
    variables: [
      {
        key: 'fee_amount',
        name: 'Fee Amount',
        description: 'Total fee amount',
        category: 'fee',
        example: '₹15,000',
        dataType: 'text'
      },
      {
        key: 'fee_due_amount',
        name: 'Due Amount',
        description: 'Outstanding fee amount',
        category: 'fee',
        example: '₹5,000',
        dataType: 'text'
      },
      {
        key: 'fee_due_date',
        name: 'Due Date',
        description: 'Fee payment due date',
        category: 'fee',
        example: '15th March 2024',
        dataType: 'date'
      },
      {
        key: 'fee_head_name',
        name: 'Fee Head',
        description: 'Type of fee (e.g., Tuition, Transport)',
        category: 'fee',
        example: 'Tuition Fee',
        dataType: 'text'
      },
      {
        key: 'payment_amount',
        name: 'Payment Amount',
        description: 'Amount paid',
        category: 'fee',
        example: '₹10,000',
        dataType: 'text'
      },
      {
        key: 'payment_date',
        name: 'Payment Date',
        description: 'Date of payment',
        category: 'fee',
        example: '10th February 2024',
        dataType: 'date'
      },
      {
        key: 'payment_mode',
        name: 'Payment Mode',
        description: 'Method of payment',
        category: 'fee',
        example: 'Online Banking',
        dataType: 'text'
      },
      {
        key: 'receipt_number',
        name: 'Receipt Number',
        description: 'Payment receipt number',
        category: 'fee',
        example: 'REC-2024-001',
        dataType: 'text'
      }
    ]
  },
  {
    id: 'attendance',
    name: 'Attendance Details',
    description: 'Student attendance and leave information',
    icon: '📅',
    variables: [
      {
        key: 'attendance_percentage',
        name: 'Attendance Percentage',
        description: 'Overall attendance percentage',
        category: 'attendance',
        example: '92%',
        dataType: 'text'
      },
      {
        key: 'present_days',
        name: 'Present Days',
        description: 'Number of days present',
        category: 'attendance',
        example: '185',
        dataType: 'number'
      },
      {
        key: 'absent_days',
        name: 'Absent Days',
        description: 'Number of days absent',
        category: 'attendance',
        example: '15',
        dataType: 'number'
      },
      {
        key: 'total_days',
        name: 'Total Days',
        description: 'Total working days',
        category: 'attendance',
        example: '200',
        dataType: 'number'
      },
      {
        key: 'attendance_date',
        name: 'Date',
        description: 'Specific attendance date',
        category: 'attendance',
        example: '15th March 2024',
        dataType: 'date'
      }
    ]
  },
  {
    id: 'staff',
    name: 'Staff Details',
    description: 'Teacher and employee information',
    icon: '👨‍🏫',
    variables: [
      {
        key: 'teacher_name',
        name: 'Teacher Name',
        description: 'Teacher full name',
        category: 'staff',
        example: 'Mrs. Jennifer Smith',
        dataType: 'text'
      },
      {
        key: 'employee_name',
        name: 'Employee Name',
        description: 'Employee full name',
        category: 'staff',
        example: 'Mr. David Johnson',
        dataType: 'text'
      },
      {
        key: 'employee_code',
        name: 'Employee Code',
        description: 'Employee identification code',
        category: 'staff',
        example: 'EMP-001',
        dataType: 'text'
      },
      {
        key: 'designation',
        name: 'Designation',
        description: 'Job designation',
        category: 'staff',
        example: 'Senior Mathematics Teacher',
        dataType: 'text'
      },
      {
        key: 'department',
        name: 'Department',
        description: 'Department name',
        category: 'staff',
        example: 'Mathematics Department',
        dataType: 'text'
      }
    ]
  },
  {
    id: 'school',
    name: 'School Details',
    description: 'School and branch information',
    icon: '🏫',
    variables: [
      {
        key: 'school_name',
        name: 'School Name',
        description: 'Name of the institution',
        category: 'school',
        example: 'Greenwood High School',
        dataType: 'text'
      },
      {
        key: 'branch_name',
        name: 'Branch Name',
        description: 'School branch name',
        category: 'school',
        example: 'Main Campus',
        dataType: 'text'
      },
      {
        key: 'school_address',
        name: 'School Address',
        description: 'School address',
        category: 'school',
        example: '123 Education Street, Knowledge City',
        dataType: 'text'
      },
      {
        key: 'school_phone',
        name: 'School Phone',
        description: 'School contact number',
        category: 'school',
        example: '+91-11-12345678',
        dataType: 'phone'
      },
      {
        key: 'school_email',
        name: 'School Email',
        description: 'School email address',
        category: 'school',
        example: 'info@greenwoodhigh.edu',
        dataType: 'email'
      },
      {
        key: 'principal_name',
        name: 'Principal Name',
        description: 'Principal name',
        category: 'school',
        example: 'Dr. Mary Wilson',
        dataType: 'text'
      }
    ]
  },
  {
    id: 'general',
    name: 'General Variables',
    description: 'Common variables for dates, times, and general use',
    icon: '📝',
    variables: [
      {
        key: 'current_date',
        name: 'Current Date',
        description: 'Today\'s date',
        category: 'general',
        example: '15th March 2024',
        dataType: 'date'
      },
      {
        key: 'current_time',
        name: 'Current Time',
        description: 'Current time',
        category: 'general',
        example: '2:30 PM',
        dataType: 'text'
      },
      {
        key: 'custom_message',
        name: 'Custom Message',
        description: 'Custom text message',
        category: 'general',
        example: 'Please contact the office for more details.',
        dataType: 'text'
      },
      {
        key: 'website_url',
        name: 'Website URL',
        description: 'School website URL',
        category: 'general',
        example: 'https://www.greenwoodhigh.edu',
        dataType: 'text'
      }
    ]
  }
];

// Helper functions
export const getAllVariables = (): TemplateVariable[] => {
  return ERP_VARIABLES.flatMap(category => category.variables);
};

export const getVariablesByCategory = (categoryId: string): TemplateVariable[] => {
  const category = ERP_VARIABLES.find(cat => cat.id === categoryId);
  return category ? category.variables : [];
};

export const getVariableByKey = (key: string): TemplateVariable | undefined => {
  return getAllVariables().find(variable => variable.key === key);
};

export const getCategoryByVariable = (variableKey: string): VariableCategory | undefined => {
  return ERP_VARIABLES.find(category => 
    category.variables.some(variable => variable.key === variableKey)
  );
};

// Template variable processing
export const parseTemplateVariables = (templateContent: string): string[] => {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...templateContent.matchAll(variableRegex)];
  
  return matches
    .map(match => match[1]?.trim())
    .filter((variable): variable is string => Boolean(variable))
    .filter(variable => {
      // Filter out variables that contain invalid characters for variable names
      // Allow letters, numbers, underscores, and hyphens
      const validVariableRegex = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
      if (!validVariableRegex.test(variable)) {
        console.warn(`Invalid template variable format: "{{${variable}}}" - variables should only contain letters, numbers, underscores, and hyphens`);
        return false;
      }
      return true;
    });
};

// Helper function to escape special regex characters
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export const renderTemplate = (
  templateContent: string, 
  variables: Record<string, string>
): string => {
  let renderedContent = templateContent;
  
  // Replace variables in {{variable}} format
  Object.entries(variables).forEach(([key, value]) => {
    try {
      // Escape special regex characters in the key
      const escapedKey = escapeRegExp(key);
      const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');
      renderedContent = renderedContent.replace(regex, value);
    } catch (error) {
      // If regex creation fails for any reason, skip this replacement
      console.warn(`Failed to create regex for template variable "${key}":`, error);
    }
  });
  
  return renderedContent;
};

export const validateTemplateVariables = (
  templateContent: string, 
  providedVariables: Record<string, string>
): { isValid: boolean; missingVariables: string[]; unknownVariables: string[] } => {
  const requiredVariables = parseTemplateVariables(templateContent);
  const providedVariableKeys = Object.keys(providedVariables);
  
  const missingVariables = requiredVariables.filter(
    variable => !providedVariableKeys.includes(variable)
  );
  
  const knownVariableKeys = getAllVariables().map(v => v.key);
  const unknownVariables = requiredVariables.filter(
    variable => !knownVariableKeys.includes(variable)
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    unknownVariables
  };
};

// Template examples with variables
export const TEMPLATE_EXAMPLES = [
  {
    name: 'Fee Reminder',
    category: 'UTILITY',
    content: `Dear {{parent_name}},

This is a reminder that the {{fee_head_name}} payment for {{student_name}} (Admission No: {{student_admission_number}}) is due.

Amount: {{fee_due_amount}}
Due Date: {{fee_due_date}}

Please make the payment at your earliest convenience.

Thank you,
{{school_name}}`,
    variables: ['parent_name', 'fee_head_name', 'student_name', 'student_admission_number', 'fee_due_amount', 'fee_due_date', 'school_name']
  },
  {
    name: 'Exam Results',
    category: 'UTILITY',
    content: `Dear {{parent_name}},

{{student_name}} has scored {{marks_obtained}}/{{total_marks}} ({{percentage}}) in {{subject_name}} - {{exam_name}}.

Grade: {{grade}}

Congratulations on the excellent performance!

Best regards,
{{teacher_name}}
{{school_name}}`,
    variables: ['parent_name', 'student_name', 'marks_obtained', 'total_marks', 'percentage', 'subject_name', 'exam_name', 'grade', 'teacher_name', 'school_name']
  },
  {
    name: 'Attendance Alert',
    category: 'UTILITY',
    content: `Dear {{parent_name}},

This is to inform you that {{student_name}} was absent from school on {{attendance_date}}.

Current attendance: {{attendance_percentage}} ({{present_days}}/{{total_days}} days)

Please ensure regular attendance for better academic performance.

Thank you,
{{school_name}}`,
    variables: ['parent_name', 'student_name', 'attendance_date', 'attendance_percentage', 'present_days', 'total_days', 'school_name']
  },
  {
    name: 'Payment Confirmation',
    category: 'UTILITY',
    content: `Dear {{parent_name}},

We have received your payment of {{payment_amount}} for {{student_name}} ({{student_admission_number}}).

Payment Details:
- Receipt No: {{receipt_number}}
- Date: {{payment_date}}
- Mode: {{payment_mode}}
- For: {{fee_head_name}}

Thank you for your payment.

{{school_name}}`,
    variables: ['parent_name', 'payment_amount', 'student_name', 'student_admission_number', 'receipt_number', 'payment_date', 'payment_mode', 'fee_head_name', 'school_name']
  }
]; 