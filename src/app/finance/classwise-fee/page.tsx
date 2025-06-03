"use client";

import React, { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DollarSign, Save, ListFilter, Copy } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";

interface FeeAssignment {
  feeHeadName: string;
  feeHeadId: string;
  amount: number;
}

export default function ClasswiseFeePage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>(undefined);
  const [copyFromClass, setCopyFromClass] = useState<string | undefined>(undefined);
  const [feeAssignments, setFeeAssignments] = useState<FeeAssignment[]>([]);

  // Fetch classes for the current branch
  const {
    data: classes = []
  } = api.finance.getClasses.useQuery(
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
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch fee heads for the selected term
  const {
    data: feeHeads = []
  } = api.finance.getFeeHeads.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch existing classwise fees
  const {
    data: existingClasswiseFees = [],
    refetch: refetchExistingFees
  } = api.finance.getClasswiseFees.useQuery(
    {
      classId: selectedClass ?? undefined,
      feeTermId: selectedTerm ?? undefined,
    },
    {
      enabled: !!selectedClass && !!selectedTerm,
    }
  );

  // Mutations
  const saveClasswiseFeesMutation = api.finance.setClasswiseFees.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Classwise fees saved successfully",
      });
      void refetchExistingFees();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyClasswiseFeesMutation = api.finance.copyClasswiseFees.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee structure copied successfully",
      });
      void refetchExistingFees();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update fee assignments when data changes - using a stable dependency approach
  useEffect(() => {
    if (selectedClass && selectedTerm && feeHeads.length > 0 && feeTerms.length > 0) {
      // Get the selected term's fee heads
      const selectedTermData = feeTerms.find(t => t.id === selectedTerm);
      const termFeeHeads = selectedTermData?.feeHeads?.map(tfh => tfh.feeHead) || [];
      
      // Create assignments from available fee heads
      const assignments = feeHeads
        .filter(fh => termFeeHeads.some(tfh => tfh.id === fh.id))
        .map(feeHead => {
          const existingFee = existingClasswiseFees.find(ef => ef.feeHeadId === feeHead.id);
          return {
            feeHeadName: feeHead.name,
            feeHeadId: feeHead.id,
            amount: existingFee?.amount || 0,
          };
        });
      
      setFeeAssignments(assignments);
    } else {
      setFeeAssignments([]);
    }
  }, [selectedClass, selectedTerm, feeHeads.length, feeTerms.length, existingClasswiseFees.length]);

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Class-wise Fee Assignment" subtitle="Assign specific fee amounts for each class per fee term.">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Please select a branch and academic session to continue.</p>
        </div>
      </PageWrapper>
    );
  }

  const handleAmountChange = (feeHeadName: string, amount: string) => {
    const numericAmount = parseFloat(amount) || 0;
    setFeeAssignments(prev =>
      prev.map(fa =>
        fa.feeHeadName === feeHeadName ? { ...fa, amount: numericAmount } : fa
      )
    );
  };

  const handleSaveAssignments = () => {
    if (!selectedClass || !selectedTerm || !currentBranchId || !currentSessionId) return;

    const feeData = feeAssignments.map(assignment => ({
      feeHeadId: assignment.feeHeadId,
      amount: assignment.amount,
    }));

    void saveClasswiseFeesMutation.mutate({
      classId: selectedClass,
      feeTermId: selectedTerm,
      fees: feeData,
      branchId: currentBranchId,
      sessionId: currentSessionId,
    });
  };

  const handleCopyFromClass = () => {
    if (!copyFromClass || !selectedClass || !selectedTerm || !currentBranchId || !currentSessionId) return;

    void copyClasswiseFeesMutation.mutate({
      fromClassId: copyFromClass,
      toClassId: selectedClass,
      feeTermId: selectedTerm,
      branchId: currentBranchId,
      sessionId: currentSessionId,
    });
  };
  
  const currentTermDetails = feeTerms.find(term => term.id === selectedTerm);
  const totalAmount = feeAssignments.reduce((sum, assignment) => sum + assignment.amount, 0);

  return (
    <PageWrapper title="Class-wise Fee Assignment" subtitle="Assign specific fee amounts for each class per fee term.">
      <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex items-center">
            <ListFilter className="h-5 w-5 mr-2 text-[#00501B] dark:text-green-400" />
            Select Class and Fee Term
          </CardTitle>
          <CardDescription>Choose a class and a fee term to view or assign fee amounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="-- Select Class --" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="term-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Fee Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={!selectedClass}>
                <SelectTrigger id="term-select">
                  <SelectValue placeholder={selectedClass ? "-- Select Fee Term --" : "Select class first"} />
                </SelectTrigger>
                <SelectContent>
                  {feeTerms.map(term => (
                    <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Copy from another class functionality */}
          {selectedClass && selectedTerm && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="copy-from-class" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Copy fee structure from another class (optional)
                  </label>
                  <Select value={copyFromClass} onValueChange={setCopyFromClass}>
                    <SelectTrigger id="copy-from-class">
                      <SelectValue placeholder="-- Select Class to Copy From --" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes
                        .filter(cls => cls.id !== selectedClass)
                        .map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCopyFromClass} 
                  disabled={!copyFromClass || copyClasswiseFeesMutation.isPending}
                  variant="outline"
                  className="mt-6 sm:mt-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Structure
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && selectedTerm && currentTermDetails && (
        <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">
              Fee Structure for {classes.find(c=>c.id === selectedClass)?.name} - {currentTermDetails.name}
            </CardTitle>
            <CardDescription>Enter the amount for each applicable fee head for the selected class and term.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feeAssignments.length > 0 ? feeAssignments.map(assignment => (
                <div key={assignment.feeHeadName} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                  <label htmlFor={`fee-${assignment.feeHeadName}`} className="font-medium text-gray-700 dark:text-gray-300">
                    {assignment.feeHeadName}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id={`fee-${assignment.feeHeadName}`}
                      type="number"
                      placeholder="Enter amount"
                      value={assignment.amount === 0 ? '' : assignment.amount.toString()}
                      onChange={(e) => handleAmountChange(assignment.feeHeadName, e.target.value)}
                      className="pl-8"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )) : (
                 <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No fee heads are associated with the selected term, or they have not been configured yet.
                 </p>
              )}
            </div>
            
            {feeAssignments.length > 0 && (
              <>
                {/* Total Amount Display */}
                <div className="mt-6 p-4 bg-[#00501B]/5 dark:bg-green-900/20 rounded-md border border-[#00501B]/20 dark:border-green-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Total Fee Amount:</span>
                    <span className="text-2xl font-bold text-[#00501B] dark:text-green-400">
                      ₹{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={handleSaveAssignments} 
                    disabled={saveClasswiseFeesMutation.isPending}
                    className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
                  >
                    {saveClasswiseFeesMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Fee Structure
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
} 