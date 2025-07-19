"use client";

import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EnhancedTeacherForm } from "@/components/teachers/enhanced-teacher-form";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

// Helper function to convert API data to form values
const convertApiToFormValues = (apiData: any) => {
  // Helper function to safely format a date value
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return "";
    
    try {
      // If it's already a string, try to create a Date from it
      if (typeof dateValue === 'string') {
        // If it looks like an ISO string, just split it
        if (dateValue.includes('T')) {
          const result = dateValue.split('T')[0];
          return result!;
        }
        // Otherwise return as is if it's a valid date string
        return dateValue;
      }
      
      // If it's a Date object, convert to ISO and get the date part
      if (dateValue instanceof Date) {
        const result = dateValue.toISOString().split('T')[0];
        return result!;
      }
      
      // For any other type, try to make it a Date first
      const result = new Date(dateValue).toISOString().split('T')[0];
      return result!;
    } catch (error) {
      console.error(`Error formatting date: ${error}`);
      return "";
    }
  };

  // Check if user already has a Clerk account
  const hasClerkAccount = !!(apiData.clerkId || apiData.userId);
  
  // Extract roleId from userRoles if available
  const roleId = apiData.userRoles && apiData.userRoles.length > 0 
    ? apiData.userRoles[0].roleId 
    : "";

  console.log("Converting API data for edit form:", {
    hasClerkAccount,
    officialEmail: apiData.officialEmail,
    personalEmail: apiData.personalEmail,
    roleId,
    userRoles: apiData.userRoles
  });

  return {
    ...apiData,
    dateOfBirth: formatDate(apiData.dateOfBirth),
    joinDate: formatDate(apiData.joinDate),
    confirmationDate: formatDate(apiData.confirmationDate),
    // Convert any null values to undefined or empty string to match form schema
    qualification: apiData.qualification || "",
    specialization: apiData.specialization || "",
    middleName: apiData.middleName || "",
    bloodGroup: apiData.bloodGroup || "",
    maritalStatus: apiData.maritalStatus || "",
    nationality: apiData.nationality || "",
    religion: apiData.religion || "",
    panNumber: apiData.panNumber || "",
    aadharNumber: apiData.aadharNumber || "",
    // Make sure to handle all optional fields that might be null
    certifications: apiData.certifications || [],
    subjects: apiData.subjects || [],
    // Ensure officialEmail and personalEmail are properly mapped
    officialEmail: apiData.officialEmail || "",
    personalEmail: apiData.personalEmail || "",
    password: "", // Empty password field for existing users (will show placeholder text)
    roleId,
  };
};

export default function EditTeacherPage() {
  const params = useParams() || {};
  const router = useRouter();
  
  const teacherId = typeof params.id === "string" ? params.id : "";
  
  const { data: teacher, isLoading, error } = api.teacher.getById.useQuery(
    { id: teacherId },
    { enabled: !!teacherId }
  );
  
  // Handle error
  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500">Error</h2>
        <p className="mt-2">{error.message || "Failed to load teacher details"}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push('/teachers')}
        >
          Back to Teachers
        </Button>
      </div>
    );
  }
  
  // Loading state
  if (isLoading || !teacher) {
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
        
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  const formattedTeacherData = convertApiToFormValues(teacher);
  
  return (
    <div className="w-full px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Teacher</h1>
            <p className="text-muted-foreground">Update teacher information for {teacher.firstName} {teacher.lastName}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href={`/staff/teachers/${teacherId}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Details
          </Link>
        </Button>
      </div>

      {/* Main form area with shadow and rounded corners */}
      <Card className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b px-6 py-4 bg-muted/30">
          <h2 className="text-xl font-semibold">Teacher Information Form</h2>
          <p className="text-sm text-muted-foreground">Update teacher information</p>
        </div>
        <div className="p-6">
          <EnhancedTeacherForm initialData={formattedTeacherData} isEditing={true} />
        </div>
      </Card>
    </div>
  );
}
