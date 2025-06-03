"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, DollarSign, Printer, CircleAlert, CheckCircle2, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FeeReceiptModal } from "@/components/finance/fee-receipt-modal";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

// Placeholder student data
const students = [
  { id: 's1', name: 'Aarav Sharma', admissionNo: 'SCH001', class: '10 A', parentName: 'Mr. Rajesh Sharma' },
  { id: 's2', name: 'Priya Singh', admissionNo: 'SCH002', class: '12 B', parentName: 'Mrs. Anita Singh' },
  { id: 's3', name: 'Rohan Mehta', admissionNo: 'SCH003', class: '9 C', parentName: 'Mr. Vikram Mehta' },
];

// Placeholder fee structure for a student
const getStudentFeeDetails = (studentId: string, termId?: string) => {
  // This would be a complex API call based on student, class, assigned fees, and previous payments
  if (studentId === 's1') {
    return [
      { id:'f1', feeHead: 'Tuition Fee', term: 'Term 1 (2024-2025)', totalAmount: 5000, paidAmount: 2500, dueAmount: 2500, dueDate: '2024-08-15', status: 'Partially Paid' as FeeItem['status'] },
      { id:'f2', feeHead: 'Library Fee', term: 'Term 1 (2024-2025)', totalAmount: 500, paidAmount: 0, dueAmount: 500, dueDate: '2024-08-15', status: 'Pending' as FeeItem['status'] },
      { id:'f3', feeHead: 'Annual Fund', term: 'Annual (2024-2025)', totalAmount: 1200, paidAmount: 1200, dueAmount: 0, dueDate: '2024-04-30', status: 'Paid' as FeeItem['status'] },
      { id:'f4', feeHead: 'Transport Fee', term: 'Term 1 (2024-2025)', totalAmount: 1500, paidAmount: 0, dueAmount: 1500, dueDate: '2024-08-15', status: 'Pending' as FeeItem['status'] },
    ];
  }
  return [];
};

const allFeeTerms = [
    { id: 'ft1', name: 'Term 1 (2024-2025)' },
    { id: 'ft2', name: 'Annual Charges (2024-2025)' },
    { id: 'all', name: 'All Outstanding Terms' },
];
  
interface FeeItem {
  id: string;
  feeHead: string;
  term: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue';
  selected?: boolean;
  payingAmount?: number;
}

