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
  Calendar,
  Wallet,
  School,
  ChevronRight,
  Info,
  X,
  CheckCircle2
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  { value: "Cash", label: "Cash", icon: DollarSign },
  { value: "Card", label: "Card", icon: CreditCard },
  { value: "Online", label: "Online Payment", icon: Wallet },
  { value: "Bank Transfer", label: "Bank Transfer", icon: FileText },
  { value: "Cheque", label: "Cheque", icon: FileText },
  { value: "DD", label: "Demand Draft", icon: FileText },
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
  const [showFilters, setShowFilters] = useState(false);

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
      if (selectedClass !== 'all') {
        if (student.section?.class?.id !== selectedClass) return false;
      }
      
      return true;
    });
  }, [students, searchQuery, selectedClass]);

  // Load fee data for filtered students
  useEffect(() => {
    const loadFeeData = async () => {
      if (filteredStudentList.length === 0) {
        setStudentFeeData([]);
        return;
      }

      setIsLoading(true);
      setLoadingProgress(0);
      
      try {
        const feeDataPromises = filteredStudentList.map(async (student, index) => {
          try {
            const fees = await onGetStudentFees(
              student.id,
              selectedFeeTerm !== 'all' ? selectedFeeTerm : undefined
            );
            
            // Update progress
            setLoadingProgress(((index + 1) / filteredStudentList.length) * 100);
            
            // Calculate totals
            const totalOutstanding = fees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
            const overdueFees = fees.filter(fee => fee.status === 'Overdue');
            const overdueAmount = overdueFees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
            
            return {
              student,
              fees,
              totalOutstanding,
              overdueAmount,
              overdueCount: overdueFees.length,
            } as StudentFeeData;
          } catch (error) {
            console.error(`Error loading fees for student ${student.id}:`, error);
            return {
              student,
              fees: [],
              totalOutstanding: 0,
              overdueAmount: 0,
              overdueCount: 0,
            } as StudentFeeData;
          }
        });

        const results = await Promise.all(feeDataPromises);
        
        // Apply filters
        let filteredResults = results;
        
        // Status filter
        if (statusFilter === 'outstanding') {
          filteredResults = filteredResults.filter(data => data.totalOutstanding > 0);
        } else if (statusFilter === 'overdue') {
          filteredResults = filteredResults.filter(data => data.overdueAmount > 0);
        } else if (statusFilter === 'paid') {
          filteredResults = filteredResults.filter(data => data.totalOutstanding === 0);
        }
        
        // Minimum outstanding amount filter
        if (minOutstandingAmount) {
          const minAmount = parseFloat(minOutstandingAmount);
          if (!isNaN(minAmount)) {
            filteredResults = filteredResults.filter(data => data.totalOutstanding >= minAmount);
          }
        }
        
        setStudentFeeData(filteredResults);
      } catch (error) {
        console.error('Error loading fee data:', error);
        toast({
          title: "Error loading fee data",
          description: "Failed to load student fee information. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setLoadingProgress(0);
      }
    };

    loadFeeData();
  }, [filteredStudentList, selectedFeeTerm, statusFilter, minOutstandingAmount, onGetStudentFees, toast]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalStudents = studentFeeData.length;
    const totalOutstanding = studentFeeData.reduce((sum, data) => sum + data.totalOutstanding, 0);
    const totalOverdue = studentFeeData.reduce((sum, data) => sum + data.overdueAmount, 0);
    const studentsWithDues = studentFeeData.filter(data => data.totalOutstanding > 0).length;
    const selectedOutstanding = studentFeeData
      .filter(data => selectedStudents.has(data.student.id))
      .reduce((sum, data) => sum + data.totalOutstanding, 0);
    
    return {
      totalStudents,
      totalOutstanding,
      totalOverdue,
      studentsWithDues,
      selectedOutstanding,
      selectedCount: selectedStudents.size,
    };
  }, [studentFeeData, selectedStudents]);

  // Handle student selection
  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(studentFeeData.map(data => data.student.id));
      setSelectedStudents(allIds);
    } else {
      setSelectedStudents(new Set());
    }
  };

  // Handle bulk payment
  const handleBulkPayment = async () => {
    if (selectedStudents.size === 0) {
      toast({
        title: "No students selected",
        description: "Please select at least one student to process payment.",
        variant: "destructive",
      });
      return;
    }

    if (!bulkPaymentMode) {
      toast({
        title: "Payment mode required",
        description: "Please select a payment mode.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayments(true);
    setPaymentProgress(0);

    try {
      const payments: Array<{
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
      }> = [];
      const selectedData = studentFeeData.filter(data => selectedStudents.has(data.student.id));
      
      for (let i = 0; i < selectedData.length; i++) {
        const data = selectedData[i];
        if (!data || data.fees.length === 0) continue;
        
        // Group fees by term for payment
        const feesByTerm: Record<string, FeeStructureItem[]> = {};
        data.fees.forEach(fee => {
          if (fee.outstandingAmount > 0) {
            if (!feesByTerm[fee.feeTermId]) {
              feesByTerm[fee.feeTermId] = [];
            }
            feesByTerm[fee.feeTermId]!.push(fee);
          }
        });
        
        // Create payment for each term
        Object.entries(feesByTerm).forEach(([termId, termFees]) => {
          payments.push({
            studentId: data.student.id,
            feeTermId: termId,
            paymentMode: bulkPaymentMode,
            transactionReference: bulkTransactionRef,
            paymentDate: new Date(),
            notes: bulkNotes,
            items: termFees.map(fee => ({
              feeHeadId: fee.feeHeadId,
              amount: fee.outstandingAmount,
            })),
          });
        });
        
        setPaymentProgress(((i + 1) / selectedData.length) * 100);
      }

      if (payments.length > 0) {
        await onBulkCollectPayments(payments);
        
        // Clear selections
        setSelectedStudents(new Set());
        setBulkTransactionRef('');
        setBulkNotes('');
        
        toast({
          title: "Bulk payment successful",
          description: `Successfully processed payments for ${selectedStudents.size} students.`,
        });
      }
    } catch (error) {
      console.error('Bulk payment error:', error);
      toast({
        title: "Bulk payment failed",
        description: "An error occurred while processing bulk payments.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayments(false);
      setPaymentProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Students</p>
                <p className="text-lg font-semibold">{summaryStats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="text-lg font-semibold">{formatIndianCurrency(summaryStats.totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Overdue</p>
                <p className="text-lg font-semibold">{formatIndianCurrency(summaryStats.totalOverdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Students with Dues</p>
                <p className="text-lg font-semibold">{summaryStats.studentsWithDues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg">Student Fee List</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {onExportData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportData(studentFeeData)}
                  disabled={studentFeeData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-5 gap-4",
            !showFilters && "lg:grid-cols-5",
            showFilters && "grid-cols-1"
          )}>
            <div className="lg:col-span-2">
              <div className="relative">
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className={cn("lg:block", !showFilters && "hidden")}>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className={cn("lg:block", !showFilters && "hidden")}>
              <Select value={selectedFeeTerm} onValueChange={setSelectedFeeTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {feeTerms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className={cn("lg:block", !showFilters && "hidden")}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Loading student fees...</span>
                <span className="font-medium">{Math.round(loadingProgress)}%</span>
              </div>
              <Progress value={loadingProgress} className="h-2" />
            </div>
          )}

          {/* Student List */}
          {!isLoading && studentFeeData.length > 0 && (
            <>
              {/* Select All */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedStudents.size === studentFeeData.length && studentFeeData.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                  <span className="text-sm font-medium">
                    Select All ({studentFeeData.length} students)
                  </span>
                </div>
                {selectedStudents.size > 0 && (
                  <Badge variant="secondary">
                    {selectedStudents.size} selected • {formatIndianCurrency(summaryStats.selectedOutstanding)}
                  </Badge>
                )}
              </div>

              {/* Student Cards */}
              <div className="space-y-2">
                {studentFeeData.map((data) => (
                  <Card 
                    key={data.student.id} 
                    className={cn(
                      "border-0 shadow-sm transition-all",
                      selectedStudents.has(data.student.id) && "ring-2 ring-primary/20"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedStudents.has(data.student.id)}
                          onCheckedChange={(checked) => handleSelectStudent(data.student.id, checked as boolean)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {data.student.firstName} {data.student.lastName}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {data.student.admissionNumber}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>{data.student.section?.class?.name || 'No Class'}</span>
                                {data.overdueCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {data.overdueCount} Overdue
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Fee Summary */}
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                                <div>
                                  <p className="text-xs text-muted-foreground">Outstanding</p>
                                  <p className="font-semibold text-red-600 dark:text-red-400">
                                    {formatIndianCurrency(data.totalOutstanding)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Overdue</p>
                                  <p className="font-semibold text-orange-600 dark:text-orange-400">
                                    {formatIndianCurrency(data.overdueAmount)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Fee Items</p>
                                  <p className="font-semibold">{data.fees.length}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Status</p>
                                  {data.totalOutstanding === 0 ? (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Paid
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {!isLoading && studentFeeData.length === 0 && (
            <div className="text-center py-12">
              <School className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                {filteredStudentList.length === 0 
                  ? "No students match your search criteria."
                  : "No fee data available for the selected students."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Payment Section */}
      {selectedStudents.size > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bulk Payment Processing</CardTitle>
            <CardDescription>
              Process payment for {selectedStudents.size} selected students
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Payment Summary */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Students</p>
                  <p className="text-2xl font-semibold">{selectedStudents.size}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-semibold text-primary">
                    {formatIndianCurrency(summaryStats.selectedOutstanding)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <Label className="text-sm mb-2">Payment Mode</Label>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setBulkPaymentMode(mode.value)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2",
                        bulkPaymentMode === mode.value
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction Reference */}
            {bulkPaymentMode !== 'Cash' && (
              <div>
                <Label htmlFor="bulk-transaction-ref" className="text-sm">
                  Transaction Reference
                </Label>
                <Input
                  id="bulk-transaction-ref"
                  value={bulkTransactionRef}
                  onChange={(e) => setBulkTransactionRef(e.target.value)}
                  placeholder="Enter reference number"
                  className="mt-1"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="bulk-notes" className="text-sm">
                Notes (Optional)
              </Label>
              <Input
                id="bulk-notes"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add any notes for this bulk payment"
                className="mt-1"
              />
            </div>

            {/* Processing Progress */}
            {processingPayments && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing payments...</span>
                  <span className="font-medium">{Math.round(paymentProgress)}%</span>
                </div>
                <Progress value={paymentProgress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleBulkPayment}
                disabled={processingPayments}
                className="flex-1"
              >
                {processingPayments ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Process Bulk Payment
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setSelectedStudents(new Set())}
                disabled={processingPayments}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}