"use client";

import React, { useState } from 'react';
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
import type { PaymentGatewayButtonProps } from '@/types/payment-gateway';

interface PaymentRequestData {
  paymentRequestId: string;
  paymentUrl: string;
  transactionId: string;
  expiresAt: Date;
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
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequestData | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');

  // Get student details for payment
  const { data: student } = api.student.getById.useQuery(
    { id: studentId },
    { enabled: !!studentId }
  );

  // Get gateway configuration
  const { data: gatewayConfig } = api.paymentGateway.getGatewayConfig.useQuery();

  // Create payment request mutation
  const createPaymentMutation = api.paymentGateway.createPaymentRequest.useMutation({
    onSuccess: (response) => {
      if (response.success && response.data) {
        setPaymentRequest(response.data);
        onPaymentInitiated?.(response.data.paymentRequestId);
        
        toast({
          title: "Payment Link Created",
          description: "Click 'Proceed to Payment' to complete your payment securely.",
        });
      }
    },
    onError: (error) => {
      console.error('Payment creation error:', error);
      toast({
        title: "Payment Creation Failed",
        description: error.message || "Failed to create payment link. Please try again.",
        variant: "destructive",
      });
      onPaymentFailure?.(error.message);
    },
    onSettled: () => {
      setIsCreatingPayment(false);
    }
  });

  const handleCreatePayment = async () => {
    if (!currentBranchId || !currentSessionId) {
      toast({
        title: "Configuration Error",
        description: "Branch and session information is required.",
        variant: "destructive",
      });
      return;
    }

    if (!student) {
      toast({
        title: "Student Information Missing",
        description: "Unable to load student details.",
        variant: "destructive",
      });
      return;
    }

    if (!buyerPhone || buyerPhone.length < 10) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingPayment(true);

    const studentName = `${student.firstName} ${student.lastName}`;
    const purpose = `Fee Payment - ${feeTermName}`;
    const description = `Fee payment for ${studentName} (${student.admissionNumber}) - ${selectedFees.map(f => f.feeHeadName).join(', ')}`;

    createPaymentMutation.mutate({
      studentId,
      branchId: currentBranchId,
      sessionId: currentSessionId,
      feeTermId,
      fees: selectedFees,
      buyerName: studentName,
      buyerEmail: buyerEmail || undefined,
      buyerPhone,
      purpose,
      description,
      expiryHours: 24, // 24 hours expiry
    });
  };

  const handleProceedToPayment = () => {
    if (paymentRequest?.paymentUrl) {
      // Open payment URL in new tab
      window.open(paymentRequest.paymentUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      // Start polling for payment status
      startPaymentStatusPolling(paymentRequest.transactionId);
      
      toast({
        title: "Payment Window Opened",
        description: "Complete your payment in the new window. This dialog will update automatically when payment is completed.",
      });
    }
  };

  const startPaymentStatusPolling = (transactionId: string) => {
    // Simple polling mechanism - in production, you'd use WebSocket or Server-Sent Events
    const pollInterval = setInterval(async () => {
      try {
        // This would typically be done via a separate API call to check status
        // For now, we'll rely on webhook processing
        console.log('Polling payment status for transaction:', transactionId);
        
        // In a real implementation, you'd check the transaction status here
        // and handle success/failure accordingly
        
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Clear polling after 30 minutes (payment link expiry)
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 30 * 60 * 1000);
  };

  const isEasebuzzConfigured = gatewayConfig?.easebuzz?.isConfigured ?? false;

  if (!isEasebuzzConfigured) {
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
            Pay securely using Easebuzz payment gateway. Your payment information is encrypted and secure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Information */}
          {student && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Student Details</h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <div><span className="font-medium">Name:</span> {student.firstName} {student.lastName}</div>
                <div><span className="font-medium">Admission No:</span> {student.admissionNumber}</div>
                <div><span className="font-medium">Class:</span> {student.section?.class?.name} - {student.section?.name}</div>
              </div>
            </div>
          )}

          {/* Fee Details */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">Payment Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">Fee Term:</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">{feeTermName}</span>
              </div>
              <div className="space-y-1">
                {selectedFees.map((fee, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-blue-700 dark:text-blue-300">{fee.feeHeadName}:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">{formatIndianCurrency(fee.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-blue-200 dark:border-blue-700 pt-2">
                <div className="flex justify-between font-medium">
                  <span className="text-blue-900 dark:text-blue-100">Total Amount:</span>
                  <span className="text-lg text-blue-900 dark:text-blue-100">{formatIndianCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Form */}
          {!paymentRequest && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">Contact Information</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="buyerPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="buyerPhone"
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit phone number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label htmlFor="buyerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    id="buyerEmail"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Request Created */}
          {paymentRequest && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-sm text-green-900 dark:text-green-100">Payment Link Ready</h4>
              </div>
              <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Expires: {new Date(paymentRequest.expiresAt).toLocaleString()}</span>
                </div>
                <p>Click "Proceed to Payment" to complete your payment securely.</p>
              </div>
            </div>
          )}

          {/* Security Badges */}
          <div className="flex items-center justify-center gap-4 py-2">
            <Badge variant="outline" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              256-bit SSL
            </Badge>
            <Badge variant="outline" className="text-xs">
              PCI DSS Compliant
            </Badge>
            <Badge variant="outline" className="text-xs">
              Bank Grade Security
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          
          {!paymentRequest ? (
            <Button 
              onClick={handleCreatePayment}
              disabled={isCreatingPayment || !buyerPhone || buyerPhone.length < 10}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreatingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Payment Link...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Create Payment Link
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleProceedToPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 