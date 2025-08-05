"use client";


import dynamic from "next/dynamic";
import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { DateRange } from 'react-day-picker';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardAction, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { DateRangeSelector } from '@/components/ui/date-range-selector';
import { 
  Download, 
  Calendar,
  CreditCard,
  Receipt,
  Users,
  Search,
  Filter,
  MoreVertical,
  Printer,
  Eye,
  ArrowUpDown,
  FileText,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Table2,
  Loader2,
  Edit3,
  Trash2,
  Save,
  X,
  IndianRupee
} from 'lucide-react';
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';
import { formatIndianCurrency } from '@/lib/utils';
import { PaymentStatusBadge } from '@/components/finance/payment-status-indicator';
import type { PaymentHistoryItem, PaymentGateway } from '@/types/payment-gateway';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printFeeReceiptDirectly } from '@/utils/receipt-print';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

// Form schema for editing payments
const editPaymentSchema = z.object({
  receiptNumber: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  paymentMode: z.string().min(1, "Payment mode is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
});

// Enhanced Payment Statistics Card Component
function PaymentStatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  percentage,
  isLoading = false
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  trend?: { value: number; type: 'increase' | 'decrease' | 'neutral' };
  percentage?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-[#7AAD8B]" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="@container/card *:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {trend && (
          <CardAction>
            <Badge variant="outline" className={trend.value >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {trend.value >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {trend.value >= 0 ? "+" : ""}{trend.value}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          <Icon className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
          {subtitle}
        </div>
        {percentage && (
          <div className="text-muted-foreground">
            {percentage}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// Modern Payment Card Component
function PaymentCard({ 
  payment, 
  onViewDetails, 
  onEdit, 
  onDelete, 
  onPrint 
}: { 
  payment: PaymentHistoryItem; 
  onViewDetails: (payment: PaymentHistoryItem) => void;
  onEdit: (payment: PaymentHistoryItem) => void;
  onDelete: (payment: PaymentHistoryItem) => void;
  onPrint: (payment: PaymentHistoryItem) => void;
}) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'cash':
        return <IndianRupee className="h-4 w-4 text-green-600" />;
      case 'upi':
      case 'online':
        return <Smartphone className="h-4 w-4 text-blue-600" />;
      case 'card':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border border-border/50 hover:border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getPaymentIcon(payment.paymentMode || 'ONLINE')}
            <Badge variant={payment.type === 'gateway' ? 'default' : 'secondary'} className="text-xs">
              {payment.type === 'gateway' ? 'Gateway' : 'Manual'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(payment.status)}
            <span className="text-xs text-muted-foreground">
              {payment.paymentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-foreground">{payment.studentName}</p>
              <p className="text-xs text-muted-foreground font-mono">{payment.studentAdmissionNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-primary">{formatIndianCurrency(payment.amount)}</p>
              {/* Class and section info not available */}
            </div>
          </div>

          <div className="border-t border-border/50 pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{payment.feeTermName}</p>
                {payment.receiptNumber && (
                  <p className="text-xs font-mono text-foreground">#{payment.receiptNumber}</p>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(payment)}
                  className="h-7 px-2 text-xs hover:bg-primary/5"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(payment)}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPrint(payment)}
                  disabled={!payment.receiptNumber}
                  className="h-7 px-2 text-xs"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(payment)}
                  className="h-7 px-2 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Payment Table Component
function PaymentTable({ 
  payments, 
  onViewDetails, 
  onEdit, 
  onDelete, 
  onPrint 
}: { 
  payments: PaymentHistoryItem[]; 
  onViewDetails: (payment: PaymentHistoryItem) => void;
  onEdit: (payment: PaymentHistoryItem) => void;
  onDelete: (payment: PaymentHistoryItem) => void;
  onPrint: (payment: PaymentHistoryItem) => void;
}) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'cash':
        return <IndianRupee className="h-4 w-4 text-green-600" />;
      case 'upi':
      case 'online':
        return <Smartphone className="h-4 w-4 text-blue-600" />;
      case 'card':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden sm:table-cell">Class</TableHead>
            <TableHead>Payment Details</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-[180px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment, index) => (
            <TableRow key={`table-${payment.studentAdmissionNumber}-${payment.paymentDate.getTime()}-${payment.receiptNumber || payment.transactionId || index}`} className="hover:bg-muted/50">
              <TableCell>
        <div className="text-center">
                  <div className="font-mono text-sm font-semibold">
            {payment.paymentDate.toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            {payment.paymentDate.toLocaleDateString('en-IN', { 
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>
      </TableCell>

              <TableCell>
                <div>
                  <div className="font-semibold text-sm">{payment.studentName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{payment.studentAdmissionNumber}</div>
          <div className="text-xs text-muted-foreground sm:hidden mt-1">
            {/* Class and section info not available */}
          </div>
        </div>
      </TableCell>

              <TableCell className="hidden sm:table-cell">
        <div className="text-sm">
                  {/* <div className="font-medium">{payment.className}</div> */}
          {/* <div className="text-muted-foreground">{payment.sectionName}</div> */}
        </div>
      </TableCell>

              <TableCell>
                <div className="space-y-1">
            <div className="flex items-center gap-2">
                    {getPaymentIcon(payment.paymentMode || 'ONLINE')}
                    <span className="text-sm font-medium">{payment.feeTermName}</span>
              </div>
                  <div className="text-xs text-muted-foreground">
              via {payment.paymentMode}
            </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={payment.type === 'gateway' ? 'default' : 'secondary'} className="text-xs h-4 px-1.5">
                      {payment.type === 'gateway' ? 'Gateway' : 'Manual'}
                    </Badge>
                  <div className="flex items-center gap-1">
                      {getStatusIcon(payment.status)}
                      <span className="text-xs">{payment.status}</span>
                  </div>
                  </div>
                  {payment.receiptNumber && (
                    <div className="text-xs font-mono text-muted-foreground">
                      #{payment.receiptNumber}
              </div>
            )}
        </div>
      </TableCell>

              <TableCell className="text-right">
        <div className="font-bold text-lg text-primary">
          {formatIndianCurrency(payment.amount)}
        </div>
      </TableCell>

                            <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(payment)}
                    className="h-7 px-2 text-xs hover:bg-primary/5"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(payment)}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPrint(payment)}
                    disabled={!payment.receiptNumber}
                    className="h-7 px-2 text-xs"
                  >
                    <Printer className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(payment)}
                    className="h-7 px-2 text-xs"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
    </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Enhanced Payment Details Modal with Edit/Delete functionality
function PaymentDetailsModal({ 
  payment, 
  isOpen, 
  onClose,
  onPaymentUpdated,
  onPrint
}: { 
  payment: PaymentHistoryItem | null; 
  isOpen: boolean; 
  onClose: () => void;
  onPaymentUpdated?: () => void;
  onPrint: (payment: PaymentHistoryItem) => void;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<z.infer<typeof editPaymentSchema>>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      receiptNumber: payment?.receiptNumber || '',
      transactionId: payment?.transactionId || '',
      notes: '',
      paymentMode: payment?.paymentMode || '',
      amount: payment?.amount || 0,
    },
  });

  // Reset form when payment changes
  useEffect(() => {
    if (payment) {
      form.reset({
        receiptNumber: payment.receiptNumber || '',
        transactionId: payment.transactionId || '',
        notes: '',
        paymentMode: payment.paymentMode || '',
        amount: payment.amount || 0,
      });
    }
  }, [payment, form]);

  // API mutations (placeholder - these would need to be implemented in the backend)
  const updatePaymentMutation = {
    mutate: (data: any) => {
      // Placeholder for update mutation
      console.log('Update payment:', data);
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Payment updated successfully",
          variant: "success",
        });
        setIsEditing(false);
        onPaymentUpdated?.();
      }, 1000);
    },
    isLoading: false
  };

  const deletePaymentMutation = {
    mutate: (data: any) => {
      // Placeholder for delete mutation
      console.log('Delete payment:', data);
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Payment deleted successfully",
          variant: "success",
        });
        setShowDeleteDialog(false);
        onClose();
        onPaymentUpdated?.();
      }, 1000);
    },
    isLoading: false
  };

  const handleEditSubmit = (data: z.infer<typeof editPaymentSchema>) => {
    if (!payment) return;

    updatePaymentMutation.mutate({
      id: payment.id || payment.receiptNumber!, // Use receipt number as fallback ID
      receiptNumber: data.receiptNumber,
      transactionId: data.transactionId,
      notes: data.notes,
      paymentMode: data.paymentMode,
      amount: data.amount,
    });
  };

  const handleDelete = () => {
    if (!payment) return;
    
    setIsDeleting(true);
    deletePaymentMutation.mutate({
      id: payment.id || payment.receiptNumber!, // Use receipt number as fallback ID
    });
  };

  const handleClose = () => {
    setIsEditing(false);
    setShowDeleteDialog(false);
    onClose();
  };

  if (!payment) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {isEditing ? 'Edit Payment' : 'Payment Details'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modify payment information' : 'Complete transaction information'} for {payment.studentName}
            </DialogDescription>
          </DialogHeader>

          {/* Action Bar - Only show in view mode */}
          {!isEditing && (
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  Available Actions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 hover:bg-primary/5 hover:border-primary/30"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit Payment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/30"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Payment
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isEditing ? (
            /* Edit Form */
            <div>
              {/* Edit Mode Indicator */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Edit3 className="h-4 w-4" />
                  Edit Mode - Make your changes below
                </div>
              </div>
              
              <Form form={form} {...form}>
                <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-6">
                {/* Student Information (Read-only) */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Student Information (Read-only)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{payment.studentName}</p>
              </div>
                    <div>
                      <p className="text-muted-foreground">Admission Number</p>
                      <p className="font-mono">{payment.studentAdmissionNumber}</p>
            </div>
                    <div>
                      <p className="text-muted-foreground">Class</p>
                      {/* <p className="font-medium">{payment.className}</p> */}
          </div>
                    <div>
                      <p className="text-muted-foreground">Section</p>
                      {/* <p className="font-medium">{payment.sectionName}</p> */}
            </div>
          </div>
        </div>
        
                {/* Editable Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                            <SelectItem value="Online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receiptNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter receipt number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transactionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter transaction ID" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
            </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add any additional notes..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    type="submit"
                    disabled={updatePaymentMutation.isLoading}
                    className="flex-1"
                  >
                    {updatePaymentMutation.isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Changes
                  </Button>
                </div>
              </form>
            </Form>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Student Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{payment.studentName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Admission Number</p>
                    <p className="font-mono">{payment.studentAdmissionNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Class</p>
                    {/* <p className="font-medium">{payment.className}</p> */}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Section</p>
                    {/* <p className="font-medium">{payment.sectionName}</p> */}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      Amount Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-bold text-primary">{formatIndianCurrency(payment.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee Terms</span>
                      <span className="font-medium text-right">{payment.feeTermName}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Transaction Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Mode</span>
                      <span className="font-medium">{payment.paymentMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant={payment.type === 'gateway' ? 'default' : 'secondary'} className="text-xs">
                        {payment.type === 'gateway' ? 'Gateway' : 'Manual'}
                      </Badge>
            </div>
            {payment.gateway && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gateway</span>
                        <span className="font-medium">{payment.gateway}</span>
              </div>
            )}
                  </CardContent>
                </Card>
              </div>

              {/* Receipt & Transaction IDs */}
              {(payment.receiptNumber || payment.transactionId) && (
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Receipt Information
                  </h4>
                  <div className="space-y-2 text-sm">
            {payment.receiptNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Receipt Number</span>
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {payment.receiptNumber}
                        </code>
              </div>
            )}
            {payment.transactionId && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Transaction ID</span>
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                  {payment.transactionId}
                        </code>
              </div>
            )}
                  </div>
              </div>
            )}

              {/* Notes */}
              {false && (
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground"></p>
          </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => onPrint(payment)}
                  disabled={!payment.receiptNumber}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button variant="default" onClick={handleClose} className="flex-1">
                  Close
                </Button>
          </div>
        </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record for {payment.studentName}? 
              This action cannot be undone and will permanently remove the payment of {formatIndianCurrency(payment.amount)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Main Component
function PaymentHistoryPageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(102);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentModeFilter, typeFilter, gatewayFilter, dateRange, pageSize]);

  // Get payment history
  const { data: paymentHistory, isLoading, error: historyError, refetch: refetchHistory } = api.paymentGateway.getPaymentHistory.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      ...(dateRange?.from && { startDate: dateRange.from }),
      ...(dateRange?.to && { endDate: dateRange.to }),
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Get payment statistics
  // TODO: Replace with actual statistics query when available
  const { data: statistics, error: statsError, refetch: refetchStats } = { 
    data: null, 
    error: null, 
    refetch: () => {} 
  } as any;

  // Handle payment updates (refetch data)
  const handlePaymentUpdated = async () => {
    await Promise.all([
      refetchHistory(),
      refetchStats()
    ]);
  };

  // Filter and process data with pagination
  const { filteredPayments, totalPages, totalFilteredItems } = useMemo(() => {
    const items = paymentHistory?.items || [];
    
    // Apply all filters first
    const filtered = items.filter(payment => {
      const matchesSearch = !searchTerm || 
        payment.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentAdmissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      const matchesMode = paymentModeFilter === 'all' || payment.paymentMode === paymentModeFilter;
      const matchesType = typeFilter === 'all' || payment.type === typeFilter;
      const matchesGateway = gatewayFilter === 'all' || payment.gateway === gatewayFilter;

      return matchesSearch && matchesStatus && matchesMode && matchesType && matchesGateway;
    });

    // Apply pagination
    const totalFilteredItems = filtered.length;
    const totalPages = Math.ceil(totalFilteredItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
    
    return {
      filteredPayments: paginatedData,
      totalPages,
      totalFilteredItems
    };
  }, [paymentHistory, searchTerm, statusFilter, paymentModeFilter, typeFilter, gatewayFilter, currentPage, pageSize]);

  // Export CSV function (exports all filtered data, not just current page)
  const handleExport = () => {
    const items = paymentHistory?.items || [];
    
    // Apply same filters as the main filter logic but without pagination
    const allFilteredItems = items.filter(payment => {
      const matchesSearch = !searchTerm || 
        payment.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.studentAdmissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      const matchesMode = paymentModeFilter === 'all' || payment.paymentMode === paymentModeFilter;
      const matchesType = typeFilter === 'all' || payment.type === typeFilter;
      const matchesGateway = gatewayFilter === 'all' || payment.gateway === gatewayFilter;

      return matchesSearch && matchesStatus && matchesMode && matchesType && matchesGateway;
    });

    if (!allFilteredItems.length) return;

    const csvData = allFilteredItems.map(payment => ({
      'Date': payment.paymentDate.toLocaleDateString('en-IN'),
      'Time': payment.paymentDate.toLocaleTimeString('en-IN'),
      'Student Name': payment.studentName || '',
      'Admission Number': payment.studentAdmissionNumber || '',
      // 'Class': payment.className || '',
      // 'Section': payment.sectionName || '',
      'Fee Terms': payment.feeTermName || '',
      'Amount': payment.amount.toString(),
      'Payment Mode': payment.paymentMode || '',
      'Type': payment.type || '',
      'Status': payment.status || '',
      'Receipt Number': payment.receiptNumber || '',
      'Transaction ID': payment.transactionId || '',
      'Gateway': payment.gateway || '',
      'Notes': ''
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle payment details view
  const handleViewDetails = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  // Handle edit payment
  const handleEditPayment = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
    // The modal will handle switching to edit mode
    setTimeout(() => {
      // This would trigger edit mode in the modal
    }, 100);
  };

  // Handle delete payment
  const handleDeletePayment = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
    // Show delete confirmation directly
    setTimeout(() => {
      if (window.confirm(`Are you sure you want to delete the payment of ${formatIndianCurrency(payment.amount)} for ${payment.studentName}?`)) {
        // Placeholder for delete logic
        console.log('Delete payment:', payment);
        toast({
          title: "Success",
          description: "Payment deleted successfully",
          variant: "success",
        });
        handlePaymentUpdated();
      }
    }, 100);
  };

  // Get tRPC utils for imperative API calls
  const utils = api.useContext();

  // Handle print receipt
  const handlePrintReceipt = async (payment: PaymentHistoryItem) => {
    if (!payment.receiptNumber) {
              toast({
          title: "Print Error",
          description: "No receipt number available for printing",
          variant: "destructive",
        });
      return;
    }

    try {
      // Fetch complete fee collection data using tRPC utils
      const feeCollectionData = await utils.finance.getFeeCollectionByReceiptNumber.fetch({
        receiptNumber: payment.receiptNumber,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      // Prepare receipt data in the format expected by printFeeReceiptDirectly
      const receiptData = {
        receiptData: {
          receiptNumber: feeCollectionData.receiptNumber,
          paymentDate: new Date(feeCollectionData.paymentDate),
          paymentMode: feeCollectionData.paymentMode,
          transactionReference: feeCollectionData.transactionReference || undefined,
          notes: feeCollectionData.notes || undefined,
        },
        student: {
          firstName: feeCollectionData.student?.firstName || '',
          lastName: feeCollectionData.student?.lastName || '',
          admissionNumber: feeCollectionData.student?.admissionNumber || '',
          section: {
            name: feeCollectionData.student?.section?.name,
            class: {
              name: feeCollectionData.student?.section?.class?.name || 'N/A',
            },
          },
          parent: {
            firstName: undefined, // Parent doesn't have firstName/lastName in this schema
            lastName: undefined,
            fatherName: feeCollectionData.student?.parent?.fatherName || undefined,
            motherName: feeCollectionData.student?.parent?.motherName || undefined,
          },
        },
        branch: {
          name: feeCollectionData.branch?.name || 'School Name',
          address: feeCollectionData.branch?.address || undefined,
          city: feeCollectionData.branch?.city || undefined,
          state: feeCollectionData.branch?.state || undefined,
          logoUrl: feeCollectionData.branch?.logoUrl || undefined,
        },
        session: {
          name: feeCollectionData.session?.name || 'Academic Session',
        },
        feeItems: feeCollectionData.items?.map((item: any) => ({
          feeHeadName: item.feeHead?.name || 'Fee',
          feeTermName: item.feeTerm?.name || 'Term',
          originalAmount: item.amount || 0,
          concessionAmount: 0, // Add concession logic if needed
          finalAmount: item.amount || 0,
          appliedConcessions: [], // Add concession logic if needed
        })) || [],
        totals: {
          totalOriginalAmount: feeCollectionData.totalAmount || 0,
          totalConcessionAmount: 0,
          totalNetAmount: feeCollectionData.totalAmount || 0,
          totalPaidAmount: feeCollectionData.paidAmount || feeCollectionData.totalAmount || 0,
        },
      };

      // Call the print function
      printFeeReceiptDirectly(receiptData);
      toast({
        title: "Success",
        description: "Receipt sent to printer",
        variant: "success",
      });
    } catch (error) {
      console.error('Failed to fetch receipt data:', error);
      toast({
        title: "Print Error", 
        description: "Failed to fetch receipt data for printing",
        variant: "destructive",
      });
    }
  };

  // Get unique filter options
  const getFilterOptions = () => {
    const items = paymentHistory?.items || [];
    return {
      statuses: [...new Set(items.map(p => p.status).filter(Boolean))] as string[],
      modes: [...new Set(items.map(p => p.paymentMode).filter(Boolean))] as string[],
      gateways: [...new Set(items.map(p => p.gateway).filter(Boolean))] as string[]
    };
  };

  const filterOptions = getFilterOptions();

  // Error handling
  if (historyError || statsError) {
    return (
      <PageWrapper title="Payment History" subtitle="Comprehensive view of all payment transactions">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <p className="font-medium">Error loading payment data</p>
              <p className="text-sm">{historyError?.message || statsError?.message}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Payment History" subtitle="Comprehensive view of all payment transactions">
      {/* Enhanced Statistics Section */}
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mb-8">
        <PaymentStatsCard
          title="Total Amount"
          value={statistics ? formatIndianCurrency(statistics.totalAmount) : "₹0"}
          subtitle="All payments combined"
          icon={IndianRupee}
          percentage={statistics ? "Total across all payment methods" : "No payments found"}
          isLoading={!statistics}
        />
        <PaymentStatsCard
          title="Total Transactions"
          value={statistics ? statistics.totalTransactions.toLocaleString('en-IN') : "0"}
          subtitle="Transaction Count"
          icon={Users}
          percentage={statistics ? `${statistics.manualTransactions || 0} manual + ${statistics.gatewayTransactions || 0} gateway` : "No transactions found"}
          isLoading={!statistics}
        />
        <PaymentStatsCard
          title="Manual Payments"
          value={statistics ? formatIndianCurrency(statistics.manualAmount) : "₹0"}
          subtitle="Cash & Manual Entries"
          icon={IndianRupee}
          percentage={statistics ? `${statistics.manualTransactions || 0} transactions` : "No manual payments"}
          isLoading={!statistics}
        />
        <PaymentStatsCard
          title="Gateway Payments"
          value={statistics ? formatIndianCurrency(statistics.gatewayAmount) : "₹0"}
          subtitle="Online & Digital Payments"
          icon={CreditCard}
          percentage={statistics ? `${statistics.gatewayTransactions || 0} transactions` : "No gateway payments"}
          isLoading={!statistics}
        />
        </div>

      {/* Enhanced Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
              <CardTitle className="text-lg">Payment Transactions</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading payments...' : 
                 totalFilteredItems > 0 ? 
                   `Showing ${filteredPayments.length} of ${totalFilteredItems} payments (Page ${currentPage} of ${totalPages})` : 
               'No payments found for the selected criteria'}
            </CardDescription>
          </div>
            <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
                disabled={!totalFilteredItems}
                size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, admission number, receipt, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                    {filterOptions.statuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </div>
                
              <div className="space-y-2">
                <Label className="text-xs font-medium">Payment Mode</Label>
                  <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                    {filterOptions.modes.map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </div>
                
              <div className="space-y-2">
                <Label className="text-xs font-medium">Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="gateway">Gateway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
              <div className="space-y-2">
                <Label className="text-xs font-medium">Gateway</Label>
                  <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Gateways</SelectItem>
                    {filterOptions.gateways.map(gateway => (
                      <SelectItem key={gateway} value={gateway}>{gateway}</SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Date Range</Label>
                <div className="flex gap-2">
                  <DateRangeSelector
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Select date range"
                    className="h-9 flex-1"
                  />
                  {dateRange?.from && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange(undefined)}
                      className="h-9 px-2"
                      title="Clear date range"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium">View</Label>
                <Select value={viewMode} onValueChange={(value: 'cards' | 'table') => setViewMode(value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cards">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-3 w-3" />
                        Cards
            </div>
                    </SelectItem>
                    <SelectItem value="table">
                      <div className="flex items-center gap-2">
                        <Table2 className="h-3 w-3" />
                        Table
          </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
          </div>
          
              <div className="space-y-2">
                <Label className="text-xs font-medium">Items per page</Label>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                  <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="12">12 per page</SelectItem>
                    <SelectItem value="24">24 per page</SelectItem>
                    <SelectItem value="48">48 per page</SelectItem>
                    <SelectItem value="102">102 per page</SelectItem>
                    <SelectItem value="150">150 per page</SelectItem>
                    <SelectItem value="204">204 per page</SelectItem>
                    <SelectItem value="306">306 per page</SelectItem>
                    <SelectItem value="500">500 per page</SelectItem>
                    <SelectItem value="1000">1000 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </div>
              </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading payments...</p>
                </div>
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payments found</h3>
            <p className="text-muted-foreground text-center">
              Try adjusting your search criteria or filters to find more payments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Payment List */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPayments.map((payment, index) => (
                <PaymentCard
                  key={`${payment.studentAdmissionNumber}-${payment.paymentDate.getTime()}-${payment.receiptNumber || payment.transactionId || index}`}
                  payment={payment}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEditPayment}
                  onDelete={handleDeletePayment}
                  onPrint={handlePrintReceipt}
                />
              ))}
            </div>
          ) : (
            <PaymentTable
              payments={filteredPayments}
              onViewDetails={handleViewDetails}
              onEdit={handleEditPayment}
              onDelete={handleDeletePayment}
              onPrint={handlePrintReceipt}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalFilteredItems)} of {totalFilteredItems} payments
                  </div>
                  
                  <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="h-8 w-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
        </CardContent>
      </Card>
          )}
        </div>
      )}

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        payment={selectedPayment}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedPayment(null);
        }}
        onPaymentUpdated={handlePaymentUpdated}
        onPrint={handlePrintReceipt}
      />
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicPaymentHistoryPageContent = dynamic(() => Promise.resolve(PaymentHistoryPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function PaymentHistoryPage() {
  return <DynamicPaymentHistoryPageContent />;
} 