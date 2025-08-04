"use client";

import { useState } from "react";
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
import { Table, Eye, Users, FileDown, Filter, Loader2, ArrowUpDown } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import {
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Separator } from "@/components/ui/separator";

interface StudentWithMappings {
  id: string;
  rollNumber: number | null;
  firstName: string;
  lastName: string;
  section: {
    name: string;
    class: {
      name: string;
    };
  } | null;
  StudentSubject?: Array<{
    id: string;
    subjectId: string;
    subject: {
      name: string;
      code: string | null;
    };
  }>;
}

function ClassSubjectOverviewPageContent() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  // Fetch classes
  const { data: classesData } = api.class.getAll.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    isActive: true,
  });

  // Fetch sections for selected class
  const { data: sectionsData } = api.section.getByClass.useQuery(
    { classId: selectedClass },
    { enabled: !!selectedClass && selectedClass !== "all" }
  );

  // Fetch students with their subject mappings
  const { data: studentsData, isLoading: isLoadingStudents } = api.studentSubject.getByClassWithMappings.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    classId: selectedClass && selectedClass !== "all" ? selectedClass : undefined,
    sectionId: selectedSection && selectedSection !== "all" ? selectedSection : undefined,
  });

  const classes = classesData || [];
  const sections = sectionsData || [];
  const students = (studentsData || []) as unknown as StudentWithMappings[];

  // Define table columns
  const columns: ColumnDef<StudentWithMappings>[] = [
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
      accessorFn: (row) => `${row.firstName || ""} ${row.lastName || ""}`.trim(),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.section?.class.name}
            {row.original.section && ` - ${row.original.section.name}`}
          </div>
        </div>
      ),
    },
    {
      id: "subjects",
      header: "Mapped Subjects",
      cell: ({ row }) => {
        const subjects = row.original.StudentSubject || [];
        if (subjects.length === 0) {
          return (
            <Badge variant="secondary" className="text-xs">
              No subjects mapped
            </Badge>
          );
        }
        
        return (
          <div className="flex flex-wrap gap-1 max-w-md">
            {subjects.slice(0, 4).map((mapping) => (
              <Badge key={mapping.id} variant="outline" className="text-xs bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20">
                {mapping.subject.name}
                {mapping.subject.code && ` (${mapping.subject.code})`}
              </Badge>
            ))}
            {subjects.length > 4 && (
              <Badge variant="outline" className="text-xs border-gray-300">
                +{subjects.length - 4} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "subjectCount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Subject Count
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => (row.StudentSubject || []).length,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {(row.original.StudentSubject || []).length}
          </Badge>
        </div>
      ),
    },
  ];

  // Calculate statistics
  const totalStudents = students.length;
  const studentsWithMappings = students.filter(s => (s.StudentSubject || []).length > 0).length;
  const studentsWithoutMappings = totalStudents - studentsWithMappings;
  const averageSubjectsPerStudent = totalStudents > 0 
    ? (students.reduce((sum, s) => sum + (s.StudentSubject || []).length, 0) / totalStudents).toFixed(1) 
    : "0";

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    toast({
      title: "Export functionality",
      description: "Export feature will be implemented soon.",
    });
  };

  return (
    <PageWrapper
      title="Class Subject Overview"
      subtitle="View subject mappings for students in each class and section"
      action={
        <Button variant="outline" onClick={handleExport} className="flex items-center gap-1">
          <FileDown className="h-4 w-4" />
          <span>Export</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Select class and section to view student subject mappings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="class-select">Class</Label>
                <Select value={selectedClass} onValueChange={(value) => {
                  setSelectedClass(value);
                  setSelectedSection("all"); // Reset section when class changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="section-select">Section</Label>
                <Select
                  value={selectedSection}
                  onValueChange={setSelectedSection}
                  disabled={!selectedClass || selectedClass === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    {sections.map((section: any) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">Search Students</Label>
                <Input
                  id="search"
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {selectedClass !== "all" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-[#00501B]" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">With Mappings</p>
                    <p className="text-2xl font-bold">{studentsWithMappings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Table className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Without Mappings</p>
                    <p className="text-2xl font-bold">{studentsWithoutMappings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg. Subjects</p>
                    <p className="text-2xl font-bold">{averageSubjectsPerStudent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Subject Mappings
            </CardTitle>
            <CardDescription>
              {selectedClass !== "all"
                ? `Students from ${classes.find((c: any) => c.id === selectedClass)?.name || 'selected class'}${
                    selectedSection !== "all" ? ` - ${sections.find((s: any) => s.id === selectedSection)?.name || 'selected section'}` : ''
                  }`
                : "All students across all classes and sections"
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
                  Please select a class to view student subject mappings.
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
const DynamicClassSubjectOverviewPageContent = dynamic(() => Promise.resolve(ClassSubjectOverviewPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ClassSubjectOverviewPage() {
  return <DynamicClassSubjectOverviewPageContent />;
} 