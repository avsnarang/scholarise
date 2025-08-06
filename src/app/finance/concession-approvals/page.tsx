"use client";

import React, { useState, useMemo } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  User,
  FileText,
  Filter,
  AlertCircle,
  Eye,
  Gavel,
  UserCheck,
  UserX,
  IndianRupee,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { ConcessionApprovalModal } from "@/components/finance/concession-approval-modal";
import { ConcessionRejectionModal } from "@/components/finance/concession-rejection-modal";
import { ConcessionApprovalSettings } from "@/components/finance/concession-approval-settings";
import { ConcessionAmountDisplay } from "@/components/finance/concession-amount-display";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/hooks/useAuth";

interface PendingConcession {
  id: string;
  studentId: string;
  concessionTypeId: string;
  createdBy?: string | null;

  reason?: string | null;
  validFrom: Date;
  validUntil?: Date | null;
  notes?: string | null;
  status: "APPROVED" | "PENDING" | "REJECTED" | "SUSPENDED" | "EXPIRED" | "PENDING_FIRST" | "PENDING_SECOND";
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    section?: {
      name: string;
      class: {
        name: string;
      };
    } | null;
  };
  concessionType: {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    appliedFeeHeads: string[];
    appliedFeeTerms: string[];
  };
}

// Status badge component
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200">
          <Clock className="w-3 h-3" />
          Pending Review
        </Badge>
      );
    case 'PENDING_FIRST':
      return (
        <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200">
          <Clock className="w-3 h-3" />
          Pending First Approval
        </Badge>
      );
    case 'PENDING_SECOND':
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200">
          <Clock className="w-3 h-3" />
          Pending Second Approval
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          {status}
        </Badge>
      );
  }
};

