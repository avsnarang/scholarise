import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { easebuzzService } from "@/utils/easebuzz-service";
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
  gateway: z.enum(['EASEBUZZ', 'RAZORPAY', 'PAYTM', 'STRIPE']).optional(),
  status: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).optional(), // No maximum limit - can be undefined for unlimited
  cursor: z.string().optional(),
});

export const paymentGatewayRouter = createTRPCRouter({
  // Test payment link creation (1 Rupee)
  createTestPaymentLink: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }): Promise<CreatePaymentRequestResponse> => {
      // Declare variables outside try block for cleanup access
      let testPaymentRequest: any = null;
      let testGatewayTransaction: any = null;
      
      try {
        // Verify Easebuzz is configured
        if (!easebuzzService.isConfigured()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Payment gateway is not configured. Please contact administrator.",
          });
        }

        // Generate test transaction ID and expiry date
        const txnid = easebuzzService.generateTransactionId('TEST');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours expiry for test

        // Create success and failure URLs
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const successUrl = `${baseUrl}/finance/payment-success?txnid=${txnid}`;
        const failureUrl = `${baseUrl}/finance/payment-failure?txnid=${txnid}`;

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

        // Create test payment request in database
        testPaymentRequest = await ctx.db.paymentRequest.create({
          data: {
            gateway: 'EASEBUZZ',
            amount: 1.0, // 1 Rupee test payment
            currency: 'INR',
            status: 'PENDING',
            studentId: testStudentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            feeTermId: testFeeTermId,
            purpose: 'Test Payment Gateway Integration',
            description: 'This is a test payment of ₹1 to verify Easebuzz integration',
            fees: [{ feeHeadId: 'test-fee-head', feeHeadName: 'Test Fee', amount: 1.0 }],
            buyerName: 'Test User',
            buyerEmail: 'test@school.edu',
            buyerPhone: '9999999999',
            redirectUrl: successUrl,
            webhookUrl: `${baseUrl}/api/webhooks/easebuzz`,
            expiresAt,
            createdBy: ctx.user?.id || "",
          },
        });

        // Create test payment gateway transaction
        testGatewayTransaction = await ctx.db.paymentGatewayTransaction.create({
          data: {
            gatewayTransactionId: txnid,
            gateway: 'EASEBUZZ',
            amount: 1.0,
            currency: 'INR',
            status: 'PENDING',
            studentId: testStudentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            feeTermId: testFeeTermId,
            paymentRequestId: testPaymentRequest.id,
            gatewayOrderId: txnid,
            expiresAt,
          },
        });

        // Create payment link with Easebuzz
        const paymentLinkResponse = await easebuzzService.createPaymentLink({
          txnid,
          amount: 1.0,
          firstname: 'Test User',
          email: 'test@school.edu',
          phone: '9999999999',
          productinfo: 'Test Payment Gateway Integration',
          surl: successUrl,
          furl: failureUrl,
          udf1: testPaymentRequest.id,
          udf2: testGatewayTransaction.id,
          udf3: testStudentId,
          udf4: input.branchId,
          udf5: input.sessionId,
          expiryDate: expiresAt,
        });

        if (paymentLinkResponse.status === 0) {
          // Payment link creation failed
          await ctx.db.paymentRequest.update({
            where: { id: testPaymentRequest.id },
            data: { status: 'FAILED' },
          });

          await ctx.db.paymentGatewayTransaction.update({
            where: { id: testGatewayTransaction.id },
            data: { 
              status: 'FAILED',
              failureReason: paymentLinkResponse.msg || 'Payment link creation failed',
            },
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Test payment link creation failed: ${paymentLinkResponse.msg || 'Unknown error from Easebuzz'}`,
          });
        }

        // Update payment request with gateway response
        await ctx.db.paymentRequest.update({
          where: { id: testPaymentRequest.id },
          data: {
            status: 'INITIATED',
            paymentUrl: paymentLinkResponse.data,
            gatewayRequestId: txnid,
          },
        });

        await ctx.db.paymentGatewayTransaction.update({
          where: { id: testGatewayTransaction.id },
          data: {
            status: 'INITIATED',
            gatewayResponse: paymentLinkResponse as any,
          },
        });

        return {
          success: true,
          data: {
            paymentRequestId: testPaymentRequest.id,
            paymentUrl: paymentLinkResponse.data,
            transactionId: testGatewayTransaction.id,
            expiresAt: expiresAt,
          },
        };

      } catch (error) {
        console.error('Test payment creation error:', error);
        
        // Clean up created records in case of error (if they were created)
        try {
          if (testPaymentRequest?.id) {
            await ctx.db.paymentRequest.update({
              where: { id: testPaymentRequest.id },
              data: { status: 'FAILED' },
            });
          }
          if (testGatewayTransaction?.id) {
            await ctx.db.paymentGatewayTransaction.update({
              where: { id: testGatewayTransaction.id },
              data: { 
                status: 'FAILED',
                failureReason: error instanceof Error ? error.message : 'Unknown error',
              },
            });
          }
        } catch (cleanupError) {
          console.error('Error cleaning up failed payment records:', cleanupError);
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        // Check for configuration issues
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('Easebuzz configuration is incomplete') || 
            errorMessage.includes('EASEBUZZ_MERCHANT_KEY') ||
            errorMessage.includes('EASEBUZZ_MERCHANT_SALT')) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Easebuzz payment gateway is not properly configured. Please contact system administrator to configure EASEBUZZ_MERCHANT_KEY and EASEBUZZ_MERCHANT_SALT environment variables.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create test payment link: ${errorMessage}`,
        });
      }
    }),

  // Check gateway configuration
  getGatewayConfig: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        easebuzz: {
          isConfigured: easebuzzService.isConfigured(),
          config: easebuzzService.getConfig(),
        },
        // Add other gateways here as needed
      };
    }),

  // Create payment request/link
  createPaymentRequest: protectedProcedure
    .input(createPaymentRequestSchema)
    .mutation(async ({ ctx, input }): Promise<CreatePaymentRequestResponse> => {
      try {
        // Verify Easebuzz is configured
        if (!easebuzzService.isConfigured()) {
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
            code: "BAD_REQUEST",
            message: "Invalid student for the specified branch",
          });
        }

        if (!student.section?.class || student.section.class.sessionId !== input.sessionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Student is not enrolled in the specified academic session",
          });
        }

        // Verify fee term
        const feeTerm = await ctx.db.feeTerm.findUnique({
          where: { id: input.feeTermId },
        });

        if (!feeTerm || feeTerm.branchId !== input.branchId || feeTerm.sessionId !== input.sessionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid fee term for the specified branch and session",
          });
        }

        // Verify fee heads exist
        const feeHeadIds = input.fees.map(fee => fee.feeHeadId);
        const validFeeHeads = await ctx.db.feeHead.findMany({
          where: {
            id: { in: feeHeadIds },
            branchId: input.branchId,
            sessionId: input.sessionId,
            isActive: true,
          },
        });

        if (validFeeHeads.length !== feeHeadIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Some fee heads are invalid or inactive",
          });
        }

        const totalAmount = input.fees.reduce((sum, fee) => sum + fee.amount, 0);

        // Generate transaction ID and expiry date
        const txnid = easebuzzService.generateTransactionId('SCHOLAR');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + input.expiryHours);

        // Create success and failure URLs
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const successUrl = `${baseUrl}/finance/payment-success?txnid=${txnid}`;
        const failureUrl = `${baseUrl}/finance/payment-failure?txnid=${txnid}`;

        // Create payment request in database first
        const paymentRequest = await ctx.db.paymentRequest.create({
          data: {
            gateway: 'EASEBUZZ',
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
            webhookUrl: `${baseUrl}/api/webhooks/easebuzz`,
            expiresAt,
            createdBy: ctx.user?.id || "",
          },
        });

        // Create payment gateway transaction
        const gatewayTransaction = await ctx.db.paymentGatewayTransaction.create({
          data: {
            gatewayTransactionId: txnid,
            gateway: 'EASEBUZZ',
            amount: totalAmount,
            currency: 'INR',
            status: 'PENDING',
            studentId: input.studentId,
            branchId: input.branchId,
            sessionId: input.sessionId,
            feeTermId: input.feeTermId,
            paymentRequestId: paymentRequest.id,
            gatewayOrderId: txnid,
            expiresAt,
          },
        });

        // Create payment link with Easebuzz
        const paymentLinkResponse = await easebuzzService.createPaymentLink({
          txnid,
          amount: totalAmount,
          firstname: input.buyerName,
          email: input.buyerEmail || student.email || `${student.admissionNumber}@school.edu`,
          phone: input.buyerPhone,
          productinfo: input.purpose,
          surl: successUrl,
          furl: failureUrl,
          udf1: paymentRequest.id, // Payment request ID
          udf2: gatewayTransaction.id, // Transaction ID
          udf3: input.studentId, // Student ID
          udf4: input.branchId, // Branch ID
          udf5: input.sessionId, // Session ID
          expiryDate: expiresAt,
        });

        if (paymentLinkResponse.status === 0) {
          // Payment link creation failed
          await ctx.db.paymentRequest.update({
            where: { id: paymentRequest.id },
            data: { status: 'FAILED' },
          });

          await ctx.db.paymentGatewayTransaction.update({
            where: { id: gatewayTransaction.id },
            data: { 
              status: 'FAILED',
              failureReason: paymentLinkResponse.msg,
            },
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Payment link creation failed: ${paymentLinkResponse.msg}`,
          });
        }

        // Update payment request with gateway response
        await ctx.db.paymentRequest.update({
          where: { id: paymentRequest.id },
          data: {
            status: 'INITIATED',
            paymentUrl: paymentLinkResponse.data,
            gatewayRequestId: txnid,
          },
        });

        await ctx.db.paymentGatewayTransaction.update({
          where: { id: gatewayTransaction.id },
          data: {
            status: 'INITIATED',
            gatewayResponse: paymentLinkResponse as any,
          },
        });

        return {
          success: true,
          data: {
            paymentRequestId: paymentRequest.id,
            paymentUrl: paymentLinkResponse.data,
            transactionId: gatewayTransaction.id,
            expiresAt,
          },
        };

      } catch (error) {
        console.error('Error creating payment request:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment request. Please try again.",
        });
      }
    }),

  // Get payment status
  getPaymentStatus: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.paymentGatewayTransaction.findUnique({
        where: { id: input.transactionId },
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }

      return transaction;
    }),

  // Get payment history (combined manual and gateway)
  getPaymentHistory: protectedProcedure
    .input(paymentHistoryFilterSchema)
    .query(async ({ ctx, input }): Promise<PaymentHistoryResponse> => {
      const limit = input.limit || 999999; // Use a very large number if no limit specified
      const cursor = input.cursor;

      // Build base where clause
      const baseWhere = {
        branchId: input.branchId,
        sessionId: input.sessionId,
        ...(input.studentId && { studentId: input.studentId }),
        ...(input.feeTermId && { feeTermId: input.feeTermId }),
        ...(input.startDate && input.endDate && {
          paymentDate: {
            gte: input.startDate,
            lte: input.endDate,
          },
        }),
      };



      // Get manual payments (FeeCollection)
      const manualPaymentsPromise = ctx.db.feeCollection.findMany({
        where: {
          ...baseWhere,
          ...(input.paymentMode && { paymentMode: input.paymentMode }),
          ...(input.status && { status: input.status }),
          gatewayTransactionId: null, // Only manual payments
        },
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: true,
                },
              },
            },
          },
          items: {
            include: {
              feeHead: true,
              feeTerm: true,
            },
          },
          branch: true,
          session: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit, // Get full limit from manual payments
      });

      // Get gateway payments (PaymentGatewayTransaction)
      const gatewayPaymentsPromise = ctx.db.paymentGatewayTransaction.findMany({
        where: {
          ...baseWhere,
          ...(input.gateway && { gateway: input.gateway }),
          // If no status filter is provided, default to SUCCESS. If provided, use the input status
          status: (input.status || 'SUCCESS') as PaymentStatus,
        },
        include: {
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
          feeCollections: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit, // Get full limit from gateway payments
      });

      const [manualPayments, gatewayPayments] = await Promise.all([
        manualPaymentsPromise,
        gatewayPaymentsPromise,
      ]);



      // Transform to unified format
      const items: PaymentHistoryItem[] = [];

      // Add manual payments
      manualPayments.forEach((payment) => {
        // Get unique fee term names from payment items
        const feeTermNames = [...new Set(payment.items.map(item => item.feeTerm.name))];
        const feeTermName = feeTermNames.join(', ') || 'Unknown';
        
        items.push({
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          studentName: `${payment.student.firstName} ${payment.student.lastName}`,
          studentAdmissionNumber: payment.student.admissionNumber,
          className: payment.student.section?.class?.name,
          sectionName: payment.student.section?.name,
          feeTermName: feeTermName,
          amount: payment.totalAmount,
          paymentMode: payment.paymentMode,
          status: payment.status,
          paymentDate: payment.paymentDate,
          transactionReference: payment.transactionReference || undefined,
          type: 'manual',
          notes: payment.notes || undefined,
          createdAt: payment.createdAt,
        });
      });

      // Add gateway payments
      gatewayPayments.forEach((transaction) => {
        const feeCollection = (transaction as any).feeCollections?.[0]; // Should have one fee collection for successful payments
        const student = (transaction as any).student;
        const feeTerm = (transaction as any).feeTerm;
        
        items.push({
          id: transaction.id,
          transactionId: transaction.id,
          studentName: `${student?.firstName || ''} ${student?.lastName || ''}`,
          studentAdmissionNumber: student?.admissionNumber || '',
          className: student?.section?.class?.name || '',
          sectionName: student?.section?.name || '',
          feeTermName: feeTerm?.name || '',
          amount: transaction.amount,
          paymentMode: 'Online',
          gateway: transaction.gateway as any,
          status: transaction.status,
          paymentDate: transaction.paidAt || transaction.createdAt,
          gatewayTransactionId: transaction.gatewayTransactionId || undefined,
          type: 'gateway',
          receiptNumber: feeCollection?.receiptNumber,
          createdAt: transaction.createdAt,
        });
      });

      // Sort by payment date/created date
      items.sort((a, b) => {
        const dateA = a.paymentDate || a.createdAt;
        const dateB = b.paymentDate || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      });

      // Apply cursor-based pagination
      let paginatedItems = items;
      if (cursor) {
        const cursorIndex = items.findIndex(item => item.id === cursor);
        if (cursorIndex >= 0) {
          paginatedItems = items.slice(cursorIndex + 1);
        }
      }

      const resultItems = paginatedItems.slice(0, limit);
      const hasMore = paginatedItems.length > limit;
      const nextCursor = hasMore ? resultItems[resultItems.length - 1]?.id : undefined;

      return {
        items: resultItems,
        nextCursor,
        hasMore,
        totalCount: items.length,
      };
    }),

  // Get payment statistics
  getPaymentStatistics: protectedProcedure
    .input(z.object({
      branchId: z.string(),
      sessionId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const dateFilter = input.startDate && input.endDate ? {
        createdAt: {
          gte: input.startDate,
          lte: input.endDate,
        },
      } : {};

      const baseWhere = {
        branchId: input.branchId,
        sessionId: input.sessionId,
        ...dateFilter,
      };

      // Get manual payment stats
      const manualStats = await ctx.db.feeCollection.aggregate({
        where: {
          ...baseWhere,
          gatewayTransactionId: null,
        },
        _sum: {
          totalAmount: true,
        },
        _count: true,
      });

      // Get gateway payment stats
      const gatewayStats = await ctx.db.paymentGatewayTransaction.groupBy({
        by: ['gateway', 'status'],
        where: baseWhere,
        _sum: {
          amount: true,
        },
        _count: true,
      });

      // Process gateway stats
      const gatewayStatsByGateway: any = {};
      gatewayStats.forEach(stat => {
        if (!gatewayStatsByGateway[stat.gateway]) {
          gatewayStatsByGateway[stat.gateway] = {
            totalAmount: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            pendingTransactions: 0,
          };
        }

        const amount = stat._sum.amount || 0;
        const count = stat._count;

        if (stat.status === 'SUCCESS') {
          gatewayStatsByGateway[stat.gateway].totalAmount += amount;
          gatewayStatsByGateway[stat.gateway].successfulTransactions += count;
        } else if (stat.status === 'FAILED') {
          gatewayStatsByGateway[stat.gateway].failedTransactions += count;
        } else {
          gatewayStatsByGateway[stat.gateway].pendingTransactions += count;
        }
      });

      const totalGatewayAmount = Object.values(gatewayStatsByGateway).reduce(
        (sum: number, gateway: any) => sum + gateway.totalAmount, 0
      );

      const totalGatewayTransactions = Object.values(gatewayStatsByGateway).reduce(
        (sum: number, gateway: any) => sum + gateway.successfulTransactions, 0
      );

      return {
        totalAmount: (manualStats._sum.totalAmount || 0) + totalGatewayAmount,
        manualAmount: manualStats._sum.totalAmount || 0,
        gatewayAmount: totalGatewayAmount,
        totalTransactions: (manualStats._count || 0) + totalGatewayTransactions,
        manualTransactions: manualStats._count || 0,
        gatewayTransactions: totalGatewayTransactions,
        gatewayStats: gatewayStatsByGateway,
      };
    }),

  // Cancel payment request
  cancelPaymentRequest: protectedProcedure
    .input(z.object({
      paymentRequestId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const paymentRequest = await ctx.db.paymentRequest.findUnique({
        where: { id: input.paymentRequestId },
        include: {
          transactions: true,
        },
      });

      if (!paymentRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment request not found",
        });
      }

      if (paymentRequest.status === 'SUCCESS') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a successful payment",
        });
      }

      // Update payment request and transactions
      await ctx.db.$transaction([
        ctx.db.paymentRequest.update({
          where: { id: input.paymentRequestId },
          data: { status: 'CANCELLED' },
        }),
        ...paymentRequest.transactions.map(transaction =>
          ctx.db.paymentGatewayTransaction.update({
            where: { id: transaction.id },
            data: { status: 'CANCELLED' },
          })
        ),
      ]);

      return { success: true };
    }),
}); 