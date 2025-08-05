import type { PaymentHistoryItem } from '@/types/payment-gateway';

/**
 * Utility functions for sharing fee receipts via WhatsApp
 */

export interface ReceiptShareData {
  receiptNumber: string;
  studentName: string;
  studentAdmissionNumber: string;
  amount: number;
  paymentDate: Date;
  paymentMode: string;
  feeBreakdown: Array<{
    feeHeadName: string;
    feeTermName: string;
    amount: number;
  }>;
  schoolName?: string;
  branchName?: string;
  sessionName?: string;
  transactionId?: string;
  isGatewayPayment: boolean;
}

/**
 * Convert payment history item to receipt share data
 */
export function paymentToReceiptShareData(payment: PaymentHistoryItem): ReceiptShareData {
  return {
    receiptNumber: payment.receiptNumber || payment.transactionId || '',
    studentName: payment.studentName,
    studentAdmissionNumber: payment.studentAdmissionNumber,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentMode: payment.paymentMode || 'Unknown',
    feeBreakdown: (payment.feesBreakdown || []).map(fee => ({
      feeHeadName: fee.feeHeadName,
      feeTermName: payment.feeTermName || 'Unknown Term',
      amount: fee.amount,
    })),
    schoolName: 'TSH School', // You can make this dynamic
    branchName: payment.branchName,
    sessionName: payment.sessionName,
    transactionId: payment.transactionId,
    isGatewayPayment: payment.type === 'gateway',
  };
}

/**
 * Format receipt data for WhatsApp message
 */
export function formatReceiptForWhatsApp(receiptData: ReceiptShareData): string {
  const { 
    receiptNumber, 
    studentName, 
    studentAdmissionNumber, 
    amount, 
    paymentDate, 
    paymentMode,
    feeBreakdown,
    schoolName,
    branchName,
    sessionName,
    transactionId,
    isGatewayPayment
  } = receiptData;

  // Format date
  const formattedDate = paymentDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Format amount in Indian numbering system
  const formattedAmount = amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Build message
  let message = `📧 *FEE RECEIPT*\n\n`;
  
  if (schoolName) {
    message += `🏫 *${schoolName}*\n`;
  }
  if (branchName) {
    message += `📍 ${branchName}\n`;
  }
  if (sessionName) {
    message += `📅 Academic Session: ${sessionName}\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Receipt details
  message += `📄 *Receipt No:* ${receiptNumber}\n`;
  message += `👤 *Student Name:* ${studentName}\n`;
  message += `🆔 *Admission No:* ${studentAdmissionNumber}\n`;
  message += `📅 *Payment Date:* ${formattedDate}\n`;
  message += `💳 *Payment Mode:* ${paymentMode}`;
  
  if (isGatewayPayment && transactionId) {
    message += ` (Online)\n`;
    message += `🔗 *Transaction ID:* ${transactionId}\n`;
  } else {
    message += ` (Manual)\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Fee breakdown
  if (feeBreakdown && feeBreakdown.length > 0) {
    message += `📊 *FEE BREAKDOWN:*\n\n`;
    feeBreakdown.forEach((fee, index) => {
      const feeAmount = fee.amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      message += `${index + 1}. ${fee.feeHeadName}`;
      if (fee.feeTermName) {
        message += ` (${fee.feeTermName})`;
      }
      message += `\n   Amount: ${feeAmount}\n\n`;
    });
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }
  
  // Total amount
  message += `💰 *TOTAL AMOUNT: ${formattedAmount}*\n\n`;
  
  // Footer
  message += `✅ Payment received successfully.\n`;
  message += `📞 For any queries, please contact the school office.\n\n`;
  message += `Thank you! 🙏`;
  
  return message;
}

/**
 * Generate WhatsApp URL for sharing receipt
 */
export function generateWhatsAppShareUrl(phoneNumber: string, receiptData: ReceiptShareData): string {
  const message = formatReceiptForWhatsApp(receiptData);
  const encodedMessage = encodeURIComponent(message);
  
  // Clean phone number (remove any non-numeric characters except +)
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Open WhatsApp share dialog
 */
export function shareReceiptViaWhatsApp(phoneNumber: string, receiptData: ReceiptShareData): void {
  const whatsappUrl = generateWhatsAppShareUrl(phoneNumber, receiptData);
  window.open(whatsappUrl, '_blank');
}

/**
 * Copy receipt text to clipboard
 */
export async function copyReceiptToClipboard(receiptData: ReceiptShareData): Promise<boolean> {
  try {
    const message = formatReceiptForWhatsApp(receiptData);
    await navigator.clipboard.writeText(message);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}