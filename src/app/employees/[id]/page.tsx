"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Edit, Trash, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteConfirm, useStatusChangeConfirm } from "@/utils/popup-utils";

export default function EmployeeDetailPage() {
  const params = useParams() || {};
  const [currentTab, setCurrentTab] = useState("personal-info");
  const router = useRouter();
  const { toast } = useToast();
  const deleteConfirm = useDeleteConfirm();
  const statusChangeConfirm = useStatusChangeConfirm();
  
  const employeeId = typeof params.id === "string" ? params.id : "";
  
  const { data: employee, isLoading, error } = api.employee.getById.useQuery(
    { id: employeeId },
    { enabled: !!employeeId }
  );

  // API mutations
  const deleteEmployeeMutation = api.employee.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Employee deleted",
        description: "Employee has been successfully deleted.",
        variant: "success",
      });
      void router.push("/employees");
    },
    onError: (error) => {
      toast({
        title: "Error deleting employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = api.employee.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: `Employee ${employee?.isActive ? "deactivated" : "activated"}`,
        description: `Employee has been ${employee?.isActive ? "deactivated" : "activated"} successfully.`,
        variant: "success",
      });
      void router.push(`/employees/${employeeId}`);
    },
    onError: (error) => {
      toast({
        title: "Error updating employee status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete handler
  const handleDelete = () => {
    if (!employee) return;
    
    deleteConfirm("employee", async () => {
      await deleteEmployeeMutation.mutateAsync({ id: employeeId });
    });
  };

  // Toggle status handler
  const handleToggleStatus = () => {
    if (!employee) return;
    
    statusChangeConfirm("employee", !employee.isActive, 1, async () => {
      await toggleStatusMutation.mutateAsync({
        id: employeeId,
        isActive: !employee.isActive,
      });
    });
  };
  
  // Handle error
  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500">Error</h2>
        <p className="mt-2">{error.message || "Failed to load employee details"}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push('/employees')}
        >
          Back to Employees
        </Button>
      </div>
    );
  }
  
  // Loading state
  if (isLoading || !employee) {
    return (
      <div className="w-full px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Skeleton className="h-4 w-20" />
            <span>/</span>
            <Skeleton className="h-4 w-20" />
            <span>/</span>
            <Skeleton className="h-4 w-20" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-40 mb-1" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full px-4 py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="icon" asChild>
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {employee.firstName} {employee.lastName}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{employee.employeeCode || ""}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={employee.isActive ? "outline" : "default"}
            className="flex items-center gap-1"
            onClick={handleToggleStatus}
          >
            {employee.isActive ? (
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
            <Link href={`/employees/${employeeId}/edit`}>
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
        <Badge variant={employee.isActive ? "default" : "secondary"} className={`text-sm ${employee.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}`}>
          {employee.isActive ? "Active" : "Inactive"}
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
              <CardDescription>Basic personal details of the employee</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p>{employee.firstName} {employee.middleName ? employee.middleName + ' ' : ''}{employee.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gender</p>
                <p>{employee.gender || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p>{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                <p>{employee.bloodGroup || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                <p>{employee.maritalStatus || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                <p>{employee.nationality || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Religion</p>
                <p>{employee.religion || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID Details</p>
                <p>PAN: {employee.panNumber || "Not provided"}</p>
                <p>Aadhar: {employee.aadharNumber || "Not provided"}</p>
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
                    <p>{employee.address || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">City</p>
                    <p>{employee.city || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <p>{employee.state || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p>{employee.country || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pincode</p>
                    <p>{employee.pincode || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Permanent Address</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>{employee.permanentAddress || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">City</p>
                    <p>{employee.permanentCity || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <p>{employee.permanentState || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p>{employee.permanentCountry || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pincode</p>
                    <p>{employee.permanentPincode || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Contact Details</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{employee.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Alternate Phone</p>
                    <p>{employee.alternatePhone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Personal Email</p>
                    <p>{employee.personalEmail || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Official Email</p>
                    <p>{employee.officialEmail || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p>{employee.emergencyContactName || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{employee.emergencyContactPhone || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Relation</p>
                    <p>{employee.emergencyContactRelation || "Not provided"}</p>
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
                <p>{employee.qualification || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Specialization</p>
                <p>{employee.specialization || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Professional Qualifications</p>
                <p>{employee.professionalQualifications || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Special Certifications</p>
                <p>{employee.specialCertifications || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Year of Completion</p>
                <p>{employee.yearOfCompletion || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Institution</p>
                <p>{employee.institution || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Experience</p>
                <p>{employee.experience || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bio</p>
                <p>{employee.bio || "Not provided"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Subject Expertise</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {employee.subjects && employee.subjects.length > 0 ? (
                    employee.subjects.map((subject: string, index: number) => (
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
                  {employee.certifications && employee.certifications.length > 0 ? (
                    employee.certifications.map((cert: string, index: number) => (
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
                  <p>{employee.employeeCode || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                  <p>{employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Designation</p>
                  <p>{employee.designation || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p>{employee.department || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reporting Manager</p>
                  <p>{employee.reportingManager || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee Type</p>
                  <p>{employee.employeeType || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Branch</p>
                  <p>{employee.branchId || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmation Date</p>
                  <p>{employee.confirmationDate ? new Date(employee.confirmationDate).toLocaleDateString() : "Not specified"}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Previous Employment</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Previous Experience</p>
                    <p>{employee.previousExperience || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Previous Employer</p>
                    <p>{employee.previousEmployer || "Not specified"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Salary & Banking</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Salary Structure</p>
                    <p>{employee.salaryStructure || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">PF Number</p>
                    <p>{employee.pfNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ESI Number</p>
                    <p>{employee.esiNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">UAN Number</p>
                    <p>{employee.uanNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                    <p>{employee.bankName || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                    <p>{employee.accountNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IFSC Code</p>
                    <p>{employee.ifscCode || "Not specified"}</p>
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
                <p>{employee.officialEmail || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Device Issued</p>
                <p>{employee.deviceIssued || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Access Card ID</p>
                <p>{employee.accessCardId || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Software Licenses</p>
                <p>{employee.softwareLicenses || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asset Return Status</p>
                <p>{employee.assetReturnStatus || "Not specified"}</p>
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
                <p className={employee.isActive ? "text-green-600" : "text-red-600"}>
                  {employee.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p>{employee.updatedAt ? new Date(employee.updatedAt).toLocaleString() : "Not available"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created At</p>
                <p>{employee.createdAt ? new Date(employee.createdAt).toLocaleString() : "Not available"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Recent activities and logs for this employee</CardDescription>
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