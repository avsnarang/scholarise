import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";
import { ReceiptService } from "@/services/receipt-service";
import { getLogoAsDataUri } from '@/utils/logo-helper';

// Lightweight PDF generation without Puppeteer for better Vercel compatibility
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  let receiptNumber: string = 'unknown';
  
  try {
    const startTime = Date.now();
    const resolvedParams = await params;
    receiptNumber = resolvedParams.receiptNumber;

    if (!receiptNumber) {
      // Return minimal valid PDF for error case
      const minimalPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF'
      );
      
      return new NextResponse(minimalPdf, {
        status: 400,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': minimalPdf.length.toString(),
        },
      });
    }
    
    console.log(`📊 Starting lightweight PDF generation for receipt: ${receiptNumber}`);

    // Find the fee collection record
    const feeCollection = await db.feeCollection.findFirst({
      where: { receiptNumber },
      include: {
        student: {
          include: {
            section: {
              include: {
                class: true
              }
            },
            parent: true
          }
        },
        branch: true,
        session: true,
        items: {
          include: {
            feeHead: true,
            feeTerm: true
          }
        }
      }
    });

    if (!feeCollection) {
      // Return minimal valid PDF for not found case
      const minimalPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n(Receipt Not Found) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000229 00000 n\n0000000328 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n422\n%%EOF'
      );
      
      return new NextResponse(minimalPdf, {
        status: 404,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': minimalPdf.length.toString(),
        },
      });
    }

    // Create receipt data
    const receiptData = ReceiptService.createReceiptFromPaymentHistoryData(feeCollection);
    
    // Get logo as base64 data URI for embedding
    const branchCode = receiptData.branch.code || (receiptNumber.includes('/') ? receiptNumber.split('/')[0] : '');
    const logoDataUri = getLogoAsDataUri(branchCode);
    
    if (logoDataUri) {
      receiptData.branch.logoUrl = logoDataUri;
      console.log(`📄 Using embedded logo for lightweight PDF, branch: ${branchCode || 'default'}`);
    } else {
      console.log(`📄 No logo found for lightweight PDF, branch: ${branchCode || 'default'}`);
    }

    // Generate simplified PDF content
    const pdfContent = generateSimplePDF(receiptData, receiptNumber);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Lightweight PDF generated for ${receiptNumber} in ${totalTime}ms, size: ${pdfContent.length} bytes`);

    // Return PDF with appropriate headers
    return new NextResponse(pdfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${receiptNumber}.pdf"`,
        'Content-Length': pdfContent.length.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Receipt-Number': receiptNumber,
        'X-PDF-Generated': new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generating lightweight PDF:', error);
    
    // Always return a valid PDF response
    const errorPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>\nendobj\n5 0 obj\n<< /Length 35 >>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n(Error) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000229 00000 n\n0000000328 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n413\n%%EOF'
    );
    
    return new NextResponse(errorPdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': errorPdf.length.toString(),
        'X-PDF-Error': 'true',
      },
    });
  }
}

// Generate a simple PDF without external dependencies that matches Payment History design
function generateSimplePDF(receiptData: any, receiptNumber: string): Buffer {
  // Extract data from the UnifiedReceiptData structure
  const date = new Date(receiptData.paymentDate);
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  
  // Use the totals from the receiptData structure
  const totalAmount = receiptData.totals?.totalPaidAmount || receiptData.totalAmount || 0;
  const formattedAmount = totalAmount.toLocaleString('en-IN');
  
  // Build receipt content matching Payment History structure
  const parentName = receiptData.student?.parent?.fatherName || 
                    receiptData.student?.parent?.motherName || 
                    (receiptData.student?.parent?.firstName && receiptData.student?.parent?.lastName 
                      ? `${receiptData.student?.parent?.firstName} ${receiptData.student?.parent?.lastName}` 
                      : 'N/A');
  
  const studentName = `${receiptData.student?.firstName || ''} ${receiptData.student?.lastName || ''}`.trim() || 'N/A';
  const className = receiptData.student?.section?.class?.name || 'N/A';
  const sectionName = receiptData.student?.section?.name || '';
  const classSection = sectionName ? `${className} - ${sectionName}` : className;
  
  // Extract fee items details
  const feeItems = receiptData.feeItems || receiptData.items || [];
  const feeItemLines = feeItems.map((item: any, index: number) => 
    `${index + 1}. ${item.feeHeadName || item.feeHead?.name || 'Fee'}: Rs. ${(item.finalAmount || item.amount || 0).toLocaleString('en-IN')}`
  );
  
  // Build the PDF content lines
  const lines = [
    `THE SCHOLARS' HOME, ${receiptData.branch?.name || 'Branch'}`,
    `${receiptData.branch?.address || ''}`,
    `RECEIPT`,
    ``,
    `Receipt Number: ${receiptData.receiptNumber || receiptNumber}`,
    `Session: ${receiptData.session?.name || '2024-25'}`,
    ``,
    `Student: ${studentName}`,
    `Father: ${parentName}`,
    `Class: ${classSection}`,
    `Student Reg No.: ${receiptData.student?.admissionNumber || 'N/A'}`,
    ``,
    `Fee Details:`,
    ...feeItemLines,
    ``,
    `Total Amount Paid: Rs. ${formattedAmount}`,
    `Payment Mode: ${receiptData.paymentMode || 'N/A'}`,
    `Payment Date: ${formattedDate}`,
    `${receiptData.transactionReference ?     `Reference: ${receiptData.transactionReference}` : ''}`,
    ``,
    `This is an E-Generated Receipt. Signature is not required.`,
    ``,
    `Fee once paid is non-refundable except for Security.`
  ].filter(line => line !== undefined);
  
  // Create PDF content stream with better formatting
  let yPosition = 750;
  const contentStream = lines.map((line, index) => {
    // Adjust font size and position for headers
    let fontSize = 10;
    let xPosition = 50;
    
    if (index === 0) { // School name
      fontSize = 14;
      xPosition = 200;
    } else if (index === 1 || index === 2) { // Branch and RECEIPT
      fontSize = 12;
      xPosition = 250;
    } else if (line.startsWith('Receipt Number:')) {
      fontSize = 11;
    }
    
    // Add extra spacing for empty lines
    if (line === '') {
      yPosition -= 10;
      return '';
    }
    
    const content = `BT\n/F1 ${fontSize} Tf\n${xPosition} ${yPosition} Td\n(${line.replace(/[()\\]/g, '\\$&')}) Tj\nET`;
    yPosition -= (fontSize > 10 ? 25 : 20);
    return content;
  }).filter(content => content !== '').join('\n');
  
  const streamLength = contentStream.length;
  
  // Build complete PDF structure for A5 landscape
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 420] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000229 00000 n
0000000345 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${345 + streamLength + 40}
%%EOF`;
  
  return Buffer.from(pdf);
}
