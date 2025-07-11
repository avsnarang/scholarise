"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Users, 
  Edit, 
  Trash,
  Filter,
  GraduationCap,
  UserCheck,
  CalendarRange,
  BookOpen,
  BadgeCheck,
  X,
  TrendingUp,
  PlusCircle,
  FileDown,
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { api } from "@/utils/api";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Card, CardContent, CardHeader, CardDescription, CardFooter, CardTitle, CardAction } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useActionPermissions } from "@/utils/permission-utils";
import { CreateClassModal } from "@/components/classes/create-class-modal";
import { SectionDataTable } from "@/components/classes/class-data-table";
import type { SectionTableData } from "@/components/classes/class-data-table";

export default function ClassesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSessionId } = useAcademicSessionContext();
  const { currentBranchId, currentBranch } = useBranchContext();
  
  // Get permissions for the classes module
  const { canView, canCreate, canEdit } = useActionPermissions("classes");
  
  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [pageSize, setPageSize] = useState(50);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Get sections for the current session and branch
  const {
    data: sectionsData,
    isLoading,
    refetch: refetchSections
  } = api.section.getAll.useQuery(
    { 
      sessionId: currentSessionId || undefined,
      branchId: currentBranchId || undefined,
      includeClass: true,
      includeTeacher: true,
      includeStudentCount: true
    },
    { enabled: !!currentSessionId && !!currentBranchId }
  );
  
  // Transform sections data to match SectionTableData type
  const sections: SectionTableData[] = sectionsData?.map((section: any) => ({
    id: section.id,
    name: section.name,
    capacity: section.capacity,
    isActive: section.isActive,
    displayOrder: section.displayOrder,
    classId: section.classId,
    teacherId: section.teacherId,
    class: {
      id: section.class.id,
      name: section.class.name,
      isActive: section.class.isActive,
      displayOrder: section.class.displayOrder,
      grade: section.class.grade
    },
    teacher: section.teacher,
    _count: section._count,
    studentCount: section.studentCount || section._count?.students || 0
  })) || [];

  // Delete section mutation
  const { mutate: deleteSection, isPending: isDeleting } = api.section.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Section deleted",
        description: "The section has been deleted successfully.",
        variant: "success"
      });
      void refetchSections();
      setClassToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete section. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Filter sections based on status filter
  const filteredSections = sections?.filter(section => {
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && section.isActive) ||
                         (statusFilter === "inactive" && !section.isActive);
    const matchesSearch = !searchQuery || 
                         section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         section.class.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  // Get stats
  const totalClasses = [...new Set(sections?.map(s => s.classId))].length || 0;
  const activeClasses = [...new Set(sections?.filter(s => s.class.isActive).map(s => s.classId))].length || 0;
  const totalSections = sections?.length || 0;
  const withTeachers = sections?.filter(s => s.teacher).length || 0;
  
  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
  };
  
  // Handle class deletion
  const handleDeleteClass = () => {
    if (classToDelete) {
      deleteSection({ id: classToDelete });
    }
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };
  
  // Page action buttons that respect permissions
  const renderPageActions = () => (
    <div className="flex gap-2">
      {/* Export button - requires view permission */}
      {canView() && (
        <Button variant="glowing-secondary" className="flex items-center gap-1">
          <FileDown className="h-4 w-4" />
          <span>Export</span>
        </Button>
      )}
      
      {/* Order classes button - requires edit permission */}
      {canEdit() && (
        <Link href="/classes/order">
          <Button variant="outline" className="flex items-center gap-1">
            <ArrowUpDown className="h-4 w-4" />
            <span>Order Classes</span>
          </Button>
        </Link>
      )}
      
      {/* Add class button - requires create permission */}
      {canCreate() && (
        <Button 
          variant="glowing" 
          className="flex items-center gap-1"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Class</span>
        </Button>
      )}
    </div>
  );
  
  if (isLoading) {
    return (
      <PageWrapper
        title="Classes"
        subtitle="Manage school classes and sections"
        action={renderPageActions()}
      >
        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full dark:bg-gray-700" />
          ))}
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-64 dark:bg-gray-700" />
          <Skeleton className="h-10 w-32 dark:bg-gray-700" />
        </div>
        
        <Skeleton className="h-[400px] w-full dark:bg-gray-700" />
      </PageWrapper>
    );
  }
  
  if (!currentSessionId || !currentBranchId) {
    return (
      <PageWrapper
        title="Classes"
        subtitle="Manage school classes and sections"
        action={renderPageActions()}
      >
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center dark:border-gray-700">
          <GraduationCap className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Selection Required</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md">
            {!currentSessionId ? "Please select an academic session " : ""}
            {!currentSessionId && !currentBranchId ? "and " : ""}
            {!currentBranchId ? "please select a branch " : ""}
            from the dropdown above to view classes.
          </p>
        </div>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper
      title="Classes"
      subtitle={`Manage classes and sections for ${currentBranch?.name || ""}`}
      action={renderPageActions()}
    >
      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-[#7aad8c]/10 dark:*:data-[slot=card]:to-[#252525] dark:*:data-[slot=card]:bg-[#252525] grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mb-6">
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">Total Classes</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {totalClasses}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                All
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <GraduationCap className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {totalClasses} total registered classes
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              Current academic session
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">Active Classes</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {activeClasses}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                {Math.round((activeClasses / (totalClasses || 1)) * 100)}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <BadgeCheck className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {activeClasses} active classes
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              {totalClasses - activeClasses} inactive classes
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">With Teachers</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {withTeachers}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                {Math.round((withTeachers / (totalClasses || 1)) * 100)}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <UserCheck className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {withTeachers} classes with assigned teachers
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              {totalClasses - withTeachers} classes need teachers
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">Total Sections</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {totalSections}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                Sections
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <BookOpen className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {totalSections} total sections
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              Across all classes
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Classes</h2>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              onClick={() => {
                const current = statusFilter === "all" ? "active" : "all";
                setStatusFilter(current);
              }}
            >
              <Filter className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              {statusFilter === "all" ? "All Classes" : "Active Only"}
            </Button>
          </div>
        </div>

        {/* Active filters display */}
        {(statusFilter !== "all") && (
          <div className="flex flex-wrap gap-2 items-center text-sm p-3 mb-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-300 font-medium">Active filters:</span>
            
            {statusFilter !== "all" && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 gap-1 pl-2 border-green-200 dark:border-green-700 shadow-sm">
                Status: {statusFilter === "active" ? "Active" : "Inactive"}
                <X className="h-3 w-3 cursor-pointer hover:text-green-900 dark:hover:text-green-100 transition-colors" onClick={() => setStatusFilter("all")} />
              </Badge>
            )}
          </div>
        )}
        
        {/* Empty state */}
        {filteredSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
            <div className="h-16 w-16 rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/20 flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-[#00501B] dark:text-[#7aad8c]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No classes found</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
              {(statusFilter !== "all") 
                ? "Try changing your filters or" 
                : "Get started by"} adding a new class.
            </p>
            <div className="mt-6">
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90 text-white shadow-sm hover:shadow transition-all"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Class data table */}
            <div className="rounded-md overflow-hidden shadow-sm">
              <SectionDataTable 
                key={`section-table-${pageSize}`}
                data={filteredSections}
                isLoading={isLoading}
              />
            </div>
            
            {/* Simplified pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {pageSize >= filteredSections.length 
                  ? `Showing all ${filteredSections.length} sections` 
                  : `Showing up to ${pageSize} sections per page`}
              </div>
              <div className="flex items-center gap-4">
                <select 
                  className="border rounded p-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  value={pageSize === filteredSections.length ? filteredSections.length.toString() : pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={filteredSections.length}>All</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setClassToDelete(null);
        }}
        onConfirm={handleDeleteClass}
        title="Delete Class"
        description="Are you sure you want to delete this class? This action cannot be undone, and all associated data will be permanently removed."
        isDeleting={isDeleting}
      />

      {/* Create class modal */}
      {currentBranchId && currentSessionId && (
        <CreateClassModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            void refetchSections();
            setIsCreateModalOpen(false);
          }}
          branchId={currentBranchId}
          sessionId={currentSessionId}
        />
      )}
    </PageWrapper>
  );
}
