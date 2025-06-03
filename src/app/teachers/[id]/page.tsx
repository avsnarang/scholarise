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

export default function TeacherDetailPage() {
  const params = useParams() || {};
  const teacherId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();
  const [currentTab, setCurrentTab] = useState("personal-info");

  // Fetch teacher data
  const { data: teacher, isLoading, error } = api.teacher.getById.useQuery({ 
    id: teacherId 
  }, {
    enabled: !!teacherId,
    retry: 1
  }) as { data: any, isLoading: boolean, error: any };

  // Update document title when teacher data is loaded
  useEffect(() => {
    if (teacher) {
      document.title = `${teacher.firstName} ${teacher.lastName} - Teacher Details | ScholaRise ERP`;
    }
  }, [teacher]);

  const utils = api.useContext();

  // API mutations
  const deleteTeacherMutation = api.teacher.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Teacher deleted",
        description: "Teacher has been successfully deleted.",
        variant: "success",
      });
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      void router.push("/teachers");
    },
    onError: (error) => {
      toast({
        title: "Error deleting teacher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = api.teacher.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: `Teacher ${teacher?.isActive ? "deactivated" : "activated"}`,
        description: `Teacher has been ${teacher?.isActive ? "deactivated" : "activated"} successfully.`,
        variant: "success",
      });
      void utils.teacher.getById.invalidate({ id: teacherId });
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error updating teacher status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete handler
  const handleDelete = () => {
    if (!teacher) return;
    
    deleteConfirm("teacher", async () => {
      await deleteTeacherMutation.mutateAsync({ id: teacherId });
    });
  };

  // Toggle status handler
  const handleToggleStatus = () => {
    if (!teacher) return;
    
    statusChangeConfirm("teacher", !teacher.isActive, 1, async () => {
      await toggleStatusMutation.mutateAsync({
        id: teacherId,
        isActive: !teacher.isActive,
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

  if (error || !teacher) {
    return (
      <div className="px-4 lg:px-6">
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Error: {error?.message || "Teacher not found"}
          </p>
          <Button asChild>
            <Link href="/teachers">Back to Teachers</Link>
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
              <Link href="/teachers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {teacher.firstName} {teacher.lastName}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.employeeCode || ""}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={teacher.isActive ? "outline" : "default"}
            className="flex items-center gap-1"
            onClick={handleToggleStatus}
          >
            {teacher.isActive ? (
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
            <Link href={`/teachers/${teacherId}/edit`}>
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
        <Badge variant={teacher.isActive ? "default" : "secondary"} className={`text-sm ${teacher.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}`}>
          {teacher.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="personal-info" className="rounded-l-md">Personal Info</TabsTrigger>
          <TabsTrigger value="contact-info">Contact Info</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="account-info" className="rounded-r-md">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic personal details of the teacher</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p>{teacher.firstName} {teacher.middleName ? teacher.middleName + ' ' : ''}{teacher.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gender</p>
                <p>{teacher.gender || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p>{teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                <p>{teacher.bloodGroup || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                <p>{teacher.maritalStatus || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                <p>{teacher.nationality || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Religion</p>
                <p>{teacher.religion || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID Details</p>
                <p>PAN: {teacher.panNumber || "Not provided"}</p>
                <p>Aadhar: {teacher.aadharNumber || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Contact details and address information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Current Address</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>{teacher.address || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">City</p>
                    <p>{teacher.city || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <p>{teacher.state || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p>{teacher.country || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pincode</p>
                    <p>{teacher.pincode || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Permanent Address</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>{teacher.permanentAddress || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">City</p>
                    <p>{teacher.permanentCity || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <p>{teacher.permanentState || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p>{teacher.permanentCountry || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pincode</p>
                    <p>{teacher.permanentPincode || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Contact Details</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{teacher.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Alternate Phone</p>
                    <p>{teacher.alternatePhone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Personal Email</p>
                    <p>{teacher.personalEmail || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Official Email</p>
                    <p>{teacher.officialEmail || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p>{teacher.emergencyContactName || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{teacher.emergencyContactPhone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Relation</p>
                    <p>{teacher.emergencyContactRelation || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Qualifications & Expertise</CardTitle>
              <CardDescription>Educational and professional qualifications</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Qualification</p>
                <p>{teacher.qualification || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Specialization</p>
                <p>{teacher.specialization || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Professional Qualifications</p>
                <p>{teacher.professionalQualifications || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Special Certifications</p>
                <p>{teacher.specialCertifications || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Year of Completion</p>
                <p>{teacher.yearOfCompletion || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Institution</p>
                <p>{teacher.institution || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Experience</p>
                <p>{teacher.experience || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bio</p>
                <p>{teacher.bio || "Not provided"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Subject Expertise</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {teacher.subjects && teacher.subjects.length > 0 ? (
                    teacher.subjects.map((subject: string, index: number) => (
                      <Badge key={index} variant="outline">{subject}</Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No subjects specified</p>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Certifications</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {teacher.certifications && teacher.certifications.length > 0 ? (
                    teacher.certifications.map((cert: string, index: number) => (
                      <Badge key={index} variant="outline">{cert}</Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No certifications specified</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>Job-related information and employment details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee Code</p>
                  <p>{teacher.employeeCode || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                  <p>{teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Designation</p>
                  <p>{teacher.designation || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p>{teacher.department || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reporting Manager</p>
                  <p>{teacher.reportingManager || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee Type</p>
                  <p>{teacher.employeeType || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Branch</p>
                  <p>{teacher.branch?.name || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmation Date</p>
                  <p>{teacher.confirmationDate ? new Date(teacher.confirmationDate).toLocaleDateString() : "Not specified"}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Previous Employment</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Previous Experience</p>
                    <p>{teacher.previousExperience || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Previous Employer</p>
                    <p>{teacher.previousEmployer || "Not specified"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Salary & Banking</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Salary Structure</p>
                    <p>{teacher.salaryStructure || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">PF Number</p>
                    <p>{teacher.pfNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ESI Number</p>
                    <p>{teacher.esiNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">UAN Number</p>
                    <p>{teacher.uanNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                    <p>{teacher.bankName || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                    <p>{teacher.accountNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IFSC Code</p>
                    <p>{teacher.ifscCode || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>IT & Assets</CardTitle>
              <CardDescription>IT related information and asset allocation</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Official Email</p>
                <p>{teacher.officialEmail || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Device Issued</p>
                <p>{teacher.deviceIssued || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Access Card ID</p>
                <p>{teacher.accessCardId || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Software Licenses</p>
                <p>{teacher.softwareLicenses || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asset Return Status</p>
                <p>{teacher.assetReturnStatus || "Not specified"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Account status and system information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className={teacher.isActive ? "text-green-600" : "text-red-600"}>
                  {teacher.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p>{teacher.updatedAt ? new Date(teacher.updatedAt).toLocaleString() : "Not available"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created At</p>
                <p>{teacher.createdAt ? new Date(teacher.createdAt).toLocaleString() : "Not available"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Sections</CardTitle>
              <CardDescription>Sections assigned to this teacher</CardDescription>
            </CardHeader>
            <CardContent>
              {teacher.sections && teacher.sections.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teacher.sections.map((section: any) => (
                    <div key={section.id} className="rounded-lg border p-3">
                      <h3 className="font-medium">{section.class?.name} - {section.name}</h3>
                      <p className="text-sm text-muted-foreground">Capacity: {section.capacity}</p>
                      <p className="text-sm text-muted-foreground">Status: {section.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No sections assigned yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Recent activities and logs for this teacher</CardDescription>
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
