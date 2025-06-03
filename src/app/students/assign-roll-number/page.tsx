"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";

export default function AssignRollNumberPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { currentSessionId } = useAcademicSessionContext();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Array<{
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    rollNumber: string | null;
    isModified: boolean;
  }>>([]);
  const [sortOrder, setSortOrder] = useState<"firstName" | "lastName" | "admissionNumber">("firstName");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch classes for the current branch
  const { data: classesData, isLoading: isLoadingClasses } = api.class.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId || undefined,
  });

  // Fetch students for the selected class
  const { data: studentsData, isLoading: isLoadingStudents } = api.student.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sectionId: selectedClass || undefined,
    sessionId: currentSessionId || undefined,
  }, {
    enabled: !!selectedClass,
  });

  // Update roll numbers mutation
  const updateRollNumberMutation = api.student.updateRollNumber.useMutation({
    onSuccess: () => {
      toast({
        title: "Roll numbers updated",
        description: "Student roll numbers have been updated successfully",
        variant: "success",
      });
      setIsSaving(false);
      // Reset modification flags
      setStudents(students.map(student => ({
        ...student,
        isModified: false
      })));
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update roll numbers",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  });

  // Update students state when data changes
  useEffect(() => {
    if (studentsData?.items) {
      const formattedStudents = studentsData.items.map(student => ({
        id: student.id,
        admissionNumber: student.admissionNumber || "",
        firstName: student.firstName,
        lastName: student.lastName,
        rollNumber: student.rollNumber?.toString() || null,
        isModified: false,
      }));
      setStudents(formattedStudents);
    }
  }, [studentsData]);

  // Handle roll number change
  const handleRollNumberChange = (studentId: string, value: string) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId
        ? { ...student, rollNumber: value, isModified: true }
        : student
    ));
  };

  // Handle auto-assign roll numbers
  const handleAutoAssign = () => {
    const sortedStudents = [...students].sort((a, b) => {
      if (sortOrder === "firstName") {
        return (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName);
      } else if (sortOrder === "lastName") {
        return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
      } else {
        return a.admissionNumber.localeCompare(b.admissionNumber);
      }
    });

    const studentsWithRollNumbers = sortedStudents.map((student, index) => ({
      ...student,
      rollNumber: (index + 1).toString(),
      isModified: true,
    }));

    setStudents(studentsWithRollNumbers);
  };

  // Save roll numbers
  const saveRollNumbers = () => {
    const studentsToUpdate = students.filter(student => student.isModified);
    
    if (studentsToUpdate.length === 0) {
      toast({
        title: "No changes",
        description: "No roll numbers have been modified",
      });
      return;
    }

    setIsSaving(true);
    updateRollNumberMutation.mutate({
      students: studentsToUpdate.map(student => ({
        id: student.id,
        rollNumber: student.rollNumber || undefined
      }))
    });
  };

  // Reset roll numbers
  const resetRollNumbers = () => {
    if (studentsData?.items) {
      const formattedStudents = studentsData.items.map(student => ({
        id: student.id,
        admissionNumber: student.admissionNumber || "",
        firstName: student.firstName,
        lastName: student.lastName,
        rollNumber: student.rollNumber?.toString() || null,
        isModified: false,
      }));
      setStudents(formattedStudents);
    }
  };

  return (
    <PageWrapper
      title="Assign Roll Numbers"
      subtitle="Assign or update roll numbers for students in each class"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Roll Number Assignment</CardTitle>
            <CardDescription>
              Select a class and assign roll numbers to students. You can auto-assign roll numbers based on student name or admission number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Class Selection */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Class</label>
                  <Select
                    disabled={isLoadingClasses}
                    value={selectedClass}
                    onValueChange={setSelectedClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesData?.map(classItem => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name} - {classItem.sections?.[0]?.name || "No Section"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Sort Order for Auto-Assign</label>
                  <Select
                    value={sortOrder}
                    onValueChange={(value: "firstName" | "lastName" | "admissionNumber") => setSortOrder(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firstName">First Name</SelectItem>
                      <SelectItem value="lastName">Last Name</SelectItem>
                      <SelectItem value="admissionNumber">Admission Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end space-x-2">
                  <Button 
                    variant="secondary" 
                    onClick={handleAutoAssign}
                    disabled={!selectedClass || isLoadingStudents || students.length === 0}
                  >
                    Auto-Assign Roll Numbers
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetRollNumbers}
                    disabled={!selectedClass || isLoadingStudents || students.length === 0}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Students Table */}
              {selectedClass ? (
                isLoadingStudents ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Loading students...</span>
                  </div>
                ) : students.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Admission Number</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="w-[180px]">Roll Number</TableHead>
                          <TableHead className="w-[80px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.admissionNumber}</TableCell>
                            <TableCell>{student.firstName} {student.lastName}</TableCell>
                            <TableCell>
                              <Input
                                value={student.rollNumber || ""}
                                onChange={(e) => handleRollNumberChange(student.id, e.target.value)}
                                placeholder="Roll Number"
                              />
                            </TableCell>
                            <TableCell>
                              {student.isModified && <span className="text-amber-500 text-xs font-medium">Modified</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={saveRollNumbers} 
                        disabled={isSaving || !students.some(s => s.isModified)}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Roll Numbers
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No students found for the selected class.</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Please select a class to view and assign roll numbers.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
} 