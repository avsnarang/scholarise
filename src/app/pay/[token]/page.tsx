"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { 
  CreditCard, 
  School, 
  User, 
  Calendar, 
  IndianRupee, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Phone,
  Mail
} from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import { api } from '@/utils/api';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentLinkData {
  id: string;
  studentId: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    section: {
      name: string;
      class: {
        name: string;
      };
    };
    parent: {
      fatherName?: string;
      motherName?: string;
      fatherMobile?: string;
      motherMobile?: string;
      fatherEmail?: string;
      motherEmail?: string;
    } | null;
  };
  branch: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
  };
  session: {
    name: string;
  };
  feeTerms: Array<{
    id: string;
    name: string;
    totalAmount: number;
    feeHeads: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
  }>;
  expiresAt: string;
  isActive: boolean;
}

interface FeeHead {
  id: string;
  name: string;
  amount: number;
}

interface FeeTerm {
  id: string;
  name: string;
  totalAmount: number;
  feeHeads: FeeHead[];
}

export default function PublicPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [selectedFeeTerm, setSelectedFeeTerm] = useState<string | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  // Fetch payment link data
  const { data: paymentLinkData, isLoading, error } = api.paymentGateway.getPaymentLinkData.useQuery(
    { token },
    { enabled: !!token }
  );

  // Create payment request mutation
  const createPaymentMutation = api.paymentGateway.createPaymentRequest.useMutation({
    onSuccess: (data) => {
      if (data && scriptLoaded) {
        initiateRazorpayPayment(data);
      }
    },
    onError: (error) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment request",
        variant: "destructive",
      });
      setIsPaymentProcessing(false);
    }
  });

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = () => {
      if (window.Razorpay) {
        setScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to load payment gateway. Please refresh the page.",
          variant: "destructive",
        });
      };
      document.body.appendChild(script);
    };

    loadRazorpayScript();
  }, []);

  const initiateRazorpayPayment = (paymentData: any) => {
    if (!window.Razorpay) {
      toast({
        title: "Error",
        description: "Payment gateway not loaded. Please refresh the page.",
        variant: "destructive",
      });
      setIsPaymentProcessing(false);
      return;
    }

    const options = {
      ...paymentData.checkoutData,
      handler: function (response: any) {
        handlePaymentSuccess(response, paymentData.transactionId);
      },
      modal: {
        ondismiss: function () {
          setIsPaymentProcessing(false);
          toast({
            title: "Payment Cancelled",
            description: "Payment was cancelled by user.",
            variant: "destructive",
          });
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handlePaymentSuccess = async (response: any, transactionId: string) => {
    try {
      // Verify payment
      await api.paymentGateway.verifyPayment.useMutation().mutateAsync({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature
      });

      router.push(`/pay/success?payment_id=${response.razorpay_payment_id}`);
    } catch (error) {
      console.error('Payment verification failed:', error);
      router.push(`/pay/failure?transaction_id=${transactionId}`);
    }
  };

  const handlePayNow = () => {
    if (!selectedFeeTerm || !paymentLinkData) return;

    const selectedTerm = paymentLinkData.feeTerms.find((term: FeeTerm) => term.id === selectedFeeTerm);
    if (!selectedTerm) return;

    setIsPaymentProcessing(true);

    createPaymentMutation.mutate({
      branchId: paymentLinkData.branch.id,
      sessionId: paymentLinkData.session.id,
      studentId: paymentLinkData.studentId,
      feeTermId: selectedFeeTerm,
      fees: selectedTerm.feeHeads.map((head: FeeHead) => ({
        feeHeadId: head.id,
        feeHeadName: head.name,
        amount: head.amount
      })),
      buyerName: paymentLinkData.student.parent?.fatherName || paymentLinkData.student.parent?.motherName || 'Parent',
      buyerPhone: paymentLinkData.student.parent?.fatherMobile || paymentLinkData.student.parent?.motherMobile || '9999999999',
      purpose: `Fee payment for ${selectedTerm.name}`
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Loading payment details...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !paymentLinkData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Payment Link</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This payment link has expired or is invalid.
            </p>
            <Button onClick={() => router.push('/sign-in')}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentLinkData.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Clock className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Link Expired</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This payment link has expired. Please contact the school for a new payment link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedTermData = paymentLinkData.feeTerms.find((term: FeeTerm) => term.id === selectedFeeTerm);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Image
              src="/mobile_logo.png"
              alt="School Logo"
              width={48}
              height={48}
              className="object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {paymentLinkData.branch.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Fee Payment Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Student Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Student Name</p>
                    <p className="font-semibold">
                      {paymentLinkData.student.firstName} {paymentLinkData.student.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Admission Number</p>
                    <p className="font-semibold">{paymentLinkData.student.admissionNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Class & Section</p>
                    <p className="font-semibold">
                      {paymentLinkData.student.section.class.name} - {paymentLinkData.student.section.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Academic Session</p>
                    <p className="font-semibold">{paymentLinkData.session.name}</p>
                  </div>
                </div>

                {paymentLinkData.student.parent && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Parent Information</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentLinkData.student.parent.fatherName && (
                          <div>
                            <p className="text-sm font-medium">{paymentLinkData.student.parent.fatherName}</p>
                            <p className="text-xs text-gray-500">Father</p>
                            {paymentLinkData.student.parent.fatherMobile && (
                              <p className="text-xs flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {paymentLinkData.student.parent.fatherMobile}
                              </p>
                            )}
                          </div>
                        )}
                        {paymentLinkData.student.parent.motherName && (
                          <div>
                            <p className="text-sm font-medium">{paymentLinkData.student.parent.motherName}</p>
                            <p className="text-xs text-gray-500">Mother</p>
                            {paymentLinkData.student.parent.motherMobile && (
                              <p className="text-xs flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {paymentLinkData.student.parent.motherMobile}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Fee Terms Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Select Fee Term
                </CardTitle>
                <CardDescription>
                  Choose the fee term you want to pay for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentLinkData.feeTerms.map((feeTerm: FeeTerm) => (
                  <div
                    key={feeTerm.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFeeTerm === feeTerm.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFeeTerm(feeTerm.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{feeTerm.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {feeTerm.feeHeads.length} fee head(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {formatIndianCurrency(feeTerm.totalAmount)}
                        </p>
                        {selectedFeeTerm === feeTerm.id && (
                          <Badge variant="default" className="mt-1">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>

                    {selectedFeeTerm === feeTerm.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm font-medium mb-2">Fee Details:</p>
                        <div className="space-y-1">
                          {feeTerm.feeHeads.map((feeHead: FeeHead) => (
                            <div key={feeHead.id} className="flex justify-between text-sm">
                              <span>{feeHead.name}</span>
                              <span>{formatIndianCurrency(feeHead.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTermData ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Fee Term:</span>
                        <span className="text-sm font-medium">{selectedTermData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Amount:</span>
                        <span className="text-lg font-bold">
                          {formatIndianCurrency(selectedTermData.totalAmount)}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <Button
                      onClick={handlePayNow}
                      disabled={isPaymentProcessing || !scriptLoaded}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {isPaymentProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Pay Now - {formatIndianCurrency(selectedTermData.totalAmount)}
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <Shield className="h-3 w-3" />
                      Secured by Razorpay
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Please select a fee term to continue</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Secure Payment</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Your payment is processed securely through our encrypted payment gateway.
                      We do not store your card details.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}