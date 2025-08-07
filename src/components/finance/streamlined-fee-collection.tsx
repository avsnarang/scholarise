"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { Badge } from "@/components/ui/badge";
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
  Info,
  Calendar,
  User,
  ChevronRight,
  Wallet,
  Ban,
  FileText,
  IndianRupee,
  Percent,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import { StudentConcessionFormModal } from "./student-concession-form-modal";
import { EnhancedPaymentGatewayButton } from './enhanced-payment-gateway-button';
import { useStudentPaymentMonitor } from '@/hooks/usePaymentRealtime';
import { ReceiptService } from '@/services/receipt-service';
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

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
  { value: "Cash", label: "Cash", icon: DollarSign },
  { value: "Card", label: "Card", icon: CreditCard },
  { value: "Online", label: "Online Payment", icon: Wallet },
  { value: "Bank Transfer", label: "Bank Transfer", icon: FileText },
  { value: "Cheque", label: "Cheque", icon: FileText },
  { value: "DD", label: "Demand Draft", icon: FileText },
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
  
  // WhatsApp receipt sending is now handled automatically by the payment collection API
  // and logged in Message History (marked as [Automation] for filtering)
  
  // Monitor real-time payment updates for this student
  useStudentPaymentMonitor(student.id);
  
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [adjustmentMode, setAdjustmentMode] = useState<'auto' | 'manual'>('auto');
  const [showMobileFooter, setShowMobileFooter] = useState(true);

  const [isAtPageEnd, setIsAtPageEnd] = useState(false);
  const [hoveredFeeId, setHoveredFeeId] = useState<string | null>(null);
  const [hoveredTermId, setHoveredTermId] = useState<string | null>(null);

  // Scroll detection for mobile footer morphing
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Consider "approaching end" when within 200px of the bottom - this will hide footer
      const approachingThreshold = 200;
      const nearEnd = scrollTop + windowHeight >= documentHeight - approachingThreshold;
      
      // Consider "at end" when within 100px of the bottom - this will show the card
      const endThreshold = 100;
      const atEnd = scrollTop + windowHeight >= documentHeight - endThreshold;
      
      setIsAtPageEnd(atEnd);
      
      // Hide footer when approaching end to avoid blocking content
      setShowMobileFooter(!nearEnd || selectedFeeIds.size === 0);
      
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedFeeIds.size]);

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
          const customAmount = customAmounts[item.id];
          const amount = customAmount ? parseFloat(customAmount) : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }
        return sum + item.outstandingAmount;
      }, 0);
  }, [selectedFeeIds, feeItems, adjustmentMode, customAmounts]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalDue = feeItems.reduce((sum, item) => sum + item.outstandingAmount, 0);
    const totalPaid = feeItems.reduce((sum, item) => sum + item.paidAmount, 0);
    const overdueFees = feeItems.filter(item => item.status === 'Overdue');
    const overdueAmount = overdueFees.reduce((sum, item) => sum + item.outstandingAmount, 0);
    const totalConcession = feeItems.reduce((sum, item) => sum + (item.concessionAmount || 0), 0);
    
    return {
      totalDue,
      totalPaid,
      overdueAmount,
      overdueCount: overdueFees.length,
      totalConcession
    };
  }, [feeItems]);

  // Handle fee selection
  const handleFeeSelection = (feeId: string) => {
    const fee = feeItems.find(f => f.id === feeId);
    if (!fee || fee.outstandingAmount <= 0) return;
    
    const newSelected = new Set(selectedFeeIds);
    if (newSelected.has(feeId)) {
      newSelected.delete(feeId);
      // Clear custom amount when deselected
      const newCustomAmounts = { ...customAmounts };
      delete newCustomAmounts[feeId];
      setCustomAmounts(newCustomAmounts);
    } else {
      newSelected.add(feeId);
    }
    setSelectedFeeIds(newSelected);
  };

  // Select all fees in a term
  const handleSelectAllInTerm = (termId: string) => {
    const termFees = feesByTerm[termId] || [];
    const selectableFees = termFees.filter(fee => fee.outstandingAmount > 0);
    if (selectableFees.length === 0) return;
    
    const newSelected = new Set(selectedFeeIds);
    const isFullySelected = isTermFullySelected(termId);
    
    selectableFees.forEach(fee => {
      if (isFullySelected) {
        newSelected.delete(fee.id);
      } else {
        newSelected.add(fee.id);
      }
    });
    
    setSelectedFeeIds(newSelected);
  };

  // Check if all fees in a term are selected
  const isTermFullySelected = (termId: string) => {
    const termFees = feesByTerm[termId] || [];
    const selectableFees = termFees.filter(fee => fee.outstandingAmount > 0);
    if (selectableFees.length === 0) return false;
    return selectableFees.every(fee => selectedFeeIds.has(fee.id));
  };

  // Check if term is partially selected
  const isTermPartiallySelected = (termId: string) => {
    const termFees = feesByTerm[termId] || [];
    const selectableFees = termFees.filter(fee => fee.outstandingAmount > 0);
    if (selectableFees.length === 0) return false;
    const selectedCount = selectableFees.filter(fee => selectedFeeIds.has(fee.id)).length;
    return selectedCount > 0 && selectedCount < selectableFees.length;
  };

  // Handle payment collection
  const handleCollectPayment = async () => {
    if (selectedFeeIds.size === 0) {
      toast({
        title: "No fees selected",
        description: "Please select at least one fee to collect payment.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMode) {
      toast({
        title: "Payment mode required",
        description: "Please select a payment mode.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const selectedFees = feeItems.filter(item => selectedFeeIds.has(item.id));
      
      const paymentItems = selectedFees.map(fee => {
        let amount = fee.outstandingAmount;
        if (adjustmentMode === 'manual') {
          const customAmount = customAmounts[fee.id];
          amount = customAmount ? parseFloat(customAmount) : fee.outstandingAmount;
        }
        
        return {
          feeHeadId: fee.feeHeadId,
          feeTermId: fee.feeTermId,
          amount: amount,
          originalAmount: fee.originalAmount || fee.totalAmount,
          concessionAmount: fee.concessionAmount || 0,
        };
      });

      const result = await onCollectPayment({
        studentId: student.id,
        selectedFees: paymentItems,
        paymentMode,
        transactionReference,
        notes,
        paymentDate: new Date(),
      });

      // Generate and download receipt
      if (result?.receiptNumber) {
        try {
          const receiptData = {
            receiptNumber: result.receiptNumber,
            paymentDate: new Date(),
            paymentMode: paymentMode,
            transactionReference: transactionReference,
            notes: notes,
            student: student,
            branch: branch,
            session: session,
            feeItems: paymentItems.map((item, index) => {
              const fee = selectedFees[index];
              return {
                feeHeadName: fee?.feeHeadName || '',
                feeTermName: fee?.feeTermName || '',
                originalAmount: item.originalAmount,
                concessionAmount: item.concessionAmount,
                finalAmount: item.amount,
              };
            }),
            totals: {
              totalOriginalAmount: paymentItems.reduce((sum, item) => sum + item.originalAmount, 0),
              totalConcessionAmount: paymentItems.reduce((sum, item) => sum + item.concessionAmount, 0),
              totalNetAmount: result.totalAmount,
              totalPaidAmount: result.totalAmount,
            },
          };

          const receiptHTML = ReceiptService.generateReceiptHTML(receiptData);
          const blob = new Blob([receiptHTML], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Fee_Receipt_${result.receiptNumber}.html`;
          a.click();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error generating receipt:', error);
          toast({
            title: "Receipt generation failed",
            description: "Payment was successful but receipt could not be generated.",
            variant: "destructive",
          });
        }

        // WhatsApp receipt is automatically handled by the payment collection API
        // Receipt will be logged in Message History with [Automation] tag
      }

      // Clear selection and reset form
      setSelectedFeeIds(new Set());
      setPaymentMode('Cash');
      setTransactionReference('');
      setNotes('');
      setCustomAmounts({});
      setAdjustmentMode('auto');
      
      // Refresh fees
      if (onRefreshFees) {
        onRefreshFees();
      }
    } catch (error) {
      console.error('Payment collection error:', error);
      toast({
        title: "Payment failed",
        description: "An error occurred while processing the payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-24 lg:pb-0">
        {/* Student Information Card */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-white dark:bg-[#303030] rounded-lg pt-0">
          <CardHeader className="pb-4 bg-gray-50 dark:bg-[#404040] border-b border-gray-200 dark:border-gray-700 rounded-t-lg pt-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <User className="h-6 w-6 text-primary" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{student.firstName} {student.lastName}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{student.admissionNumber}</span>
                    <span>•</span>
                    <span>{student.section?.class?.name} {student.section?.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshFees}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-[#404040] hover:bg-gray-50 dark:hover:bg-[#505050]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {onAssignConcession && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConcessionModal(true)}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-[#404040] hover:bg-gray-50 dark:hover:bg-[#505050]"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Concession
                  </Button>
                )}
                {/* WhatsApp Payment Link Button */}
                {student.parent && (student.parent.fatherMobile || student.parent.motherMobile) && (
                  <EnhancedPaymentGatewayButton
                    studentId={student.id}
                    selectedFees={[]} // Always empty to generate universal payment link
                    feeTermId="" // Universal payment link doesn't need specific term
                    feeTermName="All Outstanding Fees"
                    totalAmount={totals.totalDue}
                    onPaymentInitiated={(paymentLinkId: string) => {
                      toast({
                        title: "Payment Link Created",
                        description: "Payment link sent to selected parent(s) via WhatsApp",
                      });
                    }}
                    disabled={false}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-4 bg-white dark:bg-[#303030]">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <motion.div 
                className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Due</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatIndianCurrency(totals.totalDue)}
                </p>
              </motion.div>
              <motion.div 
                className="p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Paid</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatIndianCurrency(totals.totalPaid)}
                </p>
              </motion.div>
              <motion.div 
                className="p-3 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Overdue</p>
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {formatIndianCurrency(totals.overdueAmount)}
                </p>
              </motion.div>
              <motion.div 
                className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Concession</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {formatIndianCurrency(totals.totalConcession)}
                </p>
              </motion.div>
              <motion.div 
                className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Overdue Items</p>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {totals.overdueCount}
                </p>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Items by Term */}
        <div className="space-y-4">
          {Object.entries(feesByTerm).map(([termId, termFees]) => {
            const termName = termFees[0]?.feeTermName || 'Unknown Term';
            const termTotal = termFees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
            const termPaid = termFees.reduce((sum, fee) => sum + fee.paidAmount, 0);
            const hasOutstanding = termFees.some(fee => fee.outstandingAmount > 0);
            const isFullySelected = isTermFullySelected(termId);
            const isPartiallySelected = isTermPartiallySelected(termId);
            
            return (
              <motion.div
                key={termId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className={cn(
                    "relative border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] shadow-sm overflow-hidden transition-all duration-300 rounded-lg py-0 px-0",
                    hoveredTermId === termId && hasOutstanding && !isFullySelected && "shadow-lg ring-2 ring-primary/20",
                    isFullySelected && "shadow-lg ring-2 ring-primary/30"
                  )}
                  onMouseEnter={() => setHoveredTermId(termId)}
                  onMouseLeave={() => setHoveredTermId(null)}
                >
                  {/* Selection indicator for entire term */}
                  {isFullySelected && (
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-2 bg-primary z-10"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ transformOrigin: 'left' }}
                    />
                  )}
                  
                  <motion.div
                    className={cn(
                      "relative pt-0 pb-4 pl-8 pr-4 cursor-pointer select-none rounded-t-lg",
                      "bg-gray-50 dark:bg-[#404040]",
                      hasOutstanding && "hover:bg-gray-100 dark:hover:bg-[#505050]",
                      isFullySelected && "bg-primary/10 dark:bg-primary/20"
                    )}
                    onClick={() => hasOutstanding && handleSelectAllInTerm(termId)}
                    whileTap={hasOutstanding ? { scale: 0.995 } : {}}
                  >
                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center gap-3">
                        <AnimatePresence mode="wait">
                          {hasOutstanding && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className={cn(
                                "h-5 w-5 rounded-md border-2 flex items-center justify-center",
                                isFullySelected ? "border-primary bg-primary" : "border-gray-400 dark:border-gray-600 bg-white dark:bg-[#505050]",
                                isPartiallySelected && "border-primary bg-primary/20",
                                hoveredTermId === termId && !isFullySelected && "border-primary/50 shadow-sm"
                              )}
                            >
                              {(isFullySelected || isPartiallySelected) && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.1 }}
                                >
                                  <Check className="h-3 w-3 text-white" />
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {termName}
                            {hoveredTermId === termId && hasOutstanding && (
                              <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-xs text-gray-500 dark:text-gray-400"
                              >
                                Click to select all
                              </motion.span>
                            )}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                            <span>Due: {formatIndianCurrency(termTotal)}</span>
                            <span>Paid: {formatIndianCurrency(termPaid)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {termTotal === 0 && (
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Fully Paid
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                  
                  <CardContent className=" bg-white dark:bg-[#303030] -mt-6 px-0">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {termFees.map((fee, index) => {
                        const isSelected = selectedFeeIds.has(fee.id);
                        const isSelectable = fee.outstandingAmount > 0;
                        
                        return (
                          <motion.div
                            key={fee.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "relative transition-all duration-200 cursor-pointer select-none",
                              isSelectable && hoveredFeeId === fee.id && !isSelected && "ring-1 ring-primary/20 ring-inset",
                              !isSelectable && "opacity-60 cursor-not-allowed",
                              index === termFees.length - 1 && "rounded-b-lg overflow-hidden"
                            )}
                            onClick={() => isSelectable && handleFeeSelection(fee.id)}
                            onMouseEnter={() => setHoveredFeeId(fee.id)}
                            onMouseLeave={() => setHoveredFeeId(null)}
                          >
                            {/* Selection indicator bar */}
                            {isSelected && (
                              <motion.div
                                className="absolute left-0 top-0 bottom-0 w-2 bg-primary z-10"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                style={{ transformOrigin: 'left' }}
                              />
                            )}
                            
                            <div className={cn(
                              "pl-8 pr-4 py-4 transition-colors duration-200",
                              isSelected && "bg-primary/5 dark:bg-primary/10",
                              hoveredFeeId === fee.id && isSelectable && !isSelected && "bg-gray-50 dark:bg-[#404040]",
                              !isSelectable && "bg-gray-50/50 dark:bg-[#404040]/50",
                              index === termFees.length - 1 && "rounded-b-lg"
                            )}>
                            <div className="flex items-start gap-3">
                              <AnimatePresence mode="wait">
                                {isSelectable && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 180 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                    className={cn(
                                      "mt-1 h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
                                      isSelected ? "border-primary bg-primary" : "border-gray-400 dark:border-gray-600 bg-white dark:bg-[#505050]",
                                      hoveredFeeId === fee.id && !isSelected && "border-primary/50 shadow-sm"
                                    )}
                                  >
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.1 }}
                                      >
                                        <Check className="h-3 w-3 text-white" />
                                      </motion.div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                      {fee.feeHeadName}
                                      {hoveredFeeId === fee.id && isSelectable && (
                                        <motion.span
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="text-xs text-primary"
                                        >
                                          <Sparkles className="h-3 w-3" />
                                        </motion.span>
                                      )}
                                    </p>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Badge 
                                        variant={fee.status === 'Paid' ? 'secondary' : fee.status === 'Overdue' ? 'destructive' : 'outline'}
                                        className={cn(
                                          "text-xs",
                                          fee.status === 'Paid' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
                                          fee.status === 'Overdue' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
                                          fee.status === 'Pending' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
                                          fee.status === 'Partially Paid' && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                                        )}
                                      >
                                        {fee.status}
                                      </Badge>
                                      
                                      {fee.appliedConcessions && fee.appliedConcessions.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {fee.appliedConcessions.map((concession, idx) => (
                                            <Badge 
                                              key={idx}
                                              className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                            >
                                              <Gift className="h-3 w-3 mr-1" />
                                              {concession.name}
                                              {concession.type === 'PERCENTAGE' ? (
                                                <span className="ml-1">({concession.value}%)</span>
                                              ) : (
                                                <span className="ml-1">({formatIndianCurrency(concession.value)})</span>
                                              )}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                      
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        Due: {new Date(fee.dueDate).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                    
                                    {/* Concession Details */}
                                    {fee.appliedConcessions && fee.appliedConcessions.length > 0 && (
                                      <motion.div 
                                        className="mt-3 p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                      >
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                                          Concession Applied:
                                        </p>
                                        <div className="space-y-1">
                                          {fee.appliedConcessions.map((concession, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                              <span className="text-blue-600 dark:text-blue-300">
                                                {concession.name}
                                                {concession.reason && (
                                                  <span className="text-blue-500/70 dark:text-blue-400/70 ml-1">
                                                    ({concession.reason})
                                                  </span>
                                                )}
                                              </span>
                                              <span className="font-medium text-blue-700 dark:text-blue-400">
                                                -{formatIndianCurrency(concession.amount)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </div>
                                  
                                  <div className="text-right ml-4">
                                    {fee.concessionAmount && fee.concessionAmount > 0 && (
                                      <div className="mb-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                          {formatIndianCurrency(fee.originalAmount || 0)}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center justify-end gap-1">
                                          <TrendingDown className="h-3 w-3" />
                                          {formatIndianCurrency(fee.concessionAmount)}
                                        </p>
                                      </div>
                                    )}
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(fee.totalAmount)}</p>
                                    {fee.paidAmount > 0 && (
                                      <p className="text-xs text-green-600 dark:text-green-400">
                                        Paid: {formatIndianCurrency(fee.paidAmount)}
                                      </p>
                                    )}
                                    {fee.outstandingAmount > 0 && (
                                      <motion.p 
                                        className="text-sm font-medium text-red-600 dark:text-red-400"
                                        animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                      >
                                        Due: {formatIndianCurrency(fee.outstandingAmount)}
                                      </motion.p>
                                    )}
                                  </div>
                                </div>
                                
                                {selectedFeeIds.has(fee.id) && adjustmentMode === 'manual' && (
                                  <motion.div 
                                    className="mt-3"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                  >
                                    <Label className="text-xs text-gray-700 dark:text-gray-300">Custom Amount</Label>
                                    <Input
                                      type="number"
                                      value={customAmounts[fee.id] || ''}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setCustomAmounts({
                                          ...customAmounts,
                                          [fee.id]: e.target.value
                                        });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder={fee.outstandingAmount.toString()}
                                      className="mt-1 h-8 text-sm bg-white dark:bg-[#404040] border-gray-300 dark:border-gray-600"
                                      max={fee.outstandingAmount}
                                      min={0}
                                    />
                                  </motion.div>
                                )}
                              </div>
                            </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Payment Details Card (Desktop Only) */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#303030] shadow-sm hidden lg:block rounded-lg overflow-hidden pt-0 pb-6">
          <CardHeader className="bg-gray-50 dark:bg-[#404040] border-b border-gray-200 dark:border-gray-700 rounded-t-lg pt-7">
            <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 bg-white dark:bg-[#303030] pt-4">
            {/* Payment Mode Selection */}
            <div>
              <Label className="text-sm mb-2 text-gray-700 dark:text-gray-300">Payment Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <motion.button
                      key={mode.value}
                      onClick={() => setPaymentMode(mode.value)}
                      className={cn(
                        "p-3 rounded-md border-2 transition-all flex items-center justify-center gap-2",
                        paymentMode === mode.value
                          ? "border-primary bg-primary/10 dark:bg-primary/20"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#404040] hover:bg-gray-50 dark:hover:bg-[#505050]"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{mode.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Transaction Reference */}
            {paymentMode !== 'Cash' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Label htmlFor="transactionRef" className="text-sm text-gray-700 dark:text-gray-300">
                  Transaction Reference
                </Label>
                <Input
                  id="transactionRef"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Enter reference number"
                  className="mt-1 bg-white dark:bg-[#404040] border-gray-300 dark:border-gray-600"
                />
              </motion.div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm text-gray-700 dark:text-gray-300">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes"
                className="mt-1 bg-white dark:bg-[#404040] border-gray-300 dark:border-gray-600"
                rows={3}
              />
            </div>

            {/* Payment Summary */}
            <motion.div 
              className="p-4 rounded-md bg-gray-50 dark:bg-[#404040] border border-gray-200 dark:border-gray-600 space-y-2"
              animate={selectedFeeIds.size > 0 ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>Selected Items</span>
                <span className="font-medium">{selectedFeeIds.size}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-gray-100">
                <span>Total Amount</span>
                <span className="text-primary">{formatIndianCurrency(selectedFeesTotal)}</span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleCollectPayment}
                disabled={selectedFeeIds.size === 0 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Collect Payment
                  </>
                )}
              </Button>
              
              {selectedFeeIds.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFeeIds(new Set());
                    setCustomAmounts({});
                  }}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-[#404040] hover:bg-gray-50 dark:hover:bg-[#505050]"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Payment Summary Card (Document Flow) */}
      <AnimatePresence>
        {isAtPageEnd && selectedFeeIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden mt-6"
          >
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#303030] shadow-lg overflow-hidden rounded-lg">
              {/* Card Header */}
              <div className="bg-gray-50 dark:bg-[#404040] px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Complete Payment
                  </h3>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "40px" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full"
                  />
                </div>
              </div>
              
              {/* Card Content */}
              <div className="p-6 space-y-6">
                {/* Selected Fees Summary */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Items</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-50 dark:bg-[#404040] p-3 rounded-md">
                    {feeItems
                      .filter(item => selectedFeeIds.has(item.id))
                      .map(fee => (
                        <div key={fee.id} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{fee.feeHeadName}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {formatIndianCurrency(
                              adjustmentMode === 'manual' && customAmounts[fee.id]
                                ? parseFloat(customAmounts[fee.id] || '0')
                                : fee.outstandingAmount
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-gray-900 dark:text-gray-100">Total Amount</span>
                      <span className="text-primary">{formatIndianCurrency(selectedFeesTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Mode Selection */}
                <div>
                  <Label className="text-sm mb-3 text-gray-700 dark:text-gray-300">Payment Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentModes.slice(0, 6).map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <motion.button
                          key={mode.value}
                          onClick={() => setPaymentMode(mode.value)}
                          className={cn(
                            "p-3 rounded-md border-2 transition-all flex items-center justify-center gap-2 text-sm",
                            paymentMode === mode.value
                              ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#404040] hover:bg-gray-50 dark:hover:bg-[#505050] text-gray-700 dark:text-gray-300"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{mode.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Transaction Reference */}
                {paymentMode !== 'Cash' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Label htmlFor="card-transactionRef" className="text-sm text-gray-700 dark:text-gray-300">
                      Transaction Reference
                    </Label>
                    <Input
                      id="card-transactionRef"
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      placeholder="Enter reference number"
                      className="mt-2 bg-white dark:bg-[#404040] border-gray-300 dark:border-gray-600"
                    />
                  </motion.div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="card-notes" className="text-sm text-gray-700 dark:text-gray-300">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="card-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes"
                    className="mt-2 bg-white dark:bg-[#404040] border-gray-300 dark:border-gray-600"
                    rows={2}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleCollectPayment}
                      disabled={isProcessing}
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Receipt className="mr-2 h-4 w-4" />
                          Complete Payment
                        </>
                      )}
                    </Button>
                  </motion.div>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFeeIds(new Set());
                      setCustomAmounts({});
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="h-12 px-6 border-gray-300 dark:border-gray-600 bg-white dark:bg-[#404040] hover:bg-gray-50 dark:hover:bg-[#505050]"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sticky Footer */}
      <AnimatePresence>
        {selectedFeeIds.size > 0 && showMobileFooter && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-[#303030] border-t border-gray-200 dark:border-gray-700 h-20"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{selectedFeeIds.size} items selected</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(selectedFeesTotal)}</p>
                </div>
                <Button
                  onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
                  size="sm"
                  className="shadow-lg"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showConcessionModal && onAssignConcession && (
        <StudentConcessionFormModal
          isOpen={showConcessionModal}
          onClose={() => setShowConcessionModal(false)}
          students={[student as any]}
          selectedStudentId={student.id}
          concessionTypes={concessionTypes}
          feeHeads={feeHeads}
          feeTerms={feeTerms}
          onSubmit={onAssignConcession}
        />
      )}
    </>
  );
}