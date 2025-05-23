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
import { useToast } from "@/components/ui/use-toast";
import { StudentInfoTab } from "./form-tabs/student-info-tab";
import { AddressTab } from "./form-tabs/address-tab";
import { ParentInfoTab } from "./form-tabs/parent-info-tab";
import { OtherInfoTab } from "./form-tabs/other-info-tab";
import { SiblingDetailsTab } from "./form-tabs/sibling-details-tab";

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
  const [activeTab, setActiveTab] = useState("student-info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Create form methods
  const methods = useForm<StudentFormValues>({
    resolver: zodResolver(enhancedStudentSchema),
    defaultValues: initialData || {
      admissionNumber: "",
      firstName: "",
      lastName: "",
      classId: "",
      dateOfBirth: "",
      dateOfAdmission: new Date().toISOString().split('T')[0],
      dateOfJoining: new Date().toISOString().split('T')[0],
      bloodGroup: "",
      gender: "Male",
      otherGender: "",
      schoolEmail: "",
      personalEmail: "",
      phone: "",
      caste: "",
      religion: "",
      nationality: "Indian",
      aadharNumber: "",
      udiseId: "",
      cbse10RollNumber: "",
      cbse12RollNumber: "",
      username: "",
      password: "",
      subjects: [],

      permanentAddress: "",
      permanentCity: "",
      permanentState: "",
      permanentCountry: "India",
      permanentZipCode: "",
      sameAsPermAddress: false,
      correspondenceAddress: "",
      correspondenceCity: "",
      correspondenceState: "",
      correspondenceCountry: "India",
      correspondenceZipCode: "",

      fatherName: "",
      fatherDob: "",
      motherName: "",
      motherDob: "",
      guardianName: "",
      guardianDob: "",
      parentAnniversary: "",
      fatherEducation: "",
      motherEducation: "",
      guardianEducation: "",
      fatherOccupation: "",
      motherOccupation: "",
      guardianOccupation: "",
      fatherMobile: "",
      motherMobile: "",
      guardianMobile: "",
      fatherEmail: "",
      motherEmail: "",
      guardianEmail: "",
      monthlyIncome: "",
      parentUsername: "",
      parentPassword: "",

      previousSchool: "",
      lastClassAttended: "",
      mediumOfInstruction: "",
      recognisedByStateBoard: false,
      schoolCity: "",
      schoolState: "",
      reasonForLeaving: "",

      siblingAdmissionNumber: "",
    },
  });

  // Get branches for branch code validation
  const { data: branches } = api.branch.getAll.useQuery();
  const { data: classes } = api.class.getAll.useQuery({ branchId: branch?.id });

  // Function to generate admission number based on branch
  const generateAdmissionNumber = (branchId: string): string => {
    if (!branches) return "";

    const branch = branches.find((b: { id: string; code: string; name: string }) => b.id === branchId);
    if (!branch) return "";

    // Generate prefix based on branch code
    let prefix = "";
    if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
      prefix = "1000";
    } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
      prefix = "2000";
    } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
      prefix = "3000";
    } else {
      // Default prefix if branch doesn't match
      prefix = "4000";
    }

    // Get current year's last two digits
    const year = new Date().getFullYear().toString().slice(2);

    // Generate a random 3-digit number for uniqueness
    const random = Math.floor(Math.random() * 900) + 100;

    return `${prefix}${year}${random}`;
  };

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

  // Effect to set admission number, school email, and password when branch changes
  useEffect(() => {
    if (!isEditing && branch?.id && !methods.getValues("admissionNumber")) {
      const admissionNumber = generateAdmissionNumber(branch.id);
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
  }, [branch?.id, isEditing, methods]);

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

  // Create parent mutation
  const createParent = api.parent.create.useMutation();

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

        // Create or update parent record if parent information is provided
        let parentId = student.parentId;
        if (data.fatherName || data.motherName || data.guardianName) {
          try {
            const parentData = await createParent.mutateAsync({
              // Father information
              fatherName: data.fatherName,
              fatherDob: data.fatherDob,
              fatherEducation: data.fatherEducation,
              fatherOccupation: data.fatherOccupation,
              fatherMobile: data.fatherMobile,
              fatherEmail: data.fatherEmail || null,
              // Mother information
              motherName: data.motherName,
              motherDob: data.motherDob,
              motherEducation: data.motherEducation,
              motherOccupation: data.motherOccupation,
              motherMobile: data.motherMobile,
              motherEmail: data.motherEmail || null,
              // Guardian information
              guardianName: data.guardianName,
              guardianDob: data.guardianDob,
              guardianEducation: data.guardianEducation,
              guardianOccupation: data.guardianOccupation,
              guardianMobile: data.guardianMobile,
              guardianEmail: data.guardianEmail || null,
              // Additional information
              parentAnniversary: data.parentAnniversary,
              monthlyIncome: data.monthlyIncome,
            });
            parentId = parentData.id;
          } catch (error) {
            console.error("Error creating parent:", error);
            // Continue with student update even if parent creation fails
          }
        }

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
          classId: data.classId || undefined,
          parentId: parentId,
          dateOfAdmission: data.dateOfAdmission || undefined,
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
          // Previous school information
          previousSchool: data.previousSchool || "",
          lastClassAttended: data.lastClassAttended || "",
          mediumOfInstruction: data.mediumOfInstruction || "",
          recognisedByStateBoard: data.recognisedByStateBoard || false,
          schoolCity: data.schoolCity || "",
          schoolState: data.schoolState || "",
          reasonForLeaving: data.reasonForLeaving || "",
        });
      } else {
        if (!branch?.id) {
          throw new Error("Branch ID is required");
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
            admissionNumber = generateAdmissionNumber(branch.id);
          }
        }

        // Create parent record if parent information is provided
        let parentId = undefined;
        if (data.fatherName || data.motherName || data.guardianName) {
          try {
            const parentData = await createParent.mutateAsync({
              // Father information
              fatherName: data.fatherName,
              fatherDob: data.fatherDob,
              fatherEducation: data.fatherEducation,
              fatherOccupation: data.fatherOccupation,
              fatherMobile: data.fatherMobile,
              fatherEmail: data.fatherEmail || null,
              // Mother information
              motherName: data.motherName,
              motherDob: data.motherDob,
              motherEducation: data.motherEducation,
              motherOccupation: data.motherOccupation,
              motherMobile: data.motherMobile,
              motherEmail: data.motherEmail || null,
              // Guardian information
              guardianName: data.guardianName,
              guardianDob: data.guardianDob,
              guardianEducation: data.guardianEducation,
              guardianOccupation: data.guardianOccupation,
              guardianMobile: data.guardianMobile,
              guardianEmail: data.guardianEmail || null,
              // Additional information
              parentAnniversary: data.parentAnniversary,
              monthlyIncome: data.monthlyIncome,
            });
            parentId = parentData.id;
          } catch (error) {
            console.error("Error creating parent:", error);
            // Continue with student creation even if parent creation fails
          }
        }

        // Create student record with all fields
        console.log("Submitting student data:", {
          admissionNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          // Log other important fields
          branchId: branch.id,
          classId: data.classId,
        });

        try {
          await createStudent.mutateAsync({
            admissionNumber: data.admissionNumber.trim(),
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            gender: data.gender,
            dateOfBirth: new Date(data.dateOfBirth),
            dateOfAdmission: new Date(data.dateOfAdmission),
            branchId: branch?.id || "",
            classId: data.classId,
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
            motherName: data.motherName || undefined,
            motherDob: data.motherDob ? new Date(data.motherDob) : undefined,
            motherOccupation: data.motherOccupation || undefined,
            motherMobile: data.motherMobile || undefined,
            motherEmail: data.motherEmail || undefined,
            guardianName: data.guardianName || undefined,
            guardianDob: data.guardianDob ? new Date(data.guardianDob) : undefined,
            guardianOccupation: data.guardianOccupation || undefined,
            guardianMobile: data.guardianMobile || undefined,
            guardianEmail: data.guardianEmail || undefined,
            // Additional student data
            religion: data.religion || undefined,
            nationality: data.nationality || undefined,
            caste: data.caste || undefined,
            aadharNumber: data.aadharNumber || undefined,
            udiseId: data.udiseId || undefined,
            cbse10RollNumber: data.cbse10RollNumber || undefined,
            cbse12RollNumber: data.cbse12RollNumber || undefined,
          });
          console.log("Student created successfully");
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
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 pb-10">
        <Tabs value={activeTab} onValueChange={navigateToTab} className="w-full">
          <div className="bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="pt-5 pb-8 px-5">
                {/* Connected step indicator */}
                <div className="hidden md:flex items-center justify-between mb-4 px-12">
                  {["student-info", "address", "parent-info", "other-info", "sibling-details"].map((tab, index) => (
                    <React.Fragment key={tab}>
                      <div
                        className={`relative flex flex-col items-center`}
                      >
                        <button
                          type="button"
                          onClick={() => navigateToTab(tab)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full font-medium text-sm z-10 transition-all duration-300 cursor-pointer hover:scale-110 ${
                            activeTab === tab
                              ? "bg-[#A65A20] text-white"
                              : index < ["student-info", "address", "parent-info", "other-info", "sibling-details"].indexOf(activeTab)
                                ? "bg-[#00501B] text-white"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {index + 1}
                        </button>
                        <span className={`absolute -bottom-6 whitespace-nowrap text-xs transition-all duration-300 ${
                          activeTab === tab ? "text-[#A65A20] font-medium" :
                          index < ["student-info", "address", "parent-info", "other-info", "sibling-details"].indexOf(activeTab)
                            ? "text-[#00501B]"
                            : "text-gray-500"
                        }`}>
                          {tab === "student-info" && "Student"}
                          {tab === "address" && "Address"}
                          {tab === "parent-info" && "Parents"}
                          {tab === "other-info" && "School"}
                          {tab === "sibling-details" && "Siblings"}
                        </span>
                      </div>

                      {index < 4 && (
                        <div className="w-full h-0.5 flex-1 mx-2">
                          <div
                            className={`h-full transition-all duration-500 ${
                              activeTab === ["student-info", "address", "parent-info", "other-info", "sibling-details"][index]
                                ? "bg-[#A65A20]"
                                : index < ["student-info", "address", "parent-info", "other-info", "sibling-details"].indexOf(activeTab)
                                  ? "bg-[#00501B]"
                                  : "bg-gray-200"
                            }`}
                          ></div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Mobile-friendly tabs */}
                <TabsList className="md:hidden flex w-full justify-between bg-transparent p-0 mb-0 overflow-x-auto no-scrollbar">
                  <TabsTrigger
                    value="student-info"
                    className="px-3 py-2 rounded-full data-[state=active]:bg-[#A65A20] data-[state=active]:text-white text-xs"
                  >
                    Student
                  </TabsTrigger>

                  <TabsTrigger
                    value="address"
                    className="px-3 py-2 rounded-full data-[state=active]:bg-[#A65A20] data-[state=active]:text-white text-xs"
                  >
                    Address
                  </TabsTrigger>

                  <TabsTrigger
                    value="parent-info"
                    className="px-3 py-2 rounded-full data-[state=active]:bg-[#A65A20] data-[state=active]:text-white text-xs"
                  >
                    Parents
                  </TabsTrigger>

                  <TabsTrigger
                    value="other-info"
                    className="px-3 py-2 rounded-full data-[state=active]:bg-[#A65A20] data-[state=active]:text-white text-xs"
                  >
                    School
                  </TabsTrigger>

                  <TabsTrigger
                    value="sibling-details"
                    className="px-3 py-2 rounded-full data-[state=active]:bg-[#A65A20] data-[state=active]:text-white text-xs"
                  >
                    Siblings
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>

          <TabsContent value="student-info">
            <StudentInfoTab
              branch={branch}
              classes={classes || []}
              generateSchoolEmail={generateSchoolEmail}
            />
            <div className="mt-8 flex justify-end border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                onClick={goToNextTab}
                className="bg-gradient-to-r from-[#00501B] to-[#00501B] hover:from-[#00501B]/90 hover:to-[#00501B]/90 gap-2 relative overflow-hidden group text-white"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#A65A20]/0 via-[#A65A20]/30 to-[#A65A20]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-full group-hover:translate-x-full"></span>
                <span className="relative z-10 flex items-center gap-2">
                  Next: Address
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </span>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="address">
            <AddressTab />
            <div className="mt-8 flex justify-between border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevTab}
                className="border-[#A65A20] text-[#A65A20] hover:bg-[#A65A20]/10 gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                Previous: Student Information
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
                className="bg-gradient-to-r from-[#00501B] to-[#00501B] hover:from-[#00501B]/90 hover:to-[#00501B]/90 gap-2 relative overflow-hidden group text-white"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#A65A20]/0 via-[#A65A20]/30 to-[#A65A20]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-full group-hover:translate-x-full"></span>
                <span className="relative z-10 flex items-center gap-2">
                  Next: Parent's Information
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </span>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="parent-info">
            <ParentInfoTab />
            <div className="mt-8 flex justify-between border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevTab}
                className="border-[#A65A20] text-[#A65A20] hover:bg-[#A65A20]/10 gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                Previous: Address
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
                className="bg-gradient-to-r from-[#00501B] to-[#00501B] hover:from-[#00501B]/90 hover:to-[#00501B]/90 gap-2 relative overflow-hidden group text-white"
              >
                Next: Other Information
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="other-info">
            <OtherInfoTab />
            <div className="mt-8 flex justify-between border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevTab}
                className="border-[#A65A20] text-[#A65A20] hover:bg-[#A65A20]/10 gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                Previous: Parent's Information
              </Button>
              <Button
                type="button"
                onClick={goToNextTab}
                className="bg-gradient-to-r from-[#00501B] to-[#00501B] hover:from-[#00501B]/90 hover:to-[#00501B]/90 gap-2 relative overflow-hidden group text-white"
              >
                Next: Sibling Details
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="sibling-details">
            <SiblingDetailsTab />
            <div className="mt-8 flex justify-between border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevTab}
                className="border-[#A65A20] text-[#A65A20] hover:bg-[#A65A20]/10 gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                Previous: Other Information
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#00501B] to-[#00501B] hover:from-[#00501B]/90 hover:to-[#00501B]/90 gap-2 relative overflow-hidden group text-white"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    {isEditing ? "Update Student" : "Add New Student"}
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM10.1589 5.53774C10.3178 5.31191 10.2636 5.00001 10.0378 4.84109C9.81194 4.68217 9.50004 4.73642 9.34112 4.96225L6.51977 8.97154L5.35681 7.78706C5.16334 7.59002 4.84677 7.58711 4.64973 7.78058C4.45268 7.97404 4.44978 8.29061 4.64325 8.48765L6.22658 10.1003C6.33054 10.2062 6.47617 10.2604 6.62407 10.2483C6.77197 10.2363 6.90686 10.1591 6.99226 10.0377L10.1589 5.53774Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </FormProvider>
  );
}
