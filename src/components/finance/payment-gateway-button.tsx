"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  ExternalLink, 
  Clock, 
  Shield, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';
import { formatIndianCurrency } from '@/lib/utils';
import type { PaymentGatewayButtonProps, PaymentGatewayTransaction } from '@/types/payment-gateway';
import { useRouter } from 'next/navigation';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentRequestData {
  paymentRequestId: string;
  transactionId: string;
  checkoutData: {
    key: string;
    amount: number;
    currency: string;
    orderId: string;
    name: string;
    description: string;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
    notes?: Record<string, any>;
    theme?: {
      color?: string;
    };
  };
  successUrl: string;
  failureUrl: string;
}

export function PaymentGatewayButton({
  studentId,
  selectedFees,
  feeTermId,
  feeTermName,
  totalAmount,
  onPaymentInitiated,
  onPaymentSuccess,
  onPaymentFailure,
  disabled = false,
  className = '',
}: PaymentGatewayButtonProps) {
  const router = useRouter();
  const { currentBranchId, currentBranch } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentRequestData | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Student details
  const studentQuery = api.student.getById.useQuery(
    { id: studentId, branchId: currentBranchId || undefined },
    { enabled: !!studentId && !!currentBranchId }
  );

  // Parent details (for contact info)
  // TODO: Replace with actual parent query when API is available
  const parentQuery = { data: null } as any;

  // Gateway config check
  const gatewayConfigQuery = api.paymentGateway.getGatewayConfig.useQuery();
  const gatewayConfig = gatewayConfigQuery.data;

  // Create payment request mutation
  const createPaymentMutation = api.paymentGateway.createPaymentRequest.useMutation({
    onSuccess: (data) => {
      setPaymentData(data as unknown as PaymentRequestData);
      if (onPaymentInitiated) {
        onPaymentInitiated(data.transactionId);
      }
      // Open Razorpay checkout
      openRazorpayCheckout(data as unknown as PaymentRequestData);
    },
    onError: (error) => {
      toast({
        title: "Payment Creation Failed",
        description: error.message || "Unable to create payment request. Please try again.",
        variant: "destructive",
      });
      setIsCreatingPayment(false);
    },
  });

  // Verify payment mutation
  const verifyPaymentMutation = api.paymentGateway.verifyPayment.useMutation({
    onSuccess: () => {
      toast({
        title: "Payment Verified",
        description: "Your payment has been verified successfully.",
      });
    },
    onError: (error) => {
      console.error('Payment verification error:', error);
    },
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCreatePayment = async () => {
    if (!currentBranchId || !currentSessionId) {
      toast({
        title: "Session Required",
        description: "Please select a branch and academic session.",
        variant: "destructive",
      });
      return;
    }

    if (!studentQuery.data || !parentQuery.data) {
      toast({
        title: "Data Loading",
        description: "Please wait while we load student information.",
        variant: "default",
      });
      return;
    }

    setIsCreatingPayment(true);

    const student = studentQuery.data;
    const parent = parentQuery.data;

    try {
      await createPaymentMutation.mutateAsync({
        studentId,
        branchId: currentBranchId,
        sessionId: currentSessionId,
        feeTermId,
        fees: selectedFees.map(fee => ({
          feeHeadId: fee.feeHeadId,
          feeHeadName: fee.feeHeadName,
          amount: fee.amount,
        })),
        buyerName: parent?.fatherName || parent?.motherName || `${student.firstName} ${student.lastName}`,
        buyerEmail: parent?.fatherEmail || parent?.motherEmail || student.email || '',
        buyerPhone: parent?.fatherPhone || parent?.motherPhone || '9999999999',
        purpose: `Fee payment for ${feeTermName}`,
        description: `${student.firstName} ${student.lastName} (${student.admissionNumber}) - ${student.section?.class.name || 'Class'} ${student.section?.name || ''}`,
        expiryHours: 24,
      });
    } catch (error) {
      // Error handled in mutation
      setIsCreatingPayment(false);
    }
  };

  const openRazorpayCheckout = (data: PaymentRequestData) => {
    if (!scriptLoaded || !window.Razorpay) {
      toast({
        title: "Loading Payment Gateway",
        description: "Please wait while we load the payment gateway...",
      });
      // Retry after a short delay
      setTimeout(() => {
        if (window.Razorpay) {
          openRazorpayCheckout(data);
        } else {
          toast({
            title: "Payment Gateway Error",
            description: "Failed to load payment gateway. Please refresh the page and try again.",
            variant: "destructive",
          });
          setIsCreatingPayment(false);
        }
      }, 1000);
      return;
    }

    const options = {
      ...data.checkoutData,
      handler: async (response: any) => {
        // Payment successful
        console.log('Payment successful:', response);
        
        // Verify the payment signature
        try {
          await verifyPaymentMutation.mutateAsync({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        } catch (error) {
          console.error('Verification error:', error);
        }

        // Close dialog
        setIsDialogOpen(false);
        setIsCreatingPayment(false);
        
        // Call success callback
        if (onPaymentSuccess) {
          // TODO: Fetch actual transaction data after webhook processing
          onPaymentSuccess({
            id: data.transactionId,
            gatewayTransactionId: data.transactionId,
            status: 'SUCCESS',
          } as any);
        }

        // Navigate to success page
        router.push(`${data.successUrl}?txnid=${data.transactionId}`);
      },
      modal: {
        ondismiss: () => {
          console.log('Payment modal closed by user');
          setIsCreatingPayment(false);
          
          // Call failure callback
          if (onPaymentFailure) {
            onPaymentFailure('Payment cancelled by user');
          }
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  // Check if any gateway is configured
  const isAnyGatewayConfigured = 
    gatewayConfig?.razorpay?.isConfigured || 
    gatewayConfig?.paytm?.isConfigured || 
    gatewayConfig?.stripe?.isConfigured || 
    false;

  if (!isAnyGatewayConfigured) {
    return (
      <Button disabled className={className}>
        <AlertCircle className="w-4 h-4 mr-2" />
        Payment Gateway Not Configured
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          disabled={disabled || selectedFees.length === 0}
          className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white ${className}`}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Pay Online - {formatIndianCurrency(totalAmount)}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Secure Online Payment
          </DialogTitle>
          <DialogDescription>
            Pay securely using our payment gateway. Your payment information is encrypted and secure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Information */}
          {studentQuery.data && (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Student Details</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium">{studentQuery.data.firstName} {studentQuery.data.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Admission No:</span>
                  <span className="font-medium">{studentQuery.data.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Class:</span>
                  <span className="font-medium">
                    {studentQuery.data.section?.class.name} {studentQuery.data.section?.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fee Details */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Payment Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Fee Term:</span>
                <span className="font-medium">{feeTermName}</span>
              </div>
              {selectedFees.map((fee, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{fee.feeHeadName}:</span>
                  <span className="font-medium">{formatIndianCurrency(fee.amount)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Amount:</span>
                <span className="text-lg text-green-600 dark:text-green-400">
                  {formatIndianCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                  Secure Payment Gateway
                </p>
                <ul className="text-green-700 dark:text-green-300 space-y-1">
                  <li>• 256-bit SSL encryption</li>
                  <li>• PCI DSS compliant</li>
                  <li>• Powered by Razorpay</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                  Important Notes
                </p>
                <ul className="text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• Do not refresh the page during payment</li>
                  <li>• Keep your payment receipt for future reference</li>
                  <li>• Contact school office for any payment issues</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={isCreatingPayment}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleCreatePayment}
            disabled={isCreatingPayment}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            {isCreatingPayment ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Payment...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Proceed to Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}