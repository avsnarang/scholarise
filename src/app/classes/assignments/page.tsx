"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  X
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useToast } from "@/components/ui/use-toast";
import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";
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
      <h2 className="text-lg font-medium">All Subject Teacher Assignments</h2>
      <AdvancedFilter
        categories={filterCategories}
        filters={uiFilters}
        onFiltersChange={setUiFilters}
        placeholder="Search filters..."
      />
    </div>
  );
}





export default function TeacherSubjectAssignmentsPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.VIEW_TEACHERS]}>
      <PageWrapper>
        <TeacherSubjectAssignments />
      </PageWrapper>
    </RouteGuard>
  );
}

interface SubjectTeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId?: string | null;
  isActive: boolean;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
  };
  subject: {
    id: string;
    name: string;
    code?: string;
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

function TeacherSubjectAssignments() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<SubjectTeacherAssignment | null>(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdvancedFilters>({
    conditions: [],
    logicOperator: "and",
  });

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
      ...processedFilters,
    },
    { enabled: !!currentBranchId }
  );

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

  // Fetch stats
  const { data: stats } = api.subjectTeacher.getStats.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  // Mutations
  const deleteAssignmentMutation = api.subjectTeacher.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Assignment deleted",
        description: "Subject teacher assignment has been removed successfully",
      });
      refetchAssignments();
      setDeleteAssignmentId(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDeleteAssignment = async (assignmentId: string) => {
    await deleteAssignmentMutation.mutateAsync({ id: assignmentId });
  };

  const handleEditAssignment = (assignment: SubjectTeacherAssignment) => {
    setSelectedAssignment(assignment);
    setIsEditDialogOpen(true);
  };

  const handleFilterChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Subject Teacher Assignments</h1>
          <p className="mt-2 text-gray-500">
            Assign teachers to subjects for specific classes and sections (used for examinations and academic purposes)
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-[#00501B] hover:bg-[#00501B]/90"
          disabled={!currentBranchId || !currentSessionId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      {!currentBranchId || !currentSessionId ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to manage teacher subject assignments.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Teachers Assigned</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.uniqueTeachers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Subjects Covered</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.uniqueSubjects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Users className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Classes Covered</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.uniqueClasses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter and Table */}
          <SubjectTeacherFilter 
            filters={filters} 
            onFilterChange={handleFilterChange} 
          />

          {/* Assignments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subject Teacher Assignments ({assignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                                          {filters.conditions.length > 0 ? 'No matching assignments found' : 'No assignments configured'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.conditions.length > 0 
                      ? 'Try adjusting your search criteria or create a new assignment.'
                      : 'Start by creating your first subject teacher assignment.'
                    }
                  </p>
                  {filters.conditions.length === 0 && (
                      <Button 
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="bg-[#00501B] hover:bg-[#00501B]/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Assignment
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment: any) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {assignment.teacher.firstName} {assignment.teacher.lastName}
                              </div>
                              {assignment.teacher.employeeCode && (
                                <div className="text-sm text-muted-foreground">
                                  ID: {assignment.teacher.employeeCode}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{assignment.subject.name}</div>
                              {assignment.subject.code && (
                                <Badge variant="outline" className="text-xs">
                                  {assignment.subject.code}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.class.name}</Badge>
                          </TableCell>
                          <TableCell>
                            {assignment.section ? (
                              <Badge variant="secondary">{assignment.section.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">All sections</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {assignment.isActive ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAssignment(assignment)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDeleteAssignmentId(assignment.id)}
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
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create/Edit Assignment Dialog */}
      <AssignmentFormDialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedAssignment(null);
          }
        }}
        assignment={selectedAssignment}
        onSuccess={() => {
          refetchAssignments();
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedAssignment(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAssignmentId} onOpenChange={() => setDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the subject teacher assignment. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAssignmentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssignmentId && handleDeleteAssignment(deleteAssignmentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAssignmentMutation.isPending}
            >
              {deleteAssignmentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Assignment Form Dialog Component
interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: SubjectTeacherAssignment | null;
  onSuccess: () => void;
}

function AssignmentFormDialog({ open, onOpenChange, assignment, onSuccess }: AssignmentFormDialogProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    teacherId: '',
    subjectId: '',
    classId: '',
    sectionId: '',
    isActive: true,
  });

  // Fetch data for dropdowns
  const { data: teachersData } = api.teacher.getAll.useQuery(
    { branchId: currentBranchId || undefined, isActive: true },
    { enabled: !!currentBranchId && open }
  );
  const teachers = teachersData?.items || [];

  const { data: subjects } = api.subject.getAll.useQuery(
    { isActive: true },
    { enabled: open }
  );

  const { data: classes = [] } = api.class.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      sessionId: currentSessionId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId && !!currentSessionId && open }
  );

  // Get sections for selected class
  const { data: sections = [] } = api.section.getAll.useQuery(
    { 
      classId: formData.classId || undefined,
      isActive: true 
    },
    { enabled: !!formData.classId && open }
  );

  // Reset form when dialog opens/closes or assignment changes
  React.useEffect(() => {
    if (assignment) {
      setFormData({
        teacherId: assignment.teacherId,
        subjectId: assignment.subjectId,
        classId: assignment.classId,
        sectionId: assignment.sectionId || '',
        isActive: assignment.isActive,
      });
    } else {
      setFormData({
        teacherId: '',
        subjectId: '',
        classId: '',
        sectionId: '',
        isActive: true,
      });
    }
  }, [assignment, open]);

  // Mutations
  const createAssignmentMutation = api.subjectTeacher.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Assignment created",
        description: "Subject teacher assignment has been created successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error creating assignment",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => setIsSubmitting(false),
  });

  const updateAssignmentMutation = api.subjectTeacher.update.useMutation({
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
    },
    onSettled: () => setIsSubmitting(false),
  });

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

    setIsSubmitting(true);

    const data = {
      ...formData,
      sectionId: formData.sectionId === "all" ? null : formData.sectionId || null,
      branchId: currentBranchId,
    };

    if (assignment) {
      updateAssignmentMutation.mutate({
        id: assignment.id,
        ...data,
      });
    } else {
      createAssignmentMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {assignment ? 'Edit Subject Assignment' : 'Create Subject Assignment'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Teacher & Subject Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacher" className="text-sm font-medium">
                  Teacher
                </Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                  required
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {teacher.firstName} {teacher.lastName}
                          </span>
                          {teacher.employeeCode && (
                            <span className="text-xs text-muted-foreground">
                              ID: {teacher.employeeCode}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                  required
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    {subjects?.items?.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{subject.name}</span>
                          {subject.code && (
                            <span className="text-xs text-muted-foreground">
                              Code: {subject.code}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Class & Section Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class" className="text-sm font-medium">
                  Class
                </Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) => setFormData({ ...formData, classId: value, sectionId: '' })}
                  required
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section" className="text-sm font-medium">
                  Section <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Select
                  value={formData.sectionId}
                  onValueChange={(value) => setFormData({ ...formData, sectionId: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg">
                    <SelectItem value="all">
                      <span className="text-muted-foreground">All sections</span>
                    </SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Section {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Assignment Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isActive ? 'Assignment is active and visible' : 'Assignment is inactive and hidden'}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#00501B] hover:bg-[#00501B]/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (assignment ? 'Update Assignment' : 'Create Assignment')}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 