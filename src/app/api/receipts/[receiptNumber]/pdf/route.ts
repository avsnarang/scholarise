import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";
import { ReceiptService } from "@/services/receipt-service";
import puppeteer, { type Browser, type Page } from 'puppeteer';
import chromium from '@sparticuz/chromium';

// Helper function to launch browser with retries
async function launchBrowser(isVercel: boolean, retries = 3): Promise<Browser> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🚀 Browser launch attempt ${i + 1}/${retries}...`);
      
      const browser = await puppeteer.launch({
        args: isVercel ? [
          ...chromium.args,
          '--disable-blink-features=AutomationControlled',
          '--disable-features=TranslateUI',
          '--disable-web-security',
          '--disable-features=site-per-process',
          '--no-first-run',
          '--no-default-browser-check',
          '--single-process',
          '--no-zygote',
        ] : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        executablePath: isVercel ? await chromium.executablePath() : puppeteer.executablePath(),
        headless: true,
        defaultViewport: { width: 1280, height: 720 },
        timeout: 30000,
      });
      
      console.log('✅ Browser launched successfully');
      return browser;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Browser launch attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError || new Error('Failed to launch browser after multiple attempts');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  let receiptNumber: string = 'unknown';
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    const startTime = Date.now();
    const isVercel = !!process.env.VERCEL;
    const resolvedParams = await params;
    receiptNumber = resolvedParams.receiptNumber;

    if (!receiptNumber) {
      console.error('❌ Receipt number is required');
      // Return empty PDF response to avoid breaking WhatsApp
      return new NextResponse(new Uint8Array(), {
        status: 400,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': '0',
        },
      });
    }
    
    console.log(`📊 Starting PDF generation for receipt: ${receiptNumber} (Environment: ${isVercel ? 'Vercel' : 'Local'})`);

    // Find the fee collection record by receipt number
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
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Create receipt data from fee collection using the correct method
    const receiptData = ReceiptService.createReceiptFromPaymentHistoryData(feeCollection);

    // Generate HTML
    const receiptHTML = ReceiptService.generateReceiptHTML(receiptData);

    // Generate PDF using Puppeteer with Vercel-compatible Chromium
    console.log('🚀 Starting PDF generation process...');
    console.log('Environment:', isVercel ? 'Vercel' : 'Local');
    console.log('Receipt:', receiptNumber);
    
    // Launch browser with retry logic
    browser = await launchBrowser(isVercel);
    
    page = await browser.newPage();
    
    // Configure page for optimal PDF generation
    await page.setJavaScriptEnabled(false);
    await page.setCacheEnabled(false);
    
    // Set viewport to A5 landscape dimensions
    await page.setViewport({
      width: 794,   // 8.27 inches * 96 DPI
      height: 559,  // 5.83 inches * 96 DPI
      deviceScaleFactor: 1
    });
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Set page content with timeout
    console.log('📝 Setting page content...');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Fee Receipt - ${receiptNumber}</title>
          <style>
            @page {
              size: 8.27in 5.83in;
              margin: 0.3in;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              line-height: 1.4;
            }
            .fee-receipt-container {
              max-width: 100%;
              margin: 0 auto;
            }
            @media print {
              .fee-receipt-container {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
        </body>
      </html>
    `, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    
    console.log('✅ Page content set successfully');

    // Generate PDF with timeout handling
    console.log('📄 Generating PDF...');
    const pdfBuffer = await Promise.race([
      page.pdf({
        width: '8.27in',   // A5 landscape width (210mm)
        height: '5.83in',  // A5 landscape height (148mm)
        printBackground: true,
        margin: {
          top: '0.3in',
          right: '0.3in',
          bottom: '0.3in',
          left: '0.3in'
        },
        preferCSSPageSize: true,
      }),
      new Promise<Buffer>((_, reject) => 
        setTimeout(() => reject(new Error('PDF generation timeout')), 25000)
      )
    ]);
    
    console.log(`✅ PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    
    // Verify PDF is not empty
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    // Close browser
    if (browser) {
      await browser.close();
      browser = null;
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ PDF generation completed for ${receiptNumber} in ${totalTime}ms, size: ${pdfBuffer.length} bytes`);

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Fee_Receipt_${receiptNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        'X-Receipt-Number': receiptNumber,
        'X-PDF-Generated': new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generating receipt PDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      receiptNumber: receiptNumber,
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      timestamp: new Date().toISOString()
    });
    
    // Clean up browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Failed to close browser:', closeError);
      }
    }
    
    // Return a minimal valid PDF response to prevent WhatsApp errors
    // This ensures WhatsApp always gets a PDF response, even if generation fails
    const errorPdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF'
    );
    
    return new NextResponse(errorPdfContent, {
      status: 200, // Return 200 to avoid WhatsApp retry storms
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Fee_Receipt_${receiptNumber}_error.pdf"`,
        'Content-Length': errorPdfContent.length.toString(),
        'X-PDF-Error': 'true',
        'X-Error-Message': error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}