export default function ConcessionApprovalsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  // Modal states
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedConcession, setSelectedConcession] = useState<PendingConcession | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Helper function to check if a concession applies to a specific fee head/term
  const shouldConcessionApply = (concession: any, feeDetail: any) => {
    // Check if concession applies to this fee head (empty array means all fee heads)
    if (concession.concessionType.appliedFeeHeads?.length > 0 && 
        !concession.concessionType.appliedFeeHeads.includes(feeDetail.feeHeadId)) {
      return false;
    }
    
    // Check if concession applies to this fee term (empty array means all fee terms)
    if (concession.concessionType.appliedFeeTerms?.length > 0 && 
        !concession.concessionType.appliedFeeTerms.includes(feeDetail.feeTermId)) {
      return false;
    }
    
    return true;
  };

  // Helper function to calculate concession amount for a specific fee
  const calculateConcessionAmount = (concession: any, feeDetail: any) => {
    const concessionValue = concession.concessionType.value;
    let concessionAmount = 0;
    
    if (concession.concessionType.type === 'PERCENTAGE') {
      concessionAmount = feeDetail.originalAmount * (concessionValue / 100);
    } else {
      // For FIXED concessions, check if there are per-term amounts configured
      if (concession.concessionType.feeTermAmounts && 
          typeof concession.concessionType.feeTermAmounts === 'object' &&
          concession.concessionType.feeTermAmounts[feeDetail.feeTermId]) {
        // Use the specific amount for this fee term
        concessionAmount = concession.concessionType.feeTermAmounts[feeDetail.feeTermId];
      } else {
        // Fallback to the base value (for backward compatibility)
        concessionAmount = concessionValue;
      }
    }
    
    return concessionAmount;
  };

  // API queries
  const { data: concessions, isLoading, refetch, error } = api.finance.getStudentConcessions.useQuery({
    branchId: currentBranchId!,
    sessionId: currentSessionId!,
    status: statusFilter as "APPROVED" | "PENDING" | "REJECTED" | "SUSPENDED" | "EXPIRED" || undefined,
  }, {
    enabled: !!currentBranchId && !!currentSessionId,
  });

  // Get approval settings
  const { data: approvalSettings, isLoading: settingsLoading } = api.finance.getApprovalSettings.useQuery({
    branchId: currentBranchId!,
    sessionId: currentSessionId!,
  }, {
    enabled: !!currentBranchId && !!currentSessionId,
  });

  // Get user's approval permissions
  const { data: userPermissions, isLoading: permissionsLoading } = api.finance.checkApprovalPermissions.useQuery({
    branchId: currentBranchId!,
    sessionId: currentSessionId!,
    userId: user?.id || '',
    userEmail: user?.email || '',
  }, {
    enabled: !!currentBranchId && !!currentSessionId && !!user?.id,
  });

  // API mutations
    const utils = api.useContext();
  const approveConcessionMutation = api.finance.approveConcession.useMutation({
    onMutate: async (approval) => {
      // Cancel outgoing queries to prevent race conditions
      await utils.finance.getStudentConcessions.cancel({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
        status: statusFilter as any,
      });

      // Find the concession being approved
      const previousConcessions = utils.finance.getStudentConcessions.getData({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
        status: statusFilter as any,
      });

      const concessionToApprove = previousConcessions?.find(c => c.id === approval.concessionId);

      // Optimistically remove the concession from the pending list
      if (previousConcessions) {
        utils.finance.getStudentConcessions.setData(
          {
            branchId: currentBranchId!,
            sessionId: currentSessionId!,
            status: statusFilter as any,
          },
          previousConcessions.filter((c) => c.id !== approval.concessionId)
        );
      }

      // Optimistically update the student's fee details if concession is being approved
      if (concessionToApprove) {
        await utils.finance.getStudentFeeDetails.cancel({
          studentId: concessionToApprove.studentId,
          branchId: currentBranchId!,
          sessionId: currentSessionId!,
        });

        const previousFeeDetails = utils.finance.getStudentFeeDetails.getData({
          studentId: concessionToApprove.studentId,
          branchId: currentBranchId!,
          sessionId: currentSessionId!,
        });

        if (previousFeeDetails) {
          // Calculate the new fee details with the approved concession
          const updatedFeeDetails = previousFeeDetails.map(feeDetail => {
            // Check if this concession applies to this fee head and term
            const appliesTo = shouldConcessionApply(concessionToApprove, feeDetail);
            
            if (appliesTo) {
              // Calculate the concession amount for this fee
              const concessionAmount = calculateConcessionAmount(concessionToApprove, feeDetail);
              
              // Add this concession to the applied concessions
              const newAppliedConcessions = [
                ...(feeDetail.appliedConcessions || []),
                {
                  id: concessionToApprove.id,
                  name: concessionToApprove.concessionType.name,
                  type: concessionToApprove.concessionType.type,
                  value: concessionToApprove.concessionType.value,
                  amount: concessionAmount,
                  reason: concessionToApprove.reason,
                }
              ];

              // Recalculate totals
              const newTotalConcessionAmount = (feeDetail.concessionAmount || 0) + concessionAmount;
              const newTotalAmount = Math.max(0, feeDetail.originalAmount - newTotalConcessionAmount);
              const newOutstandingAmount = Math.max(0, newTotalAmount - feeDetail.paidAmount);

              return {
                ...feeDetail,
                concessionAmount: newTotalConcessionAmount,
                totalAmount: newTotalAmount,
                outstandingAmount: newOutstandingAmount,
                appliedConcessions: newAppliedConcessions,
              };
            }
            
            return feeDetail;
          });

          // Set the optimistically updated fee details
          utils.finance.getStudentFeeDetails.setData(
            {
              studentId: concessionToApprove.studentId,
              branchId: currentBranchId!,
              sessionId: currentSessionId!,
            },
            updatedFeeDetails
          );
        }
      }

      return { previousConcessions, concessionToApprove };
    },
    onError: (err, approval, context) => {
      // Restore the previous concessions list
      if (context?.previousConcessions) {
        utils.finance.getStudentConcessions.setData(
          {
            branchId: currentBranchId!,
            sessionId: currentSessionId!,
            status: statusFilter as any,
          },
          context.previousConcessions
        );
      }

      // Restore the previous fee details if they were optimistically updated
      if (context?.concessionToApprove) {
        // This will trigger a refetch of the fee details to restore the original state
        utils.finance.getStudentFeeDetails.invalidate({
          studentId: context.concessionToApprove.studentId,
          branchId: currentBranchId!,
          sessionId: currentSessionId!,
        });
      }

      toast({
        title: "Error",
        description: err.message || "Failed to approve concession",
        variant: "destructive",
      });
    },
    onSettled: () => {
      utils.finance.getStudentConcessions.invalidate({
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
        title: "Success",
        description: "Concession approved successfully",
      });
      setIsApprovalModalOpen(false);
      setSelectedConcession(null);
    },
  });

  const rejectConcessionMutation = api.finance.rejectConcession.useMutation({
    onMutate: async (rejection) => {
      await utils.finance.getStudentConcessions.cancel({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
        status: statusFilter as any,
      });

      const previousConcessions = utils.finance.getStudentConcessions.getData({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
        status: statusFilter as any,
      });

      if (previousConcessions) {
        utils.finance.getStudentConcessions.setData(
          {
            branchId: currentBranchId!,
            sessionId: currentSessionId!,
            status: statusFilter as any,
          },
          previousConcessions.filter((c) => c.id !== rejection.concessionId)
        );
      }

      return { previousConcessions };
    },
    onError: (err, rejection, context) => {
      if (context?.previousConcessions) {
        utils.finance.getStudentConcessions.setData(
          {
            branchId: currentBranchId!,
            sessionId: currentSessionId!,
            status: statusFilter as any,
          },
          context.previousConcessions
        );
      }
      toast({
        title: "Error",
        description: err.message || "Failed to reject concession",
        variant: "destructive",
      });
    },
    onSettled: () => {
      utils.finance.getStudentConcessions.invalidate({
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
        title: "Success",
        description: "Concession rejected successfully",
      });
      setIsRejectionModalOpen(false);
      setSelectedConcession(null);
    },
  });

  const saveApprovalSettingsMutation = api.finance.saveApprovalSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval settings saved successfully",
      });
      setIsSettingsModalOpen(false);
      
      // Invalidate approval settings and user permissions to reflect changes
      utils.finance.getApprovalSettings.invalidate({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
      });
      utils.finance.checkApprovalPermissions.invalidate({
        branchId: currentBranchId!,
        sessionId: currentSessionId!,
        userId: user?.id || '',
        userEmail: user?.email || '',
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save approval settings",
        variant: "destructive",
      });
    },
  });

  // Filter pending concessions
  const pendingConcessions = useMemo(() => {
    if (!concessions || !Array.isArray(concessions)) {
      console.log('No concessions data or not array:', concessions);
      return [];
    }
    
    // Debug logging to see data structure
    console.log('Raw concessions data:', concessions);
    
    const filtered = concessions.filter(c => {
      if (!c || typeof c !== 'object') {
        console.warn('Invalid concession item:', c);
        return false;
      }
      
      // Validate nested objects
      if (!c.student || typeof c.student !== 'object') {
        console.warn('Invalid student object in concession:', c);
        return false;
      }
      
      if (!c.concessionType || typeof c.concessionType !== 'object') {
        console.warn('Invalid concessionType object in concession:', c);
        return false;
      }
      
      return c?.status === 'PENDING' || 
             c?.status === 'PENDING_FIRST' || 
             c?.status === 'PENDING_SECOND';
    });
    
    console.log('Filtered pending concessions:', filtered);
    console.log('Sample concession object:', filtered[0]);
    return filtered;
  }, [concessions]);

  // Handle approval
  const handleApprove = (concession: PendingConcession) => {
    setSelectedConcession(concession);
    setIsApprovalModalOpen(true);
  };

  // Handle rejection
  const handleReject = (concession: PendingConcession) => {
    setSelectedConcession(concession);
    setIsRejectionModalOpen(true);
  };

  // Check if user can approve/reject specific concession
  const checkConcessionPermissions = (concession: PendingConcession) => {
    if (!user?.id) {
      return { canApprove: false, canReject: false, message: "User not authenticated" };
    }
    
    if (settingsLoading || permissionsLoading) {
      return { canApprove: false, canReject: false, message: "Loading permissions..." };
    }
    
    if (!approvalSettings || !userPermissions) {
      return { canApprove: false, canReject: false, message: "No approval settings configured" };
    }

    const concessionAmount = concession.concessionType.value;
    
    // Check if amount exceeds maximum
    if (concessionAmount > approvalSettings.maxApprovalAmount) {
      return { canApprove: false, canReject: false, message: "Amount exceeds maximum limit" };
    }

    // Auto-approved items can't be manually approved
    if (concessionAmount <= approvalSettings.autoApproveBelow) {
      return { canApprove: false, canReject: false, message: "Should be auto-approved" };
    }

    // Self-approval check - users should not approve their own concessions
    const isOwnConcession = concession.createdBy === user?.id;
    if (isOwnConcession) {
      return { canApprove: false, canReject: false, message: "Cannot approve own concession" };
    }

    let canApprove = false;
    let canReject = false;
    let message = "";

    // Determine approval stage based on concession status and settings
    if (approvalSettings.approvalType === '1_PERSON') {
      // Single approval system
      canApprove = userPermissions.canApprove;
      canReject = userPermissions.canApprove; // Same permission for reject
      message = canApprove ? "Ready for approval" : "No approval permission";
    } else if (approvalSettings.approvalType === '2_PERSON') {
      // Two-person approval system
      const requiresSecondApproval = concessionAmount > approvalSettings.escalationThreshold;
      
      if (concession.status === 'PENDING' || concession.status === 'PENDING_FIRST') {
        // First approval stage
        canApprove = userPermissions.canApprove;
        canReject = userPermissions.canApprove;
        message = canApprove ? "First approval required" : "No first approval permission";
      } else if (concession.status === 'PENDING_SECOND') {
        // Second approval stage
        canApprove = userPermissions.canSecondApprove;
        canReject = userPermissions.canSecondApprove;
        message = canApprove ? "Second approval required" : "No second approval permission";
      }
      
      if (!requiresSecondApproval && concession.status === 'PENDING') {
        // For amounts below escalation threshold, single approval is sufficient
        message = canApprove ? "Single approval sufficient for this amount" : "No approval permission";
      }
    }

    return { 
      canApprove, 
      canReject, 
      message 
    };
  };

  // Handle approval submission
  const handleApprovalSubmit = async (data: { notes?: string; approvedBy: string }) => {
    if (!selectedConcession) return;
    
    await approveConcessionMutation.mutateAsync({
      concessionId: selectedConcession.id,
      notes: data.notes,
      approvedBy: data.approvedBy,
    });
  };

  // Handle rejection submission
  const handleRejectionSubmit = async (data: { reason: string; rejectedBy: string }) => {
    if (!selectedConcession) return;
    
    await rejectConcessionMutation.mutateAsync({
      concessionId: selectedConcession.id,
      reason: data.reason,
      rejectedBy: data.rejectedBy,
    });
  };

  // Handle settings save
  const handleSettingsSave = async (settings: any) => {
    await saveApprovalSettingsMutation.mutateAsync({
      ...settings,
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    });
  };

  // Table columns
  const columns: ColumnDef<PendingConcession>[] = [
    {
      accessorKey: "student.admissionNumber",
      header: "Admission No.",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.student?.admissionNumber || 'N/A'}
        </div>
      ),
    },
    {
      id: "studentName",
      accessorFn: (row) => `${row.student.firstName || ''} ${row.student.lastName || ''}`.trim(),
      header: "Student Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.student?.firstName || ''} {row.original.student?.lastName || ''}
          </div>
          {row.original.student?.section && (
            <div className="text-sm text-muted-foreground">
              {row.original.student.section.class?.name || ''} - {row.original.student.section.name || ''}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "concessionType.name",
      header: "Concession Type",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.concessionType?.name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.concessionType?.type === 'PERCENTAGE' ? (
              `${row.original.concessionType?.value || 0}%`
            ) : (
              formatIndianCurrency(row.original.concessionType?.value || 0)
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: "Concession Amount",
      cell: ({ row }) => {
        const concessionType = row.original.concessionType;
        const studentId = row.original.studentId;
        
        if (!concessionType) {
          return <span className="text-muted-foreground">N/A</span>;
        }
        
        return (
          <ConcessionAmountDisplay
            studentId={studentId}
            concessionType={concessionType}
            sessionId={currentSessionId || undefined}
            compact={true}
          />
        );
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.original.reason || "No reason provided"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status || 'UNKNOWN'),
    },
    {
      accessorKey: "createdAt",
      header: "Requested On",
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        if (!createdAt) return <div className="text-sm">N/A</div>;
        
        return (
          <div className="text-sm">
            {format(new Date(createdAt), "MMM dd, yyyy")}
            <div className="text-muted-foreground">
              {format(new Date(createdAt), "hh:mm a")}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const permissions = checkConcessionPermissions(row.original);
        
        if (!permissions.canApprove && !permissions.canReject) {
          return (
            <div className="text-xs text-muted-foreground">
              {permissions.message}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {permissions.canApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApprove(row.original)}
                className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="w-3 h-3" />
                Approve
              </Button>
            )}
            {permissions.canReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(row.original)}
                className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-3 h-3" />
                Reject
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Table filters
  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "All Pending", value: "" },
        { label: "Pending Review", value: "PENDING" },
        { label: "Pending First Approval", value: "PENDING_FIRST" },
        { label: "Pending Second Approval", value: "PENDING_SECOND" },
      ],
    },
  ];

  if (isLoading) {
    return (
      <PageWrapper title="Concession Approvals">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      title="Concession Approvals" 
      action={
        <Button 
          variant="outline" 
          onClick={() => setIsSettingsModalOpen(true)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Approval Settings
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">
                  {pendingConcessions.filter(c => c.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">First Approval</p>
                <p className="text-2xl font-bold">
                  {pendingConcessions.filter(c => c.status === 'PENDING_FIRST').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserX className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Second Approval</p>
                <p className="text-2xl font-bold">
                  {pendingConcessions.filter(c => c.status === 'PENDING_SECOND').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Settings Summary */}
        {approvalSettings && !settingsLoading && (
          <div className="p-4 bg-muted/20 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Current Approval Settings</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Approval Type:</span>
                <div className="font-medium">
                  {approvalSettings.approvalType === '1_PERSON' ? 'Single Person' : 'Two Person'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Auto-approve below:</span>
                <div className="font-medium">₹{approvalSettings.autoApproveBelow.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Max amount:</span>
                <div className="font-medium">₹{approvalSettings.maxApprovalAmount.toLocaleString()}</div>
              </div>
              {approvalSettings.approvalType === '2_PERSON' && (
                <div>
                  <span className="text-muted-foreground">Escalation at:</span>
                  <div className="font-medium">₹{approvalSettings.escalationThreshold.toLocaleString()}</div>
                </div>
              )}
            </div>
            {userPermissions && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">Your permissions: </span>
                <div className="flex gap-2 mt-1">
                  {userPermissions.canApprove && (
                    <Badge variant="secondary" className="text-xs">First Approval</Badge>
                  )}
                  {userPermissions.canSecondApprove && (
                    <Badge variant="secondary" className="text-xs">Second Approval</Badge>
                  )}
                  {!userPermissions.canApprove && !userPermissions.canSecondApprove && (
                    <Badge variant="outline" className="text-xs">No Approval Permission</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data Table */}
        {error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">Error loading concessions data</div>
            <div className="text-sm text-muted-foreground">{error.message}</div>
            <Button onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={Array.isArray(pendingConcessions) ? pendingConcessions as any : []}
            filters={filters}
            searchKey="studentName"
            searchPlaceholder="Search by student name..."
          />
        )}

        {/* Modals */}
        {selectedConcession && (
          <>
            <ConcessionApprovalModal
              isOpen={isApprovalModalOpen}
              onOpenChange={setIsApprovalModalOpen}
              concession={selectedConcession as any}
              onSubmit={handleApprovalSubmit}
              isLoading={approveConcessionMutation.isPending}
              approvalSettings={approvalSettings}
            />
            
            <ConcessionRejectionModal
              isOpen={isRejectionModalOpen}
              onOpenChange={setIsRejectionModalOpen}
              concession={selectedConcession as any}
              onSubmit={handleRejectionSubmit}
              isLoading={rejectConcessionMutation.isPending}
            />
          </>
        )}

        {/* Approval Settings Modal */}
        <ConcessionApprovalSettings
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSave={handleSettingsSave}
          currentSettings={approvalSettings}
          isLoading={saveApprovalSettingsMutation.isPending}
        />
      </div>
    </PageWrapper>
  );
}