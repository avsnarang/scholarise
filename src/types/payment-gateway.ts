// Enums from Prisma
import { PaymentGateway, PaymentStatus } from '@prisma/client';

export { PaymentGateway, PaymentStatus };

// Core payment gateway types
export interface PaymentGatewayTransaction {
  id: string;
  gatewayTransactionId?: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  status: PaymentStatus;
  studentId: string;
  branchId: string;
  sessionId: string;
  feeTermId: string;
  paymentRequestId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  failureReason?: string;
  gatewayResponse?: any;
  webhookData?: any;
  refundAmount?: number;
  refundReason?: string;
  expiresAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequest {
  id: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  status: PaymentStatus;
  studentId: string;
  branchId: string;
  sessionId: string;
  feeTermId: string;
  purpose: string;
  description?: string;
  gatewayRequestId?: string;
  paymentUrl?: string;
  shortUrl?: string;
  fees: PaymentRequestFee[];
  buyerName: string;
  buyerEmail?: string;
  buyerPhone: string;
  redirectUrl?: string;
  webhookUrl?: string;
  expiresAt?: Date;
  completedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequestFee {
  feeHeadId: string;
  feeHeadName: string;
  amount: number;
}

export interface PaymentWebhookLog {
  id: string;
  gateway: PaymentGateway;
  event: string;
  transactionId?: string;
  requestId?: string;
  headers?: any;
  payload: any;
  processed: boolean;
  processingError?: string;
  createdAt: Date;
}

// Extended FeeCollection with gateway fields
export interface FeeCollectionWithGateway {
  id: string;
  receiptNumber: string;
  studentId: string;
  feeTermId: string;
  totalAmount: number;
  paidAmount: number;
  paymentMode: string;
  transactionReference?: string;
  paymentDate: Date;
  notes?: string;
  status: string;
  branchId: string;
  sessionId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  gatewayTransactionId?: string;
  paymentRequestId?: string;
  gateway?: PaymentGateway;
}

// API Request/Response types
export interface CreatePaymentRequestData {
  studentId: string;
  branchId: string;
  sessionId: string;
  feeTermId: string;
  fees: PaymentRequestFee[];
  buyerName: string;
  buyerEmail?: string;
  buyerPhone: string;
  purpose: string;
  description?: string;
  expiryHours?: number; // Hours from now
}

export interface CreatePaymentRequestResponse {
  success: boolean;
  data?: {
    paymentRequestId: string;
    paymentUrl: string;
    transactionId: string;
    expiresAt: Date;
  };
  error?: string;
}

export interface ProcessPaymentWebhookData {
  gateway: PaymentGateway;
  event: string;
  payload: any;
  headers?: any;
}

export interface ProcessPaymentWebhookResponse {
  success: boolean;
  processed: boolean;
  transactionId?: string;
  status?: PaymentStatus;
  error?: string;
}

export interface PaymentHistoryFilter {
  branchId: string;
  sessionId: string;
  studentId?: string;
  feeTermId?: string;
  paymentMode?: string;
  gateway?: PaymentGateway;
  status?: PaymentStatus | string; // string for manual payments
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: string;
}

export interface PaymentHistoryItem {
  id: string;
  receiptNumber?: string; // For manual payments
  transactionId?: string; // For gateway payments
  studentName: string;
  studentAdmissionNumber: string;
  className?: string;
  sectionName?: string;
  feeTermName: string;
  amount: number;
  paymentMode: string;
  gateway?: PaymentGateway;
  status: PaymentStatus | string;
  paymentDate: Date;
  transactionReference?: string;
  gatewayTransactionId?: string;
  type: 'manual' | 'gateway';
  notes?: string;
  createdAt: Date;
}

export interface PaymentHistoryResponse {
  items: PaymentHistoryItem[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

// Real-time payment update types
export interface PaymentStatusUpdate {
  type: 'payment_status_update';
  data: {
    transactionId: string;
    paymentRequestId?: string;
    studentId: string;
    status: PaymentStatus;
    amount: number;
    gatewayTransactionId?: string;
    paidAt?: Date;
    failureReason?: string;
  };
}

export interface PaymentSuccessNotification {
  type: 'payment_success';
  data: {
    studentId: string;
    studentName: string;
    amount: number;
    receiptNumber?: string;
    transactionId: string;
    feeTermName: string;
    gateway: PaymentGateway;
    paidAt: Date;
  };
}

// Component props interfaces
export interface PaymentGatewayButtonProps {
  studentId: string;
  selectedFees: Array<{
    feeHeadId: string;
    feeHeadName: string;
    amount: number;
  }>;
  feeTermId: string;
  feeTermName: string;
  totalAmount: number;
  onPaymentInitiated?: (paymentRequestId: string) => void;
  onPaymentSuccess?: (transaction: PaymentGatewayTransaction) => void;
  onPaymentFailure?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export interface PaymentStatusIndicatorProps {
  status: PaymentStatus;
  gateway?: PaymentGateway;
  failureReason?: string;
  showDetails?: boolean;
}

export interface PaymentHistoryTableProps {
  branchId: string;
  sessionId: string;
  filters?: Partial<PaymentHistoryFilter>;
  onRowSelect?: (payment: PaymentHistoryItem) => void;
  showExportButton?: boolean;
}

// Utility types
export type PaymentMethodType = 'manual' | 'gateway';

export interface PaymentSummary {
  totalAmount: number;
  manualAmount: number;
  gatewayAmount: number;
  totalTransactions: number;
  manualTransactions: number;
  gatewayTransactions: number;
  pendingAmount: number;
  failedAmount: number;
}

export interface GatewayPaymentStats {
  [PaymentGateway.EASEBUZZ]?: {
    totalAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
  };
  [PaymentGateway.RAZORPAY]?: {
    totalAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
  };
  [PaymentGateway.PAYTM]?: {
    totalAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
  };
  [PaymentGateway.STRIPE]?: {
    totalAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
  };
} 