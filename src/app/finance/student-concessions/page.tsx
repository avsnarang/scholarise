"use client";

import React, { useState, useMemo } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  Settings,
  Award,
  User,
  FileText,
  Filter,
  Download,
  AlertCircle,
  Info,
  TrendingUp,
  Percent,
  IndianRupee
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { ConcessionStatsCards } from "@/components/finance/concession-stats-cards";
import { StudentConcessionFormModal } from "@/components/finance/student-concession-form-modal";
import { ConcessionApprovalSettings } from "@/components/finance/concession-approval-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";

interface StudentConcession {
  id: string;
  studentId: string;
  concessionTypeId: string;
  customValue?: number | null;
  reason?: string | null;
  validFrom: Date;
  validUntil?: Date | null;
  appliedFeeHeads: string[];
  appliedFeeTerms: string[];
  notes?: string | null;
  status: string;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  firstApprovedBy?: string;
  firstApprovedAt?: Date;
  secondApprovedBy?: string;
  secondApprovedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
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
    };
  };
  concessionType: {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
  };
}

// Enhanced status badge component
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge variant="default" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case 'PENDING_FIRST':
      return (
        <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-200">
          <Clock className="h-3 w-3" />
          Pending First
        </Badge>
      );
    case 'PENDING_SECOND':
      return (
        <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200">
          <Clock className="h-3 w-3" />
          Pending Second
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case 'SUSPENDED':
      return (
        <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          <AlertCircle className="h-3 w-3" />
          Suspended
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <Calendar className="h-3 w-3" />
          Expired
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {status.replace('_', ' ')}
        </Badge>
      );
  }
};

const getConcessionTypeBadge = (type: string) => {
  return type === 'PERCENTAGE' ? (
    <Badge variant="default" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      <Percent className="h-3 w-3" />
      Percentage
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
      <IndianRupee className="h-3 w-3" />
      Fixed Amount
    </Badge>
  );
};

const formatValue = (type: 'PERCENTAGE' | 'FIXED', value: number) => {
  return type === 'PERCENTAGE' ? `${value}%` : formatIndianCurrency(value);
};

