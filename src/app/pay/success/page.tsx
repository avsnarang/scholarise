"use client";

import React, { useEffect, Suspense } from 'react';
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
  CheckCircle, 
  Download,
  ArrowLeft,
  Share2,
  Printer
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatIndianCurrency } from '@/lib/utils';

// Component that uses useSearchParams - must be wrapped in Suspense
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams?.get('payment_id') || null;

  // For now, we'll create mock payment details since the API endpoint doesn't exist yet
  const paymentDetails = paymentId ? {
    transactionId: 'TXN_' + paymentId.substring(0, 10),
    razorpayPaymentId: paymentId,
    amount: 5000, // Mock amount
    createdAt: new Date().toISOString(),
    student: {
      firstName: 'Student',
      lastName: 'Name',
      admissionNumber: 'ADM001',
      section: {
        name: 'A',
        class: {
          name: '10th'
        }
      }
    },
    feeTermName: 'Term 1 Fees',
    feeHeads: [
      { name: 'Tuition Fee', amount: 3000 },
      { name: 'Transport Fee', amount: 2000 }
    ]
  } : null;

  const isLoading = false;

  // Mock download receipt function
  const downloadReceiptMutation = {
    mutate: (data: { paymentId: string }) => {
      // Mock receipt download
      console.log('Downloading receipt for payment:', data.paymentId);
      // In real implementation, this would call the API
    },
    isLoading: false
  };

  const handleDownloadReceipt = () => {
    if (paymentId) {
      downloadReceiptMutation.mutate({ paymentId });
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2">Loading payment details...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-red-500 mb-4">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Payment Not Found</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Unable to find payment details. Please contact the school office.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b print:shadow-none print:border-none">
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
                Payment Confirmation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Success Message */}
          <Card className="mb-6">
            <CardContent className="text-center p-8">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your fee payment has been processed successfully.
              </p>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transaction ID</p>
                  <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {paymentDetails.transactionId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment ID</p>
                  <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {paymentDetails.razorpayPaymentId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatIndianCurrency(paymentDetails.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment Date</p>
                  <p className="font-semibold">
                    {new Date(paymentDetails.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Student Name</p>
                    <p className="font-semibold">
                      {paymentDetails.student.firstName} {paymentDetails.student.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Admission Number</p>
                    <p className="font-semibold">{paymentDetails.student.admissionNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Class & Section</p>
                    <p className="font-semibold">
                      {paymentDetails.student.section.class.name} - {paymentDetails.student.section.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fee Term</p>
                    <p className="font-semibold">{paymentDetails.feeTermName}</p>
                  </div>
                </div>
              </div>

              {paymentDetails.feeHeads && paymentDetails.feeHeads.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Fee Breakdown</p>
                  <div className="space-y-2">
                    {paymentDetails.feeHeads.map((feeHead: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{feeHead.name}</span>
                        <span>{formatIndianCurrency(feeHead.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 print:hidden">
            <Button
              onClick={handleDownloadReceipt}
              disabled={downloadReceiptMutation.isLoading}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadReceiptMutation.isLoading ? 'Generating...' : 'Download Receipt'}
            </Button>
            
            <Button
              onClick={handlePrintReceipt}
              variant="outline"
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              If you have any questions about this payment, please contact the school office.
            </p>
            <p className="mt-2">
              Keep this receipt for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-2">Loading payment details...</span>
        </CardContent>
      </Card>
    </div>
  );
}

// Main export component with Suspense wrapper
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}