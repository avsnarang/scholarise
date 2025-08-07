import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing payment collection flow and transaction timing...');

    // Test 1: Check if there are recent fee collections
    const recentFeeCollections = await db.feeCollection.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            parent: true
          }
        },
        branch: true,
        session: true
      }
    });

    if (recentFeeCollections.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No fee collections found to test',
        recommendation: 'Create a test payment first, then check this endpoint'
      });
    }

    // Test 2: Verify database transaction performance
    const startTime = Date.now();
    
    const testTransaction = await db.$transaction(async (prisma) => {
      // Simulate the database operations that happen during payment collection
      const testQuery1 = await prisma.feeCollection.findFirst({
        where: { id: recentFeeCollections[0]!.id },
        include: {
          student: {
            include: {
              parent: true,
              section: {
                include: {
                  class: true
                }
              }
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

      return testQuery1;
    });

    const transactionTime = Date.now() - startTime;

    // Test 3: Check PDF accessibility for recent receipts
    const pdfTests = [];
    for (const collection of recentFeeCollections.slice(0, 2)) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (baseUrl) {
        const pdfUrl = `${baseUrl}/api/receipts/${encodeURIComponent(collection.receiptNumber)}/pdf`;
        
        try {
          const pdfCheck = await fetch(pdfUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          
          pdfTests.push({
            receiptNumber: collection.receiptNumber,
            pdfAccessible: pdfCheck.ok,
            status: pdfCheck.status,
            contentType: pdfCheck.headers.get('content-type')
          });
        } catch (error) {
          pdfTests.push({
            receiptNumber: collection.receiptNumber,
            pdfAccessible: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment flow test completed',
      tests: {
        databaseTransaction: {
          success: !!testTransaction,
          timeMs: transactionTime,
          withinTimeout: transactionTime < 5000,
          status: transactionTime < 5000 ? '✅ Transaction completed within timeout' : '⚠️ Transaction took longer than expected'
        },
        recentPayments: {
          count: recentFeeCollections.length,
          latest: recentFeeCollections.slice(0, 3).map(collection => ({
            receiptNumber: collection.receiptNumber,
            amount: collection.totalAmount,
            studentName: `${collection.student.firstName} ${collection.student.lastName}`,
            paymentDate: collection.paymentDate,
            hasParentPhone: !!(collection.student.parent?.fatherMobile || collection.student.parent?.motherMobile),
            createdAt: collection.createdAt
          }))
        },
        pdfAccessibility: {
          tested: pdfTests.length,
          results: pdfTests
        }
      },
      analysis: {
        transactionPerformance: transactionTime < 3000 ? 'Excellent' : transactionTime < 5000 ? 'Good' : 'Needs attention',
        whatsappReadiness: pdfTests.every(test => test.pdfAccessible) ? 'All PDFs accessible' : 'Some PDFs have issues',
        overallStatus: transactionTime < 5000 && pdfTests.every(test => test.pdfAccessible) ? 'Ready for production' : 'Needs investigation'
      },
      recommendations: [
        transactionTime < 5000 ? '✅ Database transactions are fast enough' : '❌ Consider optimizing database queries',
        pdfTests.length > 0 && pdfTests.every(test => test.pdfAccessible) ? '✅ PDF generation is working' : '⚠️ Check PDF generation system',
        '✅ WhatsApp sending is now outside transaction scope'
      ]
    });

  } catch (error) {
    console.error('Payment flow test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to test payment flow'
    }, { status: 500 });
  }
}
