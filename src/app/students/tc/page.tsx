"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, History, Search, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function TransferCertificatePage() {
  const [search, setSearch] = useState("");
  const [lastRefetch, setLastRefetch] = useState(0);
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();

  const { hasPermission } = useActionPermissions("students");
  const canManageTC = hasPermission(Permission.MANAGE_TRANSFER_CERTIFICATES);

  // Fetch transfer certificates with optimized caching
  const { data: tcData, isLoading, refetch } = api.transferCertificate.getAll.useQuery({
    branchId: getBranchFilterParam(),
    search: search || undefined,
    limit: 50,
  }, {
    // Enable real-time updates but prevent excessive refetching
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000, // Data stays fresh for 1 second to prevent immediate refetches
    refetchInterval: false, // Don't poll automatically
  });

  const transferCertificates = tcData?.items || [];

  // Auto-refresh when route changes (e.g., coming back from create page)
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
        </div>
      ),
    },
  ];

  if (!canManageTC) {
    return (
      <PageWrapper title="Transfer Certificates" subtitle="Transfer Certificate Management">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have permission to manage transfer certificates.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Transfer Certificates</h1>
            <p className="text-sm text-gray-600">
              Generate and manage student transfer certificates
            </p>
          </div>
          <div className="flex space-x-3">
            <Link href="/students/tc/history">
              <Button variant="outline">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
            <Link href="/students/tc/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate TC
              </Button>
            </Link>
          </div>
        </div>

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
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total TCs Issued</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transferCertificates.length}</div>
              <p className="text-xs text-muted-foreground">
                All time transfers
              </p>
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
              <p className="text-xs text-muted-foreground">
                Recent transfers
              </p>
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
              <p className="text-xs text-muted-foreground">
                Annual transfers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Certificates</CardTitle>
            <CardDescription>
              List of all issued transfer certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : transferCertificates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No transfer certificates</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search ? "No transfer certificates match your search." : "Get started by generating your first transfer certificate."}
                </p>
                {!search && (
                  <div className="mt-6">
                    <Link href="/students/tc/create">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate TC
                      </Button>
                    </Link>
                  </div>
                )}
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
  );
} 