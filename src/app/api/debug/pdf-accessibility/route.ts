import { type NextRequest, NextResponse } from 'next/server';
import { env } from "@/env.js";

export async function GET(request: NextRequest) {
  try {
    // Get receipt number from query params
    const { searchParams } = new URL(request.url);
    const receiptNumber = searchParams.get('receiptNumber');
    
    if (!receiptNumber) {
      return NextResponse.json({
        success: false,
        error: 'receiptNumber query parameter is required',
        example: '/api/debug/pdf-accessibility?receiptNumber=TSHPS%2FFIN%2F2025-26%2F000001'
      }, { status: 400 });
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_APP_URL not configured'
      }, { status: 500 });
    }

    const encodedReceiptNumber = encodeURIComponent(receiptNumber);
    const receiptPdfUrl = `${baseUrl}/api/receipts/${encodedReceiptNumber}/pdf`;

    console.log(`🧪 Testing PDF accessibility for: ${receiptPdfUrl}`);

    // Test 1: Basic HEAD request
    let headTest;
    try {
      const headResponse = await fetch(receiptPdfUrl, { 
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      headTest = {
        success: headResponse.ok,
        status: headResponse.status,
        statusText: headResponse.statusText,
        contentType: headResponse.headers.get('content-type'),
        contentLength: headResponse.headers.get('content-length'),
        headers: Object.fromEntries(headResponse.headers.entries())
      };
    } catch (error) {
      headTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: WhatsApp-style GET request
    let whatsappTest;
    try {
      const whatsappResponse = await fetch(receiptPdfUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'WhatsApp/2.0',
          'Accept': 'application/pdf,*/*',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(15000) // 15 seconds timeout
      });

      const contentType = whatsappResponse.headers.get('content-type');
      const contentLength = whatsappResponse.headers.get('content-length');
      
      // Read first few bytes to verify it's actually a PDF
      let pdfSignature = null;
      if (whatsappResponse.ok && contentType?.includes('application/pdf')) {
        try {
          const buffer = await whatsappResponse.arrayBuffer();
          const bytes = new Uint8Array(buffer.slice(0, 8));
          pdfSignature = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        } catch (bufferError) {
          pdfSignature = 'Could not read buffer';
        }
      }

      whatsappTest = {
        success: whatsappResponse.ok,
        status: whatsappResponse.status,
        statusText: whatsappResponse.statusText,
        contentType,
        contentLength,
        pdfSignature,
        sizeBytes: contentLength ? parseInt(contentLength) : 0,
        headers: Object.fromEntries(whatsappResponse.headers.entries())
      };
    } catch (error) {
      whatsappTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isTimeout: error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'))
      };
    }

    // Test 3: External URL validation
    const urlValidation = {
      isHttps: receiptPdfUrl.startsWith('https://'),
      hasCorrectDomain: receiptPdfUrl.includes(baseUrl),
      encodedCorrectly: receiptPdfUrl.includes(encodedReceiptNumber),
      originalReceiptNumber: receiptNumber,
      encodedReceiptNumber,
      fullUrl: receiptPdfUrl
    };

    const overallSuccess = headTest.success && whatsappTest.success;

    return NextResponse.json({
      success: overallSuccess,
      receiptNumber,
      pdfUrl: receiptPdfUrl,
      tests: {
        headRequest: headTest,
        whatsappStyleRequest: whatsappTest,
        urlValidation
      },
      diagnosis: {
        pdfGenerated: headTest.success,
        externallyAccessible: whatsappTest.success,
        correctContentType: whatsappTest.contentType?.includes('application/pdf'),
        reasonableSize: (whatsappTest.sizeBytes || 0) > 1000,
        whatsappCompatible: overallSuccess
      },
      recommendations: overallSuccess ? [
        "✅ PDF is accessible to WhatsApp",
        "✅ Ready for WhatsApp document sending"
      ] : [
        !headTest.success ? "❌ PDF generation failed or not accessible" : "✅ PDF generation successful",
        !whatsappTest.success ? "❌ External access failed - WhatsApp won't be able to download" : "✅ External access successful", 
        !whatsappTest.contentType?.includes('application/pdf') ? "❌ Wrong content type returned" : "✅ Correct PDF content type",
        (whatsappTest.sizeBytes || 0) <= 1000 ? "❌ PDF too small or empty" : "✅ PDF has reasonable size"
      ]
    });

  } catch (error) {
    console.error('PDF accessibility test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to test PDF accessibility'
    }, { status: 500 });
  }
}
