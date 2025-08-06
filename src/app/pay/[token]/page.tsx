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
  Mail,
  Lock,
  Info,
  CheckSquare,
  Square,
  Gift,
  TrendingDown
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
    order?: number;
    isPaid?: boolean;
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
  order?: number;
  isPaid?: boolean;
  originalAmount?: number;
  concessionAmount?: number;
  paidAmount?: number;
  feeHeads: Array<{
    id: string;
    name: string;
    originalAmount: number;
    concessionAmount: number;
    finalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    concessionDetails: Array<{
      type: string;
      value: number;
      amount: number;
      description?: string;
    }>;
  }>;
}

export default function PublicPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [selectedFeeTerms, setSelectedFeeTerms] = useState<Set<string>>(new Set());
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Determine fee term availability based on sequential payment requirement
  const getTermAvailability = (feeTerms: any[]) => {
    // Sort terms by order (or fallback to name if no order field)
    const sortedTerms = [...feeTerms].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Fallback: try to extract number from name (e.g., "Term 1", "Term 2")
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });

    const availability: Record<string, { isAvailable: boolean; reason?: string; position: number }> = {};
    
    for (let i = 0; i < sortedTerms.length; i++) {
      const term = sortedTerms[i];
      const prevTerm = i > 0 ? sortedTerms[i - 1] : null;
      
      if (!prevTerm) {
        // First term is always available if not paid
        availability[term.id] = { 
          isAvailable: !term.isPaid, 
          position: i 
        };
      } else {
        // Subsequent terms are only available if previous term is paid or selected
        if (prevTerm.isPaid || selectedFeeTerms.has(prevTerm.id)) {
          availability[term.id] = { 
            isAvailable: !term.isPaid, 
            position: i 
          };
        } else {
          availability[term.id] = { 
            isAvailable: false, 
            reason: `Please select ${prevTerm.name} first`,
            position: i 
          };
        }
      }
    }
    
    return { sortedTerms, availability };
  };

  // Get available consecutive terms for bulk selection
  const getAvailableConsecutiveTerms = () => {
    if (!paymentLinkData?.feeTerms) return [];
    
    const { sortedTerms, availability } = getTermAvailability(paymentLinkData.feeTerms);
    const availableTerms = [];
    
    for (const term of sortedTerms) {
      if (term.isPaid) continue; // Skip already paid terms
      if (availability[term.id]?.isAvailable) {
        availableTerms.push(term.id);
      } else {
        break; // Stop at first unavailable term
      }
    }
    
    return availableTerms;
  };

  // Handle selecting all available consecutive terms
  const handleSelectAllAvailable = () => {
    const availableTerms = getAvailableConsecutiveTerms();
    setSelectedFeeTerms(new Set(availableTerms));
  };

  // Handle fee term selection toggle with order enforcement
  const handleFeeTermToggle = (feeTermId: string, isAvailable: boolean) => {
    if (!isAvailable) return; // Don't allow selection of unavailable terms
    
    setSelectedFeeTerms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feeTermId)) {
        newSet.delete(feeTermId);
      } else {
        newSet.add(feeTermId);
      }
      return newSet;
    });
  };
  
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
    if (selectedFeeTerms.size === 0 || !paymentLinkData?.feeTerms) return;

    const selectedTerms = paymentLinkData.feeTerms.filter((term: FeeTerm) => 
      selectedFeeTerms.has(term.id)
    );
    if (selectedTerms.length === 0) return;

    setIsPaymentProcessing(true);

    // Combine all fees from selected terms
    const allFees = selectedTerms.flatMap((term: FeeTerm) => 
      term.feeHeads.map((head) => ({
        feeHeadId: head.id,
        feeHeadName: head.name,
        amount: head.outstandingAmount, // Use outstanding amount instead of amount
        feeTermId: term.id,
        feeTermName: term.name
      }))
    );

    const termNames = selectedTerms.map((term: FeeTerm) => term.name).join(', ');

    createPaymentMutation.mutate({
      branchId: paymentLinkData.branch.id,
      sessionId: paymentLinkData.session.id,
      studentId: paymentLinkData.studentId,
      feeTermId: Array.from(selectedFeeTerms).join(','), // Pass multiple fee term IDs as comma-separated string
      fees: allFees,
      buyerName: paymentLinkData.student.parent?.fatherName || paymentLinkData.student.parent?.motherName || 'Parent',
      buyerPhone: paymentLinkData.student.parent?.fatherMobile || paymentLinkData.student.parent?.motherMobile || '9999999999',
      purpose: `Fee payment for ${termNames}`
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

  // Get term availability and sorting
  const { sortedTerms, availability } = getTermAvailability(paymentLinkData?.feeTerms || []);
  
  // Calculate selected terms data for multi-selection
  const selectedTermsData = sortedTerms.filter((term: any) => 
    selectedFeeTerms.has(term.id)
  );
  
  const totalSelectedAmount = selectedTermsData.reduce((total: number, term: any) => total + term.totalAmount, 0);
  const hasSelectedTerms = selectedTermsData.length > 0;

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
                The Scholars' Home, {paymentLinkData.branch.name}
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
                  Select Fee Terms (Sequential Order)
                </CardTitle>
                <CardDescription>
                  All fee terms are shown below. Terms must be paid in order - select multiple consecutive terms or use the quick select option.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Order Info and Quick Actions */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Sequential Payment Policy</p>
                      <p>Pay terms in order - you can select multiple consecutive terms at once. Grayed out terms will become available after earlier terms are selected.</p>
                    </div>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  {(() => {
                    const availableTerms = getAvailableConsecutiveTerms();
                    return (availableTerms.length > 1 || selectedFeeTerms.size > 0) && (
                      <div className="flex justify-end gap-2">
                        {selectedFeeTerms.size > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedFeeTerms(new Set())}
                            className="flex items-center gap-2 text-gray-600 hover:text-red-600"
                          >
                            <Square className="h-4 w-4" />
                            Clear All
                          </Button>
                        )}
                        {availableTerms.length > 1 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleSelectAllAvailable}
                            className="flex items-center gap-2"
                          >
                            <CheckSquare className="h-4 w-4" />
                            Select All Available ({availableTerms.length} terms)
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {sortedTerms.map((feeTerm: any) => {
                  const isSelected = selectedFeeTerms.has(feeTerm.id);
                  const termAvailability = availability[feeTerm.id];
                  const isAvailable = termAvailability?.isAvailable ?? false;
                  const isPaid = feeTerm.isPaid;
                  
                  return (
                    <div
                      key={feeTerm.id}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        isPaid
                          ? 'border-green-200 bg-green-50 dark:bg-green-950'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : isAvailable
                          ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-sm cursor-pointer'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60'
                      }`}
                      onClick={() => isAvailable && !isPaid && handleFeeTermToggle(feeTerm.id, isAvailable)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                            isPaid
                              ? 'border-green-500 bg-green-500'
                              : isSelected 
                              ? 'border-blue-500 bg-blue-500' 
                              : isAvailable
                              ? 'border-gray-300 hover:border-gray-400'
                              : 'border-gray-300 bg-gray-200'
                          }`}>
                            {isPaid ? (
                              <CheckCircle className="w-3 h-3 text-white" />
                            ) : isSelected ? (
                              <CheckCircle className="w-3 h-3 text-white" />
                            ) : !isAvailable ? (
                              <Lock className="w-3 h-3 text-gray-400" />
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold ${
                                isPaid ? 'text-green-700 dark:text-green-300' :
                                isSelected ? 'text-blue-700 dark:text-blue-300' :
                                isAvailable ? 'text-gray-900 dark:text-gray-100' :
                                'text-gray-500 dark:text-gray-400'
                              }`}>
                                {feeTerm.name}
                              </h3>
                              {!isAvailable && !isPaid && (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <p className={`text-sm ${
                              isPaid ? 'text-green-600 dark:text-green-400' :
                              isSelected ? 'text-blue-600 dark:text-blue-400' :
                              isAvailable ? 'text-gray-600 dark:text-gray-400' :
                              'text-gray-400 dark:text-gray-500'
                            }`}>
                              {feeTerm.feeHeads.length} fee head(s)
                            </p>
                            {!isAvailable && !isPaid && termAvailability?.reason && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                {termAvailability.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            isPaid ? 'text-green-700 dark:text-green-300' :
                            isSelected ? 'text-blue-700 dark:text-blue-300' :
                            isAvailable ? 'text-gray-900 dark:text-gray-100' :
                            'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatIndianCurrency(feeTerm.totalAmount)}
                          </p>
                          <div className="flex justify-end mt-1">
                            {isPaid && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                Paid
                              </Badge>
                            )}
                            {isSelected && !isPaid && (
                              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                                Selected
                              </Badge>
                            )}
                            {!isAvailable && !isPaid && (
                              <Badge variant="outline" className="text-gray-500 border-gray-300">
                                Will unlock after previous term
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Show fee details for selected, paid, or when hovering available terms */}
                      {(isSelected || isPaid) && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-sm font-medium mb-2">Fee Details:</p>
                          <div className="space-y-2">
                            {feeTerm.feeHeads.map((feeHead: any) => (
                              <div key={feeHead.id} className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium">{feeHead.name}</span>
                                  <span className="font-semibold">{formatIndianCurrency(feeHead.outstandingAmount)}</span>
                                </div>
                                
                                {/* Show concession details if any */}
                                {feeHead.concessionAmount > 0 && (
                                  <div className="ml-2 space-y-1">
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                      <span>Original Amount:</span>
                                      <span>{formatIndianCurrency(feeHead.originalAmount)}</span>
                                    </div>
                                    {feeHead.concessionDetails?.map((concession: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-xs text-green-600 dark:text-green-400">
                                        <span className="flex items-center gap-1">
                                          <Gift className="w-3 h-3" />
                                          {concession.type} ({concession.value}{concession.type.includes('PERCENTAGE') ? '%' : ''})
                                        </span>
                                        <span>-{formatIndianCurrency(concession.amount)}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between text-xs font-medium text-green-700 dark:text-green-300 border-t border-green-200 dark:border-green-800 pt-1">
                                      <span className="flex items-center gap-1">
                                        <TrendingDown className="w-3 h-3" />
                                        Total Concession:
                                      </span>
                                      <span>-{formatIndianCurrency(feeHead.concessionAmount)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* Show term-level concession summary if applicable */}
                            {feeTerm.concessionAmount && feeTerm.concessionAmount > 0 && (
                              <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-2 rounded">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                                    <Gift className="w-4 h-4" />
                                    Total Savings from Concessions
                                  </span>
                                  <span className="font-bold text-green-700 dark:text-green-300">
                                    -{formatIndianCurrency(feeTerm.concessionAmount)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                {hasSelectedTerms ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Selected Terms:</span>
                        <span className="text-sm font-medium">{selectedTermsData.length}</span>
                      </div>
                      
                      {/* List all selected terms */}
                      <div className="space-y-2">
                        {selectedTermsData.map((term: FeeTerm) => (
                          <div key={term.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{term.name}</span>
                              <span className="font-semibold">{formatIndianCurrency(term.totalAmount)}</span>
                            </div>
                            
                            {/* Show concession savings if any */}
                            {term.concessionAmount && term.concessionAmount > 0 && (
                              <div className="ml-2 text-xs space-y-1">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                  <span>Original Amount:</span>
                                  <span>{formatIndianCurrency(term.originalAmount || 0)}</span>
                                </div>
                                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Gift className="w-3 h-3" />
                                    Concessions Applied:
                                  </span>
                                  <span>-{formatIndianCurrency(term.concessionAmount)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Total concession summary */}
                      {(() => {
                        const totalConcessions = selectedTermsData.reduce((sum: number, term: FeeTerm) => 
                          sum + (term.concessionAmount || 0), 0
                        );
                        
                        return totalConcessions > 0 && (
                          <>
                            <Separator />
                            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                                  <Gift className="w-4 h-4" />
                                  Total Savings from All Concessions
                                </span>
                                <span className="font-bold text-green-700 dark:text-green-300">
                                  -{formatIndianCurrency(totalConcessions)}
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      
                      <Separator />
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-bold">Total Amount to Pay:</span>
                        <span className="text-lg font-bold">
                          {formatIndianCurrency(totalSelectedAmount)}
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
                          Pay Now - {formatIndianCurrency(totalSelectedAmount)}
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
                    <p className="text-gray-500">Please select one or more fee terms to continue</p>
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