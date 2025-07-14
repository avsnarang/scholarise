"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Users, 
  DollarSign, 
  Download, 
  Clock, 
  Filter,
  CreditCard,
  FileText,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    class?: {
      name: string;
      id: string;
    };
  };
  parent?: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
}

interface FeeStructureItem {
  id: string;
  feeHeadId: string;
  feeHeadName: string;
  feeTermId: string;
  feeTermName: string;
  amount: number;
  dueDate: Date;
  outstandingAmount: number;
  status: 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';
}

interface StudentFeeData {
  student: Student;
  fees: FeeStructureItem[];
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
}

interface BulkPaymentRecord {
  studentId: string;
  selectedFees: string[];
  paymentAmount: number;
  paymentMode: string;
  transactionReference?: string;
  notes?: string;
}

interface BulkFeeCollectionProps {
  students: Student[];
  classes: Array<{ id: string; name: string; }>;
  feeTerms: Array<{ id: string; name: string; }>;
  onGetStudentFees: (studentId: string, feeTermId?: string) => Promise<FeeStructureItem[]>;
  onBulkCollectPayments: (payments: Array<{
    studentId: string;
    feeTermId: string;
    paymentMode: string;
    transactionReference?: string;
    paymentDate: Date;
    notes?: string;
    items: Array<{
      feeHeadId: string;
      amount: number;
    }>;
  }>) => Promise<void>;
  onExportData?: (data: StudentFeeData[]) => void;
}

const paymentModes = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Online", label: "Online Payment" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "DD", label: "Demand Draft" },
];

