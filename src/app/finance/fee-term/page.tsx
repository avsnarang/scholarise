"use client";

import React, { useState } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, MoreVertical, Calendar, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { FeeTermFormModal, type FeeTerm } from "@/components/finance/fee-term-form-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

export default function FeeTermPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFeeTerm, setSelectedFeeTerm] = useState<FeeTerm | null>(null);
  const [feeTermToDelete, setFeeTermToDelete] = useState<FeeTerm | null>(null);

  // Fetch fee terms
  const {
    data: feeTerms = [],
    isLoading,
    refetch
  } = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch fee heads for display
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

  // Mutations
  const createFeeTermMutation = api.finance.createFeeTerm.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee term created successfully",
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

  const updateFeeTermMutation = api.finance.updateFeeTerm.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee term updated successfully",
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

  const deleteFeeTermMutation = api.finance.deleteFeeTerm.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee term deleted successfully",
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

  const handleAddFeeTerm = () => {
    setSelectedFeeTerm(null);
    setIsFormModalOpen(true);
  };

  const handleEditFeeTerm = (feeTerm: FeeTerm) => {
    setSelectedFeeTerm(feeTerm);
    setIsFormModalOpen(true);
  };

  const handleDeleteFeeTerm = (feeTerm: FeeTerm) => {
    setFeeTermToDelete(feeTerm);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = (feeTermData: {
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    dueDate: Date;
    feeHeadIds: string[];
  }) => {
    if (!currentBranchId || !currentSessionId) return;

    if (selectedFeeTerm) {
      // Update existing fee term
      updateFeeTermMutation.mutate({
        id: selectedFeeTerm.id,
        name: feeTermData.name,
        description: feeTermData.description ?? undefined,
        startDate: feeTermData.startDate,
        endDate: feeTermData.endDate,
        dueDate: feeTermData.dueDate,
        feeHeadIds: feeTermData.feeHeadIds,
      });
    } else {
      // Add new fee term
      createFeeTermMutation.mutate({
        name: feeTermData.name,
        description: feeTermData.description ?? undefined,
        startDate: feeTermData.startDate,
        endDate: feeTermData.endDate,
        dueDate: feeTermData.dueDate,
        feeHeadIds: feeTermData.feeHeadIds,
        branchId: currentBranchId,
        sessionId: currentSessionId,
      });
    }
    setIsFormModalOpen(false);
    setSelectedFeeTerm(null);
  };

  const confirmDelete = async () => {
    if (!feeTermToDelete) return;

    deleteFeeTermMutation.mutate({ id: feeTermToDelete.id });
    setIsDeleteDialogOpen(false);
    setFeeTermToDelete(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (startDate: Date, endDate: Date, dueDate: Date) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const due = new Date(dueDate);

    if (today < start) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Upcoming</Badge>;
    } else if (today >= start && today <= end) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
    } else if (today > end && today <= due) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Payment Period</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200">Completed</Badge>;
    }
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Manage Fee Terms" subtitle="Configure fee collection periods and associated fee heads for each term.">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Please select a branch and academic session to continue.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Manage Fee Terms" subtitle="Configure fee collection periods and associated fee heads for each term.">
      <div className="flex justify-end mb-6">
        <Button onClick={handleAddFeeTerm} disabled={isLoading}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Fee Term
        </Button>
      </div>

      <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Fee Terms Overview</CardTitle>
          <CardDescription>View, edit, or delete fee terms. Each term defines a collection period with associated fee heads.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-gray-500">Loading fee terms...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th scope="col" className="px-6 py-3">Term Name</th>
                    <th scope="col" className="px-6 py-3">Period</th>
                    <th scope="col" className="px-6 py-3">Due Date</th>
                    <th scope="col" className="px-6 py-3">Fee Heads</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTerms.map((term) => (
                    <tr key={term.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{term.name}</div>
                          {term.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{term.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center mb-1">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            {formatDate(term.startDate)} - {formatDate(term.endDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-sm">{formatDate(term.dueDate)}</span>
                          {getDaysUntilDue(term.dueDate) > 0 && getDaysUntilDue(term.dueDate) <= 7 && (
                            <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                              ({getDaysUntilDue(term.dueDate)} days left)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {term.feeHeads && term.feeHeads.map((termFeeHead) => (
                            <Badge key={termFeeHead.feeHead.id} variant="outline" className="text-xs">
                              {termFeeHead.feeHead.name}
                            </Badge>
                          ))}
                          {(!term.feeHeads?.length) && (
                            <span className="text-sm text-gray-500">No fee heads assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(term.startDate, term.endDate, term.dueDate)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditFeeTerm(term)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteFeeTerm(term)} 
                              className="text-red-600 dark:text-red-400 hover:!text-red-700 dark:hover:!text-red-500"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {feeTerms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No fee terms defined yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <FeeTermFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedFeeTerm(null);
        }}
        onSuccess={handleFormSuccess}
        feeTerm={selectedFeeTerm}
        feeHeads={feeHeads}
        isLoading={createFeeTermMutation.isPending || updateFeeTermMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setFeeTermToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Fee Term"
        description={`Are you sure you want to delete the fee term "${feeTermToDelete?.name}"? This action cannot be undone and may affect associated classwise fees and collections.`}
        isDeleting={deleteFeeTermMutation.isPending}
      />
    </PageWrapper>
  );
} 