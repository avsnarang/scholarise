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
  customValue?: number | null;
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

  // API mutations
  const approveConcessionMutation = api.finance.approveConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession approved successfully",
      });
      refetch();
      setIsApprovalModalOpen(false);
      setSelectedConcession(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve concession",
        variant: "destructive",
      });
    },
  });

  const rejectConcessionMutation = api.finance.rejectConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession rejected successfully",
      });
      refetch();
      setIsRejectionModalOpen(false);
      setSelectedConcession(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject concession",
        variant: "destructive",
      });
    },
  });

  const saveApprovalSettingsMutation = api.finance.saveApprovalSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval settings saved successfully",
      });
      setIsSettingsModalOpen(false);
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
    if (!user?.id || !approvalSettings) {
      return { canApprove: false, canReject: false, message: "Loading permissions..." };
    }

    const concessionAmount = concession.customValue ?? concession.concessionType.value;
    
    // Check if amount exceeds maximum
    if (concessionAmount > approvalSettings.maxApprovalAmount) {
      return { canApprove: false, canReject: false, message: "Amount exceeds maximum limit" };
    }

    // Auto-approved items can't be manually approved
    if (concessionAmount <= approvalSettings.autoApproveBelow) {
      return { canApprove: false, canReject: false, message: "Should be auto-approved" };
    }

    // For role-based authorization, we'd need user roles from API
    // For now, assume user has permissions if settings exist
    const hasPermissions = true; // This would be replaced with actual permission check

    let message = "";
    if (approvalSettings.approvalType === '2_PERSON') {
      if (concession.status === 'PENDING_FIRST' || concession.status === 'PENDING') {
        message = "First approval required";
      } else if (concession.status === 'PENDING_SECOND') {
        message = "Second approval required";
      }
    }

    return { 
      canApprove: hasPermissions, 
      canReject: hasPermissions, 
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
      accessorKey: "customValue",
      header: "Amount",
      cell: ({ row }) => {
        const customValue = row.original.customValue;
        const baseValue = row.original.concessionType?.value || 0;
        const type = row.original.concessionType?.type;
        
        if (type === 'PERCENTAGE') {
          return (
            <div className="text-center">
              <div className="font-medium">{customValue ?? baseValue}%</div>
            </div>
          );
        } else {
          return (
            <div className="text-center">
              <div className="font-medium flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                {formatIndianCurrency(customValue ?? baseValue)}
              </div>
            </div>
          );
        }
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