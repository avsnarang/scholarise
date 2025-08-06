"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
// Table and separator components removed - using simplified card layout instead
import { 
  Receipt, 
  Download, 
  Printer, 
  CreditCard,
  Check,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Gift,
  Plus,
  Settings,
  Info
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import { StudentConcessionFormModal } from "./student-concession-form-modal";
import { PaymentGatewayButton } from './payment-gateway-button';
import { useStudentPaymentMonitor } from '@/hooks/usePaymentRealtime';
import { ReceiptService } from '@/services/receipt-service';

interface FeeItem {
  id: string;
  feeHeadId: string;
  feeHeadName: string;
  feeTermId: string;
  feeTermName: string;
  originalAmount?: number;
  concessionAmount?: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  status: 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';
  appliedConcessions?: Array<{
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    amount: number;
    reason?: string;
  }>;
}

interface Student {
  id: string;
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
    fatherName?: string;
    motherName?: string;
    fatherMobile?: string;
    motherMobile?: string;
    fatherEmail?: string;
  };
}

interface StreamlinedFeeCollectionProps {
  student: Student;
  feeItems: FeeItem[];
  isLoading?: boolean;
  onCollectPayment: (payment: {
    studentId: string;
    selectedFees: Array<{
      feeHeadId: string;
      feeTermId: string;
      amount: number;
      originalAmount: number;
      concessionAmount: number;
    }>;
    paymentMode: string;
    transactionReference?: string;
    notes?: string;
    paymentDate: Date;
  }) => Promise<{ receiptNumber: string; totalAmount: number; }>;
  concessionTypes?: Array<{
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    maxValue?: number;
    description?: string;
    applicableStudentTypes: string[];
    eligibilityCriteria?: string;
    requiredDocuments: string[];
  }>;
  feeHeads?: Array<{
    id: string;
    name: string;
  }>;
  feeTerms?: Array<{
    id: string;
    name: string;
  }>;
  onAssignConcession?: (data: any) => Promise<void>;
  onRefreshFees?: () => void;
  branch?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    logoUrl?: string;
  };
  session?: {
    name: string;
  };
}

const paymentModes = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Online", label: "Online Payment" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "DD", label: "Demand Draft" },
];

// Color palette for fee terms
const termColors = [
  "bg-blue-50 border-blue-200 text-blue-900",
  "bg-green-50 border-green-200 text-green-900", 
  "bg-purple-50 border-purple-200 text-purple-900",
  "bg-orange-50 border-orange-200 text-orange-900",
  "bg-pink-50 border-pink-200 text-pink-900",
  "bg-indigo-50 border-indigo-200 text-indigo-900",
  "bg-cyan-50 border-cyan-200 text-cyan-900",
  "bg-emerald-50 border-emerald-200 text-emerald-900",
];

