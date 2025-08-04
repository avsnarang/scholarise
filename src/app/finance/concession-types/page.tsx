"use client";

import React, { useState, useMemo } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Users, 
  Award, 
  Search,
  Filter,
  Download,
  Eye,
  Settings,
  TrendingUp,
  Percent,
  IndianRupee,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { ConcessionTypeFormModal } from "@/components/finance/concession-type-form-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";

interface ConcessionType {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  maxValue: number | null;
  isActive: boolean;
  applicableStudentTypes: string[];
  eligibilityCriteria: string | null;
  requiredDocuments: string[];
  autoApproval: boolean;
  branchId: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    studentConcessions: number;
  };
}

export default function ConcessionTypesPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConcessionType, setSelectedConcessionType] = useState<ConcessionType | null>(null);
  const [concessionTypeToDelete, setConcessionTypeToDelete] = useState<ConcessionType | null>(null);

  const {
    data: concessionTypes = [],
    isLoading,
    refetch
  } = api.finance.getConcessionTypes.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch dynamic fee heads
  const {
    data: feeHeads = [],
    isLoading: feeHeadsLoading
  } = api.finance.getFeeHeads.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch dynamic fee terms
  const {
    data: feeTerms = [],
    isLoading: feeTermsLoading
  } = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const createConcessionTypeMutation = api.finance.createConcessionType.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession type created successfully",
      });
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConcessionTypeMutation = api.finance.updateConcessionType.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession type updated successfully",
      });
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConcessionTypeMutation = api.finance.deleteConcessionType.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession type deleted successfully",
      });
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedConcessionType) {
        await updateConcessionTypeMutation.mutateAsync({
          id: selectedConcessionType.id,
          ...data,
        });
      } else {
        await createConcessionTypeMutation.mutateAsync({
          ...data,
          branchId: currentBranchId!,
          sessionId: currentSessionId!,
        });
      }
      setIsFormModalOpen(false);
      setSelectedConcessionType(null);
    } catch (error) {
      console.error('Error submitting concession type:', error);
    }
  };

  const handleEdit = (concessionType: ConcessionType) => {
    setSelectedConcessionType(concessionType);
    setIsFormModalOpen(true);
  };

  const handleDelete = (concessionType: ConcessionType) => {
    setConcessionTypeToDelete(concessionType);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (concessionTypeToDelete) {
      deleteConcessionTypeMutation.mutate({ id: concessionTypeToDelete.id });
      setIsDeleteDialogOpen(false);
      setConcessionTypeToDelete(null);
    }
  };

  const formatValue = (type: string, value: number) => {
    return type === 'PERCENTAGE' ? `${value}%` : formatIndianCurrency(value);
  };

  // Enhanced badge components
  const getStatusBadge = (concessionType: ConcessionType) => {
    if (!concessionType.isActive) {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Inactive
        </Badge>
      );
    }
    
    if (concessionType.autoApproval) {
      return (
        <Badge variant="default" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-3 w-3" />
          Auto-Approve
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Manual Approval
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
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

  // Enhanced columns with better design
  const columns: ColumnDef<ConcessionType>[] = [
    {
      accessorKey: "name",
      header: "Concession Details",
      cell: ({ row }) => {
        const concessionType = row.original;
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">{concessionType.name}</div>
            {concessionType.description && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {concessionType.description}
              </div>
            )}
            {concessionType.eligibilityCriteria && (
              <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                {concessionType.eligibilityCriteria}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type & Value",
      cell: ({ row }) => {
        const concessionType = row.original;
        return (
          <div className="space-y-2">
            {getTypeBadge(concessionType.type)}
            <div className="font-mono text-sm font-semibold">
              {formatValue(concessionType.type, concessionType.value)}
            </div>
            {concessionType.maxValue && (
              <div className="text-xs text-muted-foreground">
                Max: {formatValue(concessionType.type, concessionType.maxValue)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "applicableStudentTypes",
      header: "Applicable To",
      cell: ({ row }) => {
        const types = row.original.applicableStudentTypes;
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((type) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type === 'NEW_ADMISSION' ? 'New Students' : 
                 type === 'OLD_STUDENT' ? 'Existing Students' : 'All Students'}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "_count.studentConcessions",
      header: "Usage",
      cell: ({ row }) => {
        const count = row.original._count.studentConcessions;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{count}</span>
            <span className="text-xs text-muted-foreground">students</span>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status & Settings",
      cell: ({ row }) => {
        const concessionType = row.original;
        return (
          <div className="space-y-1">
            {getStatusBadge(concessionType)}
            {concessionType.requiredDocuments.length > 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {concessionType.requiredDocuments.length} docs required
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        return (
          <div className="text-xs text-muted-foreground">
            {format(new Date(row.original.createdAt), "MMM dd, yyyy")}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const concessionType = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEdit(concessionType)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Usage
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(concessionType)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Enhanced filters
  const filters: DataTableFilter[] = [
    {
      key: "isActive",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Percentage", value: "PERCENTAGE" },
        { label: "Fixed Amount", value: "FIXED" },
      ],
    },
    {
      key: "autoApproval",
      label: "Approval",
      type: "select",
      options: [
        { label: "Auto Approval", value: "true" },
        { label: "Manual Approval", value: "false" },
      ],
    },
  ];

  // Stats calculation
  const stats = useMemo(() => {
    const total = concessionTypes.length;
    const active = concessionTypes.filter(ct => ct.isActive).length;
    const autoApprove = concessionTypes.filter(ct => ct.autoApproval).length;
    const totalUsage = concessionTypes.reduce((sum, ct) => sum + ct._count.studentConcessions, 0);
    
    return { total, active, autoApprove, totalUsage };
  }, [concessionTypes]);

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
              Please select a branch and academic session to manage concession types.
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
            <h1 className="text-2xl font-bold tracking-tight">Concession Types</h1>
            <p className="text-muted-foreground">
              Manage concession and scholarship types for fee collection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => setIsFormModalOpen(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Concession Type
            </Button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        {!isLoading && concessionTypes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Types</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                  </div>
                  <Award className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Active</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.active}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Auto-Approve</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.autoApprove}</p>
                  </div>
                  <Settings className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Usage</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.totalUsage}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Data Table */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <DataTable
              columns={columns}
              data={concessionTypes}
              searchKey="name"
              searchPlaceholder="Search concession types..."
              filters={filters}
              pageSize={50}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConcessionTypeFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedConcessionType(null);
        }}
        onSuccess={handleFormSubmit}
        concessionType={selectedConcessionType as any}
        isLoading={createConcessionTypeMutation.isPending || updateConcessionTypeMutation.isPending}
        feeHeads={feeHeads}
        feeTerms={feeTerms}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setConcessionTypeToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Concession Type"
        description={`Are you sure you want to delete "${concessionTypeToDelete?.name}"? This action cannot be undone and will affect ${concessionTypeToDelete?._count?.studentConcessions || 0} student concessions.`}
        isDeleting={deleteConcessionTypeMutation.isPending}
      />
    </PageWrapper>
  );
} 