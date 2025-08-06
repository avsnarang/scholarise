import { NextRequest, NextResponse } from 'next/server';
import { razorpayService } from '@/utils/razorpay-service';
import type { RazorpayWebhookEvent } from '@/utils/razorpay-service';
import { db } from '@/server/db';
import { PaymentStatus } from '@prisma/client';

// Razorpay sends webhook events for various payment states
// We need to handle these securely by verifying signatures
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Get Razorpay signature from headers
    const signature = request.headers.get('x-razorpay-signature');
    
    if (!signature) {
      console.error('Missing Razorpay webhook signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature for security
    if (!razorpayService.verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid Razorpay webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook event
    const event: RazorpayWebhookEvent = JSON.parse(rawBody);
    
    console.log('Received Razorpay webhook event:', {
      event: event.event,
      entity: event.entity,
      timestamp: new Date(event.created_at * 1000).toISOString(),
    });

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
      case 'payment.authorized':
        await handlePaymentSuccess(event);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event);
        break;
        
      case 'order.paid':
        await handleOrderPaid(event);
        break;
        
      default:
        console.log(`Unhandled Razorpay webhook event: ${event.event}`);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    // Return 200 to prevent Razorpay from retrying
    return NextResponse.json({ status: 'error processed' });
  }
}

async function handlePaymentSuccess(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;
  const notes = payment.notes || {};

  try {
    // Find the payment gateway transaction by order ID
    const transaction = await db.paymentGatewayTransaction.findFirst({
      where: { gatewayOrderId: orderId },
      include: {
        paymentRequest: true,
        branch: true,
        feeTerm: true,
      },
    });

    if (!transaction) {
      console.error(`Transaction not found for order ID: ${orderId}`);
      return;
    }

    // Check if transaction is already processed (idempotency protection)
    if (transaction.status === PaymentStatus.SUCCESS) {
      console.log(`Transaction ${transaction.id} already processed as SUCCESS, skipping`);
      return;
    }

    // Update the payment gateway transaction
    await db.paymentGatewayTransaction.update({
      where: { id: transaction.id },
      data: {
        gatewayPaymentId: paymentId,
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(payment.created_at * 1000),
        gatewayResponse: payment as any,
        webhookData: event as any,
      },
    });

    // Update the payment request status
    if (transaction.paymentRequestId) {
      await db.paymentRequest.update({
        where: { id: transaction.paymentRequestId },
        data: {
          status: PaymentStatus.SUCCESS,
        },
      });
    }

    // Check if fee collection already exists (idempotency protection)
    const existingFeeCollection = await db.feeCollection.findFirst({
      where: {
        gatewayTransactionId: transaction.id
      }
    });

    if (existingFeeCollection) {
      console.log(`Fee collection already exists for transaction ${transaction.id}, skipping creation`);
      return; // Don't create duplicate receipt
    }

    // Create fee collection record
    const receiptNumber = await generateReceiptNumber(transaction.branchId, transaction.sessionId);
    
    const feeCollection = await db.feeCollection.create({
      data: {
        receiptNumber,
        studentId: transaction.studentId,
        totalAmount: payment.amount / 100, // Convert from paise to rupees
        paidAmount: payment.amount / 100,
        paymentMode: 'ONLINE',
        transactionReference: paymentId,
        paymentDate: new Date(payment.created_at * 1000),
        notes: `Razorpay Payment - ${payment.method}`,
        status: 'COMPLETED',
        branchId: transaction.branchId,
        sessionId: transaction.sessionId,
        createdBy: 'system',
        gateway: 'RAZORPAY',
        gatewayTransactionId: transaction.id,
        paymentRequestId: transaction.paymentRequestId,
      },
    });

    // Create fee collection items from payment request fee breakdown
    if (transaction.paymentRequest?.fees) {
      const fees = Array.isArray(transaction.paymentRequest.fees) 
        ? transaction.paymentRequest.fees 
        : [];
      
      if (fees.length > 0) {
        await db.feeCollectionItem.createMany({
          data: fees.map((fee: any) => ({
            feeCollectionId: feeCollection.id,
            feeHeadId: fee.feeHeadId,
            feeTermId: transaction.feeTermId,
            amount: fee.amount,
            originalAmount: fee.originalAmount || fee.amount,
            concessionAmount: fee.concessionAmount || 0,
          })),
        });
      }
    }

    // Link fee collection to the transaction
    await db.paymentGatewayTransaction.update({
      where: { id: transaction.id },
      data: {
        feeCollections: {
          connect: { id: feeCollection.id }
        }
      },
    });

    console.log(`Payment success processed for order ${orderId}, payment ${paymentId}`);
    
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailed(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id;
  const paymentId = payment.id;

  try {
    // Find and update the transaction
    const transaction = await db.paymentGatewayTransaction.findFirst({
      where: { gatewayOrderId: orderId },
    });

    if (!transaction) {
      console.error(`Transaction not found for order ID: ${orderId}`);
      return;
    }

    // Update the payment gateway transaction
    await db.paymentGatewayTransaction.update({
      where: { id: transaction.id },
      data: {
        gatewayPaymentId: paymentId,
        status: PaymentStatus.FAILED,
        failureReason: payment.error_description || payment.error_reason || 'Payment failed',
        gatewayResponse: payment as any,
        webhookData: event as any,
      },
    });

    // Update the payment request status
    if (transaction.paymentRequestId) {
      await db.paymentRequest.update({
        where: { id: transaction.paymentRequestId },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
    }

    console.log(`Payment failure processed for order ${orderId}, payment ${paymentId}`);
    
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

async function handleOrderPaid(event: RazorpayWebhookEvent) {
  const order = event.payload.order?.entity;
  if (!order) return;

  console.log(`Order paid event received for order ${order.id}`);
  // Order paid events are informational, the actual payment handling
  // is done in payment.captured/authorized events
}

// Generate receipt number for fee collection
async function generateReceiptNumber(branchId: string, sessionId: string): Promise<string> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  });

  const session = await db.academicSession.findUnique({
    where: { id: sessionId },
    select: { name: true },
  });

  const branchCode = branch?.code || 'BR';
  const sessionYear = session?.name.split('-')[0] || new Date().getFullYear().toString();

  // Get the last receipt number for this branch and session
  const lastReceipt = await db.feeCollection.findFirst({
    where: {
      branchId,
      sessionId,
      receiptNumber: {
        startsWith: `${branchCode}/${sessionYear}/`,
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true },
  });

  let nextNumber = 1;
  if (lastReceipt?.receiptNumber) {
    const parts = lastReceipt.receiptNumber.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      const lastNumber = parseInt(lastPart, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }

  return `${branchCode}/${sessionYear}/${nextNumber.toString().padStart(6, '0')}`;
}

// GET endpoint for webhook verification
export async function GET() {
  return NextResponse.json({
    message: 'Razorpay webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}