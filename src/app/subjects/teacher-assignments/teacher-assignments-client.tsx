"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  AlertCircle, 
  Search, 
  Users, 
  BookOpen, 
  GraduationCap,
  ChevronDown,
  Filter,
  X,
  TrendingUp,
  PlusCircle,
  FileDown,
  UserCheck,
  BadgeCheck,
  Settings,
  ArrowUpDown
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useToast } from "@/components/ui/use-toast";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";

// Import the reusable advanced filter component
import { 
  AdvancedFilter, 
  useAdvancedFilterAdapter,
  type AdvancedFilters,
  type AdvancedFilterCondition,
  type FilterCategory,
  type FilterOption,
  type FilterMapping
} from "@/components/ui/advanced-filter";
import type { Filter as UIFilter } from "@/components/ui/filters";

import { DataTable } from "@/components/ui/data-table";
import {
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { MultiSelect } from "@/components/ui/multi-select";

// Custom filter types for subject teachers
export enum SubjectTeacherFilterType {
  TEACHER = "Teacher",
  SUBJECT = "Subject", 
  CLASS = "Class",
  STATUS = "Status",
}

// Subject Teacher Filter configuration
interface SubjectTeacherFilterProps {
  filters: AdvancedFilters;
  onFilterChange: (filters: AdvancedFilters) => void;
}

function SubjectTeacherFilter({ filters, onFilterChange }: SubjectTeacherFilterProps) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  // Fetch data for filter options
  const { data: teachersData } = api.teacher.getAll.useQuery(
    { branchId: currentBranchId || undefined, isActive: true },
    { enabled: !!currentBranchId }
  );
  const teachers = teachersData?.items || [];

  const { data: subjects } = api.subject.getAll.useQuery(
    { isActive: true },
    { enabled: !!currentBranchId }
  );

  const { data: classes = [] } = api.class.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      sessionId: currentSessionId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  // Configure filter mapping
  const filterMapping: FilterMapping = {
    [SubjectTeacherFilterType.TEACHER]: {
      field: "teacherId",
      valueMapper: (displayValue: string, options: any[]) => {
        const teacher = options.find((t: any) => 
          `${t.firstName} ${t.lastName}${t.employeeCode ? ` (${t.employeeCode})` : ''}` === displayValue
        );
        return teacher?.id ?? "";
      },
      displayMapper: (fieldValue: string, options: any[]) => {
        const teacher = options.find((t: any) => t.id === fieldValue);
        return teacher ? `${teacher.firstName} ${teacher.lastName}${teacher.employeeCode ? ` (${teacher.employeeCode})` : ''}` : "";
      }
    },
    [SubjectTeacherFilterType.SUBJECT]: {
      field: "subjectId",
      valueMapper: (displayValue: string, options: any[]) => {
        const subject = options.find((s: any) => 
          `${s.name}${s.code ? ` (${s.code})` : ''}` === displayValue
        );
        return subject?.id ?? "";
      },
      displayMapper: (fieldValue: string, options: any[]) => {
        const subject = options.find((s: any) => s.id === fieldValue);
        return subject ? `${subject.name}${subject.code ? ` (${subject.code})` : ''}` : "";
      }
    },
    [SubjectTeacherFilterType.CLASS]: {
      field: "classId",
      valueMapper: (displayValue: string, options: any[]) => {
        const cls = options.find((c: any) => c.name === displayValue);
        return cls?.id ?? "";
      },
      displayMapper: (fieldValue: string, options: any[]) => {
        const cls = options.find((c: any) => c.id === fieldValue);
        return cls?.name ?? "";
      }
    },
    [SubjectTeacherFilterType.STATUS]: {
      field: "isActive",
      valueMapper: (displayValue: string) => displayValue === "Active" ? "true" : "false",
      displayMapper: (fieldValue: string) => fieldValue === "true" ? "Active" : "Inactive"
    }
  };

  // Data options for the adapter
  const dataOptions = {
    [SubjectTeacherFilterType.TEACHER]: teachers,
    [SubjectTeacherFilterType.SUBJECT]: subjects?.items || [],
    [SubjectTeacherFilterType.CLASS]: classes,
    [SubjectTeacherFilterType.STATUS]: []
  };

  // Use the adapter hook
  const { uiFilters, setUiFilters } = useAdvancedFilterAdapter(
    filters,
    onFilterChange,
    filterMapping,
    dataOptions
  );

  // Configure filter categories
  const filterCategories: FilterCategory[][] = [
    [
      {
        name: SubjectTeacherFilterType.TEACHER,
        icon: <Users className="size-3.5" />,
        options: teachers.map((teacher: any) => ({
          name: `${teacher.firstName} ${teacher.lastName}${teacher.employeeCode ? ` (${teacher.employeeCode})` : ''}`,
          icon: <Users className="size-3.5 text-blue-500" />,
        }))
      },
      {
        name: SubjectTeacherFilterType.SUBJECT,
        icon: <BookOpen className="size-3.5" />,
        options: (subjects?.items || []).map((subject: any) => ({
          name: `${subject.name}${subject.code ? ` (${subject.code})` : ''}`,
          icon: <BookOpen className="size-3.5 text-green-500" />,
        }))
      },
    ],
    [
      {
        name: SubjectTeacherFilterType.CLASS,
        icon: <GraduationCap className="size-3.5" />,
        options: classes.map((cls: any) => ({
          name: cls.name,
          icon: <GraduationCap className="size-3.5 text-purple-500" />,
        }))
      },
      {
        name: SubjectTeacherFilterType.STATUS,
        icon: <Users className="size-3.5" />,
        options: [
          {
            name: "Active",
            icon: <Users className="size-3.5 text-green-500" />,
          },
          {
            name: "Inactive", 
            icon: <Users className="size-3.5 text-gray-500" />,
          },
        ]
      },
    ],
  ];

  return (
    <div className="mb-4 flex items-center justify-between">
      <AdvancedFilter
        categories={filterCategories}
        filters={uiFilters}
        onFiltersChange={setUiFilters}
        placeholder="Search assignments..."
        className="flex-1"
      />
    </div>
  );
}