export default function StudentConcessionsPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedConcession, setSelectedConcession] = useState<StudentConcession | null>(null);
  const [concessionToDelete, setConcessionToDelete] = useState<StudentConcession | null>(null);

  const {
    data: studentConcessions = [],
    isLoading,
    refetch
  } = api.finance.getStudentConcessions.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const {
    data: concessionTypes = []
  } = api.finance.getConcessionTypes.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const {
    data: students = []
  } = api.finance.getStudents.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

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

  const assignConcessionMutation = api.finance.assignConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student concession assigned successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign concession",
        variant: "destructive",
      });
    },
  });

  // Note: Use specific mutations like approveConcession, rejectConcession, suspendConcession
  // instead of a generic updateStudentConcession

  const deleteConcessionMutation = api.finance.deleteConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student concession deleted successfully",
      });
      refetch();
      setIsDeleteDialogOpen(false);
      setConcessionToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete concession",
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = async (data: any) => {
    const concessionData = {
      ...data,
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    };

    if (selectedConcession) {
      // TODO: Implement specific mutation based on action (approve/reject/suspend)
      console.log('Form submitted with data:', data);
      /*
      await specificConcessionMutation.mutateAsync({
        id: selectedConcession.id,
        ...concessionData,
      });
      */
    } else {
      await assignConcessionMutation.mutateAsync(concessionData);
    }
  };

  const handleEdit = (concession: StudentConcession) => {
    setSelectedConcession(concession);
    setIsFormModalOpen(true);
  };

  const handleDelete = (concession: StudentConcession) => {
    setConcessionToDelete(concession);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (concessionToDelete) {
      deleteConcessionMutation.mutate({ id: concessionToDelete.id });
    }
  };

  const handleFormClose = () => {
    setIsFormModalOpen(false);
    setSelectedConcession(null);
  };

  // Define columns for DataTable
  const columns: ColumnDef<StudentConcession>[] = useMemo(
    () => [
      {
        accessorKey: "student",
        header: "Student",
        cell: ({ row }) => {
          const student = row.original.student;
          return (
            <div>
              <div className="font-medium">
                {student.firstName} {student.lastName}
              </div>
              <div className="text-sm text-muted-foreground">
                {student.admissionNumber}
                {student.section && (
                  <span> • {student.section.class.name} {student.section.name}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "concessionType.name",
        header: "Concession Type",
        cell: ({ row }) => {
          const concessionType = row.original.concessionType;
          const customValue = row.original.customValue;
          const effectiveValue = customValue ?? concessionType.value;
          return (
            <div className="space-y-2">
              <div className="font-medium text-sm">{concessionType.name}</div>
              <div className="flex items-center gap-2">
                {getConcessionTypeBadge(concessionType.type)}
                <span className="text-sm font-mono font-semibold">
                  {formatValue(concessionType.type, effectiveValue)}
                </span>
              </div>
              {customValue && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Custom value applied
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => {
          const concessionType = row.original.concessionType;
          const customValue = row.original.customValue;
          return (
            <Badge variant="outline">
              {formatValue(concessionType.type, customValue ?? concessionType.value)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "validFrom",
        header: "Valid Period",
        cell: ({ row }) => {
          const validFrom = row.original.validFrom;
          const validUntil = row.original.validUntil;
          return (
            <div className="text-sm">
              <div>From: {format(new Date(validFrom), "dd MMM yyyy")}</div>
              {validUntil ? (
                <div>Until: {format(new Date(validUntil), "dd MMM yyyy")}</div>
              ) : (
                <div className="text-muted-foreground">No expiry</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return getStatusBadge(status);
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => {
          return format(new Date(row.original.createdAt), "dd MMM yyyy");
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const concession = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(concession)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(concession)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  // Enhanced filters for DataTable
  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Pending", value: "PENDING" },
        { label: "Pending First", value: "PENDING_FIRST" },
        { label: "Pending Second", value: "PENDING_SECOND" },
        { label: "Approved", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" },
        { label: "Suspended", value: "SUSPENDED" },
        { label: "Expired", value: "EXPIRED" },
      ],
    },
    {
      key: "concessionType.type",
      label: "Type",
      type: "select",
      options: [
        { label: "Percentage", value: "PERCENTAGE" },
        { label: "Fixed Amount", value: "FIXED" },
      ],
    },
  ];

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Award className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-muted-foreground">
              No Branch or Session Selected
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please select a branch and academic session to view student concessions.
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Student Concessions</h1>
            <p className="text-muted-foreground">
              Manage and track concessions assigned to students
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button
              onClick={() => setIsFormModalOpen(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Assign Concession
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <ConcessionStatsCards sessionId={currentSessionId} />

        {/* Enhanced Data Table */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <DataTable
              columns={columns}
              data={studentConcessions as any}
              searchKey="student"
              searchPlaceholder="Search student concessions..."
              filters={filters}
              pageSize={50}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <StudentConcessionFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        students={students}
        concessionTypes={concessionTypes.map(ct => ({
          ...ct,
          feeTermAmounts: ct.feeTermAmounts as Record<string, number> | null
        }))}
        isLoading={assignConcessionMutation.isPending}
        editingConcession={selectedConcession}
      />

      <ConcessionApprovalSettings
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={async (settings) => {
          // TODO: Implement save approval settings functionality
          console.log('Saving approval settings:', settings);
          setIsSettingsModalOpen(false);
        }}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setConcessionToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Student Concession"
        description={
          concessionToDelete
            ? `Are you sure you want to delete the concession for ${concessionToDelete.student.firstName} ${concessionToDelete.student.lastName}? This action cannot be undone.`
            : ""
        }
        isDeleting={deleteConcessionMutation.isPending}
      />
    </PageWrapper>
  );
}