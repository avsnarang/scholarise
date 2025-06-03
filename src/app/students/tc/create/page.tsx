"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, ArrowLeft, User, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useActionPermissions } from "@/utils/permission-utils";
import { Permission } from "@/types/permissions";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/usePermissions";
import type { CheckedState } from "@radix-ui/react-checkbox";

export default function CreateTransferCertificatePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [tcNumber, setTcNumber] = useState("");
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();

  const { hasPermission } = useActionPermissions("students");
  const canManageTC = hasPermission(Permission.MANAGE_TRANSFER_CERTIFICATES);

  const { isSuperAdmin } = usePermissions();

  // Search students query
  const { data: searchResults, isLoading: isSearching } = api.transferCertificate.searchStudents.useQuery(
    {
      search: searchTerm,
      branchId: getBranchFilterParam(),
    },
    {
      enabled: searchTerm.length >= 2,
    }
  );

  // Create TC mutation with optimistic updates
  const createTCMutation = api.transferCertificate.create.useMutation({
    onMutate: async ({ studentId, reason, remarks, tcNumber, isAutomatic }) => {
      // Cancel any outgoing refetches
      await utils.transferCertificate.getAll.cancel();
      await utils.transferCertificate.searchStudents.cancel();
      
      // Generate optimistic TC number if auto
      let optimisticTCNumber = tcNumber?.trim();
      if (isAutomatic || !optimisticTCNumber) {
        const year = new Date().getFullYear();
        // Get current count from existing cache
        const existingData = utils.transferCertificate.getAll.getData({
          branchId: getBranchFilterParam(),
          limit: 50,
        });
        const currentCount = existingData?.items.length || 0;
        optimisticTCNumber = `TC${year}${String(currentCount + 1).padStart(4, '0')}`;
      }

      // Create comprehensive optimistic TC entry with complete data structure
      if (selectedStudent && optimisticTCNumber) {
        const now = new Date();
        const optimisticTC = {
          id: `temp-${Date.now()}`, // Temporary ID
          tcNumber: optimisticTCNumber,
          issueDate: now,
          reason: reason?.trim() || null,
          remarks: remarks?.trim() || null,
          createdAt: now,
          updatedAt: now,
          studentId: selectedStudent.id,
          student: {
            ...selectedStudent,
            isActive: false, // Student becomes inactive
            branch: selectedStudent.branch || {
              id: getBranchFilterParam() || '',
              name: 'Current Branch',
              code: '',
              address: '',
              city: '',
              state: '',
              country: '',
              phone: '',
              email: '',
              createdAt: now,
              updatedAt: now,
              order: 0,
            },
          },
        };

        // Use only specific cache keys to avoid duplication
        const mainPageKey = { branchId: getBranchFilterParam(), limit: 50 };
        const historyPageKey = { branchId: getBranchFilterParam(), limit: 100 };
        
        // Snapshot existing data for rollback
        const mainPageData = utils.transferCertificate.getAll.getData(mainPageKey);
        const historyPageData = utils.transferCertificate.getAll.getData(historyPageKey);
        
        // Update only the main cache entries
        if (mainPageData) {
          utils.transferCertificate.getAll.setData(mainPageKey, {
            ...mainPageData,
            items: [optimisticTC, ...mainPageData.items],
          });
        }
        
        if (historyPageData) {
          utils.transferCertificate.getAll.setData(historyPageKey, {
            ...historyPageData,
            items: [optimisticTC, ...historyPageData.items],
          });
        }

        // Remove student from search results optimistically
        const searchKey = { search: searchTerm, branchId: getBranchFilterParam() };
        const searchData = utils.transferCertificate.searchStudents.getData(searchKey);
        
        if (searchData) {
          const updatedSearchResults = searchData.filter(
            student => student.id !== selectedStudent.id
          );
          utils.transferCertificate.searchStudents.setData(searchKey, updatedSearchResults);
        }

        return { 
          mainPageKey,
          historyPageKey,
          mainPageData, 
          historyPageData,
          searchKey,
          searchData,
          optimisticTC 
        };
      }

      return { 
        mainPageKey: null,
        historyPageKey: null,
        mainPageData: null, 
        historyPageData: null,
        searchKey: null,
        searchData: null, 
        optimisticTC: null 
      };
    },
    onSuccess: async (data) => {
      // Show success message
      toast({
        title: "Success",
        description: `Transfer Certificate ${data.tcNumber} created successfully.`,
      });
      
      // Wait a moment to ensure optimistic updates are visible
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to main page - optimistic updates should already be visible
      router.push("/students/tc");
      
      // Then invalidate queries to sync with server data
      setTimeout(() => {
        utils.transferCertificate.getAll.invalidate();
        utils.transferCertificate.searchStudents.invalidate();
        utils.student.getAll.invalidate();
        utils.student.getStats.invalidate();
      }, 200);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.mainPageData && context?.mainPageKey) {
        utils.transferCertificate.getAll.setData(context.mainPageKey, context.mainPageData);
      }
      
      if (context?.historyPageData && context?.historyPageKey) {
        utils.transferCertificate.getAll.setData(context.historyPageKey, context.historyPageData);
      }
      
      // Rollback search results
      if (context?.searchData && context?.searchKey) {
        utils.transferCertificate.searchStudents.setData(context.searchKey, context.searchData);
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to create transfer certificate.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Final sync with server after a delay to not override optimistic updates
      setTimeout(() => {
        utils.transferCertificate.getAll.invalidate();
        utils.transferCertificate.searchStudents.invalidate();
      }, 500);
    },
  });

  const handleCreateTC = async () => {
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Please select a student first.",
        variant: "destructive",
      });
      return;
    }

    // Validate TC number input
    if (!isAutomatic && !tcNumber.trim()) {
      toast({
        title: "Error",
        description: "Please provide a TC number or enable auto-generation.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createTCMutation.mutateAsync({
        studentId: selectedStudent.id,
        reason: reason.trim() || undefined,
        remarks: remarks.trim() || undefined,
        tcNumber: tcNumber.trim() || undefined,
        isAutomatic: isAutomatic,
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!canManageTC) {
    return (
      <PageWrapper title="Create Transfer Certificate" subtitle="Generate Transfer Certificate">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have permission to create transfer certificates.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Transfer Certificate</h1>
            <p className="text-sm text-gray-600">
              Search for a student and generate their transfer certificate
            </p>
          </div>
          <Link href="/students/tc">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to TCs
            </Button>
          </Link>
        </div>

        {/* Student Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Student</CardTitle>
            <CardDescription>
              Search by student name or admission number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter student name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {searchTerm.length >= 2 && (
                <div className="space-y-2">
                  {isSearching ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Searching...</p>
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Found {searchResults.length} student(s):
                      </p>
                      {searchResults.map((student) => (
                        <div
                          key={student.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedStudent?.id === student.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">
                                  {student.firstName} {student.lastName}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs text-gray-600">
                                <span>Admission: {student.admissionNumber}</span>
                                <span>Gender: {student.gender}</span>
                              </div>
                            </div>
                            {selectedStudent?.id === student.id && (
                              <div className="text-blue-600 text-sm font-medium">Selected</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchTerm.length >= 2 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No active students found matching your search.</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Student Details */}
        {selectedStudent && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Student</CardTitle>
              <CardDescription>
                Review student details before generating transfer certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Student Name</Label>
                    <p className="text-sm text-gray-900">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Admission Number</Label>
                    <p className="text-sm text-gray-900">{selectedStudent.admissionNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Class</Label>
                    <p className="text-sm text-gray-900">
                      {selectedStudent.class ? 
                        `${selectedStudent.class.name} ${selectedStudent.class.section}` : 
                        'Not assigned'
                      }
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Parent/Guardian</Label>
                    <p className="text-sm text-gray-900">
                      {selectedStudent.parent?.fatherName || 
                       selectedStudent.parent?.motherName || 
                       selectedStudent.parent?.guardianName || 
                       'Not available'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Date of Birth</Label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedStudent.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Gender</Label>
                    <p className="text-sm text-gray-900">{selectedStudent.gender}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TC Details Form */}
        {selectedStudent && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Certificate Details</CardTitle>
              <CardDescription>
                Provide additional information for the transfer certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAutomatic"
                    checked={isAutomatic}
                    onCheckedChange={(checked: CheckedState) => setIsAutomatic(checked === true)}
                  />
                  <Label htmlFor="isAutomatic" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Auto-generate TC Number
                    {isSuperAdmin && (
                      <span className="text-xs text-gray-500 ml-1">(Super Admin)</span>
                    )}
                  </Label>
                </div>
                
                {!isAutomatic && (
                  <div>
                    <Label htmlFor="tcNumber">Transfer Certificate Number *</Label>
                    <Input
                      id="tcNumber"
                      placeholder="Enter TC number (e.g., TC20240001)"
                      value={tcNumber}
                      onChange={(e) => setTcNumber(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a unique TC number. Format suggestion: TC{new Date().getFullYear()}XXXX
                    </p>
                  </div>
                )}
                
                {isAutomatic && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      TC number will be automatically generated in format: TC{new Date().getFullYear()}XXXX
                    </p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="reason">Reason for Transfer (Optional)</Label>
                  <Input
                    id="reason"
                    placeholder="e.g., Family relocation, Change of school preference"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="remarks">Additional Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Any additional notes or remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {selectedStudent && (
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStudent(null);
                setReason("");
                setRemarks("");
                setTcNumber("");
                setIsAutomatic(false);
              }}
            >
              Clear Selection
            </Button>
            <Button
              onClick={handleCreateTC}
              disabled={isCreating || createTCMutation.isPending}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating TC...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Transfer Certificate
                </>
              )}
            </Button>
          </div>
        )}
      </div>
  );
} 