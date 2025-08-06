// Server-side receipt service

// Server-side receipt service - no client imports needed

// Unified interface for all receipt data
export interface UnifiedReceiptData {
  receiptNumber: string;
  paymentDate: Date;
  paymentMode: string;
  transactionReference?: string;
  notes?: string;
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
  }>;
  totals: {
    totalOriginalAmount: number;
    totalConcessionAmount: number;
    totalNetAmount: number;
    totalPaidAmount: number;
  };
}

export class ReceiptService {
  
  // Legacy method - now primarily used for testing/fallback
  // Prefer using printReceiptFromData() or createReceiptFromPaymentHistoryData() + printReceipt()
  public static async printReceiptByNumber(receiptNumber: string): Promise<void> {
    console.warn('⚠️ printReceiptByNumber() is deprecated. Use printReceiptFromData() instead.');
    
    // For now, just show sample data with a warning
    alert(`Receipt printing by number is deprecated. Please use the print button from the payment history or fee collection pages instead.`);
    
    // Fallback to sample data
    const receiptData = this.getReceiptData(receiptNumber);
    this.printReceipt(receiptData);
  }

  // Enhanced method to print receipt from fee collection data directly
  public static printReceiptFromData(feeCollectionData: any): void {
    const receiptData = this.createReceiptFromPaymentHistoryData(feeCollectionData);
    this.printReceipt(receiptData);
  }

  // Get receipt data - currently hardcoded, but can be enhanced to fetch from database
  private static getReceiptData(receiptNumber: string): UnifiedReceiptData {
    // This would normally fetch from database, but for now using sample data
    // You can add more sample receipts here or implement database fetching
    
    const sampleReceipts: Record<string, UnifiedReceiptData> = {
      'TSHPS/FIN/2025-26/000001': {
        receiptNumber: 'TSHPS/FIN/2025-26/000001',
        paymentDate: new Date('2025-08-06'),
        paymentMode: "Cash",
        student: {
          firstName: "Test",
          lastName: "Student", 
          admissionNumber: "Test",
          section: {
            name: "A",
            class: {
              name: "Test"
            }
          },
          parent: {
            fatherName: "Narinder Pal Singh"
          }
        },
        branch: {
          name: "Paonta Sahib",
          address: "Jamniwala Road, Badripur",
          city: "Paonta Sahib", 
          state: "Himachal Pradesh",
          logoUrl: "/android-chrome-192x192.png"
        },
        session: {
          name: "2025-26"
        },
        feeItems: [{
          feeHeadName: "Annual Fund",
          feeTermName: "April",
          originalAmount: 10000,
          concessionAmount: 1000,
          finalAmount: 9000
        }],
        totals: {
          totalOriginalAmount: 10000,
          totalConcessionAmount: 1000,
          totalNetAmount: 9000,
          totalPaidAmount: 9000
        }
      },
      // Add more sample receipts as needed
      'default': {
        receiptNumber,
        paymentDate: new Date(),
        paymentMode: "Cash",
        student: {
          firstName: "Sample",
          lastName: "Student", 
          admissionNumber: "SAM001",
          section: {
            name: "A",
            class: {
              name: "Class X"
            }
          },
          parent: {
            fatherName: "Sample Father"
          }
        },
        branch: {
          name: "Paonta Sahib",
          address: "Jamniwala Road, Badripur",
          city: "Paonta Sahib",
          state: "Himachal Pradesh",
          logoUrl: "/android-chrome-192x192.png"
        },
        session: {
          name: "2025-26"
        },
        feeItems: [{
          feeHeadName: "Sample Fee",
          feeTermName: "Monthly",
          originalAmount: 5000,
          concessionAmount: 500,
          finalAmount: 4500
        }],
        totals: {
          totalOriginalAmount: 5000,
          totalConcessionAmount: 500,
          totalNetAmount: 4500,
          totalPaidAmount: 4500
        }
      }
    };

    return sampleReceipts[receiptNumber] || sampleReceipts['default']!;
  }



