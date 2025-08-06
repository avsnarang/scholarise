"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  XCircle, 
  ArrowLeft,
  RefreshCw,
  Phone,
  Mail
} from 'lucide-react';

// Component that uses useSearchParams - must be wrapped in Suspense
function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams?.get('transaction_id') || null;
  const error = searchParams?.get('error') || 'Payment failed';

  const handleTryAgain = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/sign-in');
  };

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
                The Scholars' Home
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Payment Status
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Failure Message */}
          <Card className="mb-6">
            <CardContent className="text-center p-8">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We're sorry, but your payment could not be processed at this time.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {error}
              </p>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          {transactionId && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transaction Reference</p>
                  <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {transactionId}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Please save this reference number for future correspondence.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Common Reasons */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Common Reasons for Payment Failure</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Insufficient balance in your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Card limit exceeded</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Incorrect card details (CVV, expiry date, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Network connectivity issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Bank server temporarily unavailable</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Payment cancelled by user</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What can you do next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold px-1">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Check your payment details</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Verify your card details, balance, and try again
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold px-1">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Try a different payment method</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Use a different card or payment option
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold px-1">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Contact your bank</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      If the problem persists, contact your bank or card issuer
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold px-1">4</span>
                  </div>
                  <div>
                    <p className="font-medium">Contact school office</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      For assistance, reach out to the school administration
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleTryAgain}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Sign In
            </Button>
          </div>

          {/* Support Information */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-2">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Call School Office</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Contact for payment assistance
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Support</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Send us your query
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Your payment was not charged. You can safely retry the payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function PaymentFailureLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    </div>
  );
}

// Main export component with Suspense wrapper
export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<PaymentFailureLoading />}>
      <PaymentFailureContent />
    </Suspense>
  );
}