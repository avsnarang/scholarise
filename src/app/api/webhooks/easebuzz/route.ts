import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { easebuzzService } from '@/utils/easebuzz-service';
import type { PaymentResponse } from '@/utils/easebuzz-service';

export async function POST(req: NextRequest) {
  try {
    // Get the raw body and headers
    const body = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Parse form data
    const formData = new URLSearchParams(body);
    const paymentResponse: Partial<PaymentResponse> = {};
    
    // Extract all Easebuzz response fields
    formData.forEach((value, key) => {
      (paymentResponse as any)[key] = value;
    });

    // Log the webhook for debugging and audit
    const webhookLog = await db.paymentWebhookLog.create({
      data: {
        gateway: 'EASEBUZZ',
        event: 'payment_response',
        headers,
        payload: paymentResponse,
        processed: false,
      },
    });

    // Validate required fields
    if (!paymentResponse.txnid || !paymentResponse.status || !paymentResponse.hash) {
      console.error('Invalid webhook payload - missing required fields:', paymentResponse);
      await db.paymentWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          processingError: 'Missing required fields: txnid, status, or hash',
        },
      });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Verify hash to ensure authenticity
    if (!easebuzzService.verifyResponseHash(paymentResponse as PaymentResponse)) {
      console.error('Invalid hash verification for transaction:', paymentResponse.txnid);
      await db.paymentWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          processingError: 'Hash verification failed',
        },
      });
      return NextResponse.json({ error: 'Hash verification failed' }, { status: 400 });
    }

    // Find the payment gateway transaction
    const transaction = await db.paymentGatewayTransaction.findFirst({
      where: {
        gatewayTransactionId: paymentResponse.txnid,
        gateway: 'EASEBUZZ',
      },
      include: {
        paymentRequest: true,
        student: {
          include: {
            section: {
              include: {
                class: true,
              },
            },
          },
        },
        feeTerm: true,
      },
    });

    if (!transaction) {
      console.error('Transaction not found for txnid:', paymentResponse.txnid);
      await db.paymentWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          processingError: `Transaction not found for txnid: ${paymentResponse.txnid}`,
        },
      });
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Map Easebuzz status to our status
    let paymentStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    
    if (paymentResponse.status === 'success') {
      paymentStatus = 'SUCCESS';
    } else if (paymentResponse.status === 'failure' || paymentResponse.status === 'error') {
      paymentStatus = 'FAILED';
    } else {
      paymentStatus = 'PENDING';
    }

    // Update the transaction with webhook data
    const updatedTransaction = await db.paymentGatewayTransaction.update({
      where: { id: transaction.id },
      data: {
        status: paymentStatus,
        gatewayPaymentId: paymentResponse.mihpayid,
        webhookData: paymentResponse,
        gatewayResponse: {
          ...(transaction.gatewayResponse && typeof transaction.gatewayResponse === 'object' ? transaction.gatewayResponse : {}),
          webhook: paymentResponse,
        },
        failureReason: paymentStatus === 'FAILED' ? paymentResponse.error_Message || paymentResponse.error : null,
        paidAt: paymentStatus === 'SUCCESS' ? new Date() : null,
      },
    });

    // Update payment request status
    if (transaction.paymentRequest) {
      await db.paymentRequest.update({
        where: { id: transaction.paymentRequest.id },
        data: {
          status: paymentStatus,
          completedAt: paymentStatus === 'SUCCESS' ? new Date() : null,
        },
      });
    }

    // If payment is successful, create fee collection record
    if (paymentStatus === 'SUCCESS' && transaction.paymentRequest) {
      try {
        // Generate new format receipt number: TSH{Branch Code}/FIN/{Session Name}/000001
        const [branch, session] = await Promise.all([
          db.branch.findUnique({
            where: { id: transaction.branchId },
            select: { code: true }
          }),
          db.academicSession.findUnique({
            where: { id: transaction.sessionId },
            select: { name: true }
          })
        ]);

        if (!branch || !session) {
          throw new Error(`Branch or session not found for transaction ${transaction.id}`);
        }

        const branchCode = branch.code;
        const sessionName = session.name;
        const prefix = `TSH${branchCode}/FIN/${sessionName}/`;

        // Find the highest existing receipt number for this branch/session
        const lastReceipt = await db.feeCollection.findFirst({
          where: {
            branchId: transaction.branchId,
            sessionId: transaction.sessionId,
            receiptNumber: {
              startsWith: prefix,
            },
          },
          orderBy: {
            receiptNumber: 'desc'
          },
          select: {
            receiptNumber: true
          }
        });

        let nextNumber: number;
        if (!lastReceipt) {
          nextNumber = 1;
        } else {
          const lastReceiptNumber = lastReceipt.receiptNumber;
          const numberPart = lastReceiptNumber.split('/').pop();
          const lastNumber = parseInt(numberPart || '0', 10);
          nextNumber = lastNumber + 1;
        }

        const paddedNumber = nextNumber.toString().padStart(6, '0');
        const receiptNumber = `${prefix}${paddedNumber}`;

        // Create fee collection
        const feeCollection = await db.feeCollection.create({
          data: {
            receiptNumber,
            studentId: transaction.studentId,
            totalAmount: transaction.amount,
            paidAmount: transaction.amount,
            paymentMode: 'Online',
            transactionReference: paymentResponse.bank_ref_num || paymentResponse.txnid,
            paymentDate: new Date(),
            status: 'COMPLETED',
            branchId: transaction.branchId,
            sessionId: transaction.sessionId,
            gatewayTransactionId: transaction.id,
            paymentRequestId: transaction.paymentRequestId,
            gateway: 'EASEBUZZ',
            notes: `Gateway Payment - ${paymentResponse.mode || 'Online'}`,
          },
        });

        // Create fee collection items from payment request fees
        const fees = transaction.paymentRequest.fees as Array<{feeHeadId: string, amount: number}>;
        await db.feeCollectionItem.createMany({
          data: fees.map(fee => ({
            feeCollectionId: feeCollection.id,
            feeHeadId: fee.feeHeadId,
            feeTermId: transaction.feeTermId,
            amount: fee.amount,
          })),
        });

        console.log(`Payment successful for transaction ${transaction.id}, receipt ${receiptNumber} created`);

        // TODO: Trigger real-time notification here
        // This is where we would publish to Supabase realtime
        
      } catch (error) {
        console.error('Error creating fee collection for successful payment:', error);
        await db.paymentWebhookLog.update({
          where: { id: webhookLog.id },
          data: {
            processingError: `Error creating fee collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        });
      }
    }

    // Mark webhook as processed
    await db.paymentWebhookLog.update({
      where: { id: webhookLog.id },
      data: {
        processed: true,
        transactionId: transaction.id,
      },
    });

    console.log(`Webhook processed for transaction ${transaction.id}, status: ${paymentStatus}`);

    return NextResponse.json({ 
      success: true, 
      status: paymentStatus,
      transactionId: transaction.id,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing Easebuzz webhook:', error);
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Easebuzz webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
} 