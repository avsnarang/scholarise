"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Receipt, 
  Download, 
  Printer, 
  X
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { FeeReceipt } from './fee-receipt';

interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    receiptNumber: string;
    paymentDate: Date;
    paymentMode: string;
    transactionReference?: string;
    notes?: string;
  };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    section?: {
      name?: string;
      class?: {
        name: string;
      };
    };
    parent?: {
      firstName?: string;
      lastName?: string;
      fatherName?: string;
      motherName?: string;
    };
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
  feeItems: Array<{
    feeHeadName: string;
    feeTermName: string;
    originalAmount: number;
    concessionAmount: number;
    finalAmount: number;
    appliedConcessions?: Array<{
      name: string;
      type: 'PERCENTAGE' | 'FIXED';
      value: number;
      amount: number;
    }>;
  }>;
  totals: {
    totalOriginalAmount: number;
    totalConcessionAmount: number;
    totalNetAmount: number;
    totalPaidAmount: number;
  };
}

export function FeeReceiptModal({
  isOpen,
  onClose,
  receiptData,
  student,
  branch,
  session,
  feeItems,
  totals,
}: FeeReceiptModalProps) {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  // Clean up any potential memory leaks when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function
      const existingPrintWindows = document.querySelectorAll('[data-print-window]');
      existingPrintWindows.forEach(window => {
        window.remove();
      });
    };
  }, []);

  const handlePrint = useCallback(() => {
    const printContent = receiptRef.current;
    if (!printContent) {
      toast({
        title: "Error",
        description: "Receipt content not found",
        variant: "destructive",
      });
      return;
    }

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window. Please check your browser settings.",
        variant: "destructive",
      });
      return;
    }

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${receiptData.receiptNumber}</title>
          <style>
            @page {
              size: A5 landscape;
              margin: 0.05in;
            }
            
            * {
              box-sizing: border-box;
            }
            
            html, body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
              overflow: hidden;
            }
            
            .print-container {
              width: 100%;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 0;
              margin: 0;
            }
            
            .fee-receipt-container {
              width: 8.17in !important;
              height: 5.73in !important;
              max-width: 8.17in !important;
              max-height: 5.73in !important;
              overflow: hidden;
              margin: 0;
            }
            
            @media print {
              html, body {
                width: 8.17in;
                height: 5.73in;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              
              .print-container {
                width: 8.17in;
                height: 5.73in;
                padding: 0;
                margin: 0;
                display: block;
              }
              
              .fee-receipt-container {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
            
            table {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .no-print {
              display: none !important;
            }
            
            @media screen {
              body {
                background: #f0f0f0;
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.outerHTML}
          </div>
        </body>
      </html>
    `);
    
    newWindow.document.close();
    
    // Give the browser time to load the content and ensure proper cleanup
    setTimeout(() => {
      try {
        newWindow.print();
        // Close after a delay to ensure print dialog appears
        setTimeout(() => {
          newWindow.close();
        }, 1000);
      } catch (error) {
        console.error('Print error:', error);
        newWindow.close();
      }
    }, 500);

    toast({
      title: "Receipt Ready",
      description: "Receipt is ready for printing",
    });
  }, [receiptData.receiptNumber, toast]);

  const handleDownload = useCallback(() => {
    const printContent = receiptRef.current;
    if (!printContent) {
      toast({
        title: "Error",
        description: "Receipt content not found",
        variant: "destructive",
      });
      return;
    }

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast({
        title: "Error",
        description: "Unable to open download window. Please check your browser settings.",
        variant: "destructive",
      });
      return;
    }

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${receiptData.receiptNumber}</title>
          <style>
            @page {
              size: A5 landscape;
              margin: 0.05in;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            .download-container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f5f5f5;
              padding: 20px;
            }
            
            .fee-receipt-container {
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .download-actions {
              text-align: center;
              margin-top: 20px;
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .download-btn {
              background: #2563eb;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              margin: 0 10px;
            }
            
            .download-btn:hover {
              background: #1d4ed8;
            }
            
            @media print {
              .download-container {
                background: white;
                min-height: auto;
                padding: 0;
                margin: 0;
                display: block;
              }
              
              .download-actions {
                display: none;
              }
              
              .fee-receipt-container {
                box-shadow: none;
                page-break-inside: avoid;
                break-inside: avoid;
                margin: 0;
                max-width: 100%;
                max-height: 100%;
                width: 8.17in !important;
                height: 5.73in !important;
              }
              
              body {
                overflow: hidden;
              }
            }
          </style>
        </head>
        <body>
          <div class="download-container">
            ${printContent.outerHTML}
            <div class="download-actions">
              <button class="download-btn" onclick="window.print()">Save as PDF</button>
              <button class="download-btn" onclick="window.close()">Close</button>
            </div>
          </div>
        </body>
      </html>
    `);
    
    newWindow.document.close();

    toast({
      title: "Download Ready",
      description: "Use the 'Save as PDF' button to download the receipt",
    });
  }, [receiptData.receiptNumber, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] p-0">
        <DialogHeader className="px-6 py-3 border-b bg-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Receipt className="h-5 w-5 text-blue-600" />
              Fee Payment Receipt
            </DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm" className="h-9 px-3">
                <Download className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
              <Button onClick={handlePrint} size="sm" className="h-9 px-3 bg-green-600 hover:bg-green-700">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm" className="h-9 w-9 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex justify-center items-start p-4 bg-gray-50 overflow-auto flex-1">
          <div className="bg-white rounded-lg shadow-lg p-2">
            <FeeReceipt
              ref={receiptRef}
              receiptData={receiptData}
              student={student}
              branch={branch}
              session={session}
              feeItems={feeItems}
              totals={totals}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}