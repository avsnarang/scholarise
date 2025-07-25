"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, RotateCcw, Download, AlertTriangle, FileText, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { DataTable } from "@/components/ui/data-table";
import { generateTransferCertificatePDF } from "@/lib/utils/tc-pdf";
import { useActionPermissions } from "@/utils/permission-utils";
import { Permission } from "@/types/permissions";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/usePermissions";

export default function TransferCertificateHistoryPage() {
  const [search, setSearch] = useState("");
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [lastRefetch, setLastRefetch] = useState(0);
  
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { toast } = useToast();
  const utils = api.useUtils();

  const { hasPermission } = useActionPermissions("students");
  const canManageTC = hasPermission(Permission.MANAGE_TRANSFER_CERTIFICATES);

  const { isSuperAdmin } = usePermissions();

  // Fetch transfer certificates with real-time updates
  const { data: tcData, isLoading, refetch } = api.transferCertificate.getAll.useQuery({
    branchId: getBranchFilterParam(),
    search: search || undefined,
    limit: 100,
  }, {
    // Enable real-time updates for instant visibility of new TCs
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000, // Data stays fresh for 1 second to prevent immediate refetches
    refetchInterval: false, // Don't poll, rely on cache updates
  });

  const transferCertificates = tcData?.items || [];

  // Auto-refresh functionality
  useEffect(() => {
    const throttledRefetch = () => {
      const now = Date.now();
      if (now - lastRefetch > 1000) {
        setLastRefetch(now);
        refetch();
      }
    };

    const handleFocus = () => {
      throttledRefetch();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        throttledRefetch();
      }
    };

    // Refresh when page becomes visible again
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch, lastRefetch]);

  // Revert TC mutation with optimistic updates
  const revertTCMutation = api.transferCertificate.revert.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.transferCertificate.getAll.cancel();
      
      // Use only specific cache keys to avoid duplication  
      const historyPageKey = { branchId: getBranchFilterParam(), search: search || undefined, limit: 100 };
      const mainPageKey = { branchId: getBranchFilterParam(), limit: 50 };
      
      // Snapshot the previous values
      const previousHistoryData = utils.transferCertificate.getAll.getData(historyPageKey);
      const previousMainData = utils.transferCertificate.getAll.getData(mainPageKey);

      // Optimistically update the cache - remove the TC
      if (previousHistoryData) {
        const updatedItems = previousHistoryData.items.filter(tc => tc.id !== id);
        utils.transferCertificate.getAll.setData(historyPageKey, {
          ...previousHistoryData,
          items: updatedItems,
        });
      }
      
      if (previousMainData) {
        const updatedItems = previousMainData.items.filter(tc => tc.id !== id);
        utils.transferCertificate.getAll.setData(mainPageKey, {
          ...previousMainData,
          items: updatedItems,
        });
      }

      // Return a context object with the snapshotted values
      return { 
        previousHistoryData, 
        previousMainData,
        historyPageKey,
        mainPageKey 
      };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transfer Certificate reverted successfully. Student has been reactivated.",
      });
      
      // Invalidate all transfer certificate queries to refresh all pages
      utils.transferCertificate.getAll.invalidate();
      utils.transferCertificate.searchStudents.invalidate();
      
      // Also invalidate student queries since student status changed
      utils.student.getAll.invalidate();
      utils.student.getStats.invalidate();
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousHistoryData && context?.historyPageKey) {
        utils.transferCertificate.getAll.setData(context.historyPageKey, context.previousHistoryData);
      }
      
      if (context?.previousMainData && context?.mainPageKey) {
        utils.transferCertificate.getAll.setData(context.mainPageKey, context.previousMainData);
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to revert transfer certificate.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setRevertingId(null);
      // Always refetch after error or success to ensure cache is in sync
      utils.transferCertificate.getAll.invalidate();
    },
  });

  // Handle PDF download
  const handleDownloadPDF = async (tc: any) => {
    try {
      const tcPDFData = {
        tcNumber: tc.tcNumber,
        issueDate: new Date(tc.issueDate),
        reason: tc.reason,
        remarks: tc.remarks,
        student: {
          firstName: tc.student.firstName,
          lastName: tc.student.lastName,
          admissionNumber: tc.student.admissionNumber,
          dateOfBirth: new Date(tc.student.dateOfBirth),
          gender: tc.student.gender,
          class: tc.student.class,
          parent: tc.student.parent,
          branch: tc.student.branch,
          dateOfAdmission: new Date(tc.student.dateOfAdmission || tc.student.joinDate),
        },
      };

      const pdf = generateTransferCertificatePDF(tcPDFData);
      pdf.save(`TC_${tc.tcNumber}_${tc.student.firstName}_${tc.student.lastName}.pdf`);
      
      toast({
        title: "Success",
        description: "Transfer Certificate PDF downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevertTC = async (tcId: string) => {
    setRevertingId(tcId);
    await revertTCMutation.mutateAsync({ id: tcId });
  };

  // Define columns for the data table
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "tcNumber",
      header: "TC Number",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.tcNumber}</div>
      ),
    },
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.student.firstName} {row.original.student.lastName}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.student.admissionNumber}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "class",
      header: "Class",
      cell: ({ row }) => (
        <div>
          {row.original.student.class ? 
            `${row.original.student.class.name} ${row.original.student.class.section}` : 
            'N/A'
          }
        </div>
      ),
    },
    {
      accessorKey: "issueDate",
      header: "Issue Date",
      cell: ({ row }) => (
        <div>{new Date(row.original.issueDate).toLocaleDateString()}</div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <div className="max-w-xs truncate">
          {row.original.reason || "Not specified"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Student Status",
      cell: ({ row }) => (
        <Badge variant={row.original.student.isActive ? "default" : "secondary"}>
          {row.original.student.isActive ? "Active" : "Withdrawn"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadPDF(row.original)}
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          {isSuperAdmin && !row.original.student.isActive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revertingId === row.original.id}
                >
                  {revertingId === row.original.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-1"></div>
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" />
                  )}
                  Revert
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span>Revert Transfer Certificate</span>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to revert this transfer certificate?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <p className="text-sm text-gray-500 mb-3">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 mb-3">
                    <li>Delete the transfer certificate permanently</li>
                    <li>Reactivate the student ({row.original.student.firstName} {row.original.student.lastName})</li>
                    <li>Allow the student to be enrolled again</li>
                  </ul>
                  <p className="text-sm font-medium text-red-600">This action cannot be undone.</p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleRevertTC(row.original.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Revert TC
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ];

  if (!canManageTC) {
    return (
      <PageWrapper title="Transfer Certificate History" subtitle="Transfer Certificate History">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">Access Denied</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You don't have permission to view transfer certificate history.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Transfer Certificate History"
      subtitle="View all issued transfer certificates and manage them"
      action={
        <Link href="/students/tc">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to TCs
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">

        {/* Super Admin Notice */}
        {isSuperAdmin && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Super Admin Access</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    As a super admin, you can revert transfer certificates. This will permanently delete the TC and reactivate the student.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Transfer Certificates</CardTitle>
            <CardDescription>
              Search by TC number, student name, or admission number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfer certificates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total TCs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transferCertificates.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transferCertificates.filter(tc => {
                  const tcDate = new Date(tc.issueDate);
                  const now = new Date();
                  return tcDate.getMonth() === now.getMonth() && 
                         tcDate.getFullYear() === now.getFullYear();
                }).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Year</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transferCertificates.filter(tc => {
                  const tcDate = new Date(tc.issueDate);
                  const now = new Date();
                  return tcDate.getFullYear() === now.getFullYear();
                }).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transferCertificates.filter(tc => {
                  const tcDate = new Date(tc.issueDate);
                  const now = new Date();
                  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  return tcDate >= thirtyDaysAgo;
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Transfer Certificates</CardTitle>
            <CardDescription>
              Complete history of all issued transfer certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : transferCertificates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">No transfer certificates found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search ? "No transfer certificates match your search." : "No transfer certificates have been issued yet."}
                </p>
              </div>
            ) : (
              <DataTable 
                columns={columns} 
                data={transferCertificates || []}
                searchKey="tcNumber"
                rowSelection={{}}
                onRowSelectionChange={() => {}}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
} 