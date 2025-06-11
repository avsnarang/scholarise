"use client";

import React, { useState, useEffect, useRef } from "react";
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
  sectionId?: string | null;
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
                      <p className="text-sm font-medium text-gray-500">Active Assignments</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeAssignments}</p>
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
                      <p className="text-sm font-medium text-gray-500">Unique Teachers</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.uniqueTeachers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BookOpen className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Unique Subjects</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.uniqueSubjects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <SubjectTeacherFilter 
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* Assignments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Assignments ({assignments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-12 w-12 text-gray-400" />
                  </div>
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
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {assignment.teacher.firstName} {assignment.teacher.lastName}
                            </div>
                            {assignment.teacher.employeeCode && (
                              <div className="text-sm text-gray-500">
                                {assignment.teacher.employeeCode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.subject.name}</div>
                            {assignment.subject.code && (
                              <div className="text-sm text-gray-500">
                                {assignment.subject.code}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{assignment.class.name}</div>
                        </TableCell>
                        <TableCell>
                          {assignment.section ? (
                            <div className="font-medium">{assignment.section.name}</div>
                          ) : (
                            <span className="text-gray-500 italic">All sections</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.isActive ? "default" : "secondary"}>
                            {assignment.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAssignment(assignment as SubjectTeacherAssignment)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteAssignmentId(assignment.id)}
                                className="text-red-600"
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
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Assignment Dialog */}
      <AssignmentFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          refetchAssignments();
          setIsCreateDialogOpen(false);
        }}
      />

      {/* Edit Assignment Dialog */}
      <AssignmentFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        assignment={selectedAssignment}
        onSuccess={() => {
          refetchAssignments();
          setIsEditDialogOpen(false);
          setSelectedAssignment(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAssignmentId} onOpenChange={() => setDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subject teacher assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssignmentId && handleDeleteAssignment(deleteAssignmentId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
  
  // Form state
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
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

  const { data: sections = [] } = api.section.getAll.useQuery(
    { classId: classId || undefined, isActive: true },
    { enabled: !!classId }
  );

  // Mutations
  const createMutation = api.subjectTeacher.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Assignment created",
        description: "Subject teacher assignment has been created successfully",
      });
      onSuccess();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error creating assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateMutation = api.subjectTeacher.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Assignment updated",
        description: "Subject teacher assignment has been updated successfully",
      });
      onSuccess();
      resetForm();
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
    setTeacherId("");
    setSubjectId("");
    setClassId("");
    setSectionId("");
    setIsActive(true);
  };

  // Populate form when editing
  useEffect(() => {
    if (assignment) {
      setTeacherId(assignment.teacherId);
      setSubjectId(assignment.subjectId);
      setClassId(assignment.classId);
      setSectionId(assignment.sectionId || "");
      setIsActive(assignment.isActive);
    } else {
      resetForm();
    }
  }, [assignment]);

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

    const data = {
      teacherId,
      subjectId,
      classId,
      sectionId: sectionId || null,
      isActive,
      branchId: currentBranchId,
    };

    if (assignment) {
      updateMutation.mutate({ id: assignment.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {assignment ? "Edit Assignment" : "Create Assignment"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher *</Label>
            <Select value={teacherId} onValueChange={setTeacherId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                    {teacher.employeeCode && ` (${teacher.employeeCode})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Select value={subjectId} onValueChange={setSubjectId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.items?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                    {subject.code && ` (${subject.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">Class *</Label>
            <Select value={classId} onValueChange={(value) => {
              setClassId(value);
              setSectionId(""); // Reset section when class changes
            }} required>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">Section (Optional)</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select section (leave empty for all sections)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#00501B] hover:bg-[#00501B]/90"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {assignment ? "Update" : "Create"} Assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 