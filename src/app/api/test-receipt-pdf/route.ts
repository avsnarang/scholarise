import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    // Get the most recent fee collection for testing
    const recentFeeCollection = await db.feeCollection.findFirst({
      orderBy: { createdAt: 'desc' },
      take: 1,
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

    if (!recentFeeCollection) {
      return NextResponse.json({
        success: false,
        error: 'No fee collections found. Please create a fee collection first.',
        testReceiptUrl: null
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const receiptPdfUrl = `${baseUrl}/api/receipts/${recentFeeCollection.receiptNumber}/pdf`;

    return NextResponse.json({
      success: true,
      message: 'Receipt PDF endpoint is ready for testing',
      testReceiptUrl: receiptPdfUrl,
      receiptNumber: recentFeeCollection.receiptNumber,
      studentName: `${recentFeeCollection.student.firstName} ${recentFeeCollection.student.lastName}`,
      amount: recentFeeCollection.totalAmount,
      paymentDate: recentFeeCollection.paymentDate,
      parentPhones: {
        father: recentFeeCollection.student.parent?.fatherMobile,
        mother: recentFeeCollection.student.parent?.motherMobile
      },
      instructions: [
        "1. Click the testReceiptUrl to download the PDF receipt",
        "2. Test WhatsApp sending using the receiptNumber with /api/finance/sendReceiptWhatsApp",
        "3. Ensure Meta WhatsApp templates are created and approved",
        "4. Configure META_ACCESS_TOKEN and META_PHONE_NUMBER_ID environment variables"
      ]
    });

  } catch (error) {
    console.error('Error in test receipt endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}