"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Home, 
  Receipt, 
  CreditCard,
  Clock,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatIndianCurrency } from '@/lib/utils';
import { PaymentStatusBadge } from '@/components/finance/payment-status-indicator';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  
  const txnid = searchParams.get('txnid');
  const status = searchParams.get('status');
  const amount = searchParams.get('amount');
  const mihpayid = searchParams.get('mihpayid');

  // Get transaction details if we have the txnid
  const { data: transaction, isLoading, error } = api.paymentGateway.checkPaymentStatus.useQuery(
    { transactionId: txnid || '' },
    { 
      enabled: !!txnid,
      refetchInterval: status === 'success' ? false : 5000, // Stop polling if successful
    }
  );

  useEffect(() => {
    // Set verification status based on URL params
    if (status === 'success') {
      setIsVerifying(false);
    } else if (txnid && !isLoading) {
      // Wait for transaction status from our API
      setTimeout(() => setIsVerifying(false), 3000);
    }
  }, [status, txnid, isLoading]);

  const handleGoToHistory = () => {
    router.push('/finance/payment-history');
  };

  const handleGoHome = () => {
    router.push('/finance');
  };

  // Show loading state while verifying
  if (isVerifying || isLoading) {
    return (
      <PageWrapper title="Verifying Payment" subtitle="Please wait while we confirm your payment">
        <div className="flex justify-center items-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <h3 className="text-lg font-medium">Verifying Payment...</h3>
                <p className="text-gray-600">
                  Please wait while we confirm your payment with the bank. This may take a few moments.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Usually takes 10-30 seconds</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  // Handle error state
  if (error || !txnid) {
    return (
      <PageWrapper title="Payment Status" subtitle="Unable to verify payment status">
        <div className="flex justify-center items-center min-h-[400px]">
          <Card className="w-full max-w-md border-red-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <ExternalLink className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-red-900">Verification Failed</h3>
                <p className="text-red-600">
                  We couldn't verify your payment status. Please contact support if you have completed the payment.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleGoHome} variant="outline">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Finance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  const isSuccess = transaction?.status === 'SUCCESS' || status === 'success';
  const paymentAmount = transaction?.amount || parseFloat(amount || '0');

  return (
    <PageWrapper 
      title={isSuccess ? "Payment Successful!" : "Payment Status"} 
      subtitle={isSuccess ? "Your payment has been processed successfully" : "Payment status confirmation"}
    >
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className={`w-full max-w-2xl ${isSuccess ? 'border-green-200' : 'border-yellow-200'}`}>
          <CardHeader className="text-center">
            <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
              isSuccess 
                ? 'bg-green-100 text-green-600' 
                : 'bg-yellow-100 text-yellow-600'
            }`}>
              {isSuccess ? (
                <CheckCircle className="h-8 w-8" />
              ) : (
                <Clock className="h-8 w-8" />
              )}
            </div>
            <CardTitle className={`text-2xl ${isSuccess ? 'text-green-900' : 'text-yellow-900'}`}>
              {isSuccess ? '🎉 Payment Successful!' : 'Payment Processing'}
            </CardTitle>
            <CardDescription className="text-base">
              {isSuccess 
                ? 'Your fee payment has been completed and recorded successfully.'
                : 'Your payment is being processed. Please wait for confirmation.'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Payment Details</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                  <div className="font-medium text-lg">{formatIndianCurrency(paymentAmount)}</div>
                </div>
                
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <div className="mt-1">
                    <PaymentStatusBadge 
                      status={transaction?.status as any || 'PENDING'} 
                      gateway={transaction?.gateway}
                    />
                  </div>
                </div>

                {txnid && (
                  <div className="col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
                    <div className="font-mono text-sm bg-white dark:bg-gray-700 p-2 rounded border mt-1">
                      {txnid}
                    </div>
                  </div>
                )}

                {mihpayid && (
                  <div className="col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Payment Reference:</span>
                    <div className="font-mono text-sm bg-white dark:bg-gray-700 p-2 rounded border mt-1">
                      {mihpayid}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Student Information */}
            {transaction?.student && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Student Information</h4>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <div><span className="font-medium">Name:</span> {transaction.student.firstName} {transaction.student.lastName}</div>
                  <div><span className="font-medium">Admission No:</span> {transaction.student.admissionNumber}</div>
                  <div><span className="font-medium">Class:</span> {transaction.student.section?.class?.name} - {transaction.student.section?.name}</div>
                  {transaction.feeTerm && (
                    <div><span className="font-medium">Fee Term:</span> {transaction.feeTerm.name}</div>
                  )}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {isSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">What's Next?</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• A receipt has been generated for this payment</li>
                  <li>• The student's fee balance has been updated</li>
                  <li>• You can view this payment in the payment history</li>
                  <li>• A confirmation SMS/email may be sent shortly</li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleGoToHistory} className="flex-1">
                <Receipt className="h-4 w-4 mr-2" />
                View Payment History
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <Button onClick={handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Back to Finance
              </Button>
            </div>

            {/* Security Notice */}
            <div className="text-center pt-4 border-t">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <CreditCard className="h-4 w-4" />
                <span>Payment processed securely</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <PageWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 animate-pulse mx-auto mb-4 text-green-500" />
            <p className="text-gray-600">Loading payment details...</p>
          </div>
        </div>
      </PageWrapper>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
} 