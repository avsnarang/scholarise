"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  Upload, 
  Download, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  BookOpen,
  TrendingUp
} from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";

interface StudentMark {
  studentId: string;
  studentName: string;
  rollNumber: number;
  marksObtained?: number;
  isAbsent: boolean;
  remarks?: string;
}

export default function MarksEntryPage() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { isTeacher, teacherId, isAdmin, isSuperAdmin } = useUserRole();
  const [selectedExamConfig, setSelectedExamConfig] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Get teacher's subject assignments if user is a teacher
  const { data: teacherAssignments = [] } = api.subjectTeacher.getByTeacherId.useQuery(
    { teacherId: teacherId || '' },
    { enabled: isTeacher && !!teacherId }
  );

  // Fetch data
  const { data: allExamConfigs } = api.examination.getExamConfigurations.useQuery();
  const { data: allClasses } = api.class.getAll.useQuery();
  const { data: sections } = api.section.getAll.useQuery();
  const { data: students } = api.student.getAll.useQuery();

  // Filter exam configurations based on teacher assignments for teachers
  const examConfigs = isTeacher && !isAdmin && !isSuperAdmin 
    ? allExamConfigs?.filter((config: any) => 
        teacherAssignments.some((assignment: any) => 
          assignment.classId === config.classId && 
          assignment.subjectId === config.subjectId &&
          (assignment.sectionId === config.sectionId || assignment.sectionId === null)
        )
      )
    : allExamConfigs;

  // Filter classes based on teacher assignments for teachers
  const classes = isTeacher && !isAdmin && !isSuperAdmin 
    ? allClasses?.filter((cls: any) => 
        teacherAssignments.some((assignment: any) => assignment.classId === cls.id)
      )
    : allClasses;
  const { data: existingMarks, refetch: refetchMarks } = api.examination.getMarksEntries.useQuery({
    examConfigId: selectedExamConfig || undefined,
  });

  // Mutations
  const createMarkMutation = api.examination.createMarksEntry.useMutation();
  const submitMarksMutation = api.examination.submitMarks.useMutation();

  // Get selected exam configuration details
  const selectedExamConfigData = examConfigs?.find((config: any) => config.id === selectedExamConfig);

  // Filter students based on selected class/section
  const filteredStudents = students?.items?.filter((student: any) => {
    const matchesClass = !selectedClass || student.section?.classId === selectedClass;
    const matchesSection = !selectedSection || student.sectionId === selectedSection;
    const matchesSearch = !searchTerm || 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesClass && matchesSection && matchesSearch && student.isActive;
  });

  // Initialize student marks when exam config or students change
  React.useEffect(() => {
    if (selectedExamConfigData && filteredStudents) {
      const marks = filteredStudents.map((student: any) => {
        const existingMark = existingMarks?.find((mark: any) => mark.studentId === student.id);
        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          rollNumber: student.rollNumber || 0,
          marksObtained: existingMark?.marksObtained || undefined,
          isAbsent: existingMark?.isAbsent || false,
          remarks: existingMark?.remarks || "",
        };
      });
      setStudentMarks(marks.sort((a, b) => a.rollNumber - b.rollNumber));
      setIsSubmitted(existingMarks?.some((mark: any) => mark.isSubmitted) || false);
    }
  }, [selectedExamConfigData, filteredStudents, existingMarks]);

  const updateStudentMark = (studentId: string, field: keyof StudentMark, value: any) => {
    setStudentMarks(prev => prev.map(mark => 
      mark.studentId === studentId 
        ? { ...mark, [field]: value }
        : mark
    ));
  };

  const handleSaveMarks = async () => {
    if (!selectedExamConfig) {
      toast({ title: "Error", description: "Please select an exam configuration", variant: "destructive" });
      return;
    }

    try {
      const promises = studentMarks.map(mark => 
        createMarkMutation.mutateAsync({
          branchId: "1", // This should come from branch context
          examConfigId: selectedExamConfig,
          studentId: mark.studentId,
          marksObtained: mark.isAbsent ? undefined : mark.marksObtained,
          isAbsent: mark.isAbsent,
          remarks: mark.remarks,
        })
      );

      await Promise.all(promises);
      toast({ title: "Success", description: "Marks saved successfully" });
      refetchMarks();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save marks", variant: "destructive" });
    }
  };

  const handleSubmitMarks = async () => {
    if (!selectedExamConfig) return;

    try {
      await submitMarksMutation.mutateAsync({
        examConfigId: selectedExamConfig,
      });
      toast({ title: "Success", description: "Marks submitted successfully" });
      setIsSubmitted(true);
      refetchMarks();
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit marks", variant: "destructive" });
    }
  };

  const calculateStats = () => {
    const validMarks = studentMarks.filter(mark => !mark.isAbsent && mark.marksObtained !== undefined);
    const absentCount = studentMarks.filter(mark => mark.isAbsent).length;
    const passedCount = validMarks.filter(mark => 
      mark.marksObtained! >= (selectedExamConfigData?.passingMarks || 0)
    ).length;

    return {
      total: studentMarks.length,
      appeared: validMarks.length,
      absent: absentCount,
      passed: passedCount,
      failed: validMarks.length - passedCount,
      average: validMarks.length > 0 ? 
        validMarks.reduce((sum, mark) => sum + mark.marksObtained!, 0) / validMarks.length : 0,
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
        <p className="text-gray-600 mt-2">
          Enter and manage exam marks for students
        </p>
      </div>

      {/* Selection Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Exam Configuration</CardTitle>
          <CardDescription>
            Choose the exam configuration to enter marks for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="examConfig">Exam Configuration</Label>
              <Select value={selectedExamConfig} onValueChange={setSelectedExamConfig}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam configuration" />
                </SelectTrigger>
                <SelectContent>
                  {examConfigs?.map((config: any) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name} - {config.class.name} {config.section?.name} - {config.subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="class">Filter by Class</Label>
              <Select value={selectedClass || "ALL_CLASSES"} onValueChange={(value) => setSelectedClass(value === "ALL_CLASSES" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_CLASSES">All Classes</SelectItem>
                  {classes?.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="section">Filter by Section</Label>
              <Select value={selectedSection || "ALL_SECTIONS"} onValueChange={(value) => setSelectedSection(value === "ALL_SECTIONS" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_SECTIONS">All Sections</SelectItem>
                  {sections?.map((section: any) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by name or admission number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Configuration Details */}
      {selectedExamConfigData && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Exam Type</p>
                <p className="text-lg font-semibold">{selectedExamConfigData.examType.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Subject</p>
                <p className="text-lg font-semibold">{selectedExamConfigData.subject.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Max Marks</p>
                <p className="text-lg font-semibold">{selectedExamConfigData.maxMarks}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Passing Marks</p>
                <p className="text-lg font-semibold">{selectedExamConfigData.passingMarks}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge variant={isSubmitted ? "default" : "secondary"}>
                  {isSubmitted ? "Submitted" : "Draft"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {selectedExamConfigData && studentMarks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Appeared</p>
                  <p className="text-2xl font-bold text-green-600">{stats.appeared}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average</p>
                  <p className="text-2xl font-bold">{stats.average.toFixed(1)}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Alert */}
      {isSubmitted && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Marks have been submitted and are now read-only. Contact admin if changes are needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Marks Entry Table */}
      {selectedExamConfigData && studentMarks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Student Marks</CardTitle>
                <CardDescription>
                  Enter marks for {studentMarks.length} students
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveMarks}
                  disabled={isSubmitted || createMarkMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Marks
                </Button>
                <Button
                  onClick={handleSubmitMarks}
                  disabled={isSubmitted || submitMarksMutation.isPending}
                  variant="default"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Marks
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Marks Obtained</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentMarks.map((mark) => {
                  const student = filteredStudents?.find((s: any) => s.id === mark.studentId);
                  const isPass = mark.marksObtained && mark.marksObtained >= selectedExamConfigData.passingMarks;
                  const percentage = mark.marksObtained ? (mark.marksObtained / selectedExamConfigData.maxMarks) * 100 : 0;
                  
                  return (
                    <TableRow key={mark.studentId}>
                      <TableCell className="font-medium">{mark.rollNumber}</TableCell>
                      <TableCell>{mark.studentName}</TableCell>
                      <TableCell>{student?.admissionNumber}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={selectedExamConfigData.maxMarks}
                          value={mark.isAbsent ? "" : mark.marksObtained || ""}
                          onChange={(e) => updateStudentMark(
                            mark.studentId, 
                            'marksObtained', 
                            e.target.value ? parseInt(e.target.value) : undefined
                          )}
                          disabled={mark.isAbsent || isSubmitted}
                          className="w-20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={mark.isAbsent}
                          onCheckedChange={(checked) => {
                            updateStudentMark(mark.studentId, 'isAbsent', checked);
                            if (checked) {
                              updateStudentMark(mark.studentId, 'marksObtained', undefined);
                            }
                          }}
                          disabled={isSubmitted}
                        />
                      </TableCell>
                      <TableCell>
                        {mark.isAbsent ? (
                          <Badge variant="secondary">Absent</Badge>
                        ) : mark.marksObtained !== undefined ? (
                          <Badge variant={isPass ? "default" : "destructive"}>
                            {isPass ? "Pass" : "Fail"} ({percentage.toFixed(1)}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Entered</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={mark.remarks || ""}
                          onChange={(e) => updateStudentMark(mark.studentId, 'remarks', e.target.value)}
                          disabled={isSubmitted}
                          placeholder="Optional remarks"
                          className="w-40"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!selectedExamConfigData && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Exam Configuration</h3>
            <p className="text-gray-600">
              Please select an exam configuration to start entering marks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 