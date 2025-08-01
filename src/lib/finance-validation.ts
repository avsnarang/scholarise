import { z } from "zod";

// Common validation schemas
export const feeAmountSchema = z
  .number()
  .min(0, "Amount must be positive")
  .max(1000000, "Amount cannot exceed ₹10,00,000")
  .refine((val) => Number.isFinite(val), "Amount must be a valid number")
  .refine((val) => !isNaN(val), "Amount must be a number");

export const percentageSchema = z
  .number()
  .min(0, "Percentage must be positive")
  .max(100, "Percentage cannot exceed 100%");

export const phoneNumberSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number")
  .optional()
  .or(z.literal(""));

export const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .optional()
  .or(z.literal(""));

export const admissionNumberSchema = z
  .string()
  .min(1, "Admission number is required")
  .max(20, "Admission number cannot exceed 20 characters")
  .regex(/^[A-Z0-9]+$/, "Admission number must contain only uppercase letters and numbers");

export const receiptNumberSchema = z
  .string()
  .min(1, "Receipt number is required")
  .max(50, "Receipt number cannot exceed 50 characters")
  .regex(/^[A-Z0-9/-]+$/, "Receipt number contains invalid characters");

// Payment mode validation
export const paymentModeSchema = z.enum(["Cash", "Card", "Bank_Transfer", "UPI", "Cheque", "Online"], {
  errorMap: () => ({ message: "Please select a valid payment mode" })
});

// Date validation schemas
export const dueDateSchema = z
  .date()
  .refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), 
    "Due date cannot be in the past");

export const paymentDateSchema = z
  .date()
  .refine((date) => date <= new Date(), 
    "Payment date cannot be in the future");

// Fee head validation
export const feeHeadSchema = z.object({
  name: z
    .string()
    .min(1, "Fee head name is required")
    .max(100, "Fee head name cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_()]+$/, "Fee head name contains invalid characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  category: z.enum(["Tuition", "Development", "Transport", "Hostel", "Exam", "Library", "Laboratory", "Other"], {
    errorMap: () => ({ message: "Please select a valid fee category" })
  }),
  isActive: z.boolean().default(true),
  isMandatory: z.boolean().default(false),
  allowPartialPayment: z.boolean().default(true),
});

// Fee term validation
export const feeTermSchema = z.object({
  name: z
    .string()
    .min(1, "Fee term name is required")
    .max(100, "Fee term name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  dueDate: dueDateSchema,
  lateFeeDays: z
    .number()
    .min(0, "Late fee days cannot be negative")
    .max(365, "Late fee days cannot exceed 365"),
  lateFeeAmount: feeAmountSchema.optional(),
  lateFeePercentage: percentageSchema.optional(),
  isActive: z.boolean().default(true),
});

// Fee structure validation
export const feeStructureSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  feeHeadId: z.string().min(1, "Fee head is required"),
  feeTermId: z.string().min(1, "Fee term is required"),
  amount: feeAmountSchema,
  discountAmount: feeAmountSchema.optional(),
  discountPercentage: percentageSchema.optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.discountAmount && data.discountPercentage) {
      return false; // Cannot have both discount amount and percentage
    }
    if (data.discountAmount && data.discountAmount >= data.amount) {
      return false; // Discount cannot be greater than or equal to amount
    }
    return true;
  },
  {
    message: "Invalid discount configuration",
    path: ["discountAmount"],
  }
);

// Fee collection validation
export const feeCollectionSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  feeTermId: z.string().min(1, "Fee term is required"),
  paymentMode: paymentModeSchema,
  transactionReference: z
    .string()
    .max(100, "Transaction reference cannot exceed 100 characters")
    .optional(),
  paymentDate: paymentDateSchema,
  notes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),
  items: z
    .array(
      z.object({
        feeHeadId: z.string().min(1, "Fee head is required"),
        amount: feeAmountSchema,
      })
    )
    .min(1, "At least one fee item is required")
    .max(20, "Cannot process more than 20 fee items at once"),
});

// Bulk fee collection validation
export const bulkFeeCollectionSchema = z.object({
  payments: z
    .array(feeCollectionSchema)
    .min(1, "At least one payment is required")
    .max(100, "Cannot process more than 100 payments at once"),
});

// Student search validation
export const studentSearchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query cannot exceed 100 characters"),
  searchType: z.enum(["admission", "name", "phone"], {
    errorMap: () => ({ message: "Please select a valid search type" })
  }),
  classId: z.string().optional(),
  feeTermId: z.string().optional(),
});

// Fee reminder validation
export const feeReminderSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  feeHeadId: z.string().min(1, "Fee head is required"),
  reminderType: z.enum(["gentle", "urgent", "final"], {
    errorMap: () => ({ message: "Please select a valid reminder type" })
  }),
  channel: z.enum(["email", "sms", "app", "all"], {
    errorMap: () => ({ message: "Please select a valid communication channel" })
  }),
  scheduledDate: z.date().optional(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message cannot exceed 2000 characters"),
});

