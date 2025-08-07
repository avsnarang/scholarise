import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { ReceiptService, type UnifiedReceiptData } from '@/services/receipt-service';

/**
 * Sample PDF endpoint for Meta WhatsApp template validation
 * This endpoint generates the EXACT SAME receipt as production but with placeholder data
 * that Meta can review when approving DOCUMENT header templates.
 */
export async function GET(request: NextRequest) {
  try {
    // Create sample receipt data using the exact same structure as production
    const sampleReceiptData: UnifiedReceiptData = {
      receiptNumber: "SAMPLE_REC_001",
      paymentDate: new Date(),
      paymentMode: "Cash",
      transactionReference: "TXN123456789",
      notes: "Sample payment for Meta template approval",
      student: {
        firstName: "{{STUDENT_FIRST_NAME}}",
        lastName: "{{STUDENT_LAST_NAME}}",
        admissionNumber: "{{ADMISSION_NUMBER}}",
        section: {
          name: "{{SECTION_NAME}}",
          class: {
            name: "{{CLASS_NAME}}"
          }
        },
        parent: {
          fatherName: "{{FATHER_NAME}}",
          motherName: "{{MOTHER_NAME}}",
          firstName: undefined,
          lastName: undefined
        }
      },
      branch: {
        name: "{{BRANCH_NAME}}",
        address: "{{SCHOOL_ADDRESS_LINE_1}}",
        city: "{{CITY}}",
        state: "{{STATE}}",
        logoUrl: "/android-chrome-192x192.png"
      },
      session: {
        name: "{{ACADEMIC_SESSION}}"
      },
      feeItems: [
        {
          feeHeadName: "{{FEE_HEAD_1}}",
          feeTermName: "{{FEE_TERM_1}}",
          originalAmount: 5000,
          concessionAmount: 500,
          finalAmount: 4500
        },
        {
          feeHeadName: "{{FEE_HEAD_2}}",
          feeTermName: "{{FEE_TERM_2}}",
          originalAmount: 3000,
          concessionAmount: 0,
          finalAmount: 3000
        },
        {
          feeHeadName: "{{FEE_HEAD_3}}",
          feeTermName: "{{FEE_TERM_3}}",
          originalAmount: 2000,
          concessionAmount: 200,
          finalAmount: 1800
        }
      ],
      totals: {
        totalOriginalAmount: 10000,
        totalConcessionAmount: 700,
        totalNetAmount: 9300,
        totalPaidAmount: 9300
      }
    };

    // Generate the exact same HTML as production using ReceiptService
    const receiptHTML = ReceiptService.generateReceiptHTML(sampleReceiptData);
    
    // Add a meta note at the top to indicate this is for template approval
    const sampleReceiptHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Sample Fee Receipt - For Meta Template Approval</title>
        <style>
          @page {
            size: 8.27in 5.83in;
            margin: 0.3in;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
          }
          .meta-note {
            background: #fee2e2;
            border: 2px solid #dc2626;
            padding: 8px;
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            color: #991b1b;
            margin-bottom: 10px;
          }
          .fee-receipt-container {
            position: relative;
          }
        </style>
      </head>
      <body>
        <div class="meta-note">
          🚨 META TEMPLATE APPROVAL SAMPLE 🚨<br>
          This shows the EXACT production receipt format with placeholder variables like {{STUDENT_NAME}}<br>
          All {{VARIABLE}} placeholders will be replaced with real data when sending to parents
        </div>
        ${receiptHTML}
      </body>
    </html>
    `;

    // Generate PDF using Puppeteer with exact same settings as production
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    
    // Set viewport to A5 landscape dimensions (same as production)
    await page.setViewport({
      width: 794,   // 8.27 inches * 96 DPI
      height: 559,  // 5.83 inches * 96 DPI
      deviceScaleFactor: 1
    });
    
    // Set content
    await page.setContent(sampleReceiptHTML, { waitUntil: 'networkidle0' });

    // Generate PDF in A5 landscape format (same as production)
    const pdfBuffer = await page.pdf({
      width: '8.27in',   // A5 landscape width (same as production)
      height: '5.83in',  // A5 landscape height (same as production) 
      printBackground: true,
      margin: {
        top: '0.3in',
        right: '0.3in',
        bottom: '0.3in',
        left: '0.3in'
      }
    });

    await browser.close();

    // Return PDF with appropriate headers for Meta access
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Production_Receipt_Sample_For_Meta_Approval.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        // Allow Meta to access this resource
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Cache for Meta validation
        'Cache-Control': 'public, max-age=86400', // 24 hours
      },
    });

  } catch (error) {
    console.error('Error generating sample PDF for Meta:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate production sample PDF for Meta approval',
        message: 'This endpoint creates the EXACT SAME receipt as production with placeholder variables for Meta WhatsApp template approval.'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}