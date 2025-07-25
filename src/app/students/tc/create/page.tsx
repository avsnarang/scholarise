"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, ArrowLeft, User, Calendar, MapPin, Users, GraduationCap, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useActionPermissions } from "@/utils/permission-utils";
import { Permission } from "@/types/permissions";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/usePermissions";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type Step = 'class-selection' | 'student-selection' | 'tc-details' | 'creating';

export default function CreateTransferCertificatePage() {
  const [currentStep, setCurrentStep] = useState<Step>('class-selection');
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [tcNumber, setTcNumber] = useState("");
  const [isAutomatic, setIsAutomatic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();

  const { hasPermission } = useActionPermissions("students");
  const canManageTC = hasPermission(Permission.MANAGE_TRANSFER_CERTIFICATES);

  const { isSuperAdmin } = usePermissions();

  // Get current session for filtering
  const { data: sessionData } = api.academicSession.getCurrentSession.useQuery();
  const currentSessionId = sessionData?.id;

  // Fetch classes for the current branch and session
  const { data: classesData } = api.class.getAll.useQuery({
    branchId: getBranchFilterParam(),
    sessionId: currentSessionId,
    isActive: true,
  });

  // Fetch sections for selected class
  const { data: sectionsData } = api.section.getByClass.useQuery(
    { classId: selectedClassId },
    { enabled: !!selectedClassId }
  );

  // Fetch students for selected section
  const { data: studentsData } = api.student.getAll.useQuery(
    {
      branchId: getBranchFilterParam(),
      sessionId: currentSessionId,
      sectionId: selectedSectionId, // Direct parameter for section filtering
      filters: {
        isActive: "true", // Only active students can get TC
      },
      limit: 1000, // Get all students in the section
    },
    { enabled: !!selectedSectionId }
  );

  // Create TC mutation
  const createTCMutation = api.transferCertificate.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Transfer Certificate Created",
        description: `TC ${data.tcNumber} has been successfully generated for ${selectedStudent?.firstName} ${selectedStudent?.lastName}.`,
        variant: "success",
      });
      
      // Invalidate relevant queries
      utils.transferCertificate.getAll.invalidate();
      utils.student.getAll.invalidate();
      
      // Redirect to TC list
      router.push("/students/tc");
    },
    onError: (error) => {
      toast({
        title: "Error Creating Transfer Certificate",
        description: error.message,
        variant: "destructive",
      });
      setCurrentStep('tc-details');
    },
  });

  const handleCreateTC = async () => {
    if (!selectedStudent) return;

    setCurrentStep('creating');
    setIsCreating(true);

    try {
      await createTCMutation.mutateAsync({
        studentId: selectedStudent.id,
        reason: reason.trim() || undefined,
        remarks: remarks.trim() || undefined,
        tcNumber: isAutomatic ? undefined : tcNumber.trim(),
        isAutomatic,
      });
    } catch (error) {
      // Error handling is done in onError callback
    } finally {
      setIsCreating(false);
    }
  };

  const resetToClassSelection = () => {
    setCurrentStep('class-selection');
    setSelectedClassId("");
    setSelectedSectionId("");
    setSelectedStudent(null);
    setReason("");
    setRemarks("");
    setTcNumber("");
    setIsAutomatic(true);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSectionId(""); // Reset section selection
    setSelectedStudent(null); // Reset student selection
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setSelectedStudent(null); // Reset student selection
  };

  // Filter students based on search term
  const filteredStudents = studentsData?.items?.filter(student =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedClass = classesData?.find(c => c.id === selectedClassId);
  const selectedSection = sectionsData?.find(s => s.id === selectedSectionId);

  if (!canManageTC) {
    return (
      <PageWrapper title="Access Denied">
        <div className="text-center py-8">
          <p className="text-muted-foreground">You don't have permission to manage transfer certificates.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Generate Transfer Certificate"
      subtitle="Create a new transfer certificate for a student"
      action={
        <Link href="/students/tc">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to TCs
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${currentStep === 'class-selection' ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'class-selection' ? 'bg-primary text-primary-foreground' : ['student-selection', 'tc-details', 'creating'].includes(currentStep) ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                    {['student-selection', 'tc-details', 'creating'].includes(currentStep) ? <Check className="h-4 w-4" /> : '1'}
                  </div>
                  <span className="font-medium">Select Class & Section</span>
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                
                <div className={`flex items-center gap-2 ${currentStep === 'student-selection' ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'student-selection' ? 'bg-primary text-primary-foreground' : ['tc-details', 'creating'].includes(currentStep) ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                    {['tc-details', 'creating'].includes(currentStep) ? <Check className="h-4 w-4" /> : '2'}
                  </div>
                  <span className="font-medium">Select Student</span>
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                
                <div className={`flex items-center gap-2 ${['tc-details', 'creating'].includes(currentStep) ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'creating' ? 'bg-green-500 text-white' : currentStep === 'tc-details' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {currentStep === 'creating' ? <Check className="h-4 w-4" /> : '3'}
                  </div>
                  <span className="font-medium">TC Details</span>
                </div>
              </div>
              
              {currentStep !== 'class-selection' && (
                <Button variant="outline" size="sm" onClick={resetToClassSelection}>
                  Start Over
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Class & Section Selection */}
        {currentStep === 'class-selection' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Select Class & Section
              </CardTitle>
              <CardDescription>
                Choose the class and section from which you want to select a student for transfer certificate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Class Selection */}
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={selectedClassId} onValueChange={handleClassChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classesData?.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Selection */}
              {selectedClassId && (
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select value={selectedSectionId} onValueChange={handleSectionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionsData?.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{section.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {section.studentCount} students
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected Summary */}
              {selectedClassId && selectedSectionId && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Selected:</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Class:</strong> {selectedClass?.name} | <strong>Section:</strong> {selectedSection?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Students Available:</strong> {selectedSection?.studentCount} students eligible for TC
                  </p>
                </div>
              )}

              {/* Continue Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => setCurrentStep('student-selection')}
                  disabled={!selectedClassId || !selectedSectionId}
                >
                  Continue to Student Selection
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Student Selection */}
        {currentStep === 'student-selection' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Student
              </CardTitle>
              <CardDescription>
                Choose the student from {selectedClass?.name} - {selectedSection?.name} for whom you want to generate a transfer certificate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students by name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Student List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No students match your search' : 'No active students found in this section'}
                    </p>
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedStudent?.id === student.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {student.firstName} {student.lastName}
                            </h4>
                            {selectedStudent?.id === student.id && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Admission No: {student.admissionNumber}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>DOB: {new Date(student.dateOfBirth).toLocaleDateString()}</span>
                            <span>Gender: {student.gender}</span>
                            {student.rollNumber && <span>Roll: {student.rollNumber}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Student Summary */}
              {selectedStudent && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium mb-2 text-primary">Selected Student:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Admission Number:</span>
                      <p className="font-medium">{selectedStudent.admissionNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Class & Section:</span>
                      <p className="font-medium">{selectedClass?.name} - {selectedSection?.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <p className="font-medium">{new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => setCurrentStep('tc-details')}
                  disabled={!selectedStudent}
                >
                  Continue to TC Details
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: TC Details */}
        {currentStep === 'tc-details' && selectedStudent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transfer Certificate Details
              </CardTitle>
              <CardDescription>
                Enter the details for the transfer certificate for {selectedStudent.firstName} {selectedStudent.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Student Information:</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Admission No:</span>
                    <p className="font-medium">{selectedStudent.admissionNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Class:</span>
                    <p className="font-medium">{selectedClass?.name} - {selectedSection?.name}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* TC Number */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-tc-number"
                    checked={isAutomatic}
                    onCheckedChange={(checked: CheckedState) => setIsAutomatic(!!checked)}
                  />
                  <Label htmlFor="auto-tc-number" className="font-medium">
                    Auto-generate TC Number
                  </Label>
                </div>

                {!isAutomatic && (
                  <div className="space-y-2">
                    <Label htmlFor="tc-number">Manual TC Number</Label>
                    <Input
                      id="tc-number"
                      placeholder="Enter TC number (e.g., TC20240001)"
                      value={tcNumber}
                      onChange={(e) => setTcNumber(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Transfer</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Family relocation, Change of school preference"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Additional Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  placeholder="Any additional notes or comments about the transfer"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5">⚠️</div>
                  <div>
                    <h5 className="font-medium text-amber-800 dark:text-amber-200">Important Note</h5>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Creating a transfer certificate will automatically mark the student as "TC Issued" and they will no longer appear in active student lists. This action cannot be easily undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCurrentStep('student-selection')}>
                  Back to Student Selection
                </Button>
                <Button onClick={handleCreateTC} disabled={isCreating}>
                  {isCreating ? 'Generating TC...' : 'Generate Transfer Certificate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Creating/Success */}
        {currentStep === 'creating' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="font-medium">Generating Transfer Certificate...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please wait while we create the transfer certificate for {selectedStudent?.firstName} {selectedStudent?.lastName}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
} 