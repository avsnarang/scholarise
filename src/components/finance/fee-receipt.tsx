"use client";

import React, { forwardRef } from 'react';
import { formatIndianCurrency } from "@/lib/utils";

interface FeeReceiptProps {
  receiptData: {
    receiptNumber: string;
    paymentDate: Date;
    paymentMode: string;
    transactionReference?: string;
    notes?: string;
  };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    section?: {
      name?: string;
      class?: {
        name: string;
      };
    };
    parent?: {
      firstName?: string;
      lastName?: string;
      fatherName?: string;
      motherName?: string;
    };
  };
  branch: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    logoUrl?: string;
  };
  session: {
    name: string;
  };
  feeItems: Array<{
    feeHeadName: string;
    feeTermName: string;
    originalAmount: number;
    concessionAmount: number;
    finalAmount: number;
    appliedConcessions?: Array<{
      name: string;
      type: 'PERCENTAGE' | 'FIXED';
      value: number;
      amount: number;
    }>;
  }>;
  totals: {
    totalOriginalAmount: number;
    totalConcessionAmount: number;
    totalNetAmount: number;
    totalPaidAmount: number;
  };
}

export const FeeReceipt = forwardRef<HTMLDivElement, FeeReceiptProps>(
  ({ receiptData, student, branch, session, feeItems, totals }, ref) => {
    const parentName = student.parent?.fatherName || 
                      (student.parent?.firstName && student.parent?.lastName 
                        ? `${student.parent.firstName} ${student.parent.lastName}` 
                        : 'N/A');

    // Group fee items by fee terms to optimize space
    const feeTerms = [...new Set(feeItems.map(item => item.feeTermName))];
    const uniqueFeeTerms = feeTerms.join(', ');

    return (
      <div 
        ref={ref} 
        className="fee-receipt-container bg-white text-black font-sans"
        style={{
          width: '8.17in', // A5 landscape width minus margins
          height: '5.73in', // A5 landscape height minus margins  
          maxWidth: '8.17in',
          maxHeight: '5.73in',
          padding: '0.2in', // Reduced padding for more content space
          fontSize: '10px', // Slightly smaller default font
          lineHeight: '1.1', // Tighter line height
          position: 'relative',
          border: '1px solid #000',
          margin: '0 auto',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ position: 'relative', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '6px' }}>
          {branch.logoUrl && (
            <div style={{ position: 'absolute', top: '0', left: '0', width: '50px', height: '50px' }}>
              <img 
                src={branch.logoUrl} 
                alt={`${branch.name} Logo`} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
          )}
          <div style={{ textAlign: 'center', paddingLeft: branch.logoUrl ? '60px' : '0' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '2px' }}>
              The Scholars' Home, {branch.name}
            </div>
            {branch.address && (
              <div style={{ fontSize: '9px', color: '#333', marginBottom: '2px' }}>
                {branch.address}{branch.city && `, ${branch.city}`}{branch.state && `, ${branch.state}`}
              </div>
            )}
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px', marginBottom: '2px' }}>
              RECEIPT
            </div>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
              Receipt Number: {receiptData.receiptNumber}
            </div>
          </div>
        </div>

        {/* Session */}
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
          Session {session.name}
        </div>

        {/* Student and Payment Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '8px' }}>
          <div>
            <div style={{ marginBottom: '4px', fontSize: '10px' }}>
              <strong>Student:</strong> {student.firstName} {student.lastName}
            </div>
            <div style={{ marginBottom: '4px', fontSize: '10px' }}>
              <strong>Father:</strong> {parentName}
            </div>
            {/* Fee Terms/Cycles */}
            <div style={{ marginBottom: '4px', fontSize: '10px', color: '#333', lineHeight: '1.0' }}>
              <strong>Fee Terms/Cycles:</strong><br/>
              {uniqueFeeTerms}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '4px', fontSize: '10px' }}>
              <strong>Class:</strong> {student.section?.class?.name || 'N/A'}
            </div>
            <div style={{ marginBottom: '4px', fontSize: '10px' }}>
              <strong>Student Reg No.:</strong> {student.admissionNumber}
            </div>
          </div>
        </div>

        {/* Fee Details Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '8px',
          border: '1px solid #000',
          fontSize: '9px',
          tableLayout: 'fixed' // Fixed layout for better column control
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '9px',
                width: '8%'
              }}>
                Sr. No
              </th>
              <th style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'left',
                fontWeight: 'bold',
                fontSize: '9px',
                width: '40%'
              }}>
                Particulars
              </th>
              <th style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '9px',
                width: '18%'
              }}>
                Fee Structure
              </th>
              <th style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '9px',
                width: '17%'
              }}>
                Concession
              </th>
              <th style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '9px',
                width: '17%'
              }}>
                Received Fee
              </th>
            </tr>
          </thead>
          <tbody>
            {feeItems.map((item, index) => (
              <tr key={index}>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '3px 4px', 
                  textAlign: 'center',
                  fontSize: '9px'
                }}>
                  {index + 1}
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '3px 4px',
                  fontSize: '9px',
                  lineHeight: '1.1'
                }}>
                  {item.feeHeadName}
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '3px 4px', 
                  textAlign: 'right',
                  fontSize: '9px'
                }}>
                  {item.originalAmount.toFixed(2)}
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '3px 4px', 
                  textAlign: 'right',
                  fontSize: '9px'
                }}>
                  {item.concessionAmount.toFixed(2)}
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '3px 4px', 
                  textAlign: 'right',
                  fontSize: '9px'
                }}>
                  {item.finalAmount.toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
              <td style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'center',
                fontSize: '9px'
              }}>
                Total
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '3px 4px',
                fontSize: '9px'
              }}>
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'right',
                fontSize: '9px'
              }}>
                {totals.totalOriginalAmount.toFixed(2)}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'right',
                fontSize: '9px'
              }}>
                {totals.totalConcessionAmount.toFixed(2)}
              </td>
              <td style={{ 
                border: '1px solid #000', 
                padding: '3px 4px', 
                textAlign: 'right',
                fontSize: '9px',
                fontWeight: 'bold'
              }}>
                Rs. {formatIndianCurrency(totals.totalPaidAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div style={{ marginBottom: '6px', fontSize: '9px' }}>
          <strong>Amount In Words:</strong> {convertToWords(totals.totalPaidAmount)} Rupees Only
        </div>

        {/* Payment Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
          <div>
            <div style={{ marginBottom: '3px', fontSize: '9px' }}>
              <strong>Mode of Payment:</strong> {receiptData.paymentMode}
            </div>
            <div style={{ marginBottom: '3px', fontSize: '9px' }}>
              <strong>Payment Date:</strong> {receiptData.paymentDate.toLocaleDateString('en-GB')}
            </div>
          </div>
          <div>
            {receiptData.transactionReference && (
              <div style={{ marginBottom: '3px', fontSize: '9px' }}>
                <strong>Reference Number:</strong> {receiptData.transactionReference}
              </div>
            )}
          </div>
        </div>

        {/* Footer Signatures */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px',
          marginTop: '12px',
          fontSize: '9px'
        }}>
          <div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Parent's Signature</strong>
            </div>
            <div>
              <strong>Receipt Date:</strong> {receiptData.paymentDate.toLocaleDateString('en-GB')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Received By</strong>
            </div>
            <div style={{ marginTop: '15px' }}>
              <strong>Cashier's Signature</strong>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ 
          position: 'absolute', 
          bottom: '0.1in', 
          left: '0.2in',
          fontSize: '8px',
          fontWeight: 'bold'
        }}>
          Fee once paid is non-refundable except for Security.
        </div>
      </div>
    );
  }
);

FeeReceipt.displayName = 'FeeReceipt';

// Helper function to convert numbers to words (simplified version)
function convertToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  }

  if (amount === 0) return 'Zero';
  
  let result = '';
  const crores = Math.floor(amount / 10000000);
  const lakhs = Math.floor((amount % 10000000) / 100000);
  const thousands = Math.floor((amount % 100000) / 1000);
  const remainder = amount % 1000;

  if (crores > 0) {
    result += convertHundreds(crores) + 'Crore ';
  }
  
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + 'Lakh ';
  }
  
  if (thousands > 0) {
    result += convertHundreds(thousands) + 'Thousand ';
  }
  
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }

  return result.trim();
}