export function StreamlinedFeeCollection({ 
  student, 
  feeItems, 
  isLoading = false,
  onCollectPayment,
  concessionTypes = [],
  feeHeads = [],
  feeTerms = [],
  onAssignConcession,
  onRefreshFees,
  branch = { name: 'School Name' },
  session = { name: '2024-25' }
}: StreamlinedFeeCollectionProps) {
  const { toast } = useToast();

  
  // Monitor real-time payment updates for this student
  useStudentPaymentMonitor(student.id);
  
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());
  const [paymentMode, setPaymentMode] = useState<string>('');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [adjustmentMode, setAdjustmentMode] = useState<'auto' | 'manual'>('auto');

  // Group fee items by term
  const feesByTerm = useMemo(() => {
    const grouped: Record<string, FeeItem[]> = {};
    feeItems.forEach(item => {
      if (!grouped[item.feeTermId]) {
        grouped[item.feeTermId] = [];
      }
      grouped[item.feeTermId]!.push(item);
    });
    return grouped;
  }, [feeItems]);

  // Calculate selected fees total
  const selectedFeesTotal = useMemo(() => {
    return feeItems
      .filter(item => selectedFeeIds.has(item.id))
      .reduce((sum, item) => {
        if (adjustmentMode === 'manual') {
          const customAmount = parseFloat(customAmounts[item.id] || '0');
          return sum + Math.min(customAmount, item.outstandingAmount);
        }
        return sum + item.outstandingAmount;
      }, 0);
  }, [feeItems, selectedFeeIds, adjustmentMode, customAmounts]);

  const selectedFeesCount = selectedFeeIds.size;

  // Handle fee selection
  const handleFeeSelection = (feeId: string, checked: boolean) => {
    const newSelection = new Set(selectedFeeIds);
    if (checked) {
      newSelection.add(feeId);
    } else {
      newSelection.delete(feeId);
      // Clear custom amount when deselected
      setCustomAmounts(prev => {
        const updated = { ...prev };
        delete updated[feeId];
        return updated;
      });
    }
    setSelectedFeeIds(newSelection);
  };

  // Handle custom amount changes
  const handleCustomAmountChange = (feeId: string, amount: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [feeId]: amount
    }));
  };

  // Handle select all for a term
  const handleTermSelection = (termId: string, checked: boolean) => {
    const termFees = feesByTerm[termId] || [];
    const newSelection = new Set(selectedFeeIds);
    
    termFees.forEach(fee => {
      if (fee.outstandingAmount > 0) {
        if (checked) {
          newSelection.add(fee.id);
        } else {
          newSelection.delete(fee.id);
        }
      }
    });
    
    setSelectedFeeIds(newSelection);
  };

  // Check if all fees in a term are selected
  const isTermFullySelected = (termId: string) => {
    const termFees = feesByTerm[termId] || [];
    const outstandingFees = termFees.filter(fee => fee.outstandingAmount > 0);
    return outstandingFees.length > 0 && outstandingFees.every(fee => selectedFeeIds.has(fee.id));
  };

  // Handle payment processing
  const handleProcessPayment = async () => {
    if (selectedFeesCount === 0) {
      toast({
        title: "No Fees Selected",
        description: "Please select at least one fee to collect payment.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMode) {
      toast({
        title: "Payment Mode Required",
        description: "Please select a payment mode.",
        variant: "destructive",
      });
      return;
    }

    // Validate custom amounts if in manual mode
    if (adjustmentMode === 'manual') {
      const invalidAmounts = feeItems
        .filter(item => selectedFeeIds.has(item.id))
        .find(item => {
          const customAmount = parseFloat(customAmounts[item.id] || '0');
          return customAmount <= 0 || customAmount > item.outstandingAmount;
        });

      if (invalidAmounts) {
        toast({
          title: "Invalid Custom Amount",
          description: "Please enter valid custom amounts between 0 and the outstanding amount for all selected fees.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);

    try {
      const selectedFees = feeItems
        .filter(item => selectedFeeIds.has(item.id))
        .map(item => {
          let amount = item.outstandingAmount;
          
          if (adjustmentMode === 'manual') {
            const customAmount = parseFloat(customAmounts[item.id] || '0');
            amount = Math.min(customAmount, item.outstandingAmount);
          }
          
                  return {
          feeHeadId: item.feeHeadId,
          feeTermId: item.feeTermId,
          amount, // This is the final amount being paid (after concessions)
          // Ensure originalAmount is ALWAYS the amount before concessions
          originalAmount: item.originalAmount || item.totalAmount + (item.concessionAmount || 0),
          // Ensure concessionAmount is properly passed
          concessionAmount: item.concessionAmount || 0,
        };
        });



      const result = await onCollectPayment({
        studentId: student.id,
        selectedFees,
        paymentMode,
        transactionReference: transactionReference || undefined,
        notes: notes || undefined,
        paymentDate: new Date(),
      });

      // Prepare receipt data using unified service
      const selectedFeeItems = feeItems.filter(item => selectedFeeIds.has(item.id));
      
      const receiptFeeItems = selectedFeeItems.map(item => {
        let amount = item.outstandingAmount;
        
        if (adjustmentMode === 'manual') {
          const customAmount = parseFloat(customAmounts[item.id] || '0');
          amount = Math.min(customAmount, item.outstandingAmount);
        }
        
        return {
          feeHeadName: item.feeHeadName,
          feeTermName: item.feeTermName,
          // Ensure originalAmount is ALWAYS the amount before concessions
          originalAmount: item.originalAmount || item.totalAmount + (item.concessionAmount || 0),
          // Ensure concessionAmount is properly passed
          concessionAmount: item.concessionAmount || 0,
          finalAmount: amount,
        };
      });

      // Create receipt data using the same format as payment history page
      const receiptData = ReceiptService.createReceiptFromPaymentHistoryData({
        receiptNumber: result.receiptNumber,
        paymentDate: new Date(),
        paymentMode: paymentMode,
        totalAmount: receiptFeeItems.reduce((sum, item) => sum + (item.originalAmount || 0), 0),
        paidAmount: selectedFeesTotal,
        transactionReference: transactionReference || result.receiptNumber,
        notes: notes || undefined,
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          section: {
            name: student.section?.name || 'N/A',
            class: {
              name: student.section?.class?.name || 'N/A'
            }
          },
          parent: {
            fatherName: student.parent?.fatherName || undefined,
            motherName: student.parent?.motherName || undefined
          }
        },
        branch: {
          name: branch?.name || 'School',
          address: branch?.address,
          city: branch?.city,
          state: branch?.state,
          logoUrl: branch?.logoUrl || '/android-chrome-192x192.png'
        },
        session: {
          name: session?.name || 'Academic Session'
        },
        items: receiptFeeItems.map(item => ({
          feeHead: { name: item.feeHeadName },
          feeTerm: { name: item.feeTermName },
          amount: item.finalAmount,
          originalAmount: item.originalAmount,
          concessionAmount: item.concessionAmount
        }))
      });

      ReceiptService.printReceipt(receiptData);

      // Reset form
      setSelectedFeeIds(new Set());
      setPaymentMode('');
      setTransactionReference('');
      setNotes('');
      setCustomAmounts({});
      setAdjustmentMode('auto');

      toast({
        title: "Payment Collected Successfully",
        description: `Receipt ${result.receiptNumber} generated and sent to printer`,
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing the payment. Please try again.",
        variant: "destructive",
      });
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };



  // Handle concession assignment
  const handleAssignConcession = async (concessionData: any) => {
    if (!onAssignConcession) return;
    
    try {
      await onAssignConcession(concessionData);
      setShowConcessionModal(false);
      
      toast({
        title: "Concession Assigned",
        description: "Student concession has been assigned successfully.",
      });
      
      // Refresh fee data
      if (onRefreshFees) {
        onRefreshFees();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign concession. Please try again.",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="space-y-4">
      {/* Student Info Header - Minimal Design */}
      <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground dark:text-white">
                {student.firstName} {student.lastName}
              </h2>
              <div className="text-sm text-muted-foreground dark:text-gray-400">
                {student.admissionNumber} • {student.section?.class?.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {formatIndianCurrency(feeItems.reduce((sum, item) => sum + item.outstandingAmount, 0))}
              </div>
              <div className="text-sm text-muted-foreground dark:text-gray-400">Outstanding</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main 2-Column Layout: 60/40 Split */}
      <div className="grid grid-cols-5 gap-6">
        
        {/* Left Column - 60% (3/5) - Fee Head and Term Grouping */}
        <div className="col-span-3 space-y-4">
          <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground dark:text-white">
                    Fee Structure
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-gray-400">
                    All fees (paid and unpaid) - Select unpaid fees to collect payment
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={adjustmentMode} onValueChange={(value: 'auto' | 'manual') => setAdjustmentMode(value)}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Amount</SelectItem>
                      <SelectItem value="manual">Custom Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  {onAssignConcession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConcessionModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Gift className="h-4 w-4" />
                      Add Concession
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(feesByTerm).map(([termId, termFees], index) => {
                const termName = termFees[0]?.feeTermName || 'Unknown Term';
                const termTotal = termFees.reduce((sum, fee) => sum + fee.totalAmount, 0);
                const termOutstanding = termFees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
                const hasOutstanding = termFees.some(fee => fee.outstandingAmount > 0);
                const termDueDate = termFees[0]?.dueDate || '';

                // Always show term, regardless of outstanding amount

                return (
                  <div 
                    key={termId} 
                    className="border border-border dark:border-gray-700 rounded-lg p-4 bg-muted/30 dark:bg-gray-800/30"
                  >
                    {/* Term Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        {hasOutstanding && (
                          <Checkbox
                            checked={isTermFullySelected(termId)}
                            onCheckedChange={(checked) => handleTermSelection(termId, checked as boolean)}
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-base text-foreground dark:text-white">
                            {termName}
                          </h4>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            Due: {termDueDate ? new Date(termDueDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="space-y-1">
                          <div className="font-bold text-lg text-foreground dark:text-white">
                            Total: {formatIndianCurrency(termTotal)}
                          </div>
                          {termOutstanding > 0 && (
                            <div className="font-semibold text-base text-primary">
                              Outstanding: {formatIndianCurrency(termOutstanding)}
                            </div>
                          )}
                          {/* Show concession info if any fees have concessions */}
                          {termFees.some(fee => fee.concessionAmount && fee.concessionAmount > 0) && (
                            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Concessions Applied: -{formatIndianCurrency(termFees.reduce((sum, fee) => sum + (fee.concessionAmount || 0), 0))}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground dark:text-gray-400">
                          {termFees.length} fee{termFees.length !== 1 ? 's' : ''} • {termFees.filter(f => f.outstandingAmount > 0).length} pending
                          {termFees.some(fee => fee.concessionAmount && fee.concessionAmount > 0) && (
                            <span className="ml-1 text-green-600 dark:text-green-400">• {termFees.filter(f => f.concessionAmount && f.concessionAmount > 0).length} with concessions</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fee Items */}
                    <div className="space-y-2">
                      {termFees.map((fee) => {
                        const isPaid = fee.outstandingAmount <= 0;
                        
                        return (
                          <div 
                            key={fee.id} 
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                              isPaid
                                ? 'bg-gray-50 dark:bg-gray-800/60 border-gray-300 dark:border-gray-600 opacity-80'
                                : selectedFeeIds.has(fee.id) 
                                  ? 'bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/40' 
                                  : 'bg-background dark:bg-gray-800 border-border dark:border-gray-600 hover:bg-muted/50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {!isPaid ? (
                                <Checkbox
                                  checked={selectedFeeIds.has(fee.id)}
                                  onCheckedChange={(checked) => handleFeeSelection(fee.id, checked as boolean)}
                                />
                              ) : (
                                <div className="w-4"></div>
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm text-foreground dark:text-white">
                                  {fee.feeHeadName}
                                </div>
                                {/* Enhanced Concession Display */}
                                {fee.originalAmount && fee.concessionAmount && fee.concessionAmount > 0 ? (
                                  <div className="mt-2">
                                    {/* Price breakdown with visual flow */}
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-muted-foreground line-through">
                                        {formatIndianCurrency(fee.originalAmount)}
                                      </span>
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        -{formatIndianCurrency(fee.concessionAmount)}
                                      </span>
                                      <span className="text-foreground dark:text-white font-semibold">
                                        = {formatIndianCurrency(fee.totalAmount)}
                                      </span>
                                    </div>
                                    
                                    {/* Concession badges - simplified and cleaner */}
                                    {fee.appliedConcessions && fee.appliedConcessions.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {fee.appliedConcessions.map((concession) => (
                                          <div
                                            key={concession.id}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-md text-xs border border-green-200 dark:border-green-800"
                                            title={`${concession.name}\n${concession.reason || 'No reason provided'}\nAmount: ${formatIndianCurrency(concession.amount)}`}
                                          >
                                            <Gift className="h-3 w-3" />
                                            <span className="font-medium">{concession.name}</span>
                                            <span className="opacity-75">
                                              {concession.type === 'PERCENTAGE' ? `${concession.value}%` : formatIndianCurrency(concession.amount)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Status indicator */}
                                    <div className="mt-1.5">
                                      <span className={`text-xs font-medium ${
                                        isPaid 
                                          ? 'text-blue-600 dark:text-blue-400' 
                                          : 'text-primary'
                                      }`}>
                                        {isPaid ? 'Paid' : 'Outstanding'}: {formatIndianCurrency(isPaid ? fee.paidAmount : fee.outstandingAmount)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    <div className="text-sm">
                                      <span className={`font-medium ${
                                        isPaid 
                                          ? 'text-blue-600 dark:text-blue-400' 
                                          : 'text-foreground dark:text-white'
                                      }`}>
                                        {formatIndianCurrency(isPaid ? fee.paidAmount : fee.outstandingAmount)}
                                      </span>
                                      <span className="text-muted-foreground ml-1">
                                        {isPaid ? 'paid' : 'due'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {adjustmentMode === 'manual' && selectedFeeIds.has(fee.id) && !isPaid ? (
                                <div className="flex flex-col gap-1">
                                  <Input
                                    type="number"
                                    value={customAmounts[fee.id] || ''}
                                    onChange={(e) => handleCustomAmountChange(fee.id, e.target.value)}
                                    placeholder={fee.outstandingAmount.toString()}
                                    className="w-24 h-8 text-xs"
                                    min="0"
                                    max={fee.outstandingAmount}
                                    step="0.01"
                                  />
                                  <div className="text-xs text-muted-foreground text-center">
                                    Max: {formatIndianCurrency(fee.outstandingAmount)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <div className={`font-bold text-lg ${
                                    isPaid 
                                      ? 'text-blue-600 dark:text-blue-400' 
                                      : 'text-foreground dark:text-white'
                                  }`}>
                                    {formatIndianCurrency(isPaid ? fee.paidAmount : fee.outstandingAmount)}
                                  </div>
                                  {fee.concessionAmount && fee.concessionAmount > 0 && !isPaid && fee.originalAmount && (
                                    <div className="text-xs text-muted-foreground">
                                      Original: {formatIndianCurrency(fee.originalAmount)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {isPaid && (
                                <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800">
                                  PAID
                                </Badge>
                              )}
                              {fee.status === 'Overdue' && !isPaid && (
                                <Badge variant="destructive" className="text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 40% (2/5) - Payment Form */}
        <div className="col-span-2">
          <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Fees Summary */}
              {selectedFeesCount > 0 && (
                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
                  <div className="text-sm font-medium text-foreground dark:text-white mb-1">
                    Selected Fees {adjustmentMode === 'manual' && '(Custom Amounts)'}
                  </div>
                  <div className="text-xs text-muted-foreground dark:text-gray-400 mb-2">
                    {selectedFeesCount} item{selectedFeesCount !== 1 ? 's' : ''} selected
                  </div>
                  <div className="text-xl font-bold text-primary">
                    {formatIndianCurrency(selectedFeesTotal)}
                  </div>
                  {adjustmentMode === 'manual' && (
                    <div className="mt-2 text-xs text-muted-foreground dark:text-gray-400">
                      <Info className="h-3 w-3 inline mr-1" />
                      Using custom payment amounts
                    </div>
                  )}
                </div>
              )}

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-gray-300">
                  Payment Mode *
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-800 border-border dark:border-gray-600">
                    {paymentModes.map((mode) => (
                      <SelectItem 
                        key={mode.value} 
                        value={mode.value}
                        className="text-foreground dark:text-white hover:bg-muted dark:hover:bg-gray-700"
                      >
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Reference */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-gray-300">
                  Transaction Reference
                </Label>
                <Input
                  placeholder="Enter reference number"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-gray-300">
                  Notes
                </Label>
                <Textarea
                  placeholder="Add payment notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-500 resize-none"
                />
              </div>

              {/* Payment Buttons */}
              <div className="pt-4 space-y-3">
                {/* Manual Payment Collection */}
                <Button
                  onClick={handleProcessPayment}
                  disabled={isProcessing || selectedFeesCount === 0 || !paymentMode}
                  className="w-full"
                  size="lg"
                  variant="default"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Collect Manual Payment
                      {selectedFeesTotal > 0 && ` - ${formatIndianCurrency(selectedFeesTotal)}`}
                    </>
                  )}
                </Button>

                {/* Gateway Payment Option */}
                {selectedFeesCount > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Or pay online securely
                      </span>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CreditCard className="w-3 h-3 mr-1" />
                        Secure
                      </Badge>
                    </div>
                    <PaymentGatewayButton
                      studentId={student.id}
                      selectedFees={feeItems
                        .filter(item => selectedFeeIds.has(item.id))
                        .map(item => ({
                          feeHeadId: item.feeHeadId,
                          feeHeadName: item.feeHeadName,
                          amount: adjustmentMode === 'manual' 
                            ? Math.min(parseFloat(customAmounts[item.id] || '0'), item.outstandingAmount)
                            : item.outstandingAmount,
                        }))
                      }
                      feeTermId={feeItems[0]?.feeTermId || ''}
                      feeTermName={feeItems[0]?.feeTermName || 'Fee Payment'}
                      totalAmount={selectedFeesTotal}
                      onPaymentInitiated={() => {
                        toast({
                          title: "Payment Link Created",
                          description: "Student will receive payment link for online payment.",
                        });
                      }}
                      onPaymentSuccess={() => {
                        // Refresh fee data when payment is successful
                        if (onRefreshFees) {
                          onRefreshFees();
                        }
                        toast({
                          title: "Payment Successful!",
                          description: "Gateway payment completed successfully.",
                        });
                      }}
                      onPaymentFailure={(error) => {
                        toast({
                          title: "Payment Failed",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* No Fees Selected Message */}
              {selectedFeesCount === 0 && (
                <div className="p-4 text-center text-muted-foreground dark:text-gray-400 border border-dashed border-border dark:border-gray-600 rounded-lg">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select fees from the left panel to process payment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>



      {/* Loading State */}
      {isLoading && (
        <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
          <CardContent className="py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground dark:text-gray-400 mb-4" />
              <p className="text-muted-foreground dark:text-gray-400">Loading fee details...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Concession Assignment Modal */}
      {showConcessionModal && onAssignConcession && (
        <StudentConcessionFormModal
          isOpen={showConcessionModal}
          onClose={() => setShowConcessionModal(false)}
          onSubmit={handleAssignConcession}
          students={[student]}
          concessionTypes={concessionTypes}
          feeTerms={feeTerms}
          feeHeads={feeHeads}
          selectedStudentId={student.id}
          isLoading={false}
        />
      )}
    </div>
  );
} 