"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Calculator, CreditCard, DollarSign, Calendar, Clock, Percent, Gift } from 'lucide-react';
import { calculateStudentFees, allocatePayment, generateFeeReminders, type FeeStructure, type PaymentRecord, type CalculatedFee } from "@/lib/fee-calculations";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    class?: {
      name: string;
    };
  };
  parent?: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
}

interface AdvancedFeeCollectionProps {
  student: Student;
  feeStructures: FeeStructure[];
  paymentRecords: PaymentRecord[];
  onCollectPayment: (paymentData: {
    studentId: string;
    allocations: Array<{
      feeHeadId: string;
      amount: number;
    }>;
    paymentMode: string;
    transactionReference?: string;
    paymentDate: Date;
    notes?: string;
  }) => Promise<void>;
  onGenerateReminder?: (reminders: Array<{
    feeHeadId: string;
    reminderType: string;
    message: string;
  }>) => void;
}

export function AdvancedFeeCollection({
  student,
  feeStructures,
  paymentRecords,
  onCollectPayment,
  onGenerateReminder,
}: AdvancedFeeCollectionProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [allocationStrategy, setAllocationStrategy] = useState<'oldest_first' | 'highest_amount_first' | 'equal_distribution'>('oldest_first');
  const [enableLateFees, setEnableLateFees] = useState(true);
  const [enableDiscounts, setEnableDiscounts] = useState(true);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});
  const [allocationMode, setAllocationMode] = useState<'automatic' | 'manual'>('automatic');

  // Calculate fees with business logic
  const calculatedFees = useMemo(() => {
    return calculateStudentFees(feeStructures, paymentRecords, {
      calculateLateFees: enableLateFees,
      applyDiscounts: enableDiscounts,
      gracePeriodDays,
      asOfDate: new Date(),
    });
  }, [feeStructures, paymentRecords, enableLateFees, enableDiscounts, gracePeriodDays]);

  // Filter outstanding fees
  const outstandingFees = useMemo(() => {
    return calculatedFees.filter(fee => fee.outstandingAmount > 0);
  }, [calculatedFees]);

  // Calculate payment allocations
  const paymentAllocations = useMemo(() => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) return [];

    if (allocationMode === 'manual') {
      // Manual allocation based on user inputs
      const allocations: Array<{
        feeHeadId: string;
        allocatedAmount: number;
        remainingOutstanding: number;
      }> = [];

      outstandingFees.forEach(fee => {
        const manualAmount = parseFloat(manualAllocations[fee.feeHeadId] || '0');
        if (manualAmount > 0) {
          const allocatedAmount = Math.min(manualAmount, fee.outstandingAmount);
          allocations.push({
            feeHeadId: fee.feeHeadId,
            allocatedAmount,
            remainingOutstanding: fee.outstandingAmount - allocatedAmount,
          });
        }
      });

      return allocations;
    } else {
      // Automatic allocation
      const feesToConsider = selectedFees.size > 0 
        ? outstandingFees.filter(fee => selectedFees.has(fee.feeHeadId))
        : outstandingFees;

      return allocatePayment(amount, feesToConsider, allocationStrategy);
    }
  }, [paymentAmount, outstandingFees, allocationStrategy, selectedFees, allocationMode, manualAllocations]);

  // Generate reminders
  const reminders = useMemo(() => {
    return generateFeeReminders(outstandingFees, {
      firstReminderDays: 7,
      secondReminderDays: 15,
      finalReminderDays: 30,
    });
  }, [outstandingFees]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalOutstanding = outstandingFees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
    const totalAllocated = paymentAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);
    const totalLateFees = calculatedFees.reduce((sum, fee) => sum + fee.lateFeeAmount, 0);
    const totalDiscounts = calculatedFees.reduce((sum, fee) => sum + fee.discountAmount, 0);

    return {
      totalOutstanding,
      totalAllocated,
      totalLateFees,
      totalDiscounts,
      unallocated: parseFloat(paymentAmount || '0') - totalAllocated,
    };
  }, [outstandingFees, paymentAllocations, calculatedFees, paymentAmount]);

  const handleFeeSelection = (feeHeadId: string, checked: boolean) => {
    const newSelection = new Set(selectedFees);
    if (checked) {
      newSelection.add(feeHeadId);
    } else {
      newSelection.delete(feeHeadId);
    }
    setSelectedFees(newSelection);
  };

  const handleManualAllocationChange = (feeHeadId: string, amount: string) => {
    setManualAllocations(prev => ({
      ...prev,
      [feeHeadId]: amount,
    }));
  };

  const handleCollectPayment = async () => {
    if (paymentAllocations.length === 0 || totals.totalAllocated === 0) {
      return;
    }

    const paymentData = {
      studentId: student.id,
      allocations: paymentAllocations.map(allocation => ({
        feeHeadId: allocation.feeHeadId,
        amount: allocation.allocatedAmount,
      })),
      paymentMode,
      transactionReference: transactionReference || undefined,
      paymentDate: new Date(paymentDate ?? ''),
      notes: notes || undefined,
    };

    await onCollectPayment(paymentData);

    // Reset form
    setPaymentAmount('');
    setTransactionReference('');
    setNotes('');
    setSelectedFees(new Set());
    setManualAllocations({});
  };

  const handleGenerateReminders = () => {
    if (reminders.length > 0 && onGenerateReminder) {
      onGenerateReminder(reminders.map(reminder => ({
        feeHeadId: reminder.feeHeadId,
        reminderType: reminder.reminderType,
        message: reminder.messageTemplate,
      })));
    }
  };

  const getStatusBadge = (status: CalculatedFee['status']) => {
    const variants = {
      'Paid': 'default',
      'Partially Paid': 'secondary',
      'Pending': 'outline',
      'Overdue': 'destructive',
    } as const;

    return (
      <Badge variant={variants[status]} className={status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Student Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fee Collection - {student.firstName} {student.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Admission No:</span> {student.admissionNumber}
            </div>
            <div>
              <span className="font-medium">Class:</span> {student.section?.class?.name || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Parent:</span> {student.parent ? `${student.parent.firstName} ${student.parent.lastName}` : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Contact:</span> {student.parent?.phone || 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-gray-600">Total Outstanding</p>
                <p className="text-lg font-bold text-red-600">₹{totals.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-gray-600">Late Fees</p>
                <p className="text-lg font-bold text-orange-600">₹{totals.totalLateFees.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-gray-600">Total Discounts</p>
                <p className="text-lg font-bold text-green-600">₹{totals.totalDiscounts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-gray-600">Payment Allocated</p>
                <p className="text-lg font-bold text-blue-600">₹{totals.totalAllocated.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fee-details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fee-details">Fee Details</TabsTrigger>
          <TabsTrigger value="payment-collection">Payment Collection</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="fee-details">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Fee Structure & Calculations</CardTitle>
                <div className="flex gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enable-late-fees" 
                      checked={enableLateFees}
                      onCheckedChange={(checked) => setEnableLateFees(checked as boolean)}
                    />
                    <Label htmlFor="enable-late-fees" className="text-xs">Calculate Late Fees</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enable-discounts" 
                      checked={enableDiscounts}
                      onCheckedChange={(checked) => setEnableDiscounts(checked as boolean)}
                    />
                    <Label htmlFor="enable-discounts" className="text-xs">Apply Discounts</Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Head</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Base Amount</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Late Fee</TableHead>
                      <TableHead>Final Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedFees.map((fee) => (
                      <TableRow key={`${fee.feeHeadId}-${fee.feeTermId}`}>
                        <TableCell className="font-medium">{fee.feeHeadName}</TableCell>
                        <TableCell>{fee.feeTermName}</TableCell>
                        <TableCell>₹{fee.baseAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">
                          {fee.discountAmount > 0 ? `-₹${fee.discountAmount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          {fee.lateFeeAmount > 0 ? `+₹${fee.lateFeeAmount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="font-medium">₹{fee.finalAmount.toLocaleString()}</TableCell>
                        <TableCell>₹{fee.paidAmount.toLocaleString()}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          ₹{fee.outstandingAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {new Date(fee.dueDate).toLocaleDateString()}
                            {fee.overdueDays > 0 && (
                              <div className="text-red-500 font-medium">
                                {fee.overdueDays} days overdue
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-collection">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Payment Collection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="payment-amount">Payment Amount (₹)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="allocation-mode">Allocation Mode</Label>
                  <Select value={allocationMode} onValueChange={(value: 'automatic' | 'manual') => setAllocationMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic Allocation</SelectItem>
                      <SelectItem value="manual">Manual Allocation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {allocationMode === 'automatic' && (
                  <div>
                    <Label htmlFor="allocation-strategy">Allocation Strategy</Label>
                    <Select value={allocationStrategy} onValueChange={(value: 'oldest_first' | 'highest_amount_first' | 'equal_distribution') => setAllocationStrategy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oldest_first">Oldest Fees First</SelectItem>
                        <SelectItem value="highest_amount_first">Highest Amount First</SelectItem>
                        <SelectItem value="equal_distribution">Equal Distribution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="payment-mode">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Online">Online Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="DD">Demand Draft</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="transaction-ref">Transaction Reference</Label>
                  <Input
                    id="transaction-ref"
                    placeholder="Reference number, cheque number, etc."
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Optional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {totals.unallocated !== 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {totals.unallocated > 0 
                        ? `₹${totals.unallocated.toLocaleString()} will remain unallocated`
                        : `Payment exceeds outstanding amount by ₹${Math.abs(totals.unallocated).toLocaleString()}`
                      }
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleCollectPayment}
                  disabled={totals.totalAllocated === 0}
                  className="w-full"
                >
                  Collect Payment (₹{totals.totalAllocated.toLocaleString()})
                </Button>
              </CardContent>
            </Card>

            {/* Payment Allocation Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Allocation Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allocationMode === 'manual' ? (
                    <div className="space-y-3">
                      <Label>Manual Allocation</Label>
                      {outstandingFees.map((fee) => (
                        <div key={fee.feeHeadId} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{fee.feeHeadName}</div>
                            <div className="text-xs text-gray-500">
                              Outstanding: ₹{fee.outstandingAmount.toLocaleString()}
                            </div>
                          </div>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={manualAllocations[fee.feeHeadId] || ''}
                            onChange={(e) => handleManualAllocationChange(fee.feeHeadId, e.target.value)}
                            className="w-24 ml-2"
                            min="0"
                            max={fee.outstandingAmount}
                            step="0.01"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label>Automatic Allocation ({allocationStrategy.replace('_', ' ')})</Label>
                      {outstandingFees.map((fee) => (
                        <div key={fee.feeHeadId} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedFees.has(fee.feeHeadId)}
                              onCheckedChange={(checked) => handleFeeSelection(fee.feeHeadId, checked as boolean)}
                            />
                            <div>
                              <div className="font-medium">{fee.feeHeadName}</div>
                              <div className="text-xs text-gray-500">
                                Outstanding: ₹{fee.outstandingAmount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {paymentAllocations.find(a => a.feeHeadId === fee.feeHeadId) && (
                              <div className="font-medium text-green-600">
                                ₹{paymentAllocations.find(a => a.feeHeadId === fee.feeHeadId)?.allocatedAmount.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Fee Reminders ({reminders.length})
                </CardTitle>
                <Button 
                  onClick={handleGenerateReminders}
                  disabled={reminders.length === 0}
                  variant="outline"
                >
                  Generate Reminders
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reminders.map((reminder, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={
                        reminder.reminderType === 'final' ? 'destructive' :
                        reminder.reminderType === 'second' ? 'secondary' :
                        'outline'
                      }>
                        {reminder.reminderType.toUpperCase()} REMINDER
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {reminder.daysOverdue} days overdue
                      </span>
                    </div>
                    <p className="text-sm">{reminder.messageTemplate}</p>
                  </div>
                ))}
                {reminders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No reminders needed at this time</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 