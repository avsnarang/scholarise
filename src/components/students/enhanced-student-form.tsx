import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/utils/api";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/use-toast";
import { StudentInfoTab } from "./form-tabs/student-info-tab";
import { AddressTab } from "./form-tabs/address-tab";
import { ParentInfoTab } from "./form-tabs/parent-info-tab";
import { OtherInfoTab } from "./form-tabs/other-info-tab";
import { SiblingDetailsTab } from "./form-tabs/sibling-details-tab";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

// Define the form schema with all fields from all tabs
const studentSchema = z.object({
  // Student Information Tab
  admissionNumber: z.string().min(1, "Admission number is required"),
  firstName: z.string().min(1, "First name is required")
    .transform(val => val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
  lastName: z.string().min(1, "Last name is required")
    .transform(val => val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
  classId: z.string().min(1, "Class is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  dateOfAdmission: z.string().min(1, "Date of admission is required"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  bloodGroup: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  otherGender: z.string().optional(),
  schoolEmail: z.string().email("Invalid email").optional(),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  caste: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  aadharNumber: z.string().optional(),
  udiseId: z.string().optional(),
  cbse10RollNumber: z.string().optional(),
  cbse12RollNumber: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  subjects: z.array(z.string()).optional(),

  // Address Tab
  permanentAddress: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentState: z.string().optional(),
  permanentCountry: z.string().optional(),
  permanentZipCode: z.string().optional(),
  sameAsPermAddress: z.boolean().optional(),
  correspondenceAddress: z.string().optional(),
  correspondenceCity: z.string().optional(),
  correspondenceState: z.string().optional(),
  correspondenceCountry: z.string().optional(),
  correspondenceZipCode: z.string().optional(),

  // Parent Information Tab
  fatherName: z.string().optional(),
  fatherDob: z.string().optional(),
  motherName: z.string().optional(),
  motherDob: z.string().optional(),
  guardianName: z.string().optional(),
  guardianDob: z.string().optional(),
  parentAnniversary: z.string().optional(),
  fatherEducation: z.string().optional(),
  motherEducation: z.string().optional(),
  guardianEducation: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  guardianOccupation: z.string().optional(),
  fatherMobile: z.string().optional(),
  motherMobile: z.string().optional(),
  guardianMobile: z.string().optional(),
  fatherEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  motherEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  guardianEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  fatherAadharNumber: z.string().optional(),
  motherAadharNumber: z.string().optional(),
  guardianAadharNumber: z.string().optional(),
  monthlyIncome: z.string().optional(),
  parentUsername: z.string().optional(),
  parentPassword: z.string().optional(),

  // Other Information Tab
  previousSchool: z.string().optional(),
  lastClassAttended: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  recognisedByStateBoard: z.boolean().optional(),
  schoolCity: z.string().optional(),
  schoolState: z.string().optional(),
  reasonForLeaving: z.string().optional(),

  // Sibling Details Tab
  siblingAdmissionNumber: z.string().optional(),
});

// Add validation for date sequence
const enhancedStudentSchema = studentSchema.refine(
  (data) => {
    if (data.dateOfBirth && data.dateOfAdmission) {
      return new Date(data.dateOfBirth) < new Date(data.dateOfAdmission);
    }
    return true;
  },
  {
    message: "Date of admission must be after date of birth",
    path: ["dateOfAdmission"],
  }
).refine(
  (data) => {
    if (data.dateOfAdmission && data.dateOfJoining) {
      return new Date(data.dateOfAdmission) <= new Date(data.dateOfJoining);
    }
    return true;
  },
  {
    message: "Date of joining must be on or after date of admission",
    path: ["dateOfJoining"],
  }
);

export type StudentFormValues = z.infer<typeof enhancedStudentSchema>;

interface EnhancedStudentFormProps {
  initialData?: Partial<StudentFormValues>;
  isEditing?: boolean;
}

export function EnhancedStudentForm({ initialData, isEditing = false }: EnhancedStudentFormProps) {
  const router = useRouter();
  const { branch } = useGlobalBranchFilter();
  const { currentSessionId, isLoading: isSessionLoading } = useAcademicSessionContext();
  const [activeTab, setActiveTab] = useState("student-info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Create form methods
  const methods = useForm<StudentFormValues>({
    resolver: zodResolver(enhancedStudentSchema),
    defaultValues: {
      admissionNumber: initialData?.admissionNumber || "",
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      classId: initialData?.classId || "",
      dateOfBirth: initialData?.dateOfBirth || "",
      dateOfAdmission: initialData?.dateOfAdmission || new Date().toISOString().split('T')[0],
      dateOfJoining: initialData?.dateOfJoining || new Date().toISOString().split('T')[0],
      bloodGroup: initialData?.bloodGroup || "",
      gender: initialData?.gender || "Male",
      otherGender: initialData?.otherGender || "",
      schoolEmail: initialData?.schoolEmail || "",
      personalEmail: initialData?.personalEmail || "",
      phone: initialData?.phone || "",
      caste: initialData?.caste || "",
      religion: initialData?.religion || "",
      nationality: initialData?.nationality || "Indian",
      aadharNumber: initialData?.aadharNumber || "",
      udiseId: initialData?.udiseId || "",
      cbse10RollNumber: initialData?.cbse10RollNumber || "",
      cbse12RollNumber: initialData?.cbse12RollNumber || "",
      username: initialData?.username || "",
      password: initialData?.password || "",
      subjects: initialData?.subjects || [],

      permanentAddress: initialData?.permanentAddress || "",
      permanentCity: initialData?.permanentCity || "",
      permanentState: initialData?.permanentState || "",
      permanentCountry: initialData?.permanentCountry || "India",
      permanentZipCode: initialData?.permanentZipCode || "",
      sameAsPermAddress: initialData?.sameAsPermAddress || false,
      correspondenceAddress: initialData?.correspondenceAddress || "",
      correspondenceCity: initialData?.correspondenceCity || "",
      correspondenceState: initialData?.correspondenceState || "",
      correspondenceCountry: initialData?.correspondenceCountry || "India",
      correspondenceZipCode: initialData?.correspondenceZipCode || "",

      fatherName: initialData?.fatherName || "",
      fatherDob: initialData?.fatherDob || "",
      motherName: initialData?.motherName || "",
      motherDob: initialData?.motherDob || "",
      guardianName: initialData?.guardianName || "",
      guardianDob: initialData?.guardianDob || "",
      parentAnniversary: initialData?.parentAnniversary || "",
      fatherEducation: initialData?.fatherEducation || "",
      motherEducation: initialData?.motherEducation || "",
      guardianEducation: initialData?.guardianEducation || "",
      fatherOccupation: initialData?.fatherOccupation || "",
      motherOccupation: initialData?.motherOccupation || "",
      guardianOccupation: initialData?.guardianOccupation || "",
      fatherMobile: initialData?.fatherMobile || "",
      motherMobile: initialData?.motherMobile || "",
      guardianMobile: initialData?.guardianMobile || "",
      fatherEmail: initialData?.fatherEmail || "",
      motherEmail: initialData?.motherEmail || "",
      guardianEmail: initialData?.guardianEmail || "",
      fatherAadharNumber: initialData?.fatherAadharNumber || "",
      motherAadharNumber: initialData?.motherAadharNumber || "",
      guardianAadharNumber: initialData?.guardianAadharNumber || "",
      monthlyIncome: initialData?.monthlyIncome || "",
      parentUsername: initialData?.parentUsername || "",
      parentPassword: initialData?.parentPassword || "",

      previousSchool: initialData?.previousSchool || "",
      lastClassAttended: initialData?.lastClassAttended || "",
      mediumOfInstruction: initialData?.mediumOfInstruction || "",
      recognisedByStateBoard: initialData?.recognisedByStateBoard || false,
      schoolState: initialData?.schoolState || "",
      reasonForLeaving: initialData?.reasonForLeaving || "",

      siblingAdmissionNumber: initialData?.siblingAdmissionNumber || "",
    },
  });

  // Get branches - superadmins see all, others see only their assigned branches
  const { isSuperAdmin } = usePermissions();
  const allBranchesQuery = api.branch.getAll.useQuery(undefined, {
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isSuperAdmin,
  });
  const userBranchesQuery = api.branch.getUserBranches.useQuery(undefined, {
    gcTime: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isSuperAdmin,
  });
  
  const { data: branches, isLoading: branchesLoading } = isSuperAdmin 
    ? allBranchesQuery 
    : userBranchesQuery;

  // Get sections with optimized caching
  const { data: sections } = api.section.getSectionsForImport.useQuery(
    { 
      branchId: branch?.id,
      sessionId: currentSessionId || undefined,
    },
    { 
      enabled: !!branch?.id && !!currentSessionId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Get next admission number with faster updates and caching
  const { data: nextAdmissionData, isLoading: isLoadingAdmissionNumber } = api.student.getNextAdmissionNumber.useQuery(
    { branchId: branch?.id || "" },
    { 
      enabled: !!branch?.id && !isEditing,
      gcTime: 2 * 60 * 1000, // 2 minutes
      staleTime: 30 * 1000, // 30 seconds
    }
  );

  // Debug logging
  useEffect(() => {
    console.log("Admission number data:", {
      nextAdmissionData,
      isLoadingAdmissionNumber,
      branchId: branch?.id,
      isEditing,
      currentAdmissionNumber: methods.getValues("admissionNumber")
    });
  }, [nextAdmissionData, isLoadingAdmissionNumber, branch?.id, isEditing, methods]);

  // Generate school email based on admission number and branch
  const generateSchoolEmail = (admissionNumber: string, branchId: string): string => {
    if (!branches || !admissionNumber) return "";

    const branch = branches.find((b: { id: string; code: string; name: string }) => b.id === branchId);
    if (!branch) return "";

    let domain = "";
    if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
      domain = "@ps.tsh.edu.in";
    } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
      domain = "@jun.tsh.edu.in";
    } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
      domain = "@majra.tsh.edu.in";
    } else {
      domain = "@tsh.edu.in";
    }

    return `${admissionNumber}${domain}`;
  };

  // Generate default password based on branch
  const generateDefaultPassword = (branchId: string): string => {
    if (!branches) return "";

    const branch = branches.find((b: { id: string; code: string; name: string }) => b.id === branchId);
    if (!branch) return "";

    if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
      return "TSHPS@12345";
    } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
      return "TSHJ@12345";
    } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
      return "TSHM@12345";
    } else {
      return "TSH@12345";
    }
  };

  // Watch admission number for parent credentials update
  const watchedAdmissionNumber = methods.watch("admissionNumber");

  // Effect to set admission number, school email, and password when branch changes (initial setup)
  useEffect(() => {
    if (!isEditing && branch?.id && nextAdmissionData?.nextAdmissionNumber) {
      console.log("Setting admission number:", nextAdmissionData.nextAdmissionNumber);
      const admissionNumber = nextAdmissionData.nextAdmissionNumber;
      methods.setValue("admissionNumber", admissionNumber);

      const schoolEmail = generateSchoolEmail(admissionNumber, branch.id);
      methods.setValue("schoolEmail", schoolEmail);
      methods.setValue("username", schoolEmail);

      const password = generateDefaultPassword(branch.id);
      methods.setValue("password", password);

      // Also set parent username
      methods.setValue("parentUsername", `P${admissionNumber}`);
      methods.setValue("parentPassword", password);
    }
  }, [branch?.id, isEditing, methods, nextAdmissionData]);

  // Effect to update parent username/password when admission number changes
  useEffect(() => {
    if (watchedAdmissionNumber && branch?.id) {
      const password = generateDefaultPassword(branch.id);
      methods.setValue("parentUsername", `P${watchedAdmissionNumber}`);
      methods.setValue("parentPassword", password);
    }
  }, [watchedAdmissionNumber, branch?.id, methods]);

  // API mutations for create and update
  const utils = api.useContext();
  const createStudent = api.student.create.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
      void utils.class.getAll.invalidate();

      // Show success toast and redirect
      toast({
        title: "Student created",
        description: "Student has been successfully created.",
      });
      router.push("/students");
    },
    onError: (error) => {
      // Enhanced error logging
      console.error("Error creating student (detailed):", error.message);
      console.error("Error data:", error.data);
      // Log the full error as string for debugging
      try {
        console.error("Full error:", JSON.stringify(error));
      } catch (e) {
        console.error("Could not stringify error");
      }

      // Parse error message for better user experience
      let errorDescription = error.message || "Failed to save student. Please check the form and try again.";

      if (error.message.includes("Failed to create student")) {
        errorDescription = "Failed to create student. This could be due to a server issue or validation errors. Please check your data and try again.";

        // Add instructions to check console for developers
        console.warn("DEVELOPER NOTE: Please check server logs for more details on what caused this error.");
      }

      toast({
        title: "Error",
        description: errorDescription,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Update student mutation
  const updateStudent = api.student.update.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries
      void utils.student.getAll.invalidate();
      void utils.student.getStats.invalidate();
      void utils.class.getAll.invalidate();
      void utils.student.getById.invalidate();

      // Show success toast and redirect
      toast({
        title: "Student updated",
        description: "Student has been successfully updated.",
      });
      router.push("/students");
    },
    onError: (error) => {
      console.error("Error updating student:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update student. Please check the form and try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: StudentFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && initialData && 'id' in initialData) {
        // Handle update logic
        const student = initialData as { id: string; parentId?: string };

        // Update student record with all fields
        await updateStudent.mutateAsync({
          id: student.id,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          phone: data.phone || "",
          email: data.schoolEmail ? data.schoolEmail.trim() || null : null,
          personalEmail: data.personalEmail ? data.personalEmail.trim() || null : null,
          bloodGroup: data.bloodGroup || "",
          religion: data.religion || "",
          nationality: data.nationality || "",
          caste: data.caste || "",
          aadharNumber: data.aadharNumber || "",
          udiseId: data.udiseId || "",
          cbse10RollNumber: data.cbse10RollNumber || "",
          cbse12RollNumber: data.cbse12RollNumber || "",
          dateOfAdmission: data.dateOfAdmission || undefined,
          sectionId: data.classId, // Add the missing sectionId field
          // Address fields
          permanentAddress: data.permanentAddress || "",
          permanentCity: data.permanentCity || "",
          permanentState: data.permanentState || "",
          permanentCountry: data.permanentCountry || "",
          permanentZipCode: data.permanentZipCode || "",
          correspondenceAddress: data.sameAsPermAddress ? data.permanentAddress || "" : data.correspondenceAddress || "",
          correspondenceCity: data.sameAsPermAddress ? data.permanentCity || "" : data.correspondenceCity || "",
          correspondenceState: data.sameAsPermAddress ? data.permanentState || "" : data.correspondenceState || "",
          correspondenceCountry: data.sameAsPermAddress ? data.permanentCountry || "" : data.correspondenceCountry || "",
          correspondenceZipCode: data.sameAsPermAddress ? data.permanentZipCode || "" : data.correspondenceZipCode || "",
          // Previous school information (supported fields only)
          previousSchool: data.previousSchool || "",
          lastClassAttended: data.lastClassAttended || "",
          mediumOfInstruction: data.mediumOfInstruction || "",
          recognisedByStateBoard: data.recognisedByStateBoard || false,
        });
      } else {
        if (!branch?.id) {
          throw new Error("Branch ID is required");
        }
        if (!currentSessionId) {
          toast({ title: "Session Error", description: "Academic session is not selected or loading. Please select an academic session.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }

        // Ensure admission number follows branch pattern
        let admissionNumber = data.admissionNumber;

        if (branch) {
          // Check if admission number follows branch pattern
          let shouldHavePrefix = "";
          if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
            shouldHavePrefix = "1000";
          } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
            shouldHavePrefix = "2000";
          } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
            shouldHavePrefix = "3000";
          }

          // If admission number doesn't start with the correct prefix, regenerate it
          if (shouldHavePrefix && !admissionNumber.startsWith(shouldHavePrefix)) {
            admissionNumber = nextAdmissionData?.nextAdmissionNumber || "";
          }
        }

        // Create student record with all fields
        // console.log("Submitting student data:", {
        //   admissionNumber,
        //   firstName: data.firstName,
        //   lastName: data.lastName,
        //   dateOfBirth: data.dateOfBirth,
        //   gender: data.gender,
        //   // Log other important fields
        //   branchId: branch.id,
        //   classId: data.classId,
        //   academicSessionId: currentSessionId,
        // });

        try {
          await createStudent.mutateAsync({
            admissionNumber: data.admissionNumber.trim(),
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            gender: data.gender,
            dateOfBirth: new Date(data.dateOfBirth),
            dateOfAdmission: new Date(data.dateOfAdmission),
            branchId: branch?.id || "",
            sectionId: data.classId,
            email: data.schoolEmail ? data.schoolEmail.trim() || null : null,
            personalEmail: data.personalEmail ? data.personalEmail.trim() || null : null,
            phone: data.phone || "",
            address: data.permanentAddress || "",
            username: data.username || undefined,
            password: data.password || undefined,
            // Parent authentication
            parentUsername: data.parentUsername || undefined,
            parentPassword: data.parentPassword || undefined,
            // Parent information
            fatherName: data.fatherName || undefined,
            fatherDob: data.fatherDob ? new Date(data.fatherDob) : undefined,
            fatherOccupation: data.fatherOccupation || undefined,
            fatherMobile: data.fatherMobile || undefined,
            fatherEmail: data.fatherEmail || undefined,
            fatherAadharNumber: data.fatherAadharNumber || undefined,
            motherName: data.motherName || undefined,
            motherDob: data.motherDob ? new Date(data.motherDob) : undefined,
            motherOccupation: data.motherOccupation || undefined,
            motherMobile: data.motherMobile || undefined,
            motherEmail: data.motherEmail || undefined,
            motherAadharNumber: data.motherAadharNumber || undefined,
            guardianName: data.guardianName || undefined,
            guardianDob: data.guardianDob ? new Date(data.guardianDob) : undefined,
            guardianOccupation: data.guardianOccupation || undefined,
            guardianMobile: data.guardianMobile || undefined,
            guardianEmail: data.guardianEmail || undefined,
            guardianAadharNumber: data.guardianAadharNumber || undefined,
            // Additional student data
            religion: data.religion || undefined,
            nationality: data.nationality || undefined,
            caste: data.caste || undefined,
            aadharNumber: data.aadharNumber || undefined,
            udiseId: data.udiseId || "",
            cbse10RollNumber: data.cbse10RollNumber || "",
            cbse12RollNumber: data.cbse12RollNumber || "",
          });
          // console.log("Student created successfully");
        } catch (studentError) {
          console.error("Detailed student creation error:", studentError);
          throw studentError;
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);

      // Parse error message to provide user-friendly feedback
      let errorMessage = "Failed to save student. Please check the form and try again.";

      if (error instanceof Error) {
        const errorString = error.message;
        console.error("Full error message:", errorString);

        // Email validation errors
        if (errorString.includes("email") && (
            errorString.includes("fatherEmail") ||
            errorString.includes("motherEmail") ||
            errorString.includes("guardianEmail") ||
            errorString.includes("personalEmail") ||
            errorString.includes("schoolEmail")
          )) {
          errorMessage = "Please check your email addresses. All email fields must either contain valid email addresses (like name@example.com) or be left completely empty.";
        }
        // Required field errors
        else if (errorString.includes("required")) {
          if (errorString.includes("admissionNumber")) {
            errorMessage = "Admission number is required. Please enter a valid admission number.";
          } else if (errorString.includes("firstName")) {
            errorMessage = "First name is required. Please enter the student's first name.";
          } else if (errorString.includes("lastName")) {
            errorMessage = "Last name is required. Please enter the student's last name.";
          } else if (errorString.includes("classId")) {
            errorMessage = "Class selection is required. Please select a class for the student.";
          } else if (errorString.includes("dateOfBirth")) {
            errorMessage = "Date of birth is required. Please enter the student's date of birth.";
          } else if (errorString.includes("dateOfAdmission")) {
            errorMessage = "Date of admission is required. Please enter when the student was admitted.";
          } else if (errorString.includes("dateOfJoining")) {
            errorMessage = "Date of joining is required. Please enter when the student joined.";
          } else {
            errorMessage = "Some required fields are missing. Please fill in all required fields.";
          }
        }
        // Date validation errors
        else if (errorString.includes("Date of admission must be after date of birth")) {
          errorMessage = "The admission date must be after the student's date of birth. Please correct the dates.";
        }
        else if (errorString.includes("Date of joining must be on or after date of admission")) {
          errorMessage = "The joining date must be on or after the admission date. Please correct the dates.";
        }
        // Duplicate student errors
        else if (errorString.includes("Admission number already exists")) {
          errorMessage = "This admission number is already in use by another student. Please use a different admission number.";
        }
        // General create student error
        else if (errorString.includes("Failed to create student")) {
          errorMessage = "There was a problem creating the student record. This may be due to:";
          errorMessage += "\n• Missing or invalid data in the form";
          errorMessage += "\n• Server connection issues";
          errorMessage += "\n• Insufficient permissions";
          errorMessage += "\nPlease check your entries and try again, or contact support if the problem persists.";
        }
        // Unprocessable Entity error
        else if (errorString.includes("Unprocessable Entity") ||
                errorString.includes("UNPROCESSABLE_CONTENT") ||
                errorString.includes("invalid data format")) {
          errorMessage = "The system couldn't process your form submission due to format issues. Please check:";
          errorMessage += "\n• Ensure all dates are valid (like MM/DD/YYYY)";
          errorMessage += "\n• Ensure email addresses are properly formatted or completely empty";
          errorMessage += "\n• Remove any special characters from text fields";
          errorMessage += "\n• Ensure no fields exceed maximum length limits";
        }
        // Branch errors
        else if (errorString.includes("Branch ID is required")) {
          errorMessage = "Please select a branch before creating a student.";
        }
        // Server or permission errors
        else if (errorString.includes("UNAUTHORIZED") || errorString.includes("unauthorized")) {
          errorMessage = "You don't have permission to perform this action. Please contact an administrator.";
        }
        else if (errorString.includes("TIMEOUT") || errorString.includes("timeout")) {
          errorMessage = "The request timed out. Please check your internet connection and try again.";
        }
        else if (errorString.includes("NOT_FOUND") || errorString.includes("not found")) {
          errorMessage = "The requested resource was not found. This may be due to recent changes.";
        }
        else {
          // Use the error message directly for other types of errors
          errorMessage = errorString;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Function to navigate between tabs
  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Function to go to next tab
  const goToNextTab = () => {
    if (activeTab === "student-info") setActiveTab("address");
    else if (activeTab === "address") setActiveTab("parent-info");
    else if (activeTab === "parent-info") setActiveTab("other-info");
    else if (activeTab === "other-info") setActiveTab("sibling-details");
  };

  // Function to go to previous tab
  const goToPrevTab = () => {
    if (activeTab === "sibling-details") setActiveTab("other-info");
    else if (activeTab === "other-info") setActiveTab("parent-info");
    else if (activeTab === "parent-info") setActiveTab("address");
    else if (activeTab === "address") setActiveTab("student-info");
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="w-full">
        <Tabs value={activeTab} onValueChange={navigateToTab} className="w-full">
          {/* Modern Tab Navigation */}
          <div className="border-b bg-background">
            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {[
                  { id: "student-info", label: "Personal Info", icon: "👤" },
                  { id: "address", label: "Address", icon: "🏠" },
                  { id: "parent-info", label: "Family", icon: "👥" },
                  { id: "other-info", label: "Academic", icon: "🎓" },
                  { id: "sibling-details", label: "Siblings", icon: "👫" }
                ].map((tab, index) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => navigateToTab(tab.id)}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2
                      ${activeTab === tab.id 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <TabsContent value="student-info" className="mt-0 space-y-6">
              <StudentInfoTab
                branch={branch}
                sections={sections || []}
                generateSchoolEmail={generateSchoolEmail}
              />
            </TabsContent>

            <TabsContent value="address" className="mt-0 space-y-6">
              <AddressTab />
            </TabsContent>

            <TabsContent value="parent-info" className="mt-0 space-y-6">
              <ParentInfoTab />
            </TabsContent>

            <TabsContent value="other-info" className="mt-0 space-y-6">
              <OtherInfoTab />
            </TabsContent>

            <TabsContent value="sibling-details" className="mt-0 space-y-6">
              <SiblingDetailsTab />
            </TabsContent>
          </div>

          {/* Navigation Footer */}
          <div className="border-t bg-muted/30 px-6 py-4">
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevTab}
                disabled={activeTab === "student-info"}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Step {["student-info", "address", "parent-info", "other-info", "sibling-details"].indexOf(activeTab) + 1} of 5
                </span>
              </div>

              {activeTab === "sibling-details" ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || isSessionLoading}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>{isEditing ? "Update Student" : "Add Student"}</span>
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goToNextTab}
                  className="flex items-center gap-2"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </form>
    </FormProvider>
  );
}
