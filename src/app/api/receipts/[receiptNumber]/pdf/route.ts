import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";
import { ReceiptService } from "@/services/receipt-service";
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  let receiptNumber: string = 'unknown';
  
  try {
    const startTime = Date.now();
    const isVercel = !!process.env.VERCEL;
    const resolvedParams = await params;
    receiptNumber = resolvedParams.receiptNumber;

    if (!receiptNumber) {
      return NextResponse.json(
        { error: 'Receipt number is required' },
        { status: 400 }
      );
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
    console.log('🚀 Attempting to launch Puppeteer browser...');
    console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
    
    // Vercel-optimized browser launch with performance flags
    const browser = await puppeteer.launch({
      args: isVercel ? [
        ...chromium.args,
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI,Translate',
        '--disable-ipc-flooding-protection',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-background-mode',
        '--single-process', // Critical for Vercel
        '--no-zygote', // Critical for Vercel
      ] : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
      ],
      executablePath: isVercel ? await chromium.executablePath() : process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      timeout: isVercel ? 30000 : 10000, // Longer timeout for Vercel cold starts
    });
    console.log('✅ Puppeteer browser launched successfully');

    const page = await browser.newPage();
    
    // Disable unnecessary features for faster processing
    await page.setJavaScriptEnabled(false);
    await page.setCacheEnabled(false);
    
    // Set viewport to A5 landscape dimensions
    await page.setViewport({
      width: 794,   // 8.27 inches * 96 DPI
      height: 559,  // 5.83 inches * 96 DPI
      deviceScaleFactor: 1
    });
    
    // Set page size and content with faster loading
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
    `, { waitUntil: 'domcontentloaded' }); // Changed from 'networkidle0' to 'domcontentloaded' for faster processing

    // Generate PDF in A5 landscape format with Vercel-optimized settings
    const pdfBuffer = await page.pdf({
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
      timeout: isVercel ? 30000 : 10000, // Longer timeout for Vercel
    });

    await browser.close();

    const totalTime = Date.now() - startTime;
    console.log(`✅ PDF generation completed for ${receiptNumber} in ${totalTime}ms`);

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Fee_Receipt_${receiptNumber}.pdf"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      receiptNumber: receiptNumber
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate receipt PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
        receiptNumber: receiptNumber
      },
      { status: 500 }
    );
  }
}