// Financial report validation
export const financialReportSchema = z.object({
  reportType: z.enum([
    "collection_summary",
    "outstanding_detail", 
    "daily_collection",
    "class_wise_dues",
    "fee_head_wise",
    "transaction_log"
  ], {
    errorMap: () => ({ message: "Please select a valid report type" })
  }),
  startDate: z.date(),
  endDate: z.date(),
  classId: z.string().optional(),
  feeTermId: z.string().optional(),
  feeHeadId: z.string().optional(),
  paymentMode: paymentModeSchema.optional(),
  status: z.enum(["Paid", "Pending", "Partially_Paid", "Overdue"]).optional(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
).refine(
  (data) => {
    const diffInDays = (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays <= 365;
  },
  {
    message: "Date range cannot exceed 365 days",
    path: ["endDate"],
  }
);

// Error handling utilities
export class FinanceValidationError extends Error {
  public readonly field: string;
  public readonly code: string;

  constructor(message: string, field: string, code = "VALIDATION_ERROR") {
    super(message);
    this.name = "FinanceValidationError";
    this.field = field;
    this.code = code;
  }
}

export class FinanceBusinessRuleError extends Error {
  public readonly code: string;
  public readonly details: any;

  constructor(message: string, code = "BUSINESS_RULE_ERROR", details?: any) {
    super(message);
    this.name = "FinanceBusinessRuleError";
    this.code = code;
    this.details = details;
  }
}

// Validation helper functions
export const validateFeeAmount = (amount: number, context = "amount"): number => {
  const result = feeAmountSchema.safeParse(amount);
  if (!result.success) {
    throw new FinanceValidationError(
      result.error.errors[0]?.message || "Invalid amount",
      context,
      "INVALID_AMOUNT"
    );
  }
  return result.data;
};

export const validatePaymentMode = (mode: string): string => {
  const result = paymentModeSchema.safeParse(mode);
  if (!result.success) {
    throw new FinanceValidationError(
      "Invalid payment mode",
      "paymentMode",
      "INVALID_PAYMENT_MODE"
    );
  }
  return result.data;
};

export const validateDateRange = (startDate: Date, endDate: Date): { startDate: Date; endDate: Date } => {
  if (endDate < startDate) {
    throw new FinanceValidationError(
      "End date must be after start date",
      "dateRange",
      "INVALID_DATE_RANGE"
    );
  }
  
  const diffInDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffInDays > 365) {
    throw new FinanceValidationError(
      "Date range cannot exceed 365 days",
      "dateRange",
      "DATE_RANGE_TOO_LARGE"
    );
  }
  
  return { startDate, endDate };
};

// Business rule validation
export const validateFeeCollection = (
  feeAmount: number,
  paidAmount: number,
  payingAmount: number
): void => {
  const outstanding = feeAmount - paidAmount;
  
  if (payingAmount <= 0) {
    throw new FinanceBusinessRuleError(
      "Payment amount must be greater than zero",
      "INVALID_PAYMENT_AMOUNT"
    );
  }
  
  if (payingAmount > outstanding) {
    throw new FinanceBusinessRuleError(
      `Payment amount (₹${payingAmount}) cannot exceed outstanding amount (₹${outstanding})`,
      "PAYMENT_EXCEEDS_OUTSTANDING",
      { payingAmount, outstanding }
    );
  }
};

export const validateFeeStructure = (
  amount: number,
  discountAmount?: number,
  discountPercentage?: number
): void => {
  if (discountAmount && discountPercentage) {
    throw new FinanceBusinessRuleError(
      "Cannot apply both discount amount and percentage",
      "MULTIPLE_DISCOUNT_TYPES"
    );
  }
  
  if (discountAmount && discountAmount >= amount) {
    throw new FinanceBusinessRuleError(
      "Discount amount cannot be greater than or equal to fee amount",
      "DISCOUNT_EXCEEDS_AMOUNT",
      { amount, discountAmount }
    );
  }
  
  if (discountPercentage && discountPercentage > 100) {
    throw new FinanceBusinessRuleError(
      "Discount percentage cannot exceed 100%",
      "DISCOUNT_PERCENTAGE_INVALID",
      { discountPercentage }
    );
  }
};

export const validateLateFee = (dueDate: Date, paymentDate: Date, lateFeeConfig: any): number => {
  if (paymentDate <= dueDate) {
    return 0; // No late fee if paid on time
  }
  
  const daysLate = Math.ceil((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysLate <= (lateFeeConfig.graceDays || 0)) {
    return 0; // Within grace period
  }
  
  let lateFee = 0;
  
  if (lateFeeConfig.type === 'fixed') {
    lateFee = lateFeeConfig.amount || 0;
  } else if (lateFeeConfig.type === 'daily') {
    lateFee = (lateFeeConfig.dailyAmount || 0) * daysLate;
  } else if (lateFeeConfig.type === 'percentage') {
    lateFee = (lateFeeConfig.baseAmount || 0) * (lateFeeConfig.percentage || 0) / 100;
  }
  
  // Apply maximum late fee limit if configured
  if (lateFeeConfig.maxAmount && lateFee > lateFeeConfig.maxAmount) {
    lateFee = lateFeeConfig.maxAmount;
  }
  
  return Math.round(lateFee * 100) / 100; // Round to 2 decimal places
};

// Data sanitization utilities
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially harmful characters
    .substring(0, 1000); // Limit length
};

export const sanitizeNumber = (input: any): number => {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    throw new FinanceValidationError("Invalid number format", "number", "INVALID_NUMBER");
  }
  return num;
};

export const sanitizeAmount = (input: any): number => {
  const amount = sanitizeNumber(input);
  return validateFeeAmount(amount);
};

// Error message formatters
export const formatValidationError = (error: z.ZodError): { field: string; message: string }[] => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
};

export const formatFinanceError = (error: unknown): { message: string; code: string; field?: string } => {
  if (error instanceof FinanceValidationError) {
    return {
      message: error.message,
      code: error.code,
      field: error.field
    };
  }
  
  if (error instanceof FinanceBusinessRuleError) {
    return {
      message: error.message,
      code: error.code
    };
  }
  
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return {
      message: firstError?.message || "Validation error",
      code: "VALIDATION_ERROR",
      field: firstError?.path.join('.') || "unknown"
    };
  }
  
  return {
    message: error instanceof Error ? error.message : "An unexpected error occurred",
    code: "UNKNOWN_ERROR"
  };
}; 