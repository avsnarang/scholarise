"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { EnhancedStudentForm } from "@/components/students/enhanced-student-form";

export default function EditStudentPage() {
  const params = useParams() || {};
  const studentId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  // Fetch student data
  const { data: student, isLoading, error } = api.student.getById.useQuery(
    { id: studentId },
    { enabled: !!studentId, retry: 1 }
  );

  // Update document title when student data is loaded
  useEffect(() => {
    if (student) {
      document.title = `Edit ${student.firstName} ${student.lastName} | ScholaRise ERP`;
    }
  }, [student]);

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

  // Format the data for the form
  const formattedData = {
    id: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: (student as any).middleName || "",
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : undefined,
    dateOfAdmission: student.dateOfAdmission ? new Date(student.dateOfAdmission).toISOString().split('T')[0] : undefined,
    dateOfJoining: student.joinDate ? new Date(student.joinDate).toISOString().split('T')[0] : undefined,
    gender: (student.gender === "Male" || student.gender === "Female" || student.gender === "Other" 
      ? student.gender 
      : undefined) as "Male" | "Female" | "Other" | undefined,
    phone: student.phone || "",
    schoolEmail: student.email || "",
    personalEmail: student.personalEmail || "",
    bloodGroup: student.bloodGroup || "",
    religion: student.religion || "",
    nationality: student.nationality || "",
    caste: student.caste || "",
    aadharNumber: student.aadharNumber || "",
    udiseId: student.udiseId || "",
    classId: student.classId || "",
    permanentAddress: student.permanentAddress || "",
    permanentCity: student.permanentCity || "",
    permanentState: student.permanentState || "",
    permanentCountry: student.permanentCountry || "",
    permanentZipCode: student.permanentZipCode || "",
    correspondenceAddress: student.correspondenceAddress || "",
    correspondenceCity: student.correspondenceCity || "",
    correspondenceState: student.correspondenceState || "",
    correspondenceCountry: student.correspondenceCountry || "",
    correspondenceZipCode: student.correspondenceZipCode || "",
    previousSchool: student.previousSchool || "",
    lastClassAttended: student.lastClassAttended || "",
    mediumOfInstruction: student.mediumOfInstruction || "",
    recognisedByStateBoard: student.recognisedByStateBoard || false,
    schoolCity: student.schoolCity || "",
    schoolState: student.schoolState || "",
    reasonForLeaving: student.reasonForLeaving || "",
    fatherDob: student.parent?.fatherDob ? new Date(student.parent.fatherDob).toISOString().split('T')[0] : undefined,
    motherDob: student.parent?.motherDob ? new Date(student.parent.motherDob).toISOString().split('T')[0] : undefined,
    guardianDob: student.parent?.guardianDob ? new Date(student.parent.guardianDob).toISOString().split('T')[0] : undefined,
    parentAnniversary: student.parent?.parentAnniversary ? new Date(student.parent.parentAnniversary).toISOString().split('T')[0] : undefined,
    fatherName: student.parent?.fatherName || "",
    fatherEducation: student.parent?.fatherEducation || "",
    fatherOccupation: student.parent?.fatherOccupation || "",
    fatherMobile: student.parent?.fatherMobile || "",
    fatherEmail: student.parent?.fatherEmail || "",
    motherName: student.parent?.motherName || "",
    motherEducation: student.parent?.motherEducation || "",
    motherOccupation: student.parent?.motherOccupation || "",
    motherMobile: student.parent?.motherMobile || "",
    motherEmail: student.parent?.motherEmail || "",
    guardianName: student.parent?.guardianName || "",
    guardianEducation: student.parent?.guardianEducation || "",
    guardianOccupation: student.parent?.guardianOccupation || "",
    guardianMobile: student.parent?.guardianMobile || "",
    guardianEmail: student.parent?.guardianEmail || "",
    monthlyIncome: student.parent?.monthlyIncome || "",
  };

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/students/${studentId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Edit Student</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{student.firstName} {student.lastName}</p>
        </div>
      </div>

      <div className="max-w-full">
        <EnhancedStudentForm initialData={formattedData} isEditing={true} />
      </div>
    </div>
  );
}
