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
import { ClassDataTable, type Class } from "@/components/classes/class-data-table";

export default function ClassesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSessionId } = useAcademicSessionContext();
  const { currentBranchId, currentBranch } = useBranchContext();
  
  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [pageSize, setPageSize] = useState(50);
  
  // Get classes for the current session and branch
  const {
    data: classes,
    isLoading,
    refetch: refetchClasses
  } = api.class.getAll.useQuery(
    { 
      sessionId: currentSessionId || undefined,
      branchId: currentBranchId || undefined,
      includeTeacher: true,
      includeStudentCount: true
    },
    { enabled: !!currentSessionId && !!currentBranchId }
  );
  
  // Get sections for filtering
  const { data: sections = [] } = api.class.getSections.useQuery(
    { 
      sessionId: currentSessionId || undefined,
      branchId: currentBranchId || undefined
    },
    { enabled: !!currentSessionId && !!currentBranchId }
  );
  
  // Delete class mutation
  const { mutate: deleteClass, isPending: isDeleting } = api.class.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Class deleted",
        description: "The class has been deleted successfully.",
        variant: "success"
      });
      void refetchClasses();
      setClassToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Filter classes based on status and section filters (not search, which is handled by the data table)
  const filteredClasses = classes?.filter(classItem => {
    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active" && !classItem.isActive) return false;
      if (statusFilter === "inactive" && classItem.isActive) return false;
    }
    
    // Apply section filter
    if (sectionFilter !== "all" && classItem.section !== sectionFilter) {
      return false;
    }
    
    return true;
  }) || [];

  // Transform data to match the ClassDataTable expected format
  const formattedClasses: Class[] = filteredClasses.map(classItem => ({
    id: classItem.id,
    name: classItem.name,
    section: classItem.section,
    capacity: classItem.capacity || 0,
    isActive: classItem.isActive,
    teacher: classItem.teacher ? {
      id: classItem.teacher.id,
      firstName: classItem.teacher.firstName,
      lastName: classItem.teacher.lastName
    } : undefined,
    _count: {
      students: classItem._count?.students || 0
    },
    studentCount: (classItem as any).studentCount || classItem._count?.students || 0
  }));
  
  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
  };
  
  // Handle class deletion
  const handleDeleteClass = () => {
    if (classToDelete) {
      deleteClass({ id: classToDelete });
    }
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSectionFilter("all");
  };
  
  // Get stats
  const totalClasses = classes?.length || 0;
  const activeClasses = classes?.filter(c => c.isActive).length || 0;
  const withTeachers = classes?.filter(c => c.teacher).length || 0;
  
  if (isLoading) {
    return (
      <PageWrapper
        title="Classes"
        subtitle="Manage school classes and sections"
        action={
          <div className="flex gap-2">
            <Button variant="glowing-secondary" className="flex items-center gap-1">
              <FileDown className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Link href="/classes/order">
              <Button variant="outline" className="flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                <span>Order Classes</span>
              </Button>
            </Link>
            <Link href="/settings/classes/new">
              <Button variant="glowing" className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span>Add Class</span>
              </Button>
            </Link>
          </div>
        }
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
        action={
          <div className="flex gap-2">
            <Button variant="glowing-secondary" className="flex items-center gap-1">
              <FileDown className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Link href="/classes/order">
              <Button variant="outline" className="flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                <span>Order Classes</span>
              </Button>
            </Link>
            <Link href="/settings/classes/new">
              <Button variant="glowing" className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span>Add Class</span>
              </Button>
            </Link>
          </div>
        }
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
      action={
        <div className="flex gap-2">
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/classes/order">
            <Button variant="outline" className="flex items-center gap-1">
              <ArrowUpDown className="h-4 w-4" />
              <span>Order Classes</span>
            </Button>
          </Link>
          <Link href="/settings/classes/new">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Class</span>
            </Button>
          </Link>
        </div>
      }
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
            <CardDescription className="dark:text-[#c0c0c0]">Average Size</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {classes?.length ? Math.round(classes.reduce((sum, c) => sum + (c._count?.students || 0), 0) / classes.length) : 0}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                Students
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <Users className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              Average students per class
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              Based on active enrollment
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
        {(statusFilter !== "all" || sectionFilter !== "all") && (
          <div className="flex flex-wrap gap-2 items-center text-sm p-3 mb-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-300 font-medium">Active filters:</span>
            
            {statusFilter !== "all" && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 gap-1 pl-2 border-green-200 dark:border-green-700 shadow-sm">
                Status: {statusFilter === "active" ? "Active" : "Inactive"}
                <X className="h-3 w-3 cursor-pointer hover:text-green-900 dark:hover:text-green-100 transition-colors" onClick={() => setStatusFilter("all")} />
              </Badge>
            )}
            
            {sectionFilter !== "all" && (
              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 gap-1 pl-2 border-purple-200 dark:border-purple-700 shadow-sm">
                Section: {sectionFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-purple-900 dark:hover:text-purple-100 transition-colors" onClick={() => setSectionFilter("all")} />
              </Badge>
            )}
          </div>
        )}
        
        {/* Empty state */}
        {filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
            <div className="h-16 w-16 rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/20 flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-[#00501B] dark:text-[#7aad8c]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No classes found</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
              {(statusFilter !== "all" || sectionFilter !== "all") 
                ? "Try changing your filters or" 
                : "Get started by"} adding a new class.
            </p>
            <div className="mt-6">
              <Button 
                onClick={() => router.push("/settings/classes/new")}
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
              <ClassDataTable 
                key={`class-table-${pageSize}`}
                data={formattedClasses}
                pageSize={pageSize}
              />
            </div>
            
            {/* Simplified pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {pageSize >= formattedClasses.length 
                  ? `Showing all ${formattedClasses.length} classes` 
                  : `Showing up to ${pageSize} classes per page`}
              </div>
              <div className="flex items-center gap-4">
                <select 
                  className="border rounded p-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  value={pageSize === formattedClasses.length ? formattedClasses.length.toString() : pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={formattedClasses.length}>All</option>
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
    </PageWrapper>
  );
}
