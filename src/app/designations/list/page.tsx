"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, FileDown } from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/api";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { DesignationStatsCards } from "@/components/designations/designation-stats-cards";

export default function DesignationsListPage() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [designationToDelete, setDesignationToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState(10);
  
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const branchId = getBranchFilterParam();

  // Log branch filter for debugging
  console.log("Current branch filter:", branchId);

  // Fetch designations with pagination and filtering
  const { data: designationsData, isLoading, refetch, error } = api.designation.getAll.useQuery({
    search: searchQuery.length > 0 ? searchQuery : undefined,
    branchId,
    limit: pageSize,
    cursor
  }, {
    refetchOnWindowFocus: false,
  });

  // Log results for debugging
  React.useEffect(() => {
    console.log("Designation data received:", designationsData);
    if (error) {
      console.error("Error fetching designations:", error);
    }
  }, [designationsData, error]);

  // Ensure designations is always an array
  const designations = Array.isArray(designationsData) ? designationsData : 
                      (designationsData?.items || []);
  
  // Log to help debug
  console.log("Designations array length:", designations.length);

  // Delete designation mutation
  const deleteDesignation = api.designation.delete.useMutation({
    onSuccess: () => {
      toast.success("Designation deleted successfully");
      refetch();
      setDeleteDialogOpen(false);
      setDesignationToDelete(null);
    },
    onError: (error) => {
      toast.error(`Error deleting designation: ${error.message}`);
    },
  });

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCursor(undefined); // Reset pagination on search
  };

  // Handle delete button click
  const handleDeleteClick = (id: string) => {
    setDesignationToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (designationToDelete) {
      deleteDesignation.mutate({ id: designationToDelete });
    }
  };

  // Check if user has permission to edit/delete
  const canManage = isAdmin || isSuperAdmin;

  return (
    <PageWrapper
      title="Designations"
      subtitle="View and manage all staff positions and job titles"
      action={
        <div className="flex gap-2">
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          {canManage && (
            <Link href="/designations/create">
              <Button variant="glowing" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Add Designation</span>
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <DesignationStatsCards />
      
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Designations</h2>
          <div className="w-72 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search designations..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading designations...
          </div>
        ) : designations.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No designations found. Try adjusting your filters.
          </div>
        ) : (
          <div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designations.map((designation) => (
                    <TableRow key={designation.id}>
                      <TableCell className="font-medium">{designation.title}</TableCell>
                      <TableCell>{designation.code}</TableCell>
                      <TableCell>{designation.category}</TableCell>
                      <TableCell>{designation.level}</TableCell>
                      <TableCell>
                        {designation.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {designation.description || "-"}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => router.push(`/designations/${designation.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(designation.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {designations.length} designations
              </div>
              <div className="flex items-center gap-4">
                <select 
                  className="border rounded p-1 text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!cursor} // Only enable if we're not on the first page
                    onClick={() => setCursor(undefined)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!designationsData?.nextCursor} // Only enable if there's a next page
                    onClick={() => {
                      if (designationsData?.nextCursor) {
                        setCursor(designationsData.nextCursor);
                      }
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this designation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteDesignation.isPending}
            >
              {deleteDesignation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
} 