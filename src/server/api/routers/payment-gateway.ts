import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { razorpayService } from "@/utils/razorpay-service";
import type { 
  PaymentGateway, 
  PaymentStatus, 
  PaymentRequestFee,
  CreatePaymentRequestData,
  CreatePaymentRequestResponse,
  PaymentHistoryFilter,
  PaymentHistoryItem,
  PaymentHistoryResponse 
} from "@/types/payment-gateway";

// Validation schemas
const paymentRequestFeeSchema = z.object({
  feeHeadId: z.string(),
  feeHeadName: z.string(),
  amount: z.number().positive(),
});

const createPaymentRequestSchema = z.object({
  studentId: z.string(),
  branchId: z.string(),
  sessionId: z.string(),
  feeTermId: z.string(),
  fees: z.array(paymentRequestFeeSchema).min(1, "At least one fee is required"),
  buyerName: z.string().min(1, "Buyer name is required"),
  buyerEmail: z.string().email().optional(),
  buyerPhone: z.string().min(10, "Valid phone number is required"),
  purpose: z.string().min(1, "Purpose is required"),
  description: z.string().optional(),
  expiryHours: z.number().min(1).max(72).default(24), // 1-72 hours
});

const paymentHistoryFilterSchema = z.object({
  branchId: z.string(),
  sessionId: z.string(),
  studentId: z.string().optional(),
  feeTermId: z.string().optional(),
  paymentMode: z.string().optional(),
  gateway: z.enum(['RAZORPAY', 'PAYTM', 'STRIPE', 'MANUAL', 'all']).optional(),
  status: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).optional(), // No maximum limit - can be undefined for unlimited
  cursor: z.string().optional(),
});

