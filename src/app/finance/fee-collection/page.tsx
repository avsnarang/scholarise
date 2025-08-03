"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  X,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StreamlinedFeeCollection } from "@/components/finance/streamlined-fee-collection";
import { BulkFeeCollection } from "@/components/finance/bulk-fee-collection";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
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
  } | null;
  parent?: {
    firstName: string;
    lastName: string;
    fatherMobile?: string;
    motherMobile?: string;
    email?: string;
  } | null;
}

export default function FeeCollectionPage() {
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



  // API calls
  const collectPaymentMutation = api.finance.createFeeCollection.useMutation({
    onSuccess: () => {
      toast({
        title: "Payment Collected Successfully",
        description: "Fee payment has been recorded.",
      });
    },
  });

  const bulkCollectPaymentsMutation = api.finance.createBulkFeeCollection.useMutation();

  const assignConcessionMutation = api.finance.assignConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Concession Assigned",
        description: "Student concession has been assigned successfully.",
      });
      void getStudentFeesQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign concession. Please try again.",
        variant: "destructive",
      });
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
    { enabled: !!currentBranchId && !!currentSessionId }
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
          <span className="bg-yellow-200 dark:bg-yellow-700 font-medium">
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
    setSearchQuery(`${student.firstName} ${student.lastName}`);
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
        })),
        paymentMode: paymentData.paymentMode as "Cash" | "Card" | "Online" | "Cheque" | "DD" | "Bank Transfer",
        transactionReference: paymentData.transactionReference,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes,
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });

      const totalAmount = paymentData.selectedFees.reduce((sum, fee) => sum + fee.amount, 0);

      await getStudentFeesQuery.refetch();

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
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access fee collection features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Fee Collection" subtitle="Collect student fees efficiently">
      <div className="space-y-6">
                {/* Search and Tabs */}
        <div className="flex items-center justify-between">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-fit grid-cols-2 h-9">
              <TabsTrigger value="individual" className="px-4">Individual</TabsTrigger>
              <TabsTrigger value="bulk" className="px-4">Bulk</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedResultIndex(-1); // Reset selection when typing
              }}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onKeyDown={handleSearchKeyDown}
              className="pl-8 pr-8 h-9 w-64 text-sm"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            
            {/* Loading indicator or Clear button */}
            {searchQuery && (
              <div className="absolute right-2 top-2.5">
                {studentsQuery.isLoading && activeSearchQuery ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveSearchQuery('');
                      setShowSearchResults(false);
                      setSelectedStudent(null);
                    }}
                    className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            
            {/* Search Results Overlay */}
            {showSearchResults && activeSearchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <div className="bg-background/95 backdrop-blur-sm border border-border/50 dark:border-gray-700/50 rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                  {searchResults.length > 0 ? (
                    <>
                      {/* Header with results count */}
                      <div className="px-3 py-2 border-b border-border/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {searchResults.length} student{searchResults.length !== 1 ? 's' : ''} found
                          </span>
                        </div>
                      </div>
                      
                      {/* Results list */}
                      <div className="max-h-80 overflow-y-auto py-1">
                        {searchResults.map((student: any, index: number) => (
                          <div
                            key={student.id}
                            className={`mx-1 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                              index === selectedResultIndex 
                                ? 'bg-primary/15 dark:bg-primary/25 border-l-2 border-primary shadow-sm' 
                                : 'hover:bg-muted/70 dark:hover:bg-muted/40 hover:shadow-sm'
                            }`}
                            onClick={() => handleStudentSelect(student as Student)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-semibold text-primary">
                                      {student.firstName[0]}{student.lastName[0]}
                                    </span>
                                  </div>
                                  <div className="font-medium text-sm text-foreground truncate">
                                    {highlightMatch(`${student.firstName} ${student.lastName}`, activeSearchQuery)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground ml-10">
                                  <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                                    {highlightMatch(student.admissionNumber, activeSearchQuery)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <div className="h-1 w-1 rounded-full bg-muted-foreground/40"></div>
                                    {highlightMatch(student.section?.class?.name || 'No class', activeSearchQuery)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center text-muted-foreground ml-3">
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      {studentsQuery.isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Searching students...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                            <Search className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-foreground">No students found</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Try searching with a different term
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
              </div>

        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="individual" className="space-y-4 mt-0">
          {/* Fee Collection Form */}
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
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading fee details...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedStudent && !getStudentFeesQuery.isLoading && feeItems.length === 0 && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Fee Structure Found</h3>
                  <p className="text-muted-foreground">
                    No fees have been configured for this student's class and section.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedStudent && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Search for a Student</h3>
                  <p className="text-muted-foreground">
                    Use the search bar above to find a student and collect fees.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
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