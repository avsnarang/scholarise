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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { School, BookOpen, Plus, Minus, Save, Loader2, Filter, ArrowUpDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import {
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

interface ClassWithSubjects {
  id: string;
  name: string;
  description?: string | null;
  subjects: Array<{
    id: string;
    subjectId: string;
    subject: {
      name: string;
      code: string | null;
    };
  }>;
  _count: {
    subjects: number;
  };
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  isOptional: boolean;
}

function ClassSubjectMappingPageContent() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [selectedClass, setSelectedClass] = useState<ClassWithSubjects | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  // Fetch classes with their current subject mappings
  const { data: classesData, isLoading: isLoadingClasses, refetch: refetchClasses } = api.class.getWithSubjects.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    isActive: true,
  });

  // Fetch all available subjects
  const { data: subjectsData } = api.subject.getAll.useQuery({
    branchId: currentBranchId || undefined,
    isActive: true,
  });

  // Fetch current class subject mappings for selected class
  const { data: classMappings, refetch: refetchMappings } = api.classSubject.getByClass.useQuery(
    { classId: selectedClass?.id || "" },
    { enabled: !!selectedClass }
  );

  // Create class subject mapping mutation
  const createMapping = api.classSubject.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Subject Added",
        description: "Subject has been successfully added to the class.",
      });
      void refetchMappings();
      void refetchClasses();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add subject to class.",
        variant: "destructive",
      });
    },
  });

  // Remove class subject mapping mutation
  const removeMapping = api.classSubject.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Subject Removed",
        description: "Subject has been successfully removed from the class.",
      });
      void refetchMappings();
      void refetchClasses();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove subject from class.",
        variant: "destructive",
      });
    },
  });

  const classes = classesData || [];
  const subjects = (subjectsData?.items || []) as Subject[];
  const currentMappings = classMappings || [];

  // Get currently mapped subject IDs for selected class
  const mappedSubjectIds = new Set(currentMappings.map((mapping: any) => mapping.subjectId));

  // Filter classes based on search term
  const filteredClasses = classes.filter((cls: ClassWithSubjects) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter subjects based on filter selection
  const filteredSubjects = subjects.filter((subject: Subject) => {
    if (subjectFilter === "mapped" && selectedClass) {
      return mappedSubjectIds.has(subject.id);
    }
    if (subjectFilter === "unmapped" && selectedClass) {
      return !mappedSubjectIds.has(subject.id);
    }
    return true; // "all"
  });

  const handleClassSelect = (cls: ClassWithSubjects) => {
    setSelectedClass(cls);
  };

  const handleSubjectToggle = (subjectId: string, isChecked: boolean) => {
    if (isChecked) {
      // Add subject to class
      if (selectedClass) {
        createMapping.mutate({
          classId: selectedClass.id,
          subjectId: subjectId,
        });
      }
    } else {
      // Remove subject from class
      const mapping = currentMappings.find((m: any) => m.subjectId === subjectId);
      if (mapping) {
        removeMapping.mutate({ id: mapping.id });
      }
    }
  };

  // Define table columns for the overview table
  const overviewColumns: ColumnDef<ClassWithSubjects>[] = [
    {
      accessorKey: "name",
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
      cell: ({ row }) => (
        <div 
          className="font-medium cursor-pointer hover:text-[#00501B]"
          onClick={() => handleClassSelect(row.original)}
        >
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string;
        return description && description.trim() ? (
          <span className="text-sm">{description}</span>
        ) : (
          <span className="text-gray-400 text-sm italic">No description</span>
        );
      },
    },
    {
      id: "assignedSubjects",
      header: "Assigned Subjects",
      cell: ({ row }) => {
        const subjects = row.original.subjects;
        if (subjects.length === 0) {
          return (
            <Badge variant="secondary" className="text-xs">
              No subjects assigned
            </Badge>
          );
        }
        
        return (
          <div className="flex flex-wrap gap-1 max-w-md">
            {subjects.slice(0, 3).map((mapping) => (
              <Badge key={mapping.id} variant="outline" className="text-xs bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20">
                {mapping.subject.name}
              </Badge>
            ))}
            {subjects.length > 3 && (
              <Badge variant="outline" className="text-xs border-gray-300">
                +{subjects.length - 3} more
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
      accessorFn: (row) => row._count.subjects,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline" className="bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20">
            {row.original._count.subjects}
          </Badge>
        </div>
      ),
    },
  ];

  if (isLoadingClasses) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        Loading classes...
      </div>
    );
  }

  return (
    <PageWrapper
      title="Class Subject Mapping"
      subtitle="Assign mandatory subjects to entire classes"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classes Overview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Classes Overview
              </CardTitle>
              <CardDescription>
                Click on a class to manage its subject assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={overviewColumns}
                data={classes}
                searchKey="name"
                searchPlaceholder="Search classes..."
                sorting={sorting}
                onSortingChange={setSorting}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            </CardContent>
          </Card>

          {/* Subject Assignment */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subject Assignment
              </CardTitle>
              <CardDescription>
                {selectedClass
                  ? `Manage subjects for ${selectedClass.name}`
                  : "Select a class to manage its subject assignments"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedClass ? (
                <div className="space-y-4">
                  {/* Class Info */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium">{selectedClass.name}</h3>
                    {selectedClass.description && (
                      <p className="text-sm text-muted-foreground">{selectedClass.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentMappings.length} subjects assigned
                    </p>
                  </div>

                  <Separator />

                  {/* Subject Filter */}
                  <div className="flex items-center gap-4">
                    <Label htmlFor="subject-filter" className="text-sm font-medium">
                      Filter Subjects:
                    </Label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        <SelectItem value="mapped">Assigned Only</SelectItem>
                        <SelectItem value="unmapped">Unassigned Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Mappings Summary */}
                  {currentMappings.length > 0 && (
                    <div className="p-3 bg-[#00501B]/5 rounded-lg border border-[#00501B]/20">
                      <h4 className="text-sm font-medium text-[#00501B] mb-2">Currently Assigned Subjects:</h4>
                      <div className="flex flex-wrap gap-1">
                        {currentMappings.map((mapping: any) => (
                          <Badge key={mapping.id} variant="outline" className="text-xs bg-[#00501B]/10 text-[#00501B]">
                            {mapping.subject.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subject List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filteredSubjects.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No subjects found for the selected filter
                      </p>
                    ) : (
                      filteredSubjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg"
                        >
                          <Checkbox
                            id={`subject-${subject.id}`}
                            checked={mappedSubjectIds.has(subject.id)}
                            onCheckedChange={(checked) =>
                              handleSubjectToggle(subject.id, checked as boolean)
                            }
                            disabled={createMapping.isPending || removeMapping.isPending}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`subject-${subject.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {subject.name}
                            </Label>
                            {subject.code && (
                              <p className="text-xs text-muted-foreground">
                                Code: {subject.code}
                              </p>
                            )}
                          </div>
                          <Badge variant={subject.isActive ? "default" : "secondary"}>
                            {subject.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a class from the left to manage its subject assignments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicClassSubjectMappingPageContent = dynamic(() => Promise.resolve(ClassSubjectMappingPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ClassSubjectMappingPage() {
  return <DynamicClassSubjectMappingPageContent />;
} 