import { AppLayout } from "@/components/layout/app-layout"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { EnhancedStudentForm } from "@/components/students/enhanced-student-form"
import { Button } from "@/components/ui/button"
import { api } from "@/utils/api"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/router"
import type { NextPageWithLayout } from "../../_app"

const EditStudentPage: NextPageWithLayout = () => {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  // Fetch student data
  const { data: student, isLoading, error } = api.student.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  // Handle loading state
  if (isLoading) {
    return (
      <PageWrapper title="Loading...">
        <div className="flex h-full items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00501B] border-t-transparent"></div>
        </div>
      </PageWrapper>
    );
  }

  // Handle student not found
  if (!student) {
    return (
      <PageWrapper title="Student Not Found">
        <div className="flex h-full flex-col items-center justify-center py-24">
          <h2 className="text-2xl font-bold">Student not found</h2>
          <p className="text-gray-500">The student you are looking for does not exist.</p>
          <Link href="/students">
            <Button className="mt-4 bg-[#00501B] hover:bg-[#00501B]/90">Back to Students</Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  // Format the data for the form
  const formattedData = {
    // Start with a clean object instead of spreading the entire student
    id: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    // Ensure dates are properly formatted as strings
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : "",
    dateOfAdmission: student.dateOfAdmission ? student.dateOfAdmission.toISOString().split('T')[0] : "",
    dateOfJoining: student.joinDate ? student.joinDate.toISOString().split('T')[0] : "",
    
    // Cast gender to expected type
    gender: (student.gender === "Male" || student.gender === "Female" || student.gender === "Other" 
      ? student.gender 
      : "Other") as "Male" | "Female" | "Other",
    
    // Convert null values to empty strings
    phone: student.phone || "",
    email: student.email || "",
    personalEmail: student.personalEmail || "",
    bloodGroup: student.bloodGroup || "",
    religion: student.religion || "",
    nationality: student.nationality || "",
    caste: student.caste || "",
    aadharNumber: student.aadharNumber || "",
    udiseId: student.udiseId || "",
    
    // Ensure classId is a string with minimum length 1
    classId: student.classId || "",
    
    // Address fields
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
    
    // Previous school fields
    previousSchool: student.previousSchool || "",
    lastClassAttended: student.lastClassAttended || "",
    mediumOfInstruction: student.mediumOfInstruction || "",
    recognisedByStateBoard: student.recognisedByStateBoard || false,
    schoolCity: student.schoolCity || "",
    schoolState: student.schoolState || "",
    reasonForLeaving: student.reasonForLeaving || "",
    
    // Parent dates formatted as strings if they exist
    fatherDob: student.parent?.fatherDob ? new Date(student.parent.fatherDob).toISOString().split('T')[0] : "",
    motherDob: student.parent?.motherDob ? new Date(student.parent.motherDob).toISOString().split('T')[0] : "",
    guardianDob: student.parent?.guardianDob ? new Date(student.parent.guardianDob).toISOString().split('T')[0] : "",
    parentAnniversary: student.parent?.parentAnniversary ? new Date(student.parent.parentAnniversary).toISOString().split('T')[0] : "",
    
    // Add parent fields if they exist
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
    <PageWrapper
      title="Edit Student"
      subtitle={`Update details for ${student.firstName} ${student.lastName}`}
      action={
        <Link href={`/students/${id}`}>
          <Button variant="outline" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Student</span>
          </Button>
        </Link>
      }
    >
      <EnhancedStudentForm initialData={formattedData} isEditing={true} />
    </PageWrapper>
  );
};

EditStudentPage.getLayout = (page) => {
  return <AppLayout title="Edit Student" description="Edit student details">{page}</AppLayout>
};

export default EditStudentPage;
