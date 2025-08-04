"use client";

import React, { useState } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, MoreVertical, Calendar, Clock, X, ChevronUp, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { FeeTermForm, type FeeTerm } from "@/components/finance/fee-term-form";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

function FeeTermPageContent() {
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

  // Fetch fee heads for association
  const {
    data: feeHeads = [],
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
      refetch();
      setIsFormModalOpen(false);
      setSelectedFeeTerm(null);
      toast({
        title: "Success",
        description: "Fee term created successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating fee term:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create fee term. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateFeeTermMutation = api.finance.updateFeeTerm.useMutation({
    onSuccess: () => {
      refetch();
      setIsFormModalOpen(false);
      setSelectedFeeTerm(null);
      toast({
        title: "Success",
        description: "Fee term updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating fee term:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update fee term. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteFeeTermMutation = api.finance.deleteFeeTerm.useMutation({
    onSuccess: () => {
      refetch();
      setIsDeleteDialogOpen(false);
      setFeeTermToDelete(null);
      toast({
        title: "Success",
        description: "Fee term deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Error deleting fee term:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete fee term. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fee Term Ordering Mutations
  const moveFeeTermUpMutation = api.finance.moveFeeTermUp.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Fee term moved up successfully.",
      });
    },
    onError: (error) => {
      console.error('Error moving fee term up:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to move fee term up.",
        variant: "destructive",
      });
    },
  });

  const moveFeeTermDownMutation = api.finance.moveFeeTermDown.useMutation({
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Fee term moved down successfully.",
      });
    },
    onError: (error) => {
      console.error('Error moving fee term down:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to move fee term down.",
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

  const handleMoveFeeTermUp = (feeTermId: string) => {
    moveFeeTermUpMutation.mutate({ id: feeTermId });
  };

  const handleMoveFeeTermDown = (feeTermId: string) => {
    moveFeeTermDownMutation.mutate({ id: feeTermId });
  };

  const handleFormSuccess = (feeTermData: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    dueDate: Date;
    feeHeadIds: string[];
  }) => {
    if (selectedFeeTerm) {
      // Update existing fee term
      updateFeeTermMutation.mutate({
        id: selectedFeeTerm.id,
        ...feeTermData,
      });
    } else {
      // Create new fee term
      if (!currentBranchId || !currentSessionId) {
        toast({
          title: "Error",
          description: "Branch and session must be selected.",
          variant: "destructive",
        });
        return;
      }
      
      createFeeTermMutation.mutate({
        ...feeTermData,
        branchId: currentBranchId,
        sessionId: currentSessionId,
      });
    }
  };

  const confirmDelete = async () => {
    if (feeTermToDelete) {
      deleteFeeTermMutation.mutate({ id: feeTermToDelete.id });
    }
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
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const due = new Date(dueDate);

    if (now < start) {
      return <Badge variant="outline">Upcoming</Badge>;
    } else if (now >= start && now <= end) {
      const daysUntilDue = getDaysUntilDue(due);
      if (daysUntilDue < 0) {
        return <Badge variant="destructive">Overdue</Badge>;
      } else if (daysUntilDue <= 7) {
        return <Badge variant="secondary">Due Soon</Badge>;
      } else {
        return <Badge variant="default">Active</Badge>;
      }
    } else {
      return <Badge variant="outline">Completed</Badge>;
    }
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Fee Terms" subtitle="Manage fee collection terms and schedules">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Please select a branch and academic session to manage fee terms.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Fee Terms" subtitle="Manage fee collection terms and schedules">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Fee Terms</CardTitle>
            <CardDescription>
              Create and manage fee collection terms with associated fee heads
            </CardDescription>
          </div>
          <Button onClick={handleAddFeeTerm}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Fee Term
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading fee terms...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-300 w-20">Order</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Term Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Period</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Due Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Fee Heads</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTerms.map((term, index) => (
                    <tr key={term.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-4 px-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveFeeTermUp(term.id)}
                            disabled={index === 0 || moveFeeTermUpMutation.isPending || moveFeeTermDownMutation.isPending}
                            title="Move up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveFeeTermDown(term.id)}
                            disabled={index === feeTerms.length - 1 || moveFeeTermUpMutation.isPending || moveFeeTermDownMutation.isPending}
                            title="Move down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{term.name}</p>
                          {term.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{term.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <div className="flex items-center text-gray-600 dark:text-gray-400 mb-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(term.startDate)} - {formatDate(term.endDate)}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(term.dueDate)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {getDaysUntilDue(term.dueDate) > 0 
                              ? `${getDaysUntilDue(term.dueDate)} days left`
                              : `${Math.abs(getDaysUntilDue(term.dueDate))} days overdue`
                            }
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {term.feeHeads && term.feeHeads.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {term.feeHeads.slice(0, 2).map((fh) => (
                                <Badge key={fh.feeHead.id} variant="outline" className="text-xs">
                                  {fh.feeHead.name}
                                </Badge>
                              ))}
                              {term.feeHeads.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{term.feeHeads.length - 2} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">No fee heads</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(term.startDate, term.endDate, term.dueDate)}
                      </td>
                      <td className="py-4 px-4 text-right">
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
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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

      {/* Custom Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => {
              setIsFormModalOpen(false);
              setSelectedFeeTerm(null);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedFeeTerm ? 'Edit Fee Term' : 'Add New Fee Term'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedFeeTerm ? 'Update the fee term details' : 'Create a new fee collection term'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsFormModalOpen(false);
                  setSelectedFeeTerm(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Form */}
            <div className="p-6">
              <FeeTermForm
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setIsFormModalOpen(false);
                  setSelectedFeeTerm(null);
                }}
                feeTerm={selectedFeeTerm}
                feeHeads={feeHeads}
                isLoading={createFeeTermMutation.isPending || updateFeeTermMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}

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

// Dynamically import to disable SSR completely
const DynamicFeeTermPageContent = dynamic(() => Promise.resolve(FeeTermPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading fee terms...</div>
});

export default function FeeTermPage() {
  return <DynamicFeeTermPageContent />;
} 