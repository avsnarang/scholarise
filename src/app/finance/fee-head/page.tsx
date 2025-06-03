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
import { PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeeHeadFormModal, type FeeHead } from "@/components/finance/fee-head-form-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

export default function FeeHeadPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFeeHead, setSelectedFeeHead] = useState<FeeHead | null>(null);
  const [feeHeadToDelete, setFeeHeadToDelete] = useState<FeeHead | null>(null);

  // Fetch fee heads
  const {
    data: feeHeads = [],
    isLoading,
    refetch
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
  const createFeeHeadMutation = api.finance.createFeeHead.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee head created successfully",
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

  const updateFeeHeadMutation = api.finance.updateFeeHead.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee head updated successfully",
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

  const deleteFeeHeadMutation = api.finance.deleteFeeHead.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee head deleted successfully",
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

  const handleAddFeeHead = () => {
    setSelectedFeeHead(null);
    setIsFormModalOpen(true);
  };

  const handleEditFeeHead = (feeHead: FeeHead) => {
    if (feeHead.isSystemDefined) return; // Prevent editing system-defined fee heads
    setSelectedFeeHead(feeHead);
    setIsFormModalOpen(true);
  };

  const handleDeleteFeeHead = (feeHead: FeeHead) => {
    if (feeHead.isSystemDefined) return; // Prevent deleting system-defined fee heads
    setFeeHeadToDelete(feeHead);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = (feeHeadData: {
    name: string;
    description: string | null;
    isSystemDefined: boolean;
  }) => {
    if (!currentBranchId || !currentSessionId) return;

    if (selectedFeeHead) {
      // Update existing fee head
      updateFeeHeadMutation.mutate({
        id: selectedFeeHead.id,
        name: feeHeadData.name,
        description: feeHeadData.description ?? undefined,
        isSystemDefined: feeHeadData.isSystemDefined,
      });
    } else {
      // Add new fee head
      createFeeHeadMutation.mutate({
        name: feeHeadData.name,
        description: feeHeadData.description ?? undefined,
        isSystemDefined: feeHeadData.isSystemDefined,
        branchId: currentBranchId,
        sessionId: currentSessionId,
      });
    }
    setIsFormModalOpen(false);
    setSelectedFeeHead(null);
  };

  const confirmDelete = async () => {
    if (!feeHeadToDelete) return;

    deleteFeeHeadMutation.mutate({ id: feeHeadToDelete.id });
    setIsDeleteDialogOpen(false);
    setFeeHeadToDelete(null);
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Manage Fee Heads" subtitle="Define and manage various types of fees applicable in the institution.">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Please select a branch and academic session to continue.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Manage Fee Heads" subtitle="Define and manage various types of fees applicable in the institution.">
      <div className="flex justify-end mb-6">
        <Button onClick={handleAddFeeHead} disabled={isLoading}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Fee Head
        </Button>
      </div>

      <Card className="shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Existing Fee Heads</CardTitle>
          <CardDescription>View, edit, or delete fee heads. System-defined heads have limited editability.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-gray-500">Loading fee heads...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Description</th>
                    <th scope="col" className="px-6 py-3 text-center">System Defined</th>
                    <th scope="col" className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeHeads.map((head) => (
                    <tr key={head.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{head.name}</td>
                      <td className="px-6 py-4">{head.description ?? '-'}</td>
                      <td className="px-6 py-4 text-center">{head.isSystemDefined ? 'Yes' : 'No'}</td>
                      <td className="px-6 py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleEditFeeHead(head)} 
                              disabled={head.isSystemDefined}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteFeeHead(head)} 
                              disabled={head.isSystemDefined} 
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
                  {feeHeads.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No fee heads defined yet.
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
      <FeeHeadFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedFeeHead(null);
        }}
        onSuccess={handleFormSuccess}
        feeHead={selectedFeeHead}
        isLoading={createFeeHeadMutation.isPending || updateFeeHeadMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setFeeHeadToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Fee Head"
        description={`Are you sure you want to delete the fee head "${feeHeadToDelete?.name}"? This action cannot be undone and may affect associated fee terms and collections.`}
        isDeleting={deleteFeeHeadMutation.isPending}
      />
    </PageWrapper>
  );
} 