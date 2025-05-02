"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash, UserX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export default function StudentDetailPage() {
  const params = useParams() || {};
  const studentId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();
  const [currentTab, setCurrentTab] = useState("overview");

  // Fetch student data
  const { data: student, isLoading, error } = api.student.getById.useQuery({ 
    id: studentId 
  }, {
    enabled: !!studentId,
    retry: 1
  }) as { data: any, isLoading: boolean, error: any };

  // Update document title when student data is loaded
  useEffect(() => {
    if (student) {
      document.title = `${student.firstName} ${student.lastName} - Student Details | ScholaRise ERP`;
    }
  }, [student]);

  const utils = api.useContext();

  // API mutations
  const deleteStudentMutation = api.student.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Student deleted",
        description: "Student has been successfully deleted.",
        variant: "success",
      });
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
      void router.push("/students");
    },
    onError: (error) => {
      toast({
        title: "Error deleting student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = api.student.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: `Student ${student?.isActive ? "deactivated" : "activated"}`,
        description: `Student has been ${student?.isActive ? "deactivated" : "activated"} successfully.`,
        variant: "success",
      });
      void utils.student.getById.invalidate({ id: studentId });
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error updating student status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete handler
  const handleDelete = () => {
    if (!student) return;
    
    deleteConfirm("student", async () => {
      await deleteStudentMutation.mutateAsync({ id: studentId });
    });
  };

  // Toggle status handler
  const handleToggleStatus = () => {
    if (!student) return;
    
    statusChangeConfirm("student", !student.isActive, 1, async () => {
      await toggleStatusMutation.mutateAsync({
        id: studentId,
        isActive: !student.isActive,
      });
    });
  };

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="px-4 lg:px-6">
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Error: {error?.message || "Student not found"}
          </p>
          <Button asChild>
            <Link href="/students">Back to Students</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="icon" asChild>
              <Link href="/students">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {student.firstName} {student.lastName}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{student.admissionNumber || ""}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={student.isActive ? "outline" : "default"}
            className="flex items-center gap-1"
            onClick={handleToggleStatus}
          >
            {student.isActive ? (
              <>
                <UserX className="h-4 w-4" />
                <span>Deactivate</span>
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                <span>Activate</span>
              </>
            )}
          </Button>
          <Button 
            asChild
            variant="outline"
            className="flex items-center gap-1"
          >
            <Link href={`/students/${studentId}/edit`}>
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Link>
          </Button>
          <Button 
            variant="destructive"
            className="flex items-center gap-1"
            onClick={handleDelete}
          >
            <Trash className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Badge variant={student.isActive ? "default" : "secondary"} className={`text-sm ${student.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}`}>
          {student.isActive ? "Active" : "Inactive"}
        </Badge>
        {student.class && (
          <Badge variant="outline" className="ml-2 text-sm">
            Class {student.class.name} {student.class.section}
          </Badge>
        )}
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="family">Family Details</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic personal details of the student</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p>{student.firstName} {student.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admission Number</p>
                <p>{student.admissionNumber || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{student.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p>{student.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gender</p>
                <p>{student.gender || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                <p>{student.bloodGroup || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admission Date</p>
                <p>{student.dateOfAdmission ? new Date(student.dateOfAdmission).toLocaleDateString() : "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                <p>{student.nationality || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Religion</p>
                <p>{student.religion || "Not specified"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Student's address details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-base font-medium mb-2">Permanent Address</h3>
                  <p>{student.permanentAddress || "Not provided"}</p>
                  {student.permanentCity && (
                    <p className="mt-1">
                      {student.permanentCity}, {student.permanentState}, {student.permanentCountry} - {student.permanentZipCode}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-medium mb-2">Correspondence Address</h3>
                  <p>{student.correspondenceAddress || "Same as permanent address"}</p>
                  {student.correspondenceCity && (
                    <p className="mt-1">
                      {student.correspondenceCity}, {student.correspondenceState}, {student.correspondenceCountry} - {student.correspondenceZipCode}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
              <CardDescription>Academic details and previous schooling</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Class</p>
                <p>{student.class ? `${student.class.name} ${student.class.section}` : "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Previous School</p>
                <p>{student.previousSchool || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Class Attended</p>
                <p>{student.lastClassAttended || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Medium of Instruction</p>
                <p>{student.mediumOfInstruction || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">School State</p>
                <p>{student.schoolState || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">School City</p>
                <p>{student.schoolCity || "Not provided"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Reason for Leaving</p>
                <p>{student.reasonForLeaving || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parent/Guardian Information</CardTitle>
              <CardDescription>Family details of the student</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {student.parent && (
                  <>
                    <div>
                      <h3 className="text-base font-medium mb-2">Father</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Name</p>
                          <p>{student.parent.fatherName || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                          <p>{student.parent.fatherOccupation || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                          <p>{student.parent.fatherMobile || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p>{student.parent.fatherEmail || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-medium mb-2">Mother</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Name</p>
                          <p>{student.parent.motherName || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                          <p>{student.parent.motherOccupation || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                          <p>{student.parent.motherMobile || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p>{student.parent.motherEmail || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-medium mb-2">Guardian</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Name</p>
                          <p>{student.parent.guardianName || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                          <p>{student.parent.guardianOccupation || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                          <p>{student.parent.guardianMobile || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p>{student.parent.guardianEmail || "Not provided"}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {!student.parent && (
                  <div className="col-span-3 text-center py-4">
                    <p className="text-muted-foreground">No parent/guardian information available.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Recent activities and logs for this student</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No recent activities found.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
