"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Users, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  X,
  Loader2,
  UserCircle,
  School
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StreamlinedFeeCollection } from "@/components/finance/streamlined-fee-collection";
import { BulkFeeCollection } from "@/components/finance/bulk-fee-collection";
import { FeeCollectionStatsCards } from "@/components/finance/fee-collection-stats-cards";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    name?: string;
    class?: {
      name: string;
      id: string;
    };
  } | null;
  parent?: {
    fatherName?: string;
    motherName?: string;
    fatherMobile?: string;
    motherMobile?: string;
    fatherEmail?: string;
  } | null;
}

function FeeCollectionPageContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState('individual');
  const [isLoading, setIsLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();

  // Debounced search effect for real-time fuzzy search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setActiveSearchQuery('');
      setShowSearchResults(false);
      return;
    }

    const debounceTimeout = setTimeout(() => {
      setActiveSearchQuery(searchQuery.trim());
      setShowSearchResults(true);
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);



  const utils = api.useContext();
  // API calls
  const collectPaymentMutation = api.finance.createFeeCollection.useMutation({
    onMutate: async (newPayment) => {
      await utils.finance.getStudentFeeDetails.cancel({
        studentId: newPayment.studentId,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      const previousFees = utils.finance.getStudentFeeDetails.getData({
        studentId: newPayment.studentId,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      if (previousFees) {
        utils.finance.getStudentFeeDetails.setData(
          {
            studentId: newPayment.studentId,
            branchId: currentBranchId!,
            sessionId: currentSessionId!,
          },
          (oldQueryData) => {
            if (!oldQueryData) return oldQueryData;

            const updatedFees = oldQueryData.map((fee) => {
              const paidItem = newPayment.items.find(
                (item) => item.feeHeadId === fee.feeHeadId && item.feeTermId === fee.feeTermId
              );
              if (paidItem) {
                const newPaidAmount = fee.paidAmount + paidItem.amount;
                const newDueAmount = fee.totalAmount - newPaidAmount;
                return {
                  ...fee,
                  paidAmount: newPaidAmount,
                  dueAmount: newDueAmount,
                  status: (newDueAmount <= 0 ? 'Paid' : 'Partially Paid') as "Paid" | "Pending" | "Partially Paid" | "Overdue",
                };
              }
              return fee;
            });
            return updatedFees;
          }
        );
      }
      return { previousFees };
    },
    onError: (err, newPayment, context) => {
      if (context?.previousFees) {
        utils.finance.getStudentFeeDetails.setData(
          {
            studentId: newPayment.studentId,
            branchId: currentBranchId!,
            sessionId: currentSessionId!,
          },
          context.previousFees
        );
      }
      toast({
        title: "Payment Collection Failed",
        description: "There was an error processing the payment. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, variables) => {
      utils.finance.getStudentFeeDetails.invalidate({
        studentId: variables.studentId,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });
      utils.finance.getConcessionStats.invalidate({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment Collected Successfully",
        description: "Fee payment has been recorded.",
      });
    },
  });

  const bulkCollectPaymentsMutation = api.finance.createBulkFeeCollection.useMutation();

  const assignConcessionMutation = api.finance.assignConcession.useMutation({
    onMutate: async (newConcession) => {
      const studentId = newConcession.studentId;
      await utils.finance.getStudentFeeDetails.cancel({
        studentId: studentId,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      const previousFees = utils.finance.getStudentFeeDetails.getData({
        studentId: studentId,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      // This is a simplified optimistic update. A more accurate one would
      // require re-calculating the concession impact on each fee head.
      // For now, we just refetch on settled.
      
      return { previousFees, studentId };
    },
    onError: (err, newConcession, context) => {
      if (context?.previousFees) {
        utils.finance.getStudentFeeDetails.setData(
          {
            studentId: context.studentId,
            branchId: currentBranchId!,
            sessionId: currentSessionId!,
          },
          context.previousFees
        );
      }
      toast({
        title: "Error",
        description: err.message || "Failed to assign concession. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, variables) => {
      const studentId = variables.studentId;
      utils.finance.getStudentFeeDetails.invalidate({
        studentId: studentId,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });
      utils.finance.getConcessionStats.invalidate({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });
    },
    onSuccess: () => {
      toast({
        title: "Concession Assigned",
        description: "Student concession has been assigned successfully.",
      });
      void getStudentFeesQuery.refetch();
    },
  });
  
  const getStudentFeesQuery = api.finance.getStudentFeeDetails.useQuery(
    { 
      studentId: selectedStudent?.id || '',
      branchId: currentBranchId!,
      sessionId: currentSessionId!
    },
    { enabled: !!selectedStudent?.id && !!currentBranchId && !!currentSessionId }
  );

  const studentsQuery = api.finance.getStudents.useQuery(
    { 
      branchId: currentBranchId!, 
      sessionId: currentSessionId!,
      search: activeSearchQuery.trim() || undefined,
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const classesQuery = api.finance.getClasses.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const feeTermsQuery = api.finance.getFeeTerms.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const concessionTypesQuery = api.finance.getConcessionTypes.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { 
      enabled: !!currentBranchId && !!currentSessionId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    }
  );

  const feeHeadsQuery = api.finance.getFeeHeads.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  // Get branch details for receipt
  const branchQuery = api.branch.getById.useQuery(
    { id: currentBranchId! },
    { enabled: !!currentBranchId }
  );

  // Get session details for receipt  
  const sessionQuery = api.academicSession.getById.useQuery(
    { id: currentSessionId! },
    { enabled: !!currentSessionId }
  );

  // Note: feeCollectionsQuery removed as payment history is now handled within StreamlinedFeeCollection

  // Transform API data into the format expected by StreamlinedFeeCollection
  const feeItems = useMemo(() => {
    const studentFees = getStudentFeesQuery.data || [];
    
    // Transform fee details into FeeItem format
    return studentFees.map(fee => ({
      id: fee.id,
      feeHeadId: fee.feeHeadId,
      feeHeadName: fee.feeHead,
      feeTermId: fee.feeTermId,
      feeTermName: fee.term,
      originalAmount: fee.originalAmount,
      concessionAmount: fee.concessionAmount || 0,
      totalAmount: fee.totalAmount,
      paidAmount: fee.paidAmount,
      outstandingAmount: fee.dueAmount,
      dueDate: fee.dueDate || new Date().toISOString(),
      status: fee.status,
      appliedConcessions: fee.appliedConcessions || [],
    }));
  }, [getStudentFeesQuery.data]);

  // Fuzzy search function
  const fuzzyMatch = useCallback((text: string, query: string): number => {
    if (!query) return 0;
    if (!text) return -1;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact match gets highest score
    if (lowerText.includes(lowerQuery)) {
      const exactIndex = lowerText.indexOf(lowerQuery);
      return 100 - exactIndex; // Earlier matches score higher
    }
    
    // Fuzzy match - check if all query characters exist in order
    let textIndex = 0;
    let queryIndex = 0;
    let matches = 0;
    
    while (textIndex < lowerText.length && queryIndex < lowerQuery.length) {
      if (lowerText[textIndex] === lowerQuery[queryIndex]) {
        matches++;
        queryIndex++;
      }
      textIndex++;
    }
    
    if (queryIndex === lowerQuery.length) {
      return matches * 10; // Fuzzy match score
    }
    
    return -1; // No match
  }, []);

  // Function to highlight matching characters
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) {
      const index = lowerText.indexOf(lowerQuery);
      return (
        <>
          {text.substring(0, index)}
          <span className="bg-primary/20 dark:bg-primary/30 font-medium rounded-sm px-0.5">
            {text.substring(index, index + query.length)}
          </span>
          {text.substring(index + query.length)}
        </>
      );
    }
    
    return text;
  }, []);

  // Enhanced fuzzy search with scoring
  const searchResults = useMemo(() => {
    if (!activeSearchQuery.trim() || !studentsQuery.data) return [];
    
    const results = studentsQuery.data
      .map((student: any) => {
        const fullName = `${student.firstName} ${student.lastName}`;
        const className = student.section?.class?.name || '';
        
        // Calculate scores for different fields
        const nameScore = fuzzyMatch(fullName, activeSearchQuery);
        const admissionScore = fuzzyMatch(student.admissionNumber, activeSearchQuery);
        const classScore = fuzzyMatch(className, activeSearchQuery);
        
        const maxScore = Math.max(nameScore, admissionScore, classScore);
        
        return {
          ...student,
          searchScore: maxScore
        };
      })
      .filter((student: any) => student.searchScore > 0)
      .sort((a: any, b: any) => b.searchScore - a.searchScore)
      .slice(0, 8); // Show top 8 results
    
    return results;
  }, [activeSearchQuery, studentsQuery.data, fuzzyMatch]);

  // Show search results when they become available
  useEffect(() => {
    if (activeSearchQuery && searchResults.length > 0 && searchQuery.trim()) {
      setShowSearchResults(true);
    } else if (!searchQuery.trim()) {
      setShowSearchResults(false);
    }
    // Reset selected index when search results change
    setSelectedResultIndex(-1);
  }, [searchResults, activeSearchQuery, searchQuery]);

  // Handle search input focus and blur
  const handleSearchFocus = () => {
    if (activeSearchQuery && searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow for clicking on results
    setTimeout(() => {
      setShowSearchResults(false);
      setSelectedResultIndex(-1);
    }, 200);
  };

  // Handle keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedResultIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedResultIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedResultIndex >= 0 && selectedResultIndex < searchResults.length) {
          handleStudentSelect(searchResults[selectedResultIndex] as Student);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSearchResults(false);
        setSelectedResultIndex(-1);
        break;
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery(''); // Clear search query completely
    setActiveSearchQuery('');
    setShowSearchResults(false);
    toast({
      title: "Student Selected",
      description: `Selected ${student.firstName} ${student.lastName}`,
    });
  };

  const handleCollectPayment = async (paymentData: {
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
  }): Promise<{ receiptNumber: string; totalAmount: number; }> => {
    try {
      setIsLoading(true);
      
      // New logic: Single API call for all fees across all terms
      const result = await collectPaymentMutation.mutateAsync({
        studentId: paymentData.studentId,
        items: paymentData.selectedFees.map(fee => ({
          feeHeadId: fee.feeHeadId,
          feeTermId: fee.feeTermId,
          amount: fee.amount,
          originalAmount: fee.originalAmount,
          concessionAmount: fee.concessionAmount,
        })),
        paymentMode: paymentData.paymentMode as "Cash" | "Card" | "Online" | "Cheque" | "DD" | "Bank Transfer",
        transactionReference: paymentData.transactionReference,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      const totalAmount = paymentData.selectedFees.reduce((sum, fee) => sum + fee.amount, 0);

      return {
        receiptNumber: result?.receiptNumber || `RCP-${Date.now()}`,
        totalAmount,
      };
    } catch (error) {
      toast({
        title: "Payment Collection Failed",
        description: "There was an error processing the payment. Please try again.",
        variant: "destructive",
      });
      console.error('Payment collection error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkCollectPayments = async (payments: Array<{
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
  }>) => {
    try {
      setIsLoading(true);
      await bulkCollectPaymentsMutation.mutateAsync({
        collections: payments.map(payment => ({
          studentId: payment.studentId,
          feeTermId: payment.feeTermId,
          paymentMode: payment.paymentMode as "Cash" | "Card" | "Online" | "Cheque" | "DD" | "Bank Transfer",
          transactionReference: payment.transactionReference,
          paymentDate: payment.paymentDate,
          notes: payment.notes,
          items: payment.items,
        })),
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      toast({
        title: "Bulk Payments Collected",
        description: `Successfully processed ${payments.length} payments.`,
      });

      await studentsQuery.refetch();
    } catch (error) {
      toast({
        title: "Bulk Payment Failed",
        description: "There was an error processing the bulk payments. Please try again.",
        variant: "destructive",
      });
      console.error('Bulk payment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStudentFees = async (studentId: string, feeTermId?: string) => {
    // Use the actual API to get student fees
    const response = await fetch(`/api/trpc/finance.getStudentFeeDetails?input=${encodeURIComponent(JSON.stringify({
      studentId,
      feeTermId,
      branchId: currentBranchId,
      sessionId: currentSessionId,
    }))}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch student fees');
    }
    
    const data = await response.json();
    const feeDetails = data.result?.data || [];
    
    // Transform the API response to match the expected format
    return feeDetails.map((fee: any) => ({
      id: fee.id,
      feeHeadId: fee.feeHeadId,
      feeHeadName: fee.feeHead,
      feeTermId: fee.feeTermId,
      feeTermName: fee.term,
      amount: fee.totalAmount,
      dueDate: new Date(fee.dueDate),
      outstandingAmount: fee.dueAmount,
      status: fee.status,
    }));
  };

  const handleAssignConcession = async (concessionData: any) => {
    if (!currentBranchId || !currentSessionId) return;

    await assignConcessionMutation.mutateAsync({
      ...concessionData,
      branchId: currentBranchId,
      sessionId: currentSessionId,
      createdBy: 'current-user', // TODO: Get from auth context
    });
  };

  const handleRefreshFees = async () => {
    await getStudentFeesQuery.refetch();
  };

  if (!currentBranchId || !currentSessionId) {
      return (
    <PageWrapper title="Fee Collection" subtitle="Collect student fees efficiently">
        <Alert className="border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            Please select a branch and academic session to access fee collection features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      title="Fee Collection" 
      subtitle="Manage and collect student fees"
    >
      <div className="space-y-6">
        {/* Header Section with Stats */}
        <div className="@container/main hidden lg:block">
          <FeeCollectionStatsCards />
        </div>

        {/* Search and Navigation Section */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                <TabsList className="w-full lg:w-auto grid grid-cols-2 bg-gray-100 dark:bg-[#404040]">
                  <TabsTrigger 
                    value="individual" 
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#505050] data-[state=active]:shadow-sm"
                  >
                    <UserCircle className="h-4 w-4 mr-2" />
                    Individual
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bulk"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#505050] data-[state=active]:shadow-sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Bulk
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search Box */}
              <div className="relative w-full lg:w-96">
                <div className="relative">
                  <Input
                    placeholder="Search by name, admission number, or class..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedResultIndex(-1);
                    }}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-10 pr-10 h-10 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  
                  {searchQuery && (
                    <div className="absolute right-3 top-3">
                      {studentsQuery.isLoading && activeSearchQuery ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setActiveSearchQuery('');
                            setShowSearchResults(false);
                            setSelectedStudent(null);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchResults && activeSearchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50">
                    <Card className="border border-gray-200 dark:border-gray-700 shadow-xl bg-white dark:bg-[#303030] py-0 rounded-t-lg">
                      <CardContent className="p-0">
                        {searchResults.length > 0 ? (
                          <>
                            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#404040] rounded-t-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Found {searchResults.length} student{searchResults.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                              {searchResults.map((student: any, index: number) => (
                                <div
                                  key={student.id}
                                  className={cn(
                                    "px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-[#383838] rounded-b-lg",
                                    index === selectedResultIndex && "bg-primary/5 dark:bg-primary/10"
                                  )}
                                  onClick={() => handleStudentSelect(student as Student)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-[#505050] flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {student.firstName[0]}{student.lastName[0]}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        {highlightMatch(`${student.firstName} ${student.lastName}`, activeSearchQuery)}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{highlightMatch(student.admissionNumber, activeSearchQuery)}</span>
                                        <span>•</span>
                                        <span>{highlightMatch(student.section?.class?.name || 'No class', activeSearchQuery)}</span>
                                      </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-gray-400" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="p-8 text-center">
                            {studentsQuery.isLoading ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                <p className="text-sm text-gray-500">Searching...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 text-gray-300" />
                                <p className="text-sm text-gray-500">No students found</p>
                                <p className="text-xs text-gray-400">Try a different search term</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="individual" className="space-y-4 mt-0">
            {selectedStudent && !getStudentFeesQuery.isLoading && (
              <StreamlinedFeeCollection
                student={selectedStudent as any}
                feeItems={feeItems}
                isLoading={getStudentFeesQuery.isLoading}
                onCollectPayment={handleCollectPayment}
                concessionTypes={concessionTypesQuery.data as any[] || []}
                feeHeads={feeHeadsQuery.data || []}
                feeTerms={feeTermsQuery.data || []}
                onAssignConcession={handleAssignConcession}
                onRefreshFees={handleRefreshFees}
                branch={{
                  name: branchQuery.data?.name || 'School Name',
                  address: branchQuery.data?.address || undefined,
                  city: branchQuery.data?.city || undefined,
                  state: branchQuery.data?.state || undefined,
                }}
                session={{
                  name: sessionQuery.data?.name || 'Academic Session',
                }}
              />
            )}

            {selectedStudent && getStudentFeesQuery.isLoading && (
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">Loading fee details...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedStudent && !getStudentFeesQuery.isLoading && feeItems.length === 0 && (
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
                <CardContent className="p-12">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No Fee Structure Found</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No fees have been configured for this student's class and section.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedStudent && (
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
                <CardContent className="p-12 lg:p-24">
                  <div className="text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-[#404040] flex items-center justify-center">
                      <School className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-gray-100">Select a Student</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Search for a student using the search bar above to start collecting fees
                    </p>
                    <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Search className="h-4 w-4" />
                      <span>You can search by name, admission number, or class</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4 mt-0">
            <BulkFeeCollection
              students={(studentsQuery.data as any[]) || []}
              classes={classesQuery.data || []}
              feeTerms={feeTermsQuery.data || []}
              onGetStudentFees={handleGetStudentFees}
              onBulkCollectPayments={handleBulkCollectPayments}
              onExportData={(data) => {
                const csvContent = data.map(item => 
                  `${item.student.firstName} ${item.student.lastName},${item.student.admissionNumber},${item.totalOutstanding}`
                ).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'student-fees-export.csv';
                a.click();
                
                toast({
                  title: "Data Exported",
                  description: "Fee collection data has been exported successfully.",
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicFeeCollectionPageContent = dynamic(() => Promise.resolve(FeeCollectionPageContent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Loading Fee Collection...</p>
      </div>
    </div>
  )
});

export default function FeeCollectionPage() {
  return <DynamicFeeCollectionPageContent />;
}