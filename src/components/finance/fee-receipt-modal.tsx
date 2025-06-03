import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";

interface FeeItem {
  id: string;
  feeHead: string;
  term: string;
  payingAmount: number;
  dueDate: string;
}

interface Student {
  id: string;
  name: string;
  admissionNo: string;
  class: string;
  parentName: string;
}

interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  feeItems: FeeItem[];
  totalAmount: number;
  paymentMode: string;
  transactionDetails: string;
  receiptNumber?: string;
  paymentDate?: string;
}

export function FeeReceiptModal({
  isOpen,
  onClose,
  student,
  feeItems,
  totalAmount,
  paymentMode,
  transactionDetails,
  receiptNumber = `RCP-${Date.now()}`,
  paymentDate = new Date().toLocaleDateString(),
}: FeeReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Fee Receipt - ${receiptNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt-header { text-align: center; margin-bottom: 30px; }
                .school-name { font-size: 24px; font-weight: bold; color: #00501B; }
                .receipt-title { font-size: 20px; margin: 10px 0; }
                .receipt-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
                .detail-item { padding: 5px 0; }
                .detail-label { font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; }
                .total-row { font-weight: bold; background-color: #f9f9f9; }
                .receipt-footer { margin-top: 30px; text-align: center; }
                @media print { 
                  body { margin: 0; } 
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    // In a real application, this would generate a PDF
    console.log('Download receipt as PDF');
    alert('PDF download functionality would be implemented here');
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Fee Receipt Preview
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="bg-white text-black p-8">
          {/* Receipt Header */}
          <div className="receipt-header text-center mb-8">
            <div className="school-name text-2xl font-bold text-[#00501B] mb-2">
              Scholars Institute
            </div>
            <div className="text-lg text-gray-600 mb-4">
              123 Education Lane, Knowledge City - 560001
            </div>
            <div className="receipt-title text-xl font-semibold border-b-2 border-[#00501B] inline-block pb-1">
              FEE RECEIPT
            </div>
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <div className="detail-label font-semibold">Receipt Number:</div>
                <div className="text-lg">{receiptNumber}</div>
              </div>
              <div className="mb-4">
                <div className="detail-label font-semibold">Payment Date:</div>
                <div>{paymentDate}</div>
              </div>
              <div className="mb-4">
                <div className="detail-label font-semibold">Payment Mode:</div>
                <div>{paymentMode}</div>
              </div>
              {transactionDetails && (
                <div className="mb-4">
                  <div className="detail-label font-semibold">Transaction Reference:</div>
                  <div>{transactionDetails}</div>
                </div>
              )}
            </div>
            <div>
              <div className="mb-4">
                <div className="detail-label font-semibold">Student Name:</div>
                <div className="text-lg">{student.name}</div>
              </div>
              <div className="mb-4">
                <div className="detail-label font-semibold">Admission Number:</div>
                <div>{student.admissionNo}</div>
              </div>
              <div className="mb-4">
                <div className="detail-label font-semibold">Class:</div>
                <div>{student.class}</div>
              </div>
              <div className="mb-4">
                <div className="detail-label font-semibold">Parent/Guardian:</div>
                <div>{student.parentName}</div>
              </div>
            </div>
          </div>

          {/* Fee Details Table */}
          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left">Fee Head</th>
                <th className="border border-gray-300 p-3 text-left">Term</th>
                <th className="border border-gray-300 p-3 text-right">Amount (₹)</th>
                <th className="border border-gray-300 p-3 text-left">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {feeItems.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-3">{item.feeHead}</td>
                  <td className="border border-gray-300 p-3">{item.term}</td>
                  <td className="border border-gray-300 p-3 text-right">{item.payingAmount.toFixed(2)}</td>
                  <td className="border border-gray-300 p-3">{new Date(item.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
              <tr className="total-row bg-[#00501B]/10">
                <td className="border border-gray-300 p-3 font-bold" colSpan={2}>Total Amount</td>
                <td className="border border-gray-300 p-3 text-right font-bold text-lg">₹{totalAmount.toFixed(2)}</td>
                <td className="border border-gray-300 p-3"></td>
              </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="mb-8">
            <div className="detail-label font-semibold">Amount in Words:</div>
            <div className="text-lg italic border-b border-gray-300 pb-1">
              {/* This would be implemented with a number-to-words library */}
              {totalAmount === Math.floor(totalAmount) 
                ? `Rupees ${totalAmount} Only` 
                : `Rupees ${totalAmount.toFixed(2)} Only`}
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="receipt-footer mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <div className="font-semibold">Received By</div>
                  <div className="text-sm text-gray-600">Cashier/Accounts</div>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <div className="font-semibold">Authorized Signatory</div>
                  <div className="text-sm text-gray-600">Finance Department</div>
                </div>
              </div>
            </div>
            <div className="mt-8 text-center text-sm text-gray-500">
              This is a computer-generated receipt. Thank you for your payment.
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint} className="bg-[#00501B] hover:bg-[#00501B]/90 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 