interface SubjectTeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId: string | null;
  isActive: boolean;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string | null;
  };
  subject: {
    id: string;
    name: string;
    code?: string | null;
  };
  class: {
    id: string;
    name: string;
  };
  section?: {
    id: string;
    name: string;
  } | null;
}



export function TeacherSubjectAssignments() {
  const { toast } = useToast();
  const { currentBranchId, currentBranch } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [assignmentToEdit, setAssignmentToEdit] = useState<SubjectTeacherAssignment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filters, setFilters] = useState<AdvancedFilters>({
    conditions: [],
    logicOperator: "and"
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  // Process filters for API query
  const processedFilters = filters.conditions.reduce((acc, condition) => {
    if (condition.field === "search") {
      acc.search = condition.value as string;
    } else if (condition.field === "teacherId") {
      acc.teacherId = condition.value as string;
    } else if (condition.field === "subjectId") {
      acc.subjectId = condition.value as string;
    } else if (condition.field === "classId") {
      acc.classId = condition.value as string;
    } else if (condition.field === "isActive") {
      acc.isActive = condition.value === "true";
    }
    return acc;
  }, {} as Record<string, any>);

  // Fetch assignments
  const {
    data: assignments = [],
    isLoading,
    refetch: refetchAssignments
  } = api.subjectTeacher.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined,
      onlyWithSections: true, // Only get assignments with specific sections
      ...processedFilters,
    },
    { enabled: !!currentBranchId }
  );

  // Delete assignment mutation
  const { mutate: deleteAssignment, isPending: isDeleting } = api.subjectTeacher.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Assignment deleted",
        description: "The subject teacher assignment has been deleted successfully.",
        variant: "success"
      });
      setIsDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      void refetchAssignments();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteAssignment = (assignmentId: string) => {
    deleteAssignment({ id: assignmentId });
  };

  const handleEditAssignment = (assignment: SubjectTeacherAssignment) => {
    setAssignmentToEdit(assignment);
    setIsAssignmentDialogOpen(true);
  };

  const handleCreateAssignment = () => {
    setAssignmentToEdit(null);
    setIsAssignmentDialogOpen(true);
  };

  // Define table columns
  const columns: ColumnDef<SubjectTeacherAssignment>[] = [
    {
      accessorKey: "teacher",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Teacher
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => `${row.teacher.firstName} ${row.teacher.lastName}`,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/20 flex items-center justify-center">
            <Users className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
          </div>
          <div>
            <div className="font-medium dark:text-gray-100">
              {row.original.teacher.firstName} {row.original.teacher.lastName}
            </div>
            {row.original.teacher.employeeCode && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {row.original.teacher.employeeCode}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "subject",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Subject
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => row.subject.name,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="dark:text-gray-100">{row.original.subject.name}</span>
          {row.original.subject.code && (
            <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
              {row.original.subject.code}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "class",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Class
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => row.class.name,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="dark:text-gray-100">{row.original.class.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "section",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Section
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => row.section?.name ?? "",
      cell: ({ row }) => (
        row.original.section ? (
          <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
            {row.original.section.name}
          </Badge>
        ) : (
          <span className="text-gray-500 dark:text-gray-400 text-sm">No section</span>
        )
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive");
        return (
          <Badge variant={isActive ? "outline" : "secondary"} className={isActive
            ? "border-green-200 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30"
            : "border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value === "all" ? true : row.getValue(id) === (value === "true");
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const assignment = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleEditAssignment(assignment)}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setAssignmentToDelete(assignment.id);
                  setIsDeleteDialogOpen(true);
                }}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleFilterChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
  };

  const handleAssignmentSuccess = () => {
    setIsAssignmentDialogOpen(false);
    setAssignmentToEdit(null);
    void refetchAssignments();
  };

  const handleAssignmentCancel = () => {
    setIsAssignmentDialogOpen(false);
    setAssignmentToEdit(null);
  };

  // Filter assignments based on search query and status filter
  const filteredAssignments = assignments?.filter(assignment => {
    const matchesSearch = !searchQuery || 
      assignment.teacher.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.teacher.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.class.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assignment.section?.name && assignment.section.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && assignment.isActive) ||
                         (statusFilter === "inactive" && !assignment.isActive);
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate stats
  const totalAssignments = assignments?.length || 0;
  const activeAssignments = assignments?.filter(a => a.isActive).length || 0;
  const uniqueTeachers = new Set(assignments?.map(a => a.teacherId)).size || 0;
  const uniqueSubjects = new Set(assignments?.map(a => a.subjectId)).size || 0;

  // Page action buttons
  const renderPageActions = () => (
    <div className="flex gap-2">
      <Button variant="glowing-secondary" className="flex items-center gap-1">
        <FileDown className="h-4 w-4" />
        <span>Export</span>
      </Button>
      
      <Button 
        variant="glowing" 
        className="flex items-center gap-1"
        onClick={handleCreateAssignment}
      >
        <PlusCircle className="h-4 w-4" />
        <span>Add Assignment</span>
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Subject Teacher Assignments"
        subtitle="Manage subject teacher assignments for your school"
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

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper
        title="Subject Teacher Assignments"
        subtitle="Manage subject teacher assignments for your school"
        action={renderPageActions()}
      >
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center dark:border-gray-700">
          <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Selection Required</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Please select a branch and academic session from the dropdown above to manage teacher subject assignments.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Subject Teacher Assignments"
      subtitle={`Manage subject teacher assignments for ${currentBranch?.name || ""}`}
      action={renderPageActions()}
    >
      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-[#7aad8c]/10 dark:*:data-[slot=card]:to-[#252525] dark:*:data-[slot=card]:bg-[#252525] grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mb-6">
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">Total Assignments</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {totalAssignments}
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
              <Settings className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {totalAssignments} total assignments
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              Across all teachers and subjects
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">Active Assignments</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {activeAssignments}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                {Math.round((activeAssignments / (totalAssignments || 1)) * 100)}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <BadgeCheck className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {activeAssignments} active assignments
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              {totalAssignments - activeAssignments} inactive assignments
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">Teachers Assigned</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {uniqueTeachers}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                Unique
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <UserCheck className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {uniqueTeachers} teachers with assignments
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              Teaching various subjects
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card dark:border-[#303030]">
          <CardHeader>
            <CardDescription className="dark:text-[#c0c0c0]">Subjects Covered</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
              {uniqueSubjects}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                Subjects
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
              <BookOpen className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
              {uniqueSubjects} subjects assigned
            </div>
            <div className="text-muted-foreground dark:text-[#c0c0c0]">
              Across all classes
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">All Assignments</h2>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
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
              {statusFilter === "all" ? "All Assignments" : "Active Only"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <SubjectTeacherFilter
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Active filters display */}
        {(statusFilter !== "all" || filters.conditions.length > 0) && (
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
        {filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
            <div className="h-16 w-16 rounded-full bg-[#00501B]/10 dark:bg-[#7aad8c]/20 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-[#00501B] dark:text-[#7aad8c]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No assignments found</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
              {(searchQuery || statusFilter !== "all" || filters.conditions.length > 0) 
                ? "Try adjusting your search or filters to find assignments." 
                : "Get started by creating your first subject teacher assignment."}
            </p>
            <div className="mt-6">
              <Button 
                onClick={handleCreateAssignment}
                className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90 text-white shadow-sm hover:shadow transition-all"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Assignment
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Assignments ({filteredAssignments.length})</CardTitle>
              <CardDescription>
                Manage teacher assignments to subjects across different classes and sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredAssignments}
                searchKey="teacher"
                searchPlaceholder="Search assignments..."
                sorting={sorting}
                onSortingChange={setSorting}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assignment Form Dialog */}
      <AssignmentFormDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        assignment={assignmentToEdit}
        onSuccess={handleAssignmentSuccess}
        onCancel={handleAssignmentCancel}
      />

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeleteDialogOpen(false);
              setAssignmentToDelete(null);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Are you sure?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                This action cannot be undone. This will permanently delete the assignment
                and remove it from our servers.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setAssignmentToDelete(null);
                }}
                disabled={isDeleting}
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => assignmentToDelete && handleDeleteAssignment(assignmentToDelete)}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </div>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: SubjectTeacherAssignment | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function AssignmentFormDialog({ open, onOpenChange, assignment, onSuccess, onCancel }: AssignmentFormDialogProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // Form state
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClassSections, setSelectedClassSections] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Fetch data for dropdowns
  const { data: teachersData } = api.teacher.getAll.useQuery(
    { branchId: currentBranchId || undefined, isActive: true },
    { enabled: !!currentBranchId }
  );
  const teachers = teachersData?.items || [];

  const { data: subjects } = api.subject.getAll.useQuery(
    { isActive: true },
    { enabled: !!currentBranchId }
  );

  const { data: classes = [] } = api.class.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      sessionId: currentSessionId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  // Fetch all sections with class information for the combined dropdown
  const { data: allSections = [] } = api.section.getAll.useQuery(
    { isActive: true }
  );

  // Mutations
  const createMutation = api.subjectTeacher.create.useMutation({
    // Individual success/error handling is done in the form submission
    // This is just for individual operations outside the bulk creation
  });

  const updateMutation = api.subjectTeacher.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Assignment updated",
        description: "Subject teacher assignment has been updated successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error updating assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedTeachers([]);
    setSelectedSubjects([]);
    setSelectedClassSections([]);
    setIsActive(true);
  };

  // Populate form when editing
  useEffect(() => {
    if (open && assignment) {
      console.log("Populating form with assignment:", assignment);
      console.log("Setting values:", {
        teacherId: assignment.teacherId,
        subjectId: assignment.subjectId,
        classId: assignment.classId,
        sectionId: assignment.sectionId,
        isActive: assignment.isActive
      });
      // For editing, we populate with single values (converted to arrays for the multi-select)
      setSelectedTeachers([assignment.teacherId]);
      setSelectedSubjects([assignment.subjectId]);
      // All assignments now require specific sections
      const classSectionValue = `${assignment.classId}-${assignment.sectionId}`;
      setSelectedClassSections([classSectionValue]);
      setIsActive(assignment.isActive);
    } else if (open && !assignment) {
      console.log("Resetting form for new assignment");
      resetForm();
    }
  }, [assignment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBranchId) {
      toast({
        title: "Error",
        description: "Please select a branch first",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (selectedTeachers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one teacher",
        variant: "destructive",
      });
      return;
    }

    if (selectedSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one subject",
        variant: "destructive",
      });
      return;
    }

    if (selectedClassSections.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one class-section combination",
        variant: "destructive",
      });
      return;
    }

    if (assignment) {
      // For editing, we only update the single assignment
      const classSectionValue = selectedClassSections[0];
      if (!classSectionValue) {
        toast({
          title: "Error",
          description: "Please select a class-section combination",
          variant: "destructive",
        });
        return;
      }
      
      const [classId, sectionId] = classSectionValue.split('-');
      if (!classId || !sectionId) {
        toast({
          title: "Error",
          description: "Invalid class-section combination selected",
          variant: "destructive",
        });
        return;
      }
      
      const data = {
        teacherId: selectedTeachers[0], // Take first selected teacher
        subjectId: selectedSubjects[0], // Take first selected subject
        classId,
        sectionId,
        isActive,
      };
      updateMutation.mutate({ id: assignment.id, ...data });
    } else {
      // For creating, use bulk assignment
      const assignments: Array<{
        teacherId: string;
        subjectId: string;
        classId: string;
        sectionId: string;
      }> = [];
              for (const teacherId of selectedTeachers) {
          for (const subjectId of selectedSubjects) {
            for (const classSectionValue of selectedClassSections) {
              const [classId, sectionId] = classSectionValue.split('-');
              if (classId && sectionId) {
                assignments.push({
                  teacherId,
                  subjectId,
                  classId,
                  sectionId,
                });
              }
            }
        }
      }

      // Create assignments sequentially using tRPC mutations
      if (assignments.length > 0) {
        let successCount = 0;
        let errorCount = 0;
        
        const createAssignments = async () => {
          for (const assignment of assignments) {
            try {
              await new Promise<void>((resolve, reject) => {
                createMutation.mutate(
                  {
                    ...assignment,
                    isActive,
                    branchId: currentBranchId!,
                  },
                  {
                    onSuccess: () => {
                      successCount++;
                      resolve();
                    },
                    onError: (error) => {
                      errorCount++;
                      console.error('Error creating assignment:', error);
                      reject(error);
                    }
                  }
                );
              });
            } catch (error) {
              // Continue with next assignment even if one fails
              continue;
            }
          }
          
          // Show single consolidated toast based on results
          if (successCount === assignments.length) {
            // All succeeded
            toast({
              title: "Success",
              description: `Successfully created ${successCount} assignment${successCount > 1 ? 's' : ''}`,
            });
            onSuccess();
          } else if (successCount > 0) {
            // Partial success
            toast({
              title: "Partially completed",
              description: `Created ${successCount} of ${assignments.length} assignments. ${errorCount} failed.`,
              variant: "destructive",
            });
          } else {
            // All failed
            toast({
              title: "Error",
              description: "Failed to create assignments. Please try again.",
              variant: "destructive",
            });
          }
        };
        
        void createAssignments();
      }
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

        console.log("Current form values:", { 
        selectedTeachers, 
        selectedSubjects, 
        selectedClassSections, 
        isActive 
      });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {assignment ? "Edit Assignment" : "Create Assignment"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {assignment 
                ? "Update the subject teacher assignment details below."
                : "Assign a teacher to a subject for a specific class and section."}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacher" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Teachers <span className="text-red-500">*</span>
              </Label>
              <MultiSelect
                options={teachers.map((teacher) => ({
                  value: teacher.id,
                  label: `${teacher.firstName} ${teacher.lastName}${teacher.employeeCode ? ` (${teacher.employeeCode})` : ''}`
                }))}
                selected={selectedTeachers}
                onValueChange={setSelectedTeachers}
                placeholder="Select teachers"
                maxCount={3}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subjects <span className="text-red-500">*</span>
              </Label>
              <MultiSelect
                options={(subjects?.items || []).map((subject) => ({
                  value: subject.id,
                  label: `${subject.name}${subject.code ? ` (${subject.code})` : ''}`
                }))}
                selected={selectedSubjects}
                onValueChange={setSelectedSubjects}
                placeholder="Select subjects"
                maxCount={3}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-section" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sections <span className="text-red-500">*</span>
            </Label>
            <MultiSelect
              options={allSections.map((section) => ({
                value: `${section.class?.id}-${section.id}`,
                label: `${section.class?.name || 'Unknown Class'} - ${section.name}`
              }))}
              selected={selectedClassSections}
              onValueChange={setSelectedClassSections}
              placeholder="Select class-section combinations"
              maxCount={3}
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select specific class-section combinations for the assignment
            </p>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <div className="flex-1">
              <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active Assignment
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enable this assignment for examination and academic purposes
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90 text-white shadow-sm hover:shadow transition-all"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{assignment ? "Updating..." : "Creating..."}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>{assignment ? "Update" : "Create"} Assignment</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 