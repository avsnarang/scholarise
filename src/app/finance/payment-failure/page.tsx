"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  XCircle, 
  Home, 
  RefreshCw, 
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  Phone,
  Mail
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatIndianCurrency } from '@/lib/utils';
import { PaymentStatusBadge } from '@/components/finance/payment-status-indicator';

function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const txnid = searchParams.get('txnid');
  const status = searchParams.get('status');
  const amount = searchParams.get('amount');
  const error = searchParams.get('error');
  const errorMessage = searchParams.get('error_Message');

  // Get transaction details if we have the txnid
  const { data: transaction, isLoading } = api.paymentGateway.checkPaymentStatus.useQuery(
    { transactionId: txnid || '' },
    { enabled: !!txnid }
  );

  const handleTryAgain = () => {
    router.push('/finance/fee-collection');
  };

  const handleGoHome = () => {
    router.push('/finance');
  };

  const handleContactSupport = () => {
    // You can implement support contact logic here
    window.open('mailto:support@school.edu?subject=Payment Issue&body=Transaction ID: ' + txnid, '_blank');
  };

  const paymentAmount = transaction?.amount || parseFloat(amount || '0');
  const failureReason = transaction?.failureReason || errorMessage || error || 'Unknown error occurred';

  return (
    <PageWrapper 
      title="Payment Failed" 
      subtitle="Your payment could not be completed"
    >
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className="w-full max-w-2xl border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Payment Failed</CardTitle>
            <CardDescription className="text-base">
              Unfortunately, your payment could not be processed. Please try again or contact support.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Payment Error:</strong> {failureReason}
              </AlertDescription>
            </Alert>

            {/* Payment Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Transaction Details</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Amount Attempted:</span>
                  <div className="font-medium text-lg">{formatIndianCurrency(paymentAmount)}</div>
                </div>
                
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <div className="mt-1">
                    <PaymentStatusBadge 
                      status={transaction?.status as any || 'FAILED'} 
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

            {/* Common Failure Reasons */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Common Reasons for Payment Failure</h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• Insufficient balance in your account</li>
                <li>• Card limit exceeded or card expired</li>
                <li>• Network connectivity issues</li>
                <li>• Incorrect card details or CVV</li>
                <li>• Bank server temporarily unavailable</li>
                <li>• Transaction timeout</li>
              </ul>
            </div>

            {/* What to Do Next */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What to Do Next?</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Check your bank account/card details</li>
                <li>• Ensure you have sufficient balance</li>
                <li>• Try a different payment method</li>
                <li>• Wait a few minutes and try again</li>
                <li>• Contact your bank if the issue persists</li>
                <li>• Reach out to our support team for assistance</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleTryAgain} className="flex-1 bg-green-600 hover:bg-green-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Payment Again
              </Button>
              
              <Button onClick={handleContactSupport} variant="outline" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              
              <Button onClick={handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Back to Finance
              </Button>
            </div>

            {/* Support Information */}
            <div className="text-center pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Phone className="h-4 w-4" />
                  <span>Need help? Call support: +91-XXXX-XXXX-XX</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <CreditCard className="h-4 w-4" />
                  <span>Secure payment gateway</span>
                </div>
              </div>
            </div>

            {/* No Money Deducted Notice */}
            <Alert className="border-green-200 bg-green-50">
              <AlertTriangle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Important:</strong> Since the payment failed, no money has been deducted from your account. 
                You can safely retry the payment.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <PageWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading payment details...</p>
          </div>
        </div>
      </PageWrapper>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
} 