export default function FeeCollectionPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentFees, setStudentFees] = useState<FeeItem[]>([]);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [transactionDetails, setTransactionDetails] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Fetch students for search
  const {
    data: students = [],
    isLoading: studentsLoading
  } = api.finance.getStudents.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch fee terms
  const {
    data: feeTerms = []
  } = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Student fee calculation query
  const {
    data: studentFeeData,
    isLoading: feeDataLoading,
    refetch: refetchFeeData
  } = api.finance.getStudentFeeDetails.useQuery(
    {
      studentId: selectedStudent?.id || '',
      feeTermId: selectedTermFilter === 'all' ? undefined : selectedTermFilter,
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    },
    {
      enabled: !!selectedStudent?.id && !!currentBranchId && !!currentSessionId,
    }
  );

  // Create fee collection mutation
  const createFeeCollectionMutation = api.finance.createFeeCollection.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment collected successfully",
      });
      refetchFeeData();
      // Reset selection
      setStudentFees(prev => prev.map(f => ({ ...f, selected: false, payingAmount: f.dueAmount })));
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (studentFeeData) {
      const fees = studentFeeData.map((fee: any) => ({
        id: fee.id,
        feeHead: fee.feeHead,
        term: fee.term,
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount,
        dueAmount: fee.dueAmount,
        dueDate: fee.dueDate,
        status: fee.status as FeeItem['status'],
        selected: false,
        payingAmount: fee.dueAmount,
      }));
      setStudentFees(fees);
    } else {
      setStudentFees([]);
    }
  }, [studentFeeData]);

  const handleSearch = () => {
    const foundStudent = students.find((s: any) => 
      s.admissionNumber?.toLowerCase() === searchQuery.toLowerCase() || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSelectedStudent(foundStudent || null);
  };

  const handleFeeItemSelection = (feeId: string, isSelected: boolean) => {
    setStudentFees(prevFees =>
      prevFees.map(fee => (fee.id === feeId ? { ...fee, selected: isSelected } : fee))
    );
  };

  const handlePayingAmountChange = (feeId: string, amount: string) => {
    const numericAmount = parseFloat(amount) || 0;
    setStudentFees(prevFees =>
      prevFees.map(fee => (fee.id === feeId ? { ...fee, payingAmount: numericAmount } : fee))
    );
  };

  const totalSelectedAmount = studentFees
    .filter(f => f.selected && f.dueAmount > 0)
    .reduce((sum, f) => sum + (f.payingAmount || 0), 0);

  const handleCollectPayment = () => {
    const itemsToPay = studentFees.filter(f => f.selected && f.payingAmount && f.payingAmount > 0);
    if (itemsToPay.length === 0) {
      toast({
        title: "Error",
        description: "No fees selected or amount entered for payment.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStudent || !currentBranchId || !currentSessionId) {
      toast({
        title: "Error",
        description: "Missing required information for payment collection.",
        variant: "destructive",
      });
      return;
    }

    // Find the term ID - for now use the first selected item's term
    const firstSelectedItem = itemsToPay[0];
    const termId = feeTerms.find(t => t.name === firstSelectedItem?.term)?.id;

    if (!termId) {
      toast({
        title: "Error",
        description: "Unable to identify fee term for payment.",
        variant: "destructive",
      });
      return;
    }

    const feeCollectionData = {
      studentId: selectedStudent.id,
      feeTermId: termId,
      paymentMode,
      transactionReference: transactionDetails || undefined,
      paymentDate: new Date(),
      items: itemsToPay.map(item => {
        // Find the original fee data to get the feeHeadId
        const originalFee = studentFeeData?.find((fee: any) => fee.id === item.id);
        return {
          feeHeadId: originalFee?.feeHeadId || '',
          amount: item.payingAmount || 0,
        };
      }),
      branchId: currentBranchId,
      sessionId: currentSessionId,
    };

    createFeeCollectionMutation.mutate(feeCollectionData);
  };

  const handlePreviewReceipt = () => {
    const itemsToPay = studentFees.filter(f => f.selected && f.payingAmount && f.payingAmount > 0);
    if (itemsToPay.length === 0) {
      toast({
        title: "Error",
        description: "No fees selected for receipt preview.",
        variant: "destructive",
      });
      return;
    }
    setIsReceiptModalOpen(true);
  };

  const getStatusBadge = (status: FeeItem['status']) => {
    switch (status) {
      case 'Paid': return <Badge variant="default" className="capitalize bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'Pending': return <Badge variant="destructive" className="capitalize"><CircleAlert className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'Partially Paid': return <Badge variant="outline" className="capitalize border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-300"><DollarSign className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'Overdue': return <Badge variant="destructive" className="capitalize"><CircleAlert className="h-3 w-3 mr-1" />{status}</Badge>;
      default: return <Badge className="capitalize">{status}</Badge>;
    }
  };

  const filteredFees = studentFees.filter(fee => {
    if (selectedTermFilter === 'all') return fee.dueAmount > 0; // Show only items with dues if 'all'
    return fee.term === feeTerms.find(t => t.id === selectedTermFilter)?.name && fee.dueAmount > 0;
  });

  // Get selected items for receipt
  const selectedFeeItems = studentFees
    .filter(f => f.selected && f.payingAmount && f.payingAmount > 0)
    .map(f => ({
      id: f.id,
      feeHead: f.feeHead,
      term: f.term,
      payingAmount: f.payingAmount || 0,
      dueDate: f.dueDate,
    }));

  // Create options for term filter
  const allFeeTerms = [
    { id: 'all', name: 'All Outstanding Terms' },
    ...feeTerms.map(term => ({ id: term.id, name: term.name })),
  ];

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Fee Collection Portal" subtitle="Search students, view outstanding fees, and record payments.">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Please select a branch and academic session to continue.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Fee Collection Portal" subtitle="Search students, view outstanding fees, and record payments.">
      {/* Action Buttons */}
      <div className="flex justify-end mb-6">
        <Link href="/finance/fee-collection/create">
          <Button className="bg-[#00501B] hover:bg-[#00501B]/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Record New Payment
          </Button>
        </Link>
      </div>

      <Card className="mb-6 shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex items-center">
            <Search className="h-5 w-5 mr-2 text-[#00501B] dark:text-green-400" />
            Search Student
          </CardTitle>
          <CardDescription>Enter Admission No. or Student Name to fetch fee details.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            type="text"
            placeholder="Admission No. or Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleSearch}>Search Student</Button>
        </CardContent>
      </Card>

      {selectedStudent && (
        <>
          <Card className="mb-6 shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-[#00501B] dark:text-green-400" />
                Student Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><strong>Name:</strong> {selectedStudent.name}</div>
              <div><strong>Admission No:</strong> {selectedStudent.admissionNo}</div>
              <div><strong>Class:</strong> {selectedStudent.class}</div>
              <div><strong>Parent:</strong> {selectedStudent.parentName}</div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div >
                        <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-[#00501B] dark:text-green-400" />
                        Outstanding Fees & Payment
                        </CardTitle>
                        <CardDescription>Select fee items to pay. Only items with dues are shown.</CardDescription>
                    </div>
                    <div className="w-full sm:w-auto">
                        <Select value={selectedTermFilter} onValueChange={setSelectedTermFilter}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filter by Term" />
                            </SelectTrigger>
                            <SelectContent>
                                {allFeeTerms.map(term => (
                                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredFees.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Select</TableHead>
                          <TableHead>Fee Head</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead className="text-right">Total (₹)</TableHead>
                          <TableHead className="text-right">Paid (₹)</TableHead>
                          <TableHead className="text-right">Due (₹)</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right w-[150px]">Pay Amount (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFees.map((fee) => (
                          <TableRow key={fee.id} className={fee.selected ? 'bg-green-50 dark:bg-green-900/30' : ''}>
                            <TableCell>
                              {fee.dueAmount > 0 && (
                                <Checkbox
                                  checked={fee.selected}
                                  onCheckedChange={(checked) => handleFeeItemSelection(fee.id, !!checked)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{fee.feeHead}</TableCell>
                            <TableCell>{fee.term}</TableCell>
                            <TableCell className="text-right">{fee.totalAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{fee.paidAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">{fee.dueAmount.toFixed(2)}</TableCell>
                            <TableCell>{new Date(fee.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(fee.status)}</TableCell>
                            <TableCell className="text-right">
                              {fee.dueAmount > 0 && (
                                <Input
                                  type="number"
                                  value={fee.payingAmount === 0 && fee.dueAmount > 0 ? '' : fee.payingAmount?.toString() ?? ''} // Show empty for 0 unless it's fully paid
                                  onChange={(e) => handlePayingAmountChange(fee.id, e.target.value)}
                                  max={fee.dueAmount}
                                  min="0"
                                  disabled={!fee.selected}
                                  className="h-8 text-right"
                                  placeholder={fee.dueAmount.toFixed(2)}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <Label htmlFor="payment-mode" className="mb-1 block">Payment Mode</Label>
                            <Select value={paymentMode} onValueChange={setPaymentMode}>
                                <SelectTrigger id="payment-mode">
                                    <SelectValue placeholder="Select Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Online">Online Transfer</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="transaction-details" className="mb-1 block">Reference / Details</Label>
                            <Input 
                                id="transaction-details"
                                placeholder="e.g., Card ending XXXX, Cheque No."
                                value={transactionDetails}
                                onChange={(e) => setTransactionDetails(e.target.value)}
                            />
                        </div>                       
                        <div className="text-right md:text-left">
                            <p className="text-sm text-gray-600 dark:text-gray-300">Total to Collect:</p>
                            <p className="text-2xl font-bold text-[#00501B] dark:text-green-400">₹{totalSelectedAmount.toFixed(2)}</p>
                        </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No outstanding fees found for the selected student/term or all dues are cleared.
                </p>
              )}
            </CardContent>
            {filteredFees.length > 0 && (
                <CardFooter className="flex justify-end gap-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" onClick={handlePreviewReceipt} disabled={totalSelectedAmount === 0}>
                        <Printer className="h-4 w-4 mr-2" /> Preview Receipt
                    </Button>
                    <Button onClick={handleCollectPayment} disabled={totalSelectedAmount === 0}>
                        <DollarSign className="h-4 w-4 mr-2" /> Collect ₹{totalSelectedAmount.toFixed(2)}
                    </Button>
                </CardFooter>
            )}
          </Card>
        </>
      )}

      {!selectedStudent && searchQuery && (
        <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
                <p className="text-center text-red-600 dark:text-red-400">
                    <CircleAlert className="inline h-5 w-5 mr-2" /> Student not found. Please check the Admission No. or Name.
                </p>
            </CardContent>
        </Card>
      )}

      {/* Receipt Modal */}
      <FeeReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        student={selectedStudent}
        feeItems={selectedFeeItems}
        totalAmount={totalSelectedAmount}
        paymentMode={paymentMode}
        transactionDetails={transactionDetails}
      />
    </PageWrapper>
  );
} 