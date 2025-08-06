import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";
import { ReceiptService } from "@/services/receipt-service";
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  try {
    const { receiptNumber } = await params;

    if (!receiptNumber) {
      return NextResponse.json(
        { error: 'Receipt number is required' },
        { status: 400 }
      );
    }

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

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    
    // Set viewport to A5 landscape dimensions
    await page.setViewport({
      width: 794,   // 8.27 inches * 96 DPI
      height: 559,  // 5.83 inches * 96 DPI
      deviceScaleFactor: 1
    });
    
    // Set page size and content
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
    `, { waitUntil: 'networkidle0' });

    // Generate PDF in A5 landscape format with explicit dimensions
    const pdfBuffer = await page.pdf({
      width: '8.27in',   // A5 landscape width (210mm)
      height: '5.83in',  // A5 landscape height (148mm)
      printBackground: true,
      margin: {
        top: '0.3in',
        right: '0.3in',
        bottom: '0.3in',
        left: '0.3in'
      }
    });

    await browser.close();

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
    return NextResponse.json(
      { error: 'Failed to generate receipt PDF' },
      { status: 500 }
    );
  }
}