  private static convertToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertHundreds = (n: number): string => {
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
    };

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

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  public static generateReceiptHTML(data: UnifiedReceiptData): string {
    const parentName = data.student.parent?.fatherName || 
                      data.student.parent?.motherName ||
                      (data.student.parent?.firstName && data.student.parent?.lastName 
                        ? `${data.student.parent.firstName} ${data.student.parent.lastName}` 
                        : 'N/A');

    const feeTerms = [...new Set(data.feeItems.map(item => item.feeTermName))];
    const uniqueFeeTerms = feeTerms.join(', ');

    const feeItemsHTML = data.feeItems.map((item, index) => `
      <tr>
        <td style="border: 1px solid #000; padding: 3px 4px; text-align: center; font-size: 9px;">${index + 1}</td>
        <td style="border: 1px solid #000; padding: 3px 4px; font-size: 9px; line-height: 1.1;">${item.feeHeadName}</td>
        <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${this.formatCurrency(item.originalAmount)}</td>
        <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${this.formatCurrency(item.concessionAmount)}</td>
        <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${this.formatCurrency(item.finalAmount)}</td>
      </tr>
    `).join('');

    return `
      <div class="fee-receipt-container" style="width: 7.67in; height: 5.23in; max-width: 7.67in; max-height: 5.23in; padding: 0.15in; font-size: 9px; line-height: 1.1; position: relative; border: 1px solid #000; margin: 0 auto; box-sizing: border-box; overflow: hidden; background: white; color: black; font-family: Arial, sans-serif;">
        <!-- Header -->
        <div style="position: relative; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 6px;">
          ${data.branch.logoUrl ? `
            <div style="position: absolute; top: 0; left: 0; width: 50px; height: 50px;">
              <img src="${data.branch.logoUrl}" alt="${data.branch.name} Logo" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
          ` : ''}
          <div style="text-align: center; ${data.branch.logoUrl ? 'padding-left: 60px;' : ''}">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 2px;">The Scholars' Home, ${data.branch.name}</div>
            ${data.branch.address ? `<div style="font-size: 9px; color: #333; margin-bottom: 2px;">${data.branch.address}${data.branch.city ? `, ${data.branch.city}` : ''}${data.branch.state ? `, ${data.branch.state}` : ''}</div>` : ''}
            <div style="font-size: 13px; font-weight: bold; margin-top: 4px; margin-bottom: 2px;">RECEIPT</div>
            <div style="font-size: 11px; font-weight: bold;">Receipt Number: ${data.receiptNumber}</div>
          </div>
        </div>

        <!-- Session -->
        <div style="text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 8px;">Session ${data.session.name}</div>

        <!-- Student and Payment Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 8px;">
          <div>
            <div style="margin-bottom: 4px; font-size: 10px;"><strong>Student:</strong> ${data.student.firstName} ${data.student.lastName}</div>
            <div style="margin-bottom: 4px; font-size: 10px;"><strong>Father:</strong> ${parentName}</div>
            <div style="margin-bottom: 4px; font-size: 10px;"><strong>Fee Terms/Cycles:</strong> ${uniqueFeeTerms}</div>
          </div>
          <div>
            <div style="margin-bottom: 4px; font-size: 10px;"><strong>Class:</strong> ${data.student.section?.class?.name || 'N/A'}${data.student.section?.name ? ` - ${data.student.section.name}` : ''}</div>
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
              <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${this.formatCurrency(data.totals.totalOriginalAmount)}</td>
              <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px;">${this.formatCurrency(data.totals.totalConcessionAmount)}</td>
              <td style="border: 1px solid #000; padding: 3px 4px; text-align: right; font-size: 9px; font-weight: bold;">₹${this.formatCurrency(data.totals.totalPaidAmount)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Amount in Words -->
        <div style="margin-bottom: 6px; font-size: 9px;"><strong>Amount In Words:</strong> ${this.convertToWords(data.totals.totalPaidAmount)} Rupees Only</div>

        <!-- Payment Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
          <div>
            <div style="margin-bottom: 3px; font-size: 9px;"><strong>Mode of Payment:</strong> ${data.paymentMode}</div>
            <div style="margin-bottom: 3px; font-size: 9px;"><strong>Payment Date:</strong> ${data.paymentDate.toLocaleDateString('en-GB')}</div>
          </div>
          <div>
            ${data.transactionReference ? `<div style="margin-bottom: 3px; font-size: 9px;"><strong>Reference Number:</strong> ${data.transactionReference}</div>` : ''}
          </div>
        </div>

        <!-- Footer Signatures -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 12px; font-size: 9px;">
          <div>
            <div style="margin-bottom: 15px;"><strong>Parent's Signature</strong></div>
            <div><strong>Receipt Date:</strong> ${data.paymentDate.toLocaleDateString('en-GB')}</div>
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

  public static printReceipt(data: UnifiedReceiptData): void {
    // This method is for client-side use only
    if (typeof window === 'undefined') {
      console.warn('printReceipt() called on server-side, skipping...');
      return;
    }
    
    // Convert relative logo URL to absolute URL for the new window
    if (data.branch.logoUrl && data.branch.logoUrl.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      data.branch.logoUrl = `${baseUrl}${data.branch.logoUrl}`;
    }
    
    const receiptHTML = this.generateReceiptHTML(data);
    
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Please allow popups to print the receipt');
      return;
    }

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${data.receiptNumber}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .fee-receipt-container { 
                width: 7.67in !important; 
                height: 5.23in !important; 
                margin: 0 !important; 
                border: none !important;
                page-break-after: avoid;
              }
              @page {
                size: 8.27in 5.83in;
                margin: 0.3in;
              }
            }
            @media screen {
              body { 
                margin: 20px; 
                background: #f5f5f5; 
                font-family: Arial, sans-serif;
              }
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
          <script>
            window.onload = function() {
              // Wait a bit for images to load before printing
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    newWindow.document.close();
  }

  public static createReceiptFromFeeCollectionData(result: any, student: any, branch: any, session: any, feeItems: any[], paymentMode: string, transactionReference?: string, notes?: string): UnifiedReceiptData {
    return {
      receiptNumber: result.receiptNumber,
      paymentDate: new Date(),
      paymentMode,
      transactionReference,
      notes,
      student,
      branch,
      session,
      feeItems: feeItems.map(item => ({
        feeHeadName: item.feeHeadName,
        feeTermName: item.feeTermName,
        originalAmount: item.originalAmount || item.totalAmount,
        concessionAmount: item.concessionAmount || 0,
        finalAmount: item.finalAmount,
      })),
      totals: {
        totalOriginalAmount: feeItems.reduce((sum, item) => sum + (item.originalAmount || item.totalAmount), 0),
        totalConcessionAmount: feeItems.reduce((sum, item) => sum + (item.concessionAmount || 0), 0),
        totalNetAmount: feeItems.reduce((sum, item) => sum + ((item.originalAmount || item.totalAmount) - (item.concessionAmount || 0)), 0),
        totalPaidAmount: feeItems.reduce((sum, item) => sum + item.finalAmount, 0),
      },
    };
  }

  public static createReceiptFromPaymentHistoryData(feeCollectionData: any): UnifiedReceiptData {
    const feeItems = feeCollectionData.items?.map((item: any) => {
      // Handle cases where originalAmount/concessionAmount might not be stored correctly
      let originalAmount = item.originalAmount || 0;
      let concessionAmount = item.concessionAmount || 0;
      const finalAmount = item.amount || 0;
      
      // If originalAmount is same as amount but there's a concessionAmount,
      // it means originalAmount was stored incorrectly (should be amount + concession)
      if (originalAmount === finalAmount && concessionAmount > 0) {
        originalAmount = finalAmount + concessionAmount;
      }
      
      // If originalAmount is 0 or not set, assume no concession was applied
      if (originalAmount === 0) {
        originalAmount = finalAmount;
        concessionAmount = 0;
      }
      
      return {
        feeHeadName: item.feeHead?.name || 'Fee',
        feeTermName: item.feeTerm?.name || 'Term',
        originalAmount,
        concessionAmount,
        finalAmount,
      };
    }) || [];

    return {
      receiptNumber: feeCollectionData.receiptNumber,
      paymentDate: new Date(feeCollectionData.paymentDate),
      paymentMode: feeCollectionData.paymentMode,
      transactionReference: feeCollectionData.transactionReference || undefined,
      notes: feeCollectionData.notes || undefined,
      student: {
        firstName: feeCollectionData.student?.firstName || '',
        lastName: feeCollectionData.student?.lastName || '',
        admissionNumber: feeCollectionData.student?.admissionNumber || '',
        section: {
          name: feeCollectionData.student?.section?.name,
          class: {
            name: feeCollectionData.student?.section?.class?.name || 'N/A',
          },
        },
        parent: {
          firstName: undefined,
          lastName: undefined,
          fatherName: feeCollectionData.student?.parent?.fatherName || undefined,
          motherName: feeCollectionData.student?.parent?.motherName || undefined,
        },
      },
      branch: {
        name: feeCollectionData.branch?.name || 'School Name',
        address: feeCollectionData.branch?.address || undefined,
        city: feeCollectionData.branch?.city || undefined,
        state: feeCollectionData.branch?.state || undefined,
        logoUrl: feeCollectionData.branch?.logoUrl || '/android-chrome-192x192.png',
      },
      session: {
        name: feeCollectionData.session?.name || 'Academic Session',
      },
      feeItems,
      totals: {
        totalOriginalAmount: feeItems.reduce((sum: number, item: any) => sum + item.originalAmount, 0),
        totalConcessionAmount: feeItems.reduce((sum: number, item: any) => sum + item.concessionAmount, 0),
        totalNetAmount: feeItems.reduce((sum: number, item: any) => sum + (item.originalAmount - item.concessionAmount), 0),
        totalPaidAmount: feeCollectionData.paidAmount || feeCollectionData.totalAmount || feeItems.reduce((sum: number, item: any) => sum + item.finalAmount, 0),
      },
    };
  }
}