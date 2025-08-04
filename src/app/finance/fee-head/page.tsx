"use client";

import React, { useState } from 'react';
import dynamic from "next/dynamic";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeeHeadForm, type FeeHead } from "@/components/finance/fee-head-form";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

function FeeHeadPageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFeeHead, setSelectedFeeHead] = useState<FeeHead | null>(null);
  const [feeHeadToDelete, setFeeHeadToDelete] = useState<FeeHead | null>(null);

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
    if (feeHead.isSystemDefined) return;
    setSelectedFeeHead(feeHead);
    setIsFormModalOpen(true);
  };

  const handleDeleteFeeHead = (feeHead: FeeHead) => {
    if (feeHead.isSystemDefined) return;
    setFeeHeadToDelete(feeHead);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = (feeHeadData: {
    name: string;
    description: string | null;
    isSystemDefined: boolean;
    studentType: string;
  }) => {
    if (!currentBranchId || !currentSessionId) return;

    if (selectedFeeHead) {
      updateFeeHeadMutation.mutate({
        id: selectedFeeHead.id,
        name: feeHeadData.name,
        description: feeHeadData.description ?? undefined,
        isSystemDefined: feeHeadData.isSystemDefined,
        studentType: feeHeadData.studentType as "NEW_ADMISSION" | "OLD_STUDENT" | "BOTH",
      });
    } else {
      createFeeHeadMutation.mutate({
        name: feeHeadData.name,
        description: feeHeadData.description ?? undefined,
        isSystemDefined: feeHeadData.isSystemDefined,
        studentType: feeHeadData.studentType as "NEW_ADMISSION" | "OLD_STUDENT" | "BOTH",
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
      <PageWrapper title="Manage Fee Heads" subtitle="Define and manage fee types">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Please select a branch and academic session to continue.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Manage Fee Heads" subtitle="Define and manage fee types">
      <div className="flex justify-end mb-6">
        <Button onClick={handleAddFeeHead} disabled={isLoading}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Fee Head
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Heads</CardTitle>
          <CardDescription>View, edit, or delete fee heads</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading fee heads...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-center p-2">Student Type</th>
                    <th className="text-center p-2">System Defined</th>
                    <th className="text-center p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeHeads.map((head) => (
                    <tr key={head.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{head.name}</td>
                      <td className="p-2">{head.description ?? '-'}</td>
                      <td className="p-2 text-center">
                        <Badge variant={head.studentType === 'BOTH' ? 'default' : 'secondary'}>
                          {head.studentType === 'NEW_ADMISSION' ? 'New Admission' : 
                           head.studentType === 'OLD_STUDENT' ? 'Old Students' : 
                           'Both'}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">{head.isSystemDefined ? 'Yes' : 'No'}</td>
                      <td className="p-2 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleEditFeeHead(head)} 
                              disabled={head.isSystemDefined}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteFeeHead(head)} 
                              disabled={head.isSystemDefined} 
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {feeHeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
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

      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => {
              if (!(createFeeHeadMutation.isPending || updateFeeHeadMutation.isPending)) {
                setIsFormModalOpen(false);
                setSelectedFeeHead(null);
              }
            }}
          />
          <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full z-10 border">
            <div className="border-b bg-background px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedFeeHead ? "Edit Fee Head" : "Add New Fee Head"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedFeeHead ? "Update fee head details" : "Create a new fee head"}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (!(createFeeHeadMutation.isPending || updateFeeHeadMutation.isPending)) {
                      setIsFormModalOpen(false);
                      setSelectedFeeHead(null);
                    }
                  }}
                  disabled={createFeeHeadMutation.isPending || updateFeeHeadMutation.isPending}
                  className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <FeeHeadForm
                onSuccess={handleFormSuccess}
                feeHead={selectedFeeHead}
                isLoading={createFeeHeadMutation.isPending || updateFeeHeadMutation.isPending}
                onCancel={() => {
                  setIsFormModalOpen(false);
                  setSelectedFeeHead(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setFeeHeadToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Fee Head"
        description={`Are you sure you want to delete the fee head "${feeHeadToDelete?.name}"? This action cannot be undone.`}
        isDeleting={deleteFeeHeadMutation.isPending}
      />
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicFeeHeadPageContent = dynamic(() => Promise.resolve(FeeHeadPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function FeeHeadPage() {
  return <DynamicFeeHeadPageContent />;
} 