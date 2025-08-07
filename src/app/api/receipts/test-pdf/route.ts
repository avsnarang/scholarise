import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { type Browser } from 'puppeteer';
import chromium from '@sparticuz/chromium';

export async function GET(request: NextRequest) {
  const testReceiptNumber = request.nextUrl.searchParams.get('receipt') || 'TEST-001';
  let browser: Browser | null = null;
  
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'Vercel' : 'Local',
    receiptNumber: testReceiptNumber,
    tests: {
      browserLaunch: { status: 'pending', details: {} },
      pageCreation: { status: 'pending', details: {} },
      htmlContent: { status: 'pending', details: {} },
      pdfGeneration: { status: 'pending', details: {} },
      lightweightPdf: { status: 'pending', details: {} },
      externalAccess: { status: 'pending', details: {} }
    }
  };
  
  try {
    const isVercel = !!process.env.VERCEL;
    
    // Test 1: Browser Launch
    console.log('🔍 Test 1: Browser Launch');
    try {
      const startTime = Date.now();
      browser = await puppeteer.launch({
        args: isVercel ? [
          ...chromium.args,
          '--single-process',
          '--no-zygote',
        ] : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
        executablePath: isVercel ? await chromium.executablePath() : puppeteer.executablePath(),
        headless: true,
        defaultViewport: { width: 1280, height: 720 },
        timeout: 30000,
      });
      
      results.tests.browserLaunch = {
        status: 'success',
        details: {
          launchTime: `${Date.now() - startTime}ms`,
          executablePath: isVercel ? 'Vercel Chromium' : 'Local Puppeteer'
        }
      };
    } catch (error) {
      results.tests.browserLaunch = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
      throw error;
    }
    
    // Test 2: Page Creation
    console.log('🔍 Test 2: Page Creation');
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 559 });
      
      results.tests.pageCreation = {
        status: 'success',
        details: { viewport: '794x559' }
      };
      
      // Test 3: HTML Content
      console.log('🔍 Test 3: HTML Content');
      try {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Test Receipt</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                .info { margin: 10px 0; }
              </style>
            </head>
            <body>
              <h1>Fee Receipt - ${testReceiptNumber}</h1>
              <div class="info">Date: ${new Date().toLocaleDateString()}</div>
              <div class="info">Amount: Rs. 10,000</div>
              <div class="info">Status: PAID</div>
              <div class="info">Generated at: ${new Date().toISOString()}</div>
            </body>
          </html>
        `;
        
        await page.setContent(htmlContent, { 
          waitUntil: 'domcontentloaded',
          timeout: 20000 
        });
        
        results.tests.htmlContent = {
          status: 'success',
          details: { contentLength: htmlContent.length }
        };
        
        // Test 4: PDF Generation
        console.log('🔍 Test 4: PDF Generation');
        try {
          const startTime = Date.now();
          const pdfBuffer = await page.pdf({
            width: '8.27in',
            height: '5.83in',
            printBackground: true,
            margin: {
              top: '0.3in',
              right: '0.3in',
              bottom: '0.3in',
              left: '0.3in'
            }
          });
          
          results.tests.pdfGeneration = {
            status: 'success',
            details: {
              pdfSize: `${pdfBuffer.length} bytes`,
              generationTime: `${Date.now() - startTime}ms`,
              isValid: pdfBuffer.length > 0 && pdfBuffer.toString().startsWith('%PDF')
            }
          };
        } catch (error) {
          results.tests.pdfGeneration = {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        
      } catch (error) {
        results.tests.htmlContent = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      
    } catch (error) {
      results.tests.pageCreation = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 5: Lightweight PDF Generation
    console.log('🔍 Test 5: Lightweight PDF Generation');
    try {
      const lightPdf = generateTestLightweightPDF(testReceiptNumber);
      results.tests.lightweightPdf = {
        status: 'success',
        details: {
          pdfSize: `${lightPdf.length} bytes`,
          isValid: lightPdf.toString().startsWith('%PDF')
        }
      };
    } catch (error) {
      results.tests.lightweightPdf = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Test 6: External Access URLs
    console.log('🔍 Test 6: External Access URLs');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    results.tests.externalAccess = {
      status: 'success',
      details: {
        baseUrl,
        standardPdfUrl: `${baseUrl}/api/receipts/${testReceiptNumber}/pdf`,
        lightweightPdfUrl: `${baseUrl}/api/receipts/${testReceiptNumber}/pdf-light`,
        testPdfUrl: `${baseUrl}/api/receipts/test-pdf?receipt=${testReceiptNumber}`
      }
    };
    
    // Clean up
    if (browser) {
      await browser.close();
    }
    
    // Calculate overall status
    const allTests = Object.values(results.tests) as any[];
    const failedTests = allTests.filter((t: any) => t.status === 'failed');
    results.overallStatus = failedTests.length === 0 ? 'success' : 'partial';
    results.summary = {
      total: allTests.length,
      passed: allTests.filter((t: any) => t.status === 'success').length,
      failed: failedTests.length,
      failedTests: failedTests.map((t: any, i: number) => 
        Object.keys(results.tests)[i]
      ).filter(Boolean)
    };
    
    return NextResponse.json(results, { 
      status: failedTests.length === 0 ? 200 : 207 
    });
    
  } catch (error) {
    // Clean up on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Failed to close browser:', closeError);
      }
    }
    
    results.overallStatus = 'error';
    results.error = error instanceof Error ? error.message : 'Unknown error';
    results.stack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(results, { status: 500 });
  }
}

// Generate test lightweight PDF matching Payment History design
function generateTestLightweightPDF(receiptNumber: string): Buffer {
  const date = new Date();
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  
  const lines = [
    `THE SCHOLARS' HOME, Test Branch`,
    `Test Address, Test City`,
    `RECEIPT`,
    ``,
    `Receipt Number: ${receiptNumber}`,
    `Session: 2024-25`,
    ``,
    `Student: Test Student`,
    `Father: Test Parent`,
    `Class: Test Class - A`,
    `Student Reg No.: TEST001`,
    ``,
    `Fee Details:`,
    `1. Tuition Fee: Rs. 8,000`,
    `2. Transport Fee: Rs. 2,000`,
    ``,
    `Total Amount Paid: Rs. 10,000`,
    `Payment Mode: TEST`,
    `Payment Date: ${formattedDate}`,
    `Reference: TEST-TXN-001`,
    ``,
    `Fee once paid is non-refundable except for Security.`
  ];
  
  let yPosition = 700;
  const contentStream = lines.map(line => {
    const content = `BT\n/F1 10 Tf\n50 ${yPosition} Td\n(${line}) Tj\nET`;
    yPosition -= 20;
    return content;
  }).join('\n');
  
  const streamLength = contentStream.length;
  
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 842] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
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
0000000328 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${328 + streamLength + 40}
%%EOF`;
  
  return Buffer.from(pdf);
}
