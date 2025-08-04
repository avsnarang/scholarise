"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { Users, BookOpen, Loader2, Filter, FileDown, ArrowUpDown, X, BadgeCheck, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import {
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber: number | null;
  section: {
    id: string;
    name: string;
    class: {
      id: string;
      name: string;
    };
  } | null;
  StudentSubject?: Array<{
    id: string;
    subjectId: string;
    subject: {
      id: string;
      name: string;
      code: string | null;
      isOptional: boolean;
    };
  }>;
  ClassSubjects?: Array<{
    id: string;
    subjectId: string;
    subject: {
      id: string;
      name: string;
      code: string | null;
      isOptional: boolean;
    };
    isFromClass: boolean;
  }>;
}

interface OptionalSubject {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  isOptional: boolean;
}

function StudentSubjectMappingPageContent() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  
  // Track pending changes for optional subjects
  const [pendingChanges, setPendingChanges] = useState<Map<string, string | null>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch classes
  const { data: classesData } = api.class.getAll.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    isActive: true,
  });

  // Fetch sections for selected class
  const { data: sectionsData } = api.section.getByClass.useQuery(
    { classId: selectedClass },
    { enabled: !!selectedClass }
  );

  // Fetch students with their current subject mappings
  const { data: studentsData, isLoading: isLoadingStudents, refetch: refetchStudents } = api.studentSubject.getByClassWithMappings.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    classId: selectedClass || undefined,
    sectionId: selectedSection || undefined,
  });

  // Fetch only optional subjects
  const { data: subjectsData } = api.subject.getAll.useQuery({
    branchId: currentBranchId || undefined,
    isActive: true,
    isOptional: true, // Only fetch optional subjects
  });

  // Single update mutation for individual updates
  const updateMapping = api.studentSubject.updateOptionalSubject.useMutation({
    onError: (error: any) => {
      toast({
        title: "Error Updating Subject",
        description: error.message || "Failed to update optional subject.",
        variant: "destructive",
      });
      setIsSaving(false);
    },
  });

  const classes = classesData || [];
  const sections = sectionsData || [];
  const students = (studentsData || []) as unknown as Student[];
  const optionalSubjects = (subjectsData?.items || []) as unknown as OptionalSubject[];

  // Create a map of student IDs to their current optional subject (including pending changes)
  const studentOptionalSubjects = useMemo(() => {
    const map = new Map<string, string | null>();
    students.forEach((student: Student) => {
      // Only look for optional subjects in StudentSubject (not ClassSubjects)
      const optionalSubject = student.StudentSubject?.find((s) => s.subject.isOptional);
      const currentValue = optionalSubject?.subjectId || null;
      
      // If there's a pending change for this student, use that instead
      const pendingValue = pendingChanges.get(student.id);
      map.set(student.id, pendingValue !== undefined ? pendingValue : currentValue);
    });
    return map;
  }, [students, pendingChanges]);

  const handleOptionalSubjectChange = (studentId: string, subjectId: string | null) => {
    // Track the change locally instead of immediately saving
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      newChanges.set(studentId, subjectId);
      return newChanges;
    });
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = pendingChanges.size > 0;

  // Handle batch save
  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Process all pending changes sequentially
      for (const [studentId, optionalSubjectId] of pendingChanges.entries()) {
        try {
          await new Promise<void>((resolve, reject) => {
            updateMapping.mutate(
              { studentId, optionalSubjectId },
              {
                onSuccess: () => {
                  successCount++;
                  resolve();
                },
                onError: (error) => {
                  errorCount++;
                  console.error(`Failed to update student ${studentId}:`, error);
                  reject(error);
                }
              }
            );
          });
        } catch (error) {
          // Continue with other updates even if one fails
          continue;
        }
      }
      
      // Show result toast
      if (successCount > 0) {
        toast({
          title: "Changes Saved",
          description: `Successfully updated optional subjects for ${successCount} students.${errorCount > 0 ? ` ${errorCount} updates failed.` : ''}`,
          variant: errorCount > 0 ? "destructive" : "default",
        });
      }
      
      if (errorCount === 0) {
        setPendingChanges(new Map()); // Clear pending changes only if all succeeded
      }
      
      void refetchStudents();
    } catch (error) {
      toast({
        title: "Error Saving Changes",
        description: "Failed to save some optional subject changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel changes
  const handleCancelChanges = () => {
    setPendingChanges(new Map());
    toast({
      title: "Changes Discarded",
      description: "All unsaved changes have been discarded.",
    });
  };

  // Define table columns
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "rollNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Roll No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("rollNumber") || "N/A"}
        </div>
      ),
    },
    {
      id: "studentName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Student Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => {
        return `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unknown Student";
      },
      cell: ({ row }) => {
        const firstName = row.original.firstName || "Unknown";
        const lastName = row.original.lastName || "Student";
        const className = row.original.section?.class?.name || "Unknown Class";
        const sectionName = row.original.section?.name;
        
        return (
          <div>
            <div className="font-medium">
              {firstName} {lastName}
            </div>
            <div className="text-sm text-muted-foreground">
              {className}
              {sectionName && ` - ${sectionName}`}
            </div>
          </div>
        );
      },
    },
    {
      id: "compulsorySubjects",
      header: "Compulsory Subjects",
      cell: ({ row }) => {
        const compulsorySubjects = row.original.ClassSubjects || [];
        if (compulsorySubjects.length === 0) {
          return (
            <Badge variant="secondary" className="text-xs">
              No compulsory subjects
            </Badge>
          );
        }
        
        return (
          <div className="flex flex-wrap gap-1 max-w-md">
            {compulsorySubjects.slice(0, 3).map((mapping) => (
              <Badge key={mapping.id} variant="secondary" className="text-xs" title="Compulsory subject from class mapping">
                {mapping.subject.name}
                {mapping.subject.code && ` (${mapping.subject.code})`}
              </Badge>
            ))}
            {compulsorySubjects.length > 3 && (
              <Badge variant="secondary" className="text-xs" title={`${compulsorySubjects.length - 3} more compulsory subjects`}>
                +{compulsorySubjects.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "optionalSubject",
      header: "Optional Subject",
      cell: ({ row }) => {
        const student = row.original;
        const currentOptionalSubjectId = studentOptionalSubjects.get(student.id);
        const hasPendingChange = pendingChanges.has(student.id);
        
        return (
          <div className="w-48 space-y-1">
            <div className="relative">
              <Select
                value={currentOptionalSubjectId || "none"}
                onValueChange={(value) => handleOptionalSubjectChange(student.id, value === "none" ? null : value)}
                disabled={isSaving}
              >
                <SelectTrigger className={`h-8 ${hasPendingChange ? 'border-orange-300 bg-orange-50' : ''}`}>
                  <SelectValue placeholder="Select optional subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">None</SelectItem>
                  {optionalSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      {subject.name}
                      {subject.code && ` (${subject.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasPendingChange && (
                <div className="absolute -top-1 -right-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                </div>
              )}
            </div>
            {hasPendingChange && (
              <div className="text-xs text-orange-600">
                Unsaved changes
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    toast({
      title: "Export functionality",
      description: "Export feature will be implemented soon.",
    });
  };

  return (
    <PageWrapper
      title="Student Subject Mapping"
      subtitle={
        hasUnsavedChanges 
          ? `View compulsory subjects from class mappings and assign optional subjects to individual students • ${pendingChanges.size} unsaved changes`
          : "View compulsory subjects from class mappings and assign optional subjects to individual students"
      }
      action={
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancelChanges}
                disabled={isSaving}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                <span>Cancel Changes</span>
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <BadgeCheck className="h-4 w-4" />
                    <span>Save Changes ({pendingChanges.size})</span>
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    You have {pendingChanges.size} unsaved changes
                  </p>
                  <p className="text-sm text-orange-700">
                    Remember to save your changes before navigating away from this page.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                  <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Filters
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                    Select class and section to view students
                  </CardDescription>
                </div>
              </div>
              {(selectedClass || selectedSection || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClass("");
                    setSelectedSection("");
                    setSearchTerm("");
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Class Filter */}
              <div className="space-y-2">
                <Label htmlFor="class-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Class <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedClass} onValueChange={(value) => {
                  setSelectedClass(value);
                  setSelectedSection(""); // Reset section when class changes
                }}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Filter */}
              <div className="space-y-2">
                <Label htmlFor="section-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedSection}
                  onValueChange={(value) => setSelectedSection(value)}
                  disabled={!selectedClass}
                >
                  <SelectTrigger className="h-10" disabled={!selectedClass}>
                    <SelectValue placeholder={selectedClass ? "Select section" : "Select class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section: any) => (
                      <SelectItem key={section.id} value={section.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Filter */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedClass || selectedSection || searchTerm) && (
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active:</span>
                {selectedClass && (
                  <Badge variant="secondary" className="text-xs">
                    {classes.find((c: any) => c.id === selectedClass)?.name}
                  </Badge>
                )}
                {selectedSection && (
                  <Badge variant="secondary" className="text-xs">
                    {sections.find((s: any) => s.id === selectedSection)?.name}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    "{searchTerm}"
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Subject Mapping Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Subject Assignments
            </CardTitle>
            <CardDescription>
              {selectedClass
                ? `Students from ${classes.find((c: any) => c.id === selectedClass)?.name || 'selected class'}${
                    selectedSection ? ` - ${sections.find((s: any) => s.id === selectedSection)?.name || 'selected section'}` : ''
                  }`
                : "Select a class to view students and assign optional subjects"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading students...</span>
              </div>
            ) : !selectedClass ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Please select a class to view students and assign optional subjects.
                </p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No students found for the selected class/section.
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={students}
                searchKey="studentName"
                searchPlaceholder="Search students..."
                sorting={sorting}
                onSortingChange={setSorting}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicStudentSubjectMappingPageContent = dynamic(() => Promise.resolve(StudentSubjectMappingPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function StudentSubjectMappingPage() {
  return <DynamicStudentSubjectMappingPageContent />;
} 