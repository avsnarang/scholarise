"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ChevronLeft,
  Building,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash,
  RefreshCw,
  ImageIcon,
} from "lucide-react";

import { api } from "@/utils/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { BranchFormModal } from "@/components/settings/branch-form-modal";
// import { AuthDebug } from "@/components/debug/auth-debug"; // Commented out - debug resolved

export default function BranchesPage() {
  const { toast } = useToast();

  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch branches
  const {
    data: branches,
    isLoading,
    refetch: refetchBranches,
  } = api.branch.getAll.useQuery();

  // Mutations
  const deleteMutation = api.branch.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Branch deleted",
        description: "The branch has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchBranches();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete branch. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createHeadquartersMutation = api.branch.createHeadquarters.useMutation({
    onSuccess: () => {
      toast({
        title: "Headquarters created",
        description: "The headquarters branch has been created successfully.",
        variant: "success",
      });
      void refetchBranches();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create headquarters. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddBranch = () => {
    setSelectedBranch(null);
    setIsFormModalOpen(true);
  };

  const handleCreateHeadquarters = () => {
    // Check if headquarters already exists
    const headquartersExists = branches?.some(branch => branch.id === 'headquarters' || branch.code === 'HQ');
    
    if (headquartersExists) {
      toast({
        title: "Headquarters already exists",
        description: "A headquarters branch has already been created.",
        variant: "destructive",
      });
      return;
    }

    // Create headquarters using the dedicated mutation
    createHeadquartersMutation.mutate();
  };

  const handleEditBranch = (branch: any) => {
    setSelectedBranch(branch);
    setIsFormModalOpen(true);
  };

  const handleDeleteBranch = (branch: any) => {
    setSelectedBranch(branch);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedBranch) {
      deleteMutation.mutate({ id: selectedBranch.id });
    }
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    void refetchBranches();
  };

  // Filter branches based on search query
  const filteredBranches = branches?.filter((branch) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      branch.name.toLowerCase().includes(searchLower) ||
      branch.code.toLowerCase().includes(searchLower) ||
      branch.address?.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Auth Debug Panel - Commented out since issue is resolved
        <AuthDebug /> */}
        
        <div className="flex items-center justify-between">
          <Link href="/settings">
            <Button variant="ghost" className="flex items-center gap-1 p-0">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#00501B]">Branch Management</h1>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
            <p className="text-sm text-gray-500">
              Manage branches for your school. Branches are used to organize students, teachers, and classes by location.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreateHeadquarters}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50 clickable"
              disabled={createHeadquartersMutation.isPending}
            >
              <Building className="mr-2 h-4 w-4" />
              {createHeadquartersMutation.isPending ? "Creating..." : "Create Headquarters"}
            </Button>
            <Button
              onClick={handleAddBranch}
              className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </div>
        </div>

        {/* Search and refresh */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search branches..."
                className="w-full pl-9 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void refetchBranches()}
            className="clickable"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Branches table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Branches</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 float-right" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBranches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          {searchQuery ? "No branches found matching your search." : "No branches found. Click the 'Add Branch' button to create your first branch."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBranches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell>
                            <div className="flex items-center justify-center w-10 h-10">
                              {branch.logoUrl ? (
                                <img
                                  src={branch.logoUrl}
                                  alt={`${branch.name} logo`}
                                  className="w-8 h-8 object-contain rounded"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Building className="mr-2 h-4 w-4 text-gray-400" />
                              {branch.name}
                            </div>
                          </TableCell>
                          <TableCell>{branch.code}</TableCell>
                          <TableCell>
                            {branch.address || <span className="text-gray-400">No address</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 clickable">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleEditBranch(branch)}
                                  className="clickable"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteBranch(branch)}
                                  className="text-red-600 focus:text-red-600 clickable"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>

      {/* Modals */}
      <BranchFormModal
        isOpen={isFormModalOpen}
        branch={selectedBranch}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Branch"
        description={`Are you sure you want to delete the branch "${selectedBranch?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
        isDeleting={deleteMutation.isPending}
      />
    </PageWrapper>
  );
}
