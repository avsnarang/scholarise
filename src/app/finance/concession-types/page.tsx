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
import { PlusCircle, Edit, Trash2, MoreVertical, Users, Award } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConcessionTypeFormModal } from "@/components/finance/concession-type-form-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";

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

  const handleAddConcessionType = () => {
    setSelectedConcessionType(null);
    setIsFormModalOpen(true);
  };

  const handleEditConcessionType = (concessionType: ConcessionType) => {
    setSelectedConcessionType(concessionType);
    setIsFormModalOpen(true);
  };

  const handleDeleteConcessionType = (concessionType: ConcessionType) => {
    setConcessionTypeToDelete(concessionType);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = (data: any) => {
    if (!currentBranchId || !currentSessionId) return;

    if (selectedConcessionType) {
      updateConcessionTypeMutation.mutate({
        id: selectedConcessionType.id,
        ...data,
      });
    } else {
      createConcessionTypeMutation.mutate({
        ...data,
        branchId: currentBranchId,
        sessionId: currentSessionId,
      });
    }
    setIsFormModalOpen(false);
    setSelectedConcessionType(null);
  };

  const confirmDelete = async () => {
    if (!concessionTypeToDelete) return;

    deleteConcessionTypeMutation.mutate({ id: concessionTypeToDelete.id });
    setIsDeleteDialogOpen(false);
    setConcessionTypeToDelete(null);
  };

  const formatValue = (type: string, value: number) => {
    if (type === 'PERCENTAGE') {
      return `${value}%`;
    } else {
      return formatIndianCurrency(value);
    }
  };

  const getStudentTypeLabel = (types: string[]) => {
    if (types.includes('BOTH') || types.length === 0) return 'All Students';
    if (types.includes('NEW_ADMISSION') && types.includes('OLD_STUDENT')) return 'All Students';
    if (types.includes('NEW_ADMISSION')) return 'New Admissions';
    if (types.includes('OLD_STUDENT')) return 'Existing Students';
    return types.join(', ');
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Concession Types" subtitle="Manage concession and scholarship types">
        <Alert>
          <Award className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access concession types.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Concession Types" subtitle="Manage concession and scholarship types">
      <div className="flex justify-end mb-6">
        <Button onClick={handleAddConcessionType} disabled={isLoading}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Concession Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Concession Types</CardTitle>
          <CardDescription>
            Configure different types of concessions and scholarships available for students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading concession types...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Applicable To</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Auto Approval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {concessionTypes.map((type) => (
                    <TableRow key={type.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          {type.description && (
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {type.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatValue(type.type, type.value)}</div>
                          {type.maxValue && (
                            <div className="text-sm text-muted-foreground">
                              Max: {formatValue(type.type, type.maxValue)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getStudentTypeLabel(type.applicableStudentTypes)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{type._count.studentConcessions}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.autoApproval ? "default" : "secondary"}>
                          {type.autoApproval ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.isActive ? "default" : "secondary"}>
                          {type.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditConcessionType(type)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteConcessionType(type)}
                              disabled={type._count.studentConcessions > 0}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {concessionTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Award className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No concession types defined yet.</p>
                          <Button variant="outline" onClick={handleAddConcessionType}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Create First Concession Type
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConcessionTypeFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedConcessionType(null);
        }}
        onSuccess={handleFormSuccess}
        concessionType={selectedConcessionType as any}
        isLoading={createConcessionTypeMutation.isPending || updateConcessionTypeMutation.isPending}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setConcessionTypeToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Concession Type"
        description={`Are you sure you want to delete the concession type "${concessionTypeToDelete?.name}"? This action cannot be undone.`}
        isDeleting={deleteConcessionTypeMutation.isPending}
      />
    </PageWrapper>
  );
} 