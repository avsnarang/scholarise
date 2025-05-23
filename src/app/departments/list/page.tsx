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
import { DepartmentStatsCards } from "@/components/departments/department-stats-cards";

export default function DepartmentsListPage() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageSize, setPageSize] = useState(10);
  
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const branchId = getBranchFilterParam();
  
  // Log branch filter for debugging
  console.log("Current branch filter:", branchId);

  // Fetch departments with pagination and filtering
  const { data: departmentsData, isLoading, refetch, error } = api.department.getAll.useQuery({
    search: searchQuery.length > 0 ? searchQuery : undefined,
    branchId,
    limit: pageSize,
    cursor
  }, {
    refetchOnWindowFocus: false,
  });
  
  // Log results for debugging
  React.useEffect(() => {
    console.log("Department data received:", departmentsData);
    if (error) {
      console.error("Error fetching departments:", error);
    }
  }, [departmentsData, error]);
  
  const departments = departmentsData?.items || [];
  
  // Log to help debug
  console.log("Departments array length:", departments.length);

  // Delete department mutation
  const deleteDepartment = api.department.delete.useMutation({
    onSuccess: () => {
      toast.success("Department deleted successfully");
      refetch();
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    },
    onError: (error) => {
      toast.error(`Error deleting department: ${error.message}`);
    },
  });

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCursor(undefined); // Reset pagination on search
  };

  // Handle delete button click
  const handleDeleteClick = (id: string) => {
    setDepartmentToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (departmentToDelete) {
      deleteDepartment.mutate({ id: departmentToDelete });
    }
  };
  
  // Handle pagination
  const goToNextPage = useCallback(() => {
    if (departmentsData?.nextCursor) {
      setCursor(departmentsData.nextCursor);
    }
  }, [departmentsData?.nextCursor]);

  const goToPreviousPage = useCallback(() => {
    setCursor(undefined); // Reset to first page
  }, []);

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCursor(undefined); // Reset to first page
  };

  // Check if user has permission to edit/delete
  const canManage = isAdmin || isSuperAdmin;

  return (
    <PageWrapper
      title="Departments"
      subtitle="View and manage all departments across your institution"
      action={
        <div className="flex gap-2">
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          {canManage && (
            <Link href="/departments/create">
              <Button variant="glowing" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Add Department</span>
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <DepartmentStatsCards />
      
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Departments</h2>
          <div className="w-72 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading departments...
          </div>
        ) : departments.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No departments found. Try adjusting your filters.
          </div>
        ) : (
          <div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>{department.code}</TableCell>
                      <TableCell>{department.type}</TableCell>
                      <TableCell>
                        {department.isActive ? (
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
                        {department.description || "-"}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => router.push(`/departments/${department.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(department.id)}
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
                Showing up to {pageSize} departments per page
              </div>
              <div className="flex items-center gap-4">
                <select 
                  className="border rounded p-1 text-sm"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
                    onClick={goToPreviousPage}
                    disabled={!cursor} // Only enable if we're not on the first page
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!departmentsData?.nextCursor} // Only enable if there's a next page
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
            <DialogTitle>Are you sure you want to delete this department?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              department and remove its data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteDepartment.isPending}
            >
              {deleteDepartment.isPending ? "Deleting..." : "Delete Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
} 