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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  PlusCircle, 
  Search, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  Award,
  AlertTriangle,
  History,
  User,
  FileText,
  Calendar,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentConcessionFormModal } from "@/components/finance/student-concession-form-modal";
import { ConcessionApprovalSettings } from "@/components/finance/concession-approval-settings";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";

interface StudentConcession {
  id: string;
  studentId: string;
  concessionTypeId: string;
  customValue?: number;
  reason?: string;
  validFrom: Date;
  validUntil?: Date;
  appliedFeeHeads: string[];
  appliedFeeTerms: string[];
  notes?: string;
  status: 'PENDING' | 'PENDING_FIRST' | 'PENDING_SECOND' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED';
  approvedBy?: string;
  approvedAt?: Date;
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

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  PENDING_FIRST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  PENDING_SECOND: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  SUSPENDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const statusIcons = {
  PENDING: <Clock className="h-3 w-3" />,
  PENDING_FIRST: <User className="h-3 w-3" />,
  PENDING_SECOND: <Users className="h-3 w-3" />,
  APPROVED: <CheckCircle className="h-3 w-3" />,
  REJECTED: <XCircle className="h-3 w-3" />,
  SUSPENDED: <AlertTriangle className="h-3 w-3" />,
  EXPIRED: <Calendar className="h-3 w-3" />,
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: studentConcessions = [],
    isLoading,
    refetch
  } = api.finance.getStudentConcessions.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      sessionId: currentSessionId ?? undefined,
      status: statusFilter !== 'all' ? statusFilter as any : undefined,
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
      search: searchQuery || undefined,
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
        description: "Concession assigned successfully",
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

  const approveConcessionMutation = api.finance.approveConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession approved successfully",
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

  const rejectConcessionMutation = api.finance.rejectConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession rejected successfully",
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

  const suspendConcessionMutation = api.finance.suspendConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession suspended successfully",
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

  const deleteConcessionMutation = api.finance.deleteConcession.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Concession deleted successfully",
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

  const {
    data: approvalSettings
  } = api.finance.getApprovalSettings.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const saveApprovalSettingsMutation = api.finance.saveApprovalSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Approval settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignConcession = () => {
    setSelectedConcession(null);
    setIsFormModalOpen(true);
  };

  const handleEditConcession = (concession: StudentConcession) => {
    setSelectedConcession(concession);
    setIsFormModalOpen(true);
  };

