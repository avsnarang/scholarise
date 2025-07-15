"use client";

import { DesignationStatsCards } from "@/components/designations/designation-stats-cards"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { DesignationDataTable, type Designation } from "@/components/designations/designation-data-table"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileDown } from "lucide-react"
import Link from "next/link"
import { api } from "@/utils/api"
import { useState, useCallback, useEffect, useMemo } from "react"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { useToast } from "@/components/ui/use-toast"

export default function DesignationsListPage() {
  // State management
  const [currentDesignations, setCurrentDesignations] = useState<Designation[]>([]);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]); // Store cursors for each page
  const [searchTerm, setSearchTerm] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [allDesignationsSelected, setAllDesignationsSelected] = useState(false);
  const [allDesignationIds, setAllDesignationIds] = useState<string[]>([]);
  const [isPaginating, setIsPaginating] = useState(false);
  const [paginatingDirection, setPaginatingDirection] = useState<'previous' | 'next' | null>(null);
  const [lastKnownTotalPages, setLastKnownTotalPages] = useState(0);

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { toast } = useToast();
  const utils = api.useContext();

  // Memoize branch ID to prevent re-renders
  const branchId = useMemo(() => getBranchFilterParam(), [getBranchFilterParam]);

  // Debounce search to prevent excessive resets
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API query with pagination
  const { data: designationsData, isLoading, refetch } = api.designation.getAll.useQuery({
    branchId: branchId,
    limit: pageSize,
    cursor: cursors[currentPage - 1],
    search: debouncedSearchTerm || undefined,
  });

  // Calculate pagination parameters
  const designations = designationsData?.items || [];
  const totalCount = designations.length;
  const hasNextPage = designationsData?.nextCursor !== undefined;
  const currentTotalPages = Math.ceil(totalCount / pageSize);
  const totalPages = isPaginating && lastKnownTotalPages > 1 ? lastKnownTotalPages : currentTotalPages;

  // Transform designation data
  const transformDesignationData = useCallback((designation: any): Designation => {
    try {
      return {
        id: designation.id,
        title: designation.title || 'Unknown',
        code: designation.code || 'Unknown',
        category: designation.category || 'Other',
        level: designation.level || 'Entry',
        description: designation.description || undefined,
        isActive: designation.isActive !== undefined ? designation.isActive : true,
        branch: designation.branch
      };
    } catch (error) {
      console.error('Error transforming designation data:', error, designation);
      return {
        id: designation?.id || `error-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Data Error',
        code: 'ERROR',
        category: 'Other',
        level: 'Entry',
        isActive: false
      };
    }
  }, []);

  // Update currentDesignations when data loads
  useEffect(() => {
    if (designationsData?.items) {
      const transformedDesignations = designationsData.items.map(transformDesignationData);
      setCurrentDesignations(transformedDesignations);
      setAllDesignationIds(transformedDesignations.map(d => d.id));
      
      // Store next cursor for pagination
      if (designationsData.nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[currentPage] = designationsData.nextCursor;
          return newCursors;
        });
      }
      
      // Update last known total pages when we have valid data
      const newTotalPages = Math.ceil(transformedDesignations.length / pageSize);
      setLastKnownTotalPages(newTotalPages);
      
      // Reset pagination loading state
      setIsPaginating(false);
      setPaginatingDirection(null);
    }
  }, [designationsData?.items, designationsData?.nextCursor, currentPage, pageSize, transformDesignationData]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCursors([undefined]); // Reset cursors
    setRowSelection({});
    setAllDesignationsSelected(false);
    setIsPaginating(false); // Reset pagination state
    setPaginatingDirection(null); // Reset pagination direction
    setLastKnownTotalPages(0); // Reset last known total pages
  }, [debouncedSearchTerm, branchId, pageSize]);

  // API mutations
  const deleteDesignationMutation = api.designation.delete.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.designation.getStats.invalidate();
      toast({ title: "Designation deleted", description: "Designation record has been successfully deleted.", variant: "success" });
    },
  });

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle select all designations (entire dataset)
  const handleSelectAllDesignations = () => {
    setAllDesignationsSelected(true);
    setRowSelection({});
  };

  // Handle deselect all designations
  const handleDeselectAllDesignations = () => {
    setAllDesignationsSelected(false);
    setRowSelection({});
  };

  // Get selected designation IDs
  const getSelectedDesignationIds = () => {
    if (allDesignationsSelected) {
      return allDesignationIds;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  };

  // Get selected count
  const getSelectedCount = () => {
    if (allDesignationsSelected) {
      return allDesignationIds.length;
    }
    return Object.keys(rowSelection).filter(id => rowSelection[id]).length;
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setIsPaginating(true);
      setPaginatingDirection('previous');
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && hasNextPage) {
      setIsPaginating(true);
      setPaginatingDirection('next');
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setCursors([undefined]); // Reset cursors
  };

  // Handle bulk delete (simplified version)
  const handleBulkDelete = async (ids: string[]) => {
    try {
      // Delete one by one since bulk delete may not be available
      for (const id of ids) {
        await deleteDesignationMutation.mutateAsync({ id });
      }
      setRowSelection({});
      setAllDesignationsSelected(false);
      toast({ 
        title: "Designations Deleted", 
        description: `${ids.length} designation(s) have been successfully deleted.`, 
        variant: "success" 
      });
    } catch (error) {
      console.error('Error deleting designations:', error);
      toast({
        title: "Bulk Deletion Failed",
        description: "An error occurred while deleting designations.",
        variant: "destructive",
      });
    }
  };

  // Define update mutation
  const updateDesignationMutation = api.designation.update.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.designation.getStats.invalidate();
    },
  });

  // Handle bulk status update (simplified version)
  const handleBulkStatusUpdate = async (ids: string[], isActive: boolean) => {
    try {
      // Update one by one since bulk update may not be available
      for (const id of ids) {
        const designation = currentDesignations.find(d => d.id === id);
        if (designation) {
          await updateDesignationMutation.mutateAsync({
            id: designation.id,
            title: designation.title,
            category: designation.category,
            level: designation.level,
            description: designation.description,
            isActive: isActive
          });
        }
      }
      setRowSelection({});
      setAllDesignationsSelected(false);
      toast({ 
        title: "Status Updated", 
        description: `${ids.length} designation(s) status has been updated.`, 
        variant: "success" 
      });
    } catch (error) {
      console.error('Error updating designation status:', error);
      toast({
        title: "Status Update Failed",
        description: "An error occurred while updating designation status.",
        variant: "destructive",
      });
    }
  };

  // Get designation stats from the API or use default values
  const { data: designationStats, isLoading: isLoadingStats } = api.designation.getStats.useQuery({
    branchId: branchId
  });

  return (
    <PageWrapper
      title="Designations"
      subtitle="Manage all designations in your institution"
      action={
        <div className="flex gap-2">
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/staff/designations/create">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Designation</span>
            </Button>
          </Link>
        </div>
      }
    >
      <DesignationStatsCards branchId={branchId} />

      <div className="mt-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">All Designations</h2>
            <p className="text-muted-foreground">
              {isLoading ? 'Loading...' : `Showing ${currentDesignations.length} of ${totalCount} designations`}
            </p>
          </div>
        </div>

        {/* Designation Data Table */}
        <DesignationDataTable
          data={currentDesignations}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          isPaginating={isPaginating}
          paginatingDirection={paginatingDirection}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          allDesignationsSelected={allDesignationsSelected}
          onSelectAllDesignations={handleSelectAllDesignations}
          onDeselectAllDesignations={handleDeselectAllDesignations}
          selectedCount={getSelectedCount()}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
        />
      </div>
    </PageWrapper>
  );
} 