export function BulkFeeCollection({
  students = [],
  classes = [],
  feeTerms = [],
  onGetStudentFees,
  onBulkCollectPayments,
  onExportData,
}: BulkFeeCollectionProps) {
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedFeeTerm, setSelectedFeeTerm] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('outstanding');
  const [minOutstandingAmount, setMinOutstandingAmount] = useState<string>('');
  const [studentFeeData, setStudentFeeData] = useState<StudentFeeData[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkPaymentMode, setBulkPaymentMode] = useState('Cash');
  const [bulkTransactionRef, setBulkTransactionRef] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [processingPayments, setProcessingPayments] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [bulkPaymentRecords, setBulkPaymentRecords] = useState<Record<string, BulkPaymentRecord>>({});

  // Filter students based on criteria
  const filteredStudentList = useMemo(() => {
    return students.filter(student => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          student.firstName.toLowerCase().includes(query) ||
          student.lastName.toLowerCase().includes(query) ||
          student.admissionNumber.toLowerCase().includes(query) ||
          (student.parent?.firstName?.toLowerCase().includes(query)) ||
          (student.parent?.lastName?.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }
      
      // Class filter
      if (selectedClass !== 'all' && student.section?.class?.id !== selectedClass) {
        return false;
      }
      
      return true;
    });
  }, [students, searchQuery, selectedClass]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalStudents = studentFeeData.length;
    const totalOutstanding = studentFeeData.reduce((sum, data) => sum + data.totalOutstanding, 0);
    const totalOverdue = studentFeeData.reduce((sum, data) => sum + data.overdueAmount, 0);
    const studentsWithOverdue = studentFeeData.filter(data => data.overdueAmount > 0).length;
    const selectedStudentData = studentFeeData.filter(data => selectedStudents.has(data.student.id));
    const selectedOutstanding = selectedStudentData.reduce((sum, data) => sum + data.totalOutstanding, 0);
    
    return {
      totalStudents,
      totalOutstanding,
      totalOverdue,
      studentsWithOverdue,
      selectedCount: selectedStudents.size,
      selectedOutstanding,
    };
  }, [studentFeeData, selectedStudents]);

  // Load student fee data
  const loadStudentFees = async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    
    try {
      const data: StudentFeeData[] = [];
      const filteredStudents = filteredStudentList;
      
      for (let i = 0; i < filteredStudents.length; i++) {
        const student = filteredStudents[i];
        
        try {
          const fees = await onGetStudentFees(
            student?.id ?? '', 
            selectedFeeTerm === 'all' ? undefined : selectedFeeTerm
          );
          
          const totalOutstanding = fees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
          const overdueAmount = fees
            .filter(fee => fee.status === 'Overdue')
            .reduce((sum, fee) => sum + fee.outstandingAmount, 0);
          const overdueCount = fees.filter(fee => fee.status === 'Overdue').length;
          
          // Apply filters
          const minAmount = parseFloat(minOutstandingAmount) || 0;
          if (statusFilter === 'outstanding' && totalOutstanding === 0) continue;
          if (statusFilter === 'overdue' && overdueAmount === 0) continue;
          if (totalOutstanding < minAmount) continue;
          
          data.push({
            student: student ?? {
              id: '',
              firstName: '',
              lastName: '',
              admissionNumber: '',
              section: { class: { name: '', id: '' } },
              parent: { firstName: '', lastName: '', phone: '', email: '' },
            },
            fees,
            totalOutstanding,
            overdueAmount,
            overdueCount,
          });
        } catch (error) {
          console.error(`Error loading fees for student ${student?.id}:`, error);
        }
        
        setLoadingProgress(((i + 1) / filteredStudents.length) * 100);
      }
      
      setStudentFeeData(data);
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  useEffect(() => {
    if (filteredStudentList.length > 0) {
      loadStudentFees();
    }
  }, [selectedClass, selectedFeeTerm, statusFilter, minOutstandingAmount]);

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    const newSelection = new Set(selectedStudents);
    if (checked) {
      newSelection.add(studentId);
      // Auto-set payment amount to full outstanding
      const studentData = studentFeeData.find(data => data.student.id === studentId);
      if (studentData) {
        handleBulkPaymentUpdate(studentId, {
          paymentAmount: studentData.totalOutstanding,
        });
      }
    } else {
      newSelection.delete(studentId);
      // Remove payment record
      setBulkPaymentRecords(prev => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });
    }
    setSelectedStudents(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(studentFeeData.map(data => data.student.id)));
      // Auto-set payment amounts for all
      const newRecords: Record<string, BulkPaymentRecord> = {};
      studentFeeData.forEach(data => {
        newRecords[data.student.id] = {
          studentId: data.student.id,
          selectedFees: [],
          paymentAmount: data.totalOutstanding,
          paymentMode: bulkPaymentMode,
          transactionReference: bulkTransactionRef,
          notes: bulkNotes,
        };
      });
      setBulkPaymentRecords(newRecords);
    } else {
      setSelectedStudents(new Set());
      setBulkPaymentRecords({});
    }
  };

  const handleBulkPaymentUpdate = (studentId: string, updates: Partial<BulkPaymentRecord>) => {
    setBulkPaymentRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        selectedFees: [],
        paymentAmount: 0,
        paymentMode: bulkPaymentMode,
        ...updates,
      },
    }));
  };

  const handleBulkCollectPayments = async () => {
    const selectedStudentData = studentFeeData.filter(data => selectedStudents.has(data.student.id));
    
    if (selectedStudentData.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select students to process payments.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayments(true);
    setPaymentProgress(0);

    try {
      const payments = [];
      
      for (let i = 0; i < selectedStudentData.length; i++) {
        const studentData = selectedStudentData[i];
        const paymentRecord = bulkPaymentRecords[studentData?.student.id ?? ''];
        
        if (!paymentRecord || paymentRecord.paymentAmount <= 0) continue;

        // Allocate payment across outstanding fees (simplified allocation)
        const outstandingFees = studentData?.fees.filter(fee => fee.outstandingAmount > 0) ?? [];
        let remainingAmount = paymentRecord.paymentAmount;
        const items = [];

        for (const fee of outstandingFees) {
          if (remainingAmount <= 0) break;
          
          const allocatedAmount = Math.min(remainingAmount, fee.outstandingAmount);
          items.push({
            feeHeadId: fee.feeHeadId,
            amount: allocatedAmount,
          });
          remainingAmount -= allocatedAmount;
        }

        if (items.length > 0) {
          // Find the fee term (use the first fee term for simplicity)
          const feeTermId = outstandingFees[0]?.feeTermId || feeTerms[0]?.id;
          
          payments.push({
            studentId: studentData?.student.id ?? '',
            feeTermId: feeTermId ?? '',
            paymentMode: paymentRecord.paymentMode,
            transactionReference: paymentRecord.transactionReference,
            paymentDate: new Date(),
            notes: paymentRecord.notes,
            items,
          });
        }
        
        setPaymentProgress(((i + 1) / selectedStudentData.length) * 100);
      }

      if (payments.length > 0) {
        await onBulkCollectPayments(payments as any);
        
        toast({
          title: "Bulk Payment Successful",
          description: `Successfully processed ${payments.length} payments.`,
        });
        
        // Reset form
        setSelectedStudents(new Set());
        setBulkPaymentRecords({});
        
        // Reload data
        await loadStudentFees();
      }
    } catch (error) {
      toast({
        title: "Bulk Payment Failed",
        description: "There was an error processing the payments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayments(false);
      setPaymentProgress(0);
    }
  };

  const handleExportData = () => {
    if (onExportData) {
      onExportData(studentFeeData);
    }
    toast({
      title: "Data Exported",
      description: "Student fee data has been exported successfully.",
    });
  };

  const getTotalSelectedPayment = () => {
    return Object.values(bulkPaymentRecords).reduce((sum, record) => sum + (record?.paymentAmount ?? 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Total Students</p>
                <p className="text-xl font-bold text-foreground dark:text-white">
                  {summaryStats.totalStudents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Total Outstanding</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatIndianCurrency(summaryStats.totalOutstanding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Overdue Amount</p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {formatIndianCurrency(summaryStats.totalOverdue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Selected</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {summaryStats.selectedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-gray-400">
            Filter students by class, fee term, or search criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground dark:text-gray-300">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground dark:text-gray-500" />
                <Input
                  placeholder="Name, admission no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground dark:text-gray-300">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background dark:bg-gray-800 border-border dark:border-gray-600">
                  <SelectItem value="all" className="text-foreground dark:text-white">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="text-foreground dark:text-white">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground dark:text-gray-300">Fee Term</Label>
              <Select value={selectedFeeTerm} onValueChange={setSelectedFeeTerm}>
                <SelectTrigger className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background dark:bg-gray-800 border-border dark:border-gray-600">
                  <SelectItem value="all" className="text-foreground dark:text-white">All Terms</SelectItem>
                  {feeTerms.map(term => (
                    <SelectItem key={term.id} value={term.id} className="text-foreground dark:text-white">
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground dark:text-gray-300">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background dark:bg-gray-800 border-border dark:border-gray-600">
                  <SelectItem value="outstanding" className="text-foreground dark:text-white">With Outstanding</SelectItem>
                  <SelectItem value="overdue" className="text-foreground dark:text-white">Overdue Only</SelectItem>
                  <SelectItem value="all" className="text-foreground dark:text-white">All Students</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground dark:text-gray-300">Min Outstanding (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={minOutstandingAmount}
                onChange={(e) => setMinOutstandingAmount(e.target.value)}
                min="0"
                className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={loadStudentFees} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Apply Filters'
              )}
            </Button>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          {isLoading && (
            <div className="mt-4 p-4 bg-muted/30 dark:bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-foreground dark:text-white">Loading student fee data...</span>
              </div>
              <Progress value={loadingProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Payment Controls */}
      {selectedStudents.size > 0 && (
        <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bulk Payment Collection
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">
              {selectedStudents.size} students selected • {formatIndianCurrency(getTotalSelectedPayment())} total payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-gray-300">Payment Mode</Label>
                <Select value={bulkPaymentMode} onValueChange={setBulkPaymentMode}>
                  <SelectTrigger className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-800 border-border dark:border-gray-600">
                    {paymentModes.map(mode => (
                      <SelectItem key={mode.value} value={mode.value} className="text-foreground dark:text-white">
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-gray-300">Transaction Reference</Label>
                <Input
                  placeholder="Batch reference..."
                  value={bulkTransactionRef}
                  onChange={(e) => setBulkTransactionRef(e.target.value)}
                  className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-gray-300">Notes</Label>
                <Input
                  placeholder="Bulk collection notes..."
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="bg-background dark:bg-gray-800 border-border dark:border-gray-600 text-foreground dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleBulkCollectPayments}
                  disabled={processingPayments || getTotalSelectedPayment() === 0}
                  className="w-full"
                  size="lg"
                >
                  {processingPayments ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Collect {formatIndianCurrency(getTotalSelectedPayment())}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {processingPayments && (
              <div className="p-4 bg-muted/30 dark:bg-gray-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-foreground dark:text-white">Processing payments...</span>
                </div>
                <Progress value={paymentProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      <Card className="border-border dark:border-gray-700 bg-card dark:bg-gray-900">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground dark:text-white">
                Student Fee Details
              </CardTitle>
              <CardDescription className="text-muted-foreground dark:text-gray-400">
                {studentFeeData.length} students found
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedStudents.size === studentFeeData.length && studentFeeData.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm font-medium text-foreground dark:text-gray-300">Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {studentFeeData.map((data) => (
              <div 
                key={data.student.id} 
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  selectedStudents.has(data.student.id)
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 dark:border-primary/40'
                    : 'bg-background dark:bg-gray-800 border-border dark:border-gray-600 hover:bg-muted/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={selectedStudents.has(data.student.id)}
                      onCheckedChange={(checked) => handleStudentSelection(data.student.id, checked as boolean)}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-semibold text-foreground dark:text-white">
                            {data.student.firstName} {data.student.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground dark:text-gray-400">
                            {data.student.admissionNumber} • {data.student.section?.class?.name || 'N/A'}
                          </div>
                        </div>
                        
                                                  <div className="text-right">
                            <div className="font-semibold text-red-600 dark:text-red-400">
                              {formatIndianCurrency(data.totalOutstanding)}
                            </div>
                            <div className="text-sm text-muted-foreground dark:text-gray-400">Outstanding</div>
                          </div>
                        
                                                  {data.overdueAmount > 0 && (
                            <div className="text-right">
                              <div className="font-semibold text-orange-600 dark:text-orange-400">
                                {formatIndianCurrency(data.overdueAmount)}
                              </div>
                              <div className="text-sm text-muted-foreground dark:text-gray-400">Overdue</div>
                            </div>
                          )}
                        
                        <div className="flex gap-2">
                          {data.overdueCount > 0 && (
                            <Badge variant="destructive">{data.overdueCount} overdue</Badge>
                          )}
                          {data.totalOutstanding > 0 ? (
                            <Badge variant="secondary">Outstanding</Badge>
                          ) : (
                            <Badge variant="default">Paid</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedStudents.has(data.student.id) && (
                    <div className="ml-4 w-32">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={bulkPaymentRecords[data.student.id]?.paymentAmount || ''}
                        onChange={(e) => handleBulkPaymentUpdate(data.student.id, {
                          paymentAmount: parseFloat(e.target.value) || 0,
                          paymentMode: bulkPaymentMode,
                          transactionReference: bulkTransactionRef,
                          notes: bulkNotes,
                        })}
                        className="text-right bg-background dark:bg-gray-800 border-border dark:border-gray-600"
                        min="0"
                        max={data.totalOutstanding}
                        step="0.01"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {studentFeeData.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground dark:text-gray-500 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground dark:text-white mb-2">No students found</h3>
                <p className="text-muted-foreground dark:text-gray-400">
                  No students match the current filters. Try adjusting your search criteria.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 