  const handleDeleteConcession = (concession: StudentConcession) => {
    setConcessionToDelete(concession);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSuccess = async (data: any): Promise<void> => {
    if (!currentBranchId || !currentSessionId) return;

    await assignConcessionMutation.mutateAsync({
      ...data,
      branchId: currentBranchId,
      sessionId: currentSessionId,
    });
    setIsFormModalOpen(false);
    setSelectedConcession(null);
  };

  const handleApproveConcession = async (concessionId: string) => {
    try {
      await approveConcessionMutation.mutateAsync({
        id: concessionId,
        approvedBy: 'current-user', // TODO: Get from auth context
        notes: 'Approved via dashboard',
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleSecondApproveConcession = async (concessionId: string) => {
    try {
      // TODO: Implement second approval API call
      console.log('Second approval for concession:', concessionId);
      toast({
        title: "Second Approval Submitted",
        description: "Concession has been given second approval.",
      });
      void refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process second approval. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectConcession = async (concessionId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason?.trim()) return;

    try {
      await rejectConcessionMutation.mutateAsync({
        id: concessionId,
        rejectedBy: 'current-user', // TODO: Get from auth context
        reason: reason.trim(),
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleSuspendConcession = async (concessionId: string) => {
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason?.trim()) return;

    try {
      await suspendConcessionMutation.mutateAsync({
        id: concessionId,
        suspendedBy: 'current-user', // TODO: Get from auth context
        reason: reason.trim(),
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const confirmDelete = async () => {
    if (!concessionToDelete) return;

    deleteConcessionMutation.mutate({ id: concessionToDelete.id });
    setIsDeleteDialogOpen(false);
    setConcessionToDelete(null);
  };

  const handleSaveApprovalSettings = async (settings: any) => {
    if (!currentBranchId || !currentSessionId) return;

    try {
      await saveApprovalSettingsMutation.mutateAsync({
        ...settings,
        branchId: currentBranchId,
        sessionId: currentSessionId,
      });
      
      setIsSettingsModalOpen(false);
    } catch (error) {
      // Error already handled by mutation
      throw error;
    }
  };

  const formatValue = (type: string, value: number) => {
    if (type === 'PERCENTAGE') {
      return `${value}%`;
    } else {
      return formatIndianCurrency(value);
    }
  };

  const filteredConcessions = studentConcessions.filter((concession: any) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        concession.student.firstName.toLowerCase().includes(query) ||
        concession.student.lastName.toLowerCase().includes(query) ||
        concession.student.admissionNumber.toLowerCase().includes(query) ||
        concession.concessionType.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group concessions by status for stats
  const stats = {
    total: studentConcessions.length,
    pending: studentConcessions.filter((c: any) => 
      ['PENDING', 'PENDING_FIRST', 'PENDING_SECOND'].includes(c.status)
    ).length,
    approved: studentConcessions.filter((c: any) => c.status === 'APPROVED').length,
    rejected: studentConcessions.filter((c: any) => c.status === 'REJECTED').length,
    suspended: studentConcessions.filter((c: any) => c.status === 'SUSPENDED').length,
    expired: studentConcessions.filter((c: any) => c.status === 'EXPIRED').length,
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Student Concessions" subtitle="Manage student concessions and scholarships">
        <Alert>
          <Award className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access student concessions.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Student Concessions" subtitle="Manage student concessions and scholarships">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        {Object.entries(stats).slice(1).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{status}</p>
                  <p className="text-2xl font-semibold">{count}</p>
                </div>
                {statusIcons[status.toUpperCase() as keyof typeof statusIcons]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, admission number, or concession type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            disabled={isLoading}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
          <Button onClick={handleAssignConcession} disabled={isLoading}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Assign Concession
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Student Concessions</CardTitle>
          <CardDescription>
            Manage and track concessions assigned to students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading student concessions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Concession Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConcessions.map((concession: any) => (
                    <TableRow key={concession.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {concession.student.firstName} {concession.student.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {concession.student.admissionNumber}
                            {concession.student.section && (
                              <span> • {concession.student.section.class.name} {concession.student.section.name}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{concession.concessionType.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatValue(concession.concessionType.type, concession.customValue ?? concession.concessionType.value)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatValue(concession.concessionType.type, concession.customValue ?? concession.concessionType.value)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>From: {new Date(concession.validFrom).toLocaleDateString()}</div>
                          {concession.validUntil && (
                            <div>Until: {new Date(concession.validUntil).toLocaleDateString()}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[concession.status as keyof typeof statusColors]}>
                          <div className="flex items-center gap-1">
                            {statusIcons[concession.status as keyof typeof statusIcons]}
                            {concession.status}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(concession.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditConcession(concession)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            
                            {/* First Approval Actions */}
                            {['PENDING', 'PENDING_FIRST'].includes(concession.status) && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleApproveConcession(concession.id)}
                                  className="text-green-600"
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  {concession.status === 'PENDING_FIRST' ? 'First Approve' : 'Approve'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleRejectConcession(concession.id)}
                                  className="text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}

                            {/* Second Approval Actions */}
                            {concession.status === 'PENDING_SECOND' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleSecondApproveConcession(concession.id)}
                                  className="text-green-600"
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Second Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleRejectConcession(concession.id)}
                                  className="text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {concession.status === 'APPROVED' && (
                              <DropdownMenuItem 
                                onClick={() => handleSuspendConcession(concession.id)}
                                className="text-orange-600"
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                              onClick={() => handleDeleteConcession(concession)}
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
                  {filteredConcessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Award className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            {searchQuery ? 'No concessions match your search.' : 'No concessions assigned yet.'}
                          </p>
                          {!searchQuery && (
                            <Button variant="outline" onClick={handleAssignConcession}>
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Assign First Concession
                            </Button>
                          )}
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

      <StudentConcessionFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedConcession(null);
        }}
        onSubmit={handleFormSuccess}
        editingConcession={selectedConcession}
        concessionTypes={concessionTypes as any[]}
        students={students}
        feeHeads={feeHeads}
        feeTerms={feeTerms}
        isLoading={assignConcessionMutation.isPending}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setConcessionToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Student Concession"
        description={`Are you sure you want to delete this concession for "${concessionToDelete?.student.firstName} ${concessionToDelete?.student.lastName}"? This action cannot be undone.`}
        isDeleting={deleteConcessionMutation.isPending}
      />

      <ConcessionApprovalSettings
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveApprovalSettings}
        currentSettings={approvalSettings}
        isLoading={saveApprovalSettingsMutation.isPending}
      />
    </PageWrapper>
  );
} 