export const paymentGatewayRouter = createTRPCRouter({
  // Test payment gateway integration
  testPayment: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      let testPaymentRequest: any = null;
      let testGatewayTransaction: any = null;
      
      try {
        // Verify Razorpay is configured
        if (!razorpayService.isConfigured()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Payment gateway is not configured. Please contact administrator.",
          });
        }

        // Generate test receipt ID and expiry date
        const receiptId = razorpayService.generateReceiptId('TEST');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours expiry for test

        // Create success and failure URLs
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const successUrl = `${baseUrl}/finance/payment-success`;
        const failureUrl = `${baseUrl}/finance/payment-failure`;

        // Try to find a real student and fee term for testing, or use dummy values
        let testStudentId = 'test-student-id';
        let testFeeTermId = 'test-fee-term';
        
        try {
          // Try to get a real student from the branch
          const realStudent = await ctx.db.student.findFirst({
            where: { branchId: input.branchId },
            select: { id: true }
          });
          if (realStudent) {
            testStudentId = realStudent.id;
          }

          // Try to get a real fee term from the branch/session
          const realFeeTerm = await ctx.db.feeTerm.findFirst({
            where: { 
              branchId: input.branchId,
              sessionId: input.sessionId 
            },
            select: { id: true }
          });
          if (realFeeTerm) {
            testFeeTermId = realFeeTerm.id;
          }
        } catch (error) {
          console.log('Using dummy values for test payment');
        }

        // Create Razorpay order
        const razorpayOrder = await razorpayService.createOrder({
          amount: 1.0, // 1 Rupee test payment
          receipt: receiptId,
          notes: {
            purpose: 'Test Payment Gateway Integration',
            branchId: input.branchId,
            sessionId: input.sessionId,
            environment: 'test',
          },
        });

        // Create test payment request in database
        testPaymentRequest = await ctx.db.paymentRequest.create({
          data: {
            gateway: 'RAZORPAY',
            amount: 1.0, // 1 Rupee test payment
            currency: 'INR',
            status: 'PENDING',
            studentId: testStudentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            feeTermId: testFeeTermId,
            purpose: 'Test Payment Gateway Integration',
            description: 'This is a test payment of ₹1 to verify Razorpay integration',
            fees: [{ feeHeadId: 'test-fee-head', feeHeadName: 'Test Fee', amount: 1.0 }],
            buyerName: 'Test User',
            buyerEmail: 'test@school.edu',
            buyerPhone: '9999999999',
            redirectUrl: successUrl,
            webhookUrl: `${baseUrl}/api/webhooks/razorpay`,
            expiresAt,
            createdBy: ctx.user?.id || "",
            gatewayRequestId: razorpayOrder.id,
          },
        });

        // Create test payment gateway transaction
        testGatewayTransaction = await ctx.db.paymentGatewayTransaction.create({
          data: {
            gatewayTransactionId: receiptId,
            gateway: 'RAZORPAY',
            amount: 1.0,
            currency: 'INR',
            status: 'INITIATED',
            studentId: testStudentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            feeTermId: testFeeTermId,
            paymentRequestId: testPaymentRequest.id,
            gatewayOrderId: razorpayOrder.id,
            expiresAt,
          },
        });

        // Update payment request with initiated status
        await ctx.db.paymentRequest.update({
          where: { id: testPaymentRequest.id },
          data: {
            status: 'INITIATED',
          },
        });

        // Return checkout information
        return {
          success: true,
          paymentRequestId: testPaymentRequest.id,
          transactionId: testGatewayTransaction.id,
          checkoutData: {
            key: razorpayService.getConfig().keyId,
            amount: razorpayOrder.amount, // Amount in paise
            currency: razorpayOrder.currency,
            orderId: razorpayOrder.id,
            name: 'Test Payment',
            description: 'Test payment of ₹1',
            prefill: {
              name: 'Test User',
              email: 'test@school.edu',
              contact: '9999999999',
            },
            theme: {
              color: '#3B82F6', // Blue color
            },
            modal: {
              ondismiss: () => {
                console.log('Payment modal closed');
              }
            }
          },
          successUrl,
          failureUrl,
          message: 'Test payment order created successfully. Please complete the payment.',
        };
      } catch (error) {
        // Clean up if something goes wrong
        try {
          if (testGatewayTransaction) {
            await ctx.db.paymentGatewayTransaction.delete({
              where: { id: testGatewayTransaction.id },
            });
          }
          if (testPaymentRequest) {
            await ctx.db.paymentRequest.delete({
              where: { id: testPaymentRequest.id },
            });
          }
        } catch (cleanupError) {
          console.error('Error cleaning up failed payment records:', cleanupError);
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create test payment: ${errorMessage}`,
        });
      }
    }),

  // Check gateway configuration
  getGatewayConfig: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        razorpay: {
          isConfigured: razorpayService.isConfigured(),
          config: razorpayService.getConfig(),
        },
        paytm: {
          isConfigured: false,
          config: {},
        },
        stripe: {
          isConfigured: false,
          config: {},
        },
      };
    }),

  // Create payment request/link
  createPaymentRequest: protectedProcedure
    .input(createPaymentRequestSchema)
    .mutation(async ({ ctx, input }): Promise<CreatePaymentRequestResponse> => {
      try {
        // Verify Razorpay is configured
        if (!razorpayService.isConfigured()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Payment gateway is not configured. Please contact administrator.",
          });
        }

        // Verify student exists and belongs to the branch
        const student = await ctx.db.student.findUnique({
          where: { id: input.studentId },
          include: {
            section: {
              include: {
                class: true,
              },
            },
            parent: true,
          },
        });

        if (!student || student.branchId !== input.branchId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found or does not belong to this branch",
          });
        }

        // Verify fee term exists and belongs to the branch/session
        const feeTerm = await ctx.db.feeTerm.findUnique({
          where: { id: input.feeTermId },
        });

        if (!feeTerm || feeTerm.branchId !== input.branchId || feeTerm.sessionId !== input.sessionId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fee term not found or does not belong to this branch/session",
          });
        }

        // Calculate total amount
        const totalAmount = input.fees.reduce((sum, fee) => sum + fee.amount, 0);

        if (totalAmount <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Total amount must be greater than zero",
          });
        }

        // Generate receipt ID and expiry date
        const receiptId = razorpayService.generateReceiptId('SCHOLAR');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + input.expiryHours);

        // Create success and failure URLs
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const successUrl = `${baseUrl}/finance/payment-success`;
        const failureUrl = `${baseUrl}/finance/payment-failure`;

        // Create Razorpay order
        const razorpayOrder = await razorpayService.createOrder({
          amount: totalAmount,
          receipt: receiptId,
          notes: {
            studentId: input.studentId,
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            className: student.section?.class.name,
            sectionName: student.section?.name,
            feeTermId: input.feeTermId,
            feeTermName: feeTerm.name,
            branchId: input.branchId,
            sessionId: input.sessionId,
            purpose: input.purpose,
          },
        });

        // Create payment request in database first
        const paymentRequest = await ctx.db.paymentRequest.create({
          data: {
            gateway: 'RAZORPAY',
            amount: totalAmount,
            currency: 'INR',
            status: 'PENDING',
            studentId: input.studentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            feeTermId: input.feeTermId,
            purpose: input.purpose,
            description: input.description,
            fees: input.fees,
            buyerName: input.buyerName,
            buyerEmail: input.buyerEmail,
            buyerPhone: input.buyerPhone,
            redirectUrl: successUrl,
            webhookUrl: `${baseUrl}/api/webhooks/razorpay`,
            expiresAt,
            createdBy: ctx.user?.id || "",
            gatewayRequestId: razorpayOrder.id,
          },
        });

        // Create payment gateway transaction
        const gatewayTransaction = await ctx.db.paymentGatewayTransaction.create({
          data: {
            gatewayTransactionId: receiptId,
            gateway: 'RAZORPAY',
            amount: totalAmount,
            currency: 'INR',
            status: 'INITIATED',
            studentId: input.studentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            feeTermId: input.feeTermId,
            paymentRequestId: paymentRequest.id,
            gatewayOrderId: razorpayOrder.id,
            expiresAt,
          },
        });

        // Update payment request with initiated status
        await ctx.db.paymentRequest.update({
          where: { id: paymentRequest.id },
          data: {
            status: 'INITIATED',
          },
        });

        // Return checkout information
        return {
          success: true,
          transactionId: gatewayTransaction.id,
          checkoutData: {
            key: razorpayService.getConfig().keyId,
            amount: razorpayOrder.amount, // Amount in paise
            currency: razorpayOrder.currency,
            orderId: razorpayOrder.id,
            name: `${student.section?.class.name || 'School'} Fee Payment`,
            description: input.purpose,
            prefill: {
              name: input.buyerName,
              email: input.buyerEmail || student.email || '',
              contact: input.buyerPhone,
            },
            notes: {
              paymentRequestId: paymentRequest.id,
              transactionId: gatewayTransaction.id,
            },
            theme: {
              color: '#3B82F6', // Blue color matching the app theme
            },
          },
          successUrl,
          failureUrl,
          message: 'Payment order created successfully. Redirecting to payment gateway...',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check for Razorpay configuration issues
        if (errorMessage.includes('Razorpay') && errorMessage.includes('not configured')) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Razorpay payment gateway is not properly configured. Please contact system administrator.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create payment request: ${errorMessage}`,
        });
      }
    }),

  // Get payment history - shows all successful payments with receipts (both manual and gateway)
  getPaymentHistory: protectedProcedure
    .input(paymentHistoryFilterSchema)
    .query(async ({ ctx, input }): Promise<PaymentHistoryResponse> => {
      try {
        // Build where clause for fee collections (both manual and gateway payments create fee collections)
        const whereClause: any = {
          branchId: input.branchId,
          sessionId: input.sessionId,
          status: 'COMPLETED', // Only show completed/successful payments
        };

        // Apply student filter
        if (input.studentId) {
          whereClause.studentId = input.studentId;
        }

        // Apply date filters to paymentDate
        if (input.startDate || input.endDate) {
          whereClause.paymentDate = {};
          if (input.startDate) {
            whereClause.paymentDate.gte = input.startDate;
          }
          if (input.endDate) {
            whereClause.paymentDate.lte = input.endDate;
          }
        }

        // Apply payment mode filter
        if (input.paymentMode && input.paymentMode !== 'all') {
          whereClause.paymentMode = input.paymentMode;
        }

        // Apply gateway filter (distinguishes between manual and gateway payments)
        if (input.gateway && input.gateway !== 'all') {
          if (input.gateway === 'MANUAL') {
            whereClause.gateway = null; // Manual payments have null gateway
          } else {
            whereClause.gateway = input.gateway;
          }
        }

        // Query fee collections (includes both manual and gateway payments)
        const feeCollections = await ctx.db.feeCollection.findMany({
          where: whereClause,
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                admissionNumber: true,
              },
            },
            items: {
              select: {
                id: true,
                amount: true,
                originalAmount: true,
                concessionAmount: true,
                feeHead: {
                  select: {
                    name: true,
                  },
                },
                feeTerm: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            branch: {
              select: {
                name: true,
                address: true,
                city: true,
                state: true,
                logoUrl: true,
              },
            },
            session: {
              select: {
                name: true,
              },
            },
            gatewayTransaction: {
              select: {
                gatewayTransactionId: true,
                gatewayOrderId: true,
                status: true,
                failureReason: true,
                gatewayResponse: true,
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        });

        // Convert fee collections to PaymentHistoryItem format
        const paymentItems: PaymentHistoryItem[] = feeCollections.map((fee: any): PaymentHistoryItem => {
          // Get fee term names from items
          const feeTermNames = fee.items?.map((item: any) => item.feeTerm?.name).filter(Boolean) || [];
          const uniqueFeeTermNames = [...new Set(feeTermNames)];
          
          // Determine payment type based on gateway field
          const isGatewayPayment = fee.gateway !== null;
          
          return {
            id: fee.id,
            transactionId: isGatewayPayment 
              ? fee.gatewayTransaction?.gatewayTransactionId || fee.transactionReference || fee.receiptNumber
              : fee.receiptNumber,
            orderId: fee.gatewayTransaction?.gatewayOrderId || undefined,
            gateway: fee.gateway || 'RAZORPAY' as PaymentGateway, // Required by interface, actual payment type determined by type field
            amount: fee.totalAmount,
            currency: 'INR',
            status: 'SUCCESS' as PaymentStatus, // All fee collections are successful
            type: isGatewayPayment ? 'gateway' as const : 'manual' as const,
            studentId: fee.studentId,
            studentName: `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`.trim(),
            studentAdmissionNumber: fee.student?.admissionNumber || '',
            branchId: fee.branchId,
            branchName: fee.branch?.name || '',
            branchAddress: fee.branch?.address,
            branchCity: fee.branch?.city,
            branchState: fee.branch?.state,
            branchLogoUrl: fee.branch?.logoUrl,
            sessionId: fee.sessionId,
            sessionName: fee.session?.name || '',
            feeTermId: fee.items?.[0]?.feeTermId || '',
            feeTermName: uniqueFeeTermNames.length > 0 ? uniqueFeeTermNames.join(', ') : undefined,
            paymentRequestId: fee.paymentRequestId || undefined,
            moneyCollectionId: fee.id,
            receiptNumber: fee.receiptNumber,
            paymentMode: fee.paymentMode,
            paymentDate: fee.paymentDate,
            feesBreakdown: fee.items?.map((item: any) => ({
              feeHeadName: item.feeHead?.name || '',
              feeTermName: item.feeTerm?.name || '',
              amount: item.amount,
              originalAmount: item.originalAmount || item.amount,
              concessionAmount: item.concessionAmount || 0,
            })) || [],
            failureReason: fee.gatewayTransaction?.failureReason || undefined,
            gatewayResponse: fee.gatewayTransaction?.gatewayResponse || undefined,
            createdAt: fee.createdAt,
            updatedAt: fee.updatedAt,
          };
        });

        return {
          items: paymentItems,
          nextCursor: undefined,
        };
      } catch (error) {
        console.error('Payment history error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch payment history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get payment details by transaction ID
  getPaymentByTransactionId: publicProcedure
    .input(z.object({
      transactionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.paymentGatewayTransaction.findFirst({
        where: { gatewayTransactionId: input.transactionId },
        include: {
          student: {
            select: {
              id: true,
              admissionNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          session: {
            select: {
              id: true,
              name: true,
            },
          },
          feeTerm: {
            select: {
              id: true,
              name: true,
            },
          },
          feeCollections: {
            select: {
              id: true,
              receiptNumber: true,
              paymentMode: true,
              paymentDate: true,
              totalAmount: true,

            },
          },
          paymentRequest: {
            select: {
              id: true,
              purpose: true,
              description: true,
              buyerName: true,
              buyerEmail: true,
              buyerPhone: true,
              fees: true,
              expiresAt: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment transaction not found",
        });
      }

      return transaction;
    }),

  // Check payment status
  checkPaymentStatus: publicProcedure
    .input(z.object({
      transactionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.paymentGatewayTransaction.findFirst({
        where: { gatewayTransactionId: input.transactionId },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
              section: {
                include: {
                  class: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          feeTerm: {
            select: {
              id: true,
              name: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          session: {
            select: {
              id: true,
              name: true,
            },
          },
          feeCollections: {
            select: {
              id: true,
              receiptNumber: true,
            },
            take: 1,
          },
        },
      });

      if (!transaction) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment transaction not found",
        });
      }

      return {
        transactionId: transaction.gatewayTransactionId,
        gateway: transaction.gateway,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        isSuccess: transaction.status === 'SUCCESS',
        isPending: transaction.status === 'PENDING' || transaction.status === 'INITIATED',
        isFailed: transaction.status === 'FAILED',
        moneyCollectionId: transaction.feeCollections?.[0]?.id || null,
        failureReason: transaction.failureReason,
        lastUpdated: transaction.updatedAt,
        student: transaction.student,
        feeTerm: transaction.feeTerm,
        branch: transaction.branch,
        session: transaction.session,
      };
    }),

  // Verify payment after redirect (for client-side verification)
  verifyPayment: publicProcedure
    .input(z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify the payment signature
        const isValid = razorpayService.verifyPaymentSignature({
          orderId: input.razorpay_order_id,
          paymentId: input.razorpay_payment_id,
          signature: input.razorpay_signature,
        });

        if (!isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid payment signature",
          });
        }

        // Find the transaction by order ID
        const transaction = await ctx.db.paymentGatewayTransaction.findFirst({
          where: { gatewayOrderId: input.razorpay_order_id },
        });

        if (!transaction) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transaction not found",
          });
        }

        // The webhook will handle the actual status update
        // This endpoint just verifies the signature for the client
        return {
          success: true,
          transactionId: transaction.gatewayTransactionId,
          message: "Payment verified successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify payment",
        });
      }
    }),

  // Get all payment gateway requests for monitoring
  getPaymentGatewayRequests: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      status: z.enum(['PENDING', 'INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'all']).optional(),
      gateway: z.enum(['RAZORPAY', 'PAYTM', 'STRIPE', 'all']).optional(),
      studentId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(1000).default(100),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Build where clause for payment requests
        const requestWhereClause: any = {
          branchId: input.branchId,
          sessionId: input.sessionId,
        };

        if (input.studentId) {
          requestWhereClause.studentId = input.studentId;
        }

        if (input.gateway && input.gateway !== 'all') {
          requestWhereClause.gateway = input.gateway;
        }

        if (input.status && input.status !== 'all') {
          requestWhereClause.status = input.status;
        }

        if (input.startDate || input.endDate) {
          requestWhereClause.createdAt = {};
          if (input.startDate) {
            requestWhereClause.createdAt.gte = input.startDate;
          }
          if (input.endDate) {
            requestWhereClause.createdAt.lte = input.endDate;
          }
        }

        // Add cursor for pagination
        if (input.cursor) {
          requestWhereClause.id = {
            lt: input.cursor,
          };
        }

        // Build where clause for transactions
        const transactionWhereClause: any = {
          branchId: input.branchId,
          sessionId: input.sessionId,
        };

        if (input.studentId) {
          transactionWhereClause.studentId = input.studentId;
        }

        if (input.gateway && input.gateway !== 'all') {
          transactionWhereClause.gateway = input.gateway;
        }

        if (input.status && input.status !== 'all') {
          transactionWhereClause.status = input.status;
        }

        if (input.startDate || input.endDate) {
          transactionWhereClause.createdAt = {};
          if (input.startDate) {
            transactionWhereClause.createdAt.gte = input.startDate;
          }
          if (input.endDate) {
            transactionWhereClause.createdAt.lte = input.endDate;
          }
        }

        // Fetch payment requests and transactions
        const [paymentRequests, transactions, webhookLogs] = await Promise.all([
          ctx.db.paymentRequest.findMany({
            where: requestWhereClause,
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  admissionNumber: true,
                },
              },
              feeTerm: {
                select: {
                  name: true,
                },
              },
              transactions: {
                select: {
                  id: true,
                  status: true,
                  gatewayTransactionId: true,
                  failureReason: true,
                  paidAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 1, // Latest transaction
              },
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit + 1, // Take one extra to check if there are more
          }),

          ctx.db.paymentGatewayTransaction.findMany({
            where: transactionWhereClause,
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  admissionNumber: true,
                },
              },
              feeTerm: {
                select: {
                  name: true,
                },
              },
              paymentRequest: {
                select: {
                  id: true,
                  purpose: true,
                  buyerName: true,
                  buyerPhone: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
          }),

          // Get recent webhook logs for debugging
          ctx.db.paymentWebhookLog.findMany({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          }),
        ]);

        // Check if there are more payment requests
        const hasMore = paymentRequests.length > input.limit;
        const limitedRequests = hasMore ? paymentRequests.slice(0, input.limit) : paymentRequests;

        // Get next cursor
        const nextCursor = hasMore ? limitedRequests[limitedRequests.length - 1]?.id : undefined;

        return {
          paymentRequests: limitedRequests.map((req: any) => ({
            id: req.id,
            gateway: req.gateway,
            amount: req.amount,
            currency: req.currency,
            status: req.status,
            studentId: req.studentId,
            studentName: `${req.student?.firstName || ''} ${req.student?.lastName || ''}`.trim(),
            studentAdmissionNumber: req.student?.admissionNumber || '',
            feeTermName: req.feeTerm?.name || '',
            purpose: req.purpose,
            description: req.description,
            buyerName: req.buyerName,
            buyerPhone: req.buyerPhone,
            buyerEmail: req.buyerEmail,
            gatewayRequestId: req.gatewayRequestId,
            paymentUrl: req.paymentUrl,
            shortUrl: req.shortUrl,
            expiresAt: req.expiresAt,
            completedAt: req.completedAt,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            latestTransaction: req.transactions?.[0] || null,
            fees: req.fees,
          })),
          transactions: transactions.map((txn: any) => ({
            id: txn.id,
            gatewayTransactionId: txn.gatewayTransactionId,
            gateway: txn.gateway,
            amount: txn.amount,
            currency: txn.currency,
            status: txn.status,
            studentId: txn.studentId,
            studentName: `${txn.student?.firstName || ''} ${txn.student?.lastName || ''}`.trim(),
            studentAdmissionNumber: txn.student?.admissionNumber || '',
            feeTermName: txn.feeTerm?.name || '',
            paymentRequestId: txn.paymentRequestId,
            gatewayOrderId: txn.gatewayOrderId,
            gatewayPaymentId: txn.gatewayPaymentId,
            failureReason: txn.failureReason,
            gatewayResponse: txn.gatewayResponse,
            webhookData: txn.webhookData,
            expiresAt: txn.expiresAt,
            paidAt: txn.paidAt,
            createdAt: txn.createdAt,
            updatedAt: txn.updatedAt,
            paymentRequest: txn.paymentRequest,
          })),
          webhookLogs: webhookLogs.map((log: any) => ({
            id: log.id,
            gateway: log.gateway,
            event: log.event,
            transactionId: log.transactionId,
            requestId: log.requestId,
            processed: log.processed,
            processingError: log.processingError,
            createdAt: log.createdAt,
            payload: log.payload,
          })),
          pagination: {
            hasMore,
            nextCursor,
          },
        };
      } catch (error) {
        console.error('Payment gateway requests error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch payment gateway requests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});