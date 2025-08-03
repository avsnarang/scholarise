"use client";

interface FeeReceiptData {
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

// Helper function to generate receipt HTML
function generateReceiptHTML(data: FeeReceiptData): string {
  const parentName = data.student.parent?.fatherName || 
                    (data.student.parent?.firstName && data.student.parent?.lastName 
                      ? `${data.student.parent.firstName} ${data.student.parent.lastName}` 
                      : 'N/A');

  const feeTerms = [...new Set(data.feeItems.map(item => item.feeTermName))];
  const uniqueFeeTerms = feeTerms.join(', ');

  const convertToWords = (amount: number): string => {
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
  };

  const formatIndianCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const feeItemsHTML = data.feeItems.map((item, index) => `
    <tr>
      <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-size: 9px;">${index + 1}</td>
      <td style="border: 1px solid #000; padding: 3px 4px; font-size: 9px; line-height: 1.1;">${item.feeHeadName}</td>
      <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${item.originalAmount.toFixed(2)}</td>
      <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${item.concessionAmount.toFixed(2)}</td>
      <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${item.finalAmount.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div class="fee-receipt-container" style="width: 8.17in; height: 5.73in; max-width: 8.17in; max-height: 5.73in; padding: 0.2in; font-size: 10px; line-height: 1.1; position: relative; border: 1px solid #000; margin: 0 auto; box-sizing: border-box; overflow: hidden; background: white; color: black; font-family: Arial, sans-serif;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 6px;">
        <div style="font-size: 15px; font-weight: bold; margin-bottom: 2px;">The Scholars' Home, ${data.branch.name}</div>
        ${data.branch.address ? `<div style="font-size: 9px; color: #333; margin-bottom: 2px;">${data.branch.address}${data.branch.city ? `, ${data.branch.city}` : ''}${data.branch.state ? `, ${data.branch.state}` : ''}</div>` : ''}
        <div style="font-size: 13px; font-weight: bold; margin-top: 4px; margin-bottom: 2px;">RECEIPT</div>
        <div style="font-size: 11px; font-weight: bold;">Receipt Number: ${data.receiptData.receiptNumber}</div>
      </div>

      <!-- Session -->
      <div style="text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 8px;">Session ${data.session.name}</div>

      <!-- Student and Payment Info -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 8px;">
        <div>
          <div style="margin-bottom: 4px; font-size: 10px;"><strong>Student:</strong> ${data.student.firstName} ${data.student.lastName}</div>
          <div style="margin-bottom: 4px; font-size: 10px;"><strong>Father:</strong> ${parentName}</div>
          <div style="margin-bottom: 4px; font-size: 8px; color: #333; line-height: 1.0;"><strong>Fee Terms/Cycles:</strong><br/>${uniqueFeeTerms}</div>
        </div>
        <div>
          <div style="margin-bottom: 4px; font-size: 10px;"><strong>Class:</strong> ${data.student.section?.class?.name || 'N/A'}</div>
          <div style="margin-bottom: 4px; font-size: 10px;"><strong>Student Reg No.:</strong> ${data.student.admissionNumber}</div>
        </div>
      </div>

      <!-- Fee Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000; font-size: 9px; table-layout: fixed;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-weight: bold; font-size: 9px; width: 8%;">Sr. No</th>
            <th style="border: 1px solid #000; padding: 3px 4px; text-align: left; font-weight: bold; font-size: 9px; width: 40%;">Particulars</th>
            <th style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-weight: bold; font-size: 9px; width: 18%;">Fee Structure</th>
            <th style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-weight: bold; font-size: 9px; width: 17%;">Concession</th>
            <th style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-weight: bold; font-size: 9px; width: 17%;">Received Fee</th>
          </tr>
        </thead>
        <tbody>
          ${feeItemsHTML}
          <!-- Total Row -->
          <tr style="background-color: #f0f0f0; font-weight: bold;">
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-size: 9px;">Total</td>
            <td style="border: 1px solid #000; padding: 3px 4px; font-size: 9px;"></td>
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${data.totals.totalOriginalAmount.toFixed(2)}</td>
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${data.totals.totalConcessionAmount.toFixed(2)}</td>
            <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px; font-weight: bold;">Rs. ${formatIndianCurrency(data.totals.totalPaidAmount)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words -->
      <div style="margin-bottom: 6px; font-size: 9px;"><strong>Amount In Words:</strong> ${convertToWords(data.totals.totalPaidAmount)} Rupees Only</div>

      <!-- Payment Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
        <div>
          <div style="margin-bottom: 3px; font-size: 9px;"><strong>Mode of Payment:</strong> ${data.receiptData.paymentMode}</div>
          <div style="margin-bottom: 3px; font-size: 9px;"><strong>Payment Date:</strong> ${data.receiptData.paymentDate.toLocaleDateString('en-GB')}</div>
        </div>
        <div>
          ${data.receiptData.transactionReference ? `<div style="margin-bottom: 3px; font-size: 9px;"><strong>Reference Number:</strong> ${data.receiptData.transactionReference}</div>` : ''}
        </div>
      </div>

      <!-- Footer Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; font-size: 9px;">
        <div>
          <div style="margin-bottom: 15px;"><strong>Parent's Signature</strong></div>
          <div><strong>Receipt Date:</strong> ${data.receiptData.paymentDate.toLocaleDateString('en-GB')}</div>
        </div>
        <div style="text-align: right;">
          <div style="margin-bottom: 8px;"><strong>Received By</strong></div>
          <div style="margin-top: 15px;"><strong>Cashier's Signature</strong></div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="position: absolute; bottom: 0.1in; left: 0.2in; font-size: 8px; font-weight: bold;">Fee once paid is non-refundable except for Security.</div>
    </div>
  `;
}

export function printFeeReceiptDirectly(data: FeeReceiptData) {
  const receiptHTML = generateReceiptHTML(data);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Unable to open print window. Please check your browser settings.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fee Receipt - ${data.receiptData.receiptNumber}</title>
        <style>
          @page {
            size: A5 landscape;
            margin: 0.05in;
          }
          
          * {
            box-sizing: border-box;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
            overflow: hidden;
          }
          
          .print-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;
            margin: 0;
          }
          
          .fee-receipt-container {
            width: 8.17in !important;
            height: 5.73in !important;
            max-width: 8.17in !important;
            max-height: 5.73in !important;
            overflow: hidden;
            margin: 0;
          }
          
          @media print {
            html, body {
              width: 8.17in;
              height: 5.73in;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            
            .print-container {
              width: 8.17in;
              height: 5.73in;
              padding: 0;
              margin: 0;
              display: block;
            }
            
            .fee-receipt-container {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
          
          table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .no-print {
            display: none !important;
          }
          
          @media screen {
            body {
              background: #f0f0f0;
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${receiptHTML}
        </div>
        <script>
          // Auto-trigger print dialog after content loads
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Close window after print dialog
              window.onafterprint = function() {
                window.close();
              };
              // Fallback to close after delay if print is cancelled
              setTimeout(function() {
                window.close();
              }, 30000);
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
}

export function downloadFeeReceiptAsPDF(data: FeeReceiptData) {
  const receiptHTML = generateReceiptHTML(data);

  const downloadWindow = window.open('', '_blank');
  if (!downloadWindow) {
    alert('Unable to open download window. Please check your browser settings.');
    return;
  }

  downloadWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fee Receipt - ${data.receiptData.receiptNumber}</title>
        <style>
          @page {
            size: A5 landscape;
            margin: 0.05in;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .download-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
            padding: 20px;
          }
          
          .fee-receipt-container {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .download-actions {
            text-align: center;
            margin-top: 20px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .download-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin: 0 10px;
          }
          
          .download-btn:hover {
            background: #1d4ed8;
          }
          
          @media print {
            .download-container {
              background: white;
              min-height: auto;
              padding: 0;
              margin: 0;
              display: block;
            }
            
            .download-actions {
              display: none;
            }
            
            .fee-receipt-container {
              box-shadow: none;
              page-break-inside: avoid;
              break-inside: avoid;
              margin: 0;
              max-width: 100%;
              max-height: 100%;
              width: 8.17in !important;
              height: 5.73in !important;
            }
            
            body {
              overflow: hidden;
            }
          }
        </style>
      </head>
      <body>
        <div class="download-container">
          ${receiptHTML}
          <div class="download-actions">
            <button class="download-btn" onclick="window.print()">Save as PDF</button>
            <button class="download-btn" onclick="window.close()">Close</button>
          </div>
        </div>
      </body>
    </html>
  `);
  
  downloadWindow.document.close();
}