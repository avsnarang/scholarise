import { type NextRequest, NextResponse } from 'next/server';
import { db } from "@/server/db";
import { WhatsAppReceiptService } from "@/services/whatsapp-receipt-service";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const receiptNumber = url.searchParams.get('receipt');
    const studentId = url.searchParams.get('student');
    const dryRun = url.searchParams.get('dryRun') === 'true';

    if (!receiptNumber && !studentId) {
      return NextResponse.json({
        error: 'Either receiptNumber or studentId is required',
        usage: {
          testByReceipt: '/api/debug/fee-collection-whatsapp?receipt=RECEIPT_NUMBER',
          testByStudent: '/api/debug/fee-collection-whatsapp?student=STUDENT_ID',
          dryRun: 'Add &dryRun=true to test without sending'
        }
      }, { status: 400 });
    }

    let feeCollection = null;

    if (receiptNumber) {
      // Find by receipt number
      feeCollection = await db.feeCollection.findFirst({
        where: { receiptNumber },
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
        }
      });
    } else if (studentId) {
      // Find latest fee collection for student
      feeCollection = await db.feeCollection.findFirst({
        where: { studentId },
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
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!feeCollection) {
      return NextResponse.json({
        error: 'Fee collection not found',
        searched: receiptNumber ? { receiptNumber } : { studentId }
      }, { status: 404 });
    }

    const parent = feeCollection.student.parent;
    const parentPhoneNumber = parent?.fatherMobile || parent?.motherMobile;

    // Analyze the data
    const analysis = {
      receiptNumber: feeCollection.receiptNumber,
      student: {
        id: feeCollection.student.id,
        name: `${feeCollection.student.firstName} ${feeCollection.student.lastName}`,
        admissionNumber: feeCollection.student.admissionNumber,
        class: feeCollection.student.section?.class?.name,
        section: feeCollection.student.section?.name
      },
      parent: {
        hasParent: !!parent,
        fatherName: parent?.fatherName,
        motherName: parent?.motherName,
        fatherMobile: parent?.fatherMobile,
        motherMobile: parent?.motherMobile,
        selectedPhone: parentPhoneNumber,
        phoneValid: !!parentPhoneNumber
      },
      payment: {
        amount: feeCollection.totalAmount,
        paymentDate: feeCollection.paymentDate,
        branch: feeCollection.branch.name
      },
      whatsappEnvironment: {
        hasAccessToken: !!process.env.META_WHATSAPP_ACCESS_TOKEN,
        hasPhoneNumberId: !!process.env.META_WHATSAPP_PHONE_NUMBER_ID,
        hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        isConfigured: WhatsAppReceiptService.isConfigured()
      }
    };

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Analysis complete - no message sent',
        analysis,
        readyToSend: analysis.parent.phoneValid && analysis.whatsappEnvironment.isConfigured,
        recommendedAction: analysis.parent.phoneValid && analysis.whatsappEnvironment.isConfigured 
          ? 'Remove &dryRun=true to send actual WhatsApp message'
          : 'Fix missing phone number or WhatsApp configuration first'
      });
    }

    // Check if we can send
    if (!parentPhoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'No parent phone number available',
        analysis
      }, { status: 400 });
    }

    if (!WhatsAppReceiptService.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp service not configured',
        analysis
      }, { status: 500 });
    }

    // Determine parent name
    let parentName = "Parent";
    if (parent) {
      if (parentPhoneNumber === parent.fatherMobile && parent.fatherName) {
        parentName = parent.fatherName.toLowerCase().includes('mr.') ? parent.fatherName : `Mr. ${parent.fatherName}`;
      } else if (parentPhoneNumber === parent.motherMobile && parent.motherName) {
        parentName = parent.motherName.toLowerCase().includes('mrs.') ? parent.motherName : `Mrs. ${parent.motherName}`;
      } else if (parent.fatherName) {
        parentName = parent.fatherName.toLowerCase().includes('mr.') ? parent.fatherName : `Mr. ${parent.fatherName}`;
      } else if (parent.motherName) {
        parentName = parent.motherName.toLowerCase().includes('mrs.') ? parent.motherName : `Mrs. ${parent.motherName}`;
      }
    }

    const receiptData = {
      receiptNumber: feeCollection.receiptNumber,
      studentName: `${feeCollection.student.firstName} ${feeCollection.student.lastName}`,
      amount: feeCollection.totalAmount,
      paymentDate: feeCollection.paymentDate,
      parentPhoneNumber: parentPhoneNumber,
      branchName: feeCollection.branch.name,
      parentName: parentName,
      branchId: feeCollection.branchId,
      studentId: feeCollection.studentId,
      parentId: parent?.id,
    };

    console.log('🧪 Debug: Sending WhatsApp receipt:', receiptData);

    // Send WhatsApp receipt
    const result = await WhatsAppReceiptService.sendReceiptTemplate(receiptData);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      analysis,
      receiptData,
      usedTemplate: 'fee_receipt_automatic',
      pdfUrl: WhatsAppReceiptService.getReceiptPdfUrl(feeCollection.receiptNumber)
    });

  } catch (error) {
    console.error('Debug WhatsApp receipt error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to test WhatsApp receipt functionality'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { receiptNumber, phone, dryRun = false } = body;

    if (!receiptNumber) {
      return NextResponse.json({
        error: 'receiptNumber is required in request body'
      }, { status: 400 });
    }

    // Find the fee collection
    const feeCollection = await db.feeCollection.findFirst({
      where: { receiptNumber },
      include: {
        student: {
          include: {
            parent: true
          }
        },
        branch: true,
      }
    });

    if (!feeCollection) {
      return NextResponse.json({
        error: 'Fee collection not found',
        receiptNumber
      }, { status: 404 });
    }

    const parent = feeCollection.student.parent;
    const parentPhoneNumber = phone || parent?.fatherMobile || parent?.motherMobile;

    if (!parentPhoneNumber) {
      return NextResponse.json({
        error: 'No phone number provided and no parent phone available',
        availablePhones: {
          fatherMobile: parent?.fatherMobile,
          motherMobile: parent?.motherMobile
        }
      }, { status: 400 });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Would send WhatsApp receipt',
        receiptNumber,
        phone: parentPhoneNumber,
        student: `${feeCollection.student.firstName} ${feeCollection.student.lastName}`,
        amount: feeCollection.totalAmount
      });
    }

    // Determine parent name
    let parentName = "Parent";
    if (parent) {
      if (parentPhoneNumber === parent.fatherMobile && parent.fatherName) {
        parentName = parent.fatherName.toLowerCase().includes('mr.') ? parent.fatherName : `Mr. ${parent.fatherName}`;
      } else if (parentPhoneNumber === parent.motherMobile && parent.motherName) {
        parentName = parent.motherName.toLowerCase().includes('mrs.') ? parent.motherName : `Mrs. ${parent.motherName}`;
      } else if (parent.fatherName) {
        parentName = parent.fatherName.toLowerCase().includes('mr.') ? parent.fatherName : `Mr. ${parent.fatherName}`;
      } else if (parent.motherName) {
        parentName = parent.motherName.toLowerCase().includes('mrs.') ? parent.motherName : `Mrs. ${parent.motherName}`;
      }
    }

    const receiptData = {
      receiptNumber: feeCollection.receiptNumber,
      studentName: `${feeCollection.student.firstName} ${feeCollection.student.lastName}`,
      amount: feeCollection.totalAmount,
      paymentDate: feeCollection.paymentDate,
      parentPhoneNumber: parentPhoneNumber,
      branchName: feeCollection.branch.name,
      parentName: parentName,
      branchId: feeCollection.branchId,
      studentId: feeCollection.studentId,
      parentId: parent?.id,
    };

    const result = await WhatsAppReceiptService.sendReceiptTemplate(receiptData);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      receiptData,
      method: 'POST with custom phone'
    });

  } catch (error) {
    console.error('Debug WhatsApp receipt POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
