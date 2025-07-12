import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { PersonalInfoTab } from "./form-tabs/personal-info-tab";
import { ContactInfoTab } from "./form-tabs/contact-info-tab";
import { QualificationsTab } from "./form-tabs/qualifications-tab";
import { EmploymentTab } from "./form-tabs/employment-tab";
import { AccountInfoTab } from "./form-tabs/account-info-tab";

// Define a schema for the teacher form
const teacherFormSchema = z.object({
  // Personal Info
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  panNumber: z.string().optional(),
  aadharNumber: z.string().optional(),

  // Contact Information
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  permanentAddress: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentState: z.string().optional(),
  permanentCountry: z.string().optional(),
  permanentPincode: z.string().optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  
  // Educational Qualifications
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  professionalQualifications: z.string().optional(),
  specialCertifications: z.string().optional(),
  yearOfCompletion: z.string().optional(),
  institution: z.string().optional(),
  // certifications: File upload will be handled separately
  experience: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  bio: z.string().optional(),
  
  // Employment Details
  employeeCode: z.string().optional(),
  joinDate: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  reportingManager: z.string().optional(),
  employeeType: z.string().optional(),
  branch: z.string().optional(),
  previousExperience: z.string().optional(),
  previousEmployer: z.string().optional(),
  confirmationDate: z.string().optional(),
  isActive: z.boolean(),
  
  // Branch Information
  branchId: z.string().min(1, "Branch is required"),
  
  // Salary & Banking Details
  salaryStructure: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  
  // IT & Asset Allocation
  officialEmail: z.string().email("Invalid email").min(1, "Official email is required"),
  deviceIssued: z.string().optional(),
  accessCardId: z.string().optional(),
  softwareLicenses: z.string().optional(),
  assetReturnStatus: z.string().optional(),
  
  // User Account (always required for teachers)
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  roleId: z.string().min(1, "Role is required"),
}).refine((data) => {
  // Password is only required for new teachers, not for existing teachers being updated
  return true;
}, {
  message: "All fields are required",
  path: ["roleId"],
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

// Define tab order for navigation
const tabOrder = [
  "personal-info",
  "contact-info",
  "qualifications",
  "employment",
  "account-info"
] as const;

// Tab type
type TabType = typeof tabOrder[number];

interface EnhancedTeacherFormProps {
  initialData?: Partial<TeacherFormValues> & { id?: string };
  isEditing?: boolean;
}

export function EnhancedTeacherForm({ initialData, isEditing = false }: EnhancedTeacherFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("personal-info");
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();

  // Get current tab index
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabOrder.length - 1;

  // Tab navigation functions
  const goToNextTab = () => {
    if (!isLastTab) {
      const nextTab = tabOrder[currentTabIndex + 1]!;
      setActiveTab(nextTab);
    }
  };

  const goToPreviousTab = () => {
    if (!isFirstTab) {
      const prevTab = tabOrder[currentTabIndex - 1]!;
      setActiveTab(prevTab);
    }
  };

  // Fetch all branches for the branch selector
  // Get branches - superadmins see all, others see only their assigned branches
  const { isSuperAdmin } = usePermissions();
  const { data: branches = [] } = isSuperAdmin 
    ? api.branch.getAll.useQuery()
    : api.branch.getUserBranches.useQuery();

  // Dynamic schema based on editing mode
  const dynamicTeacherFormSchema = teacherFormSchema.refine((data) => {
    // For new teachers, password is required
    // For existing teachers, password is optional (only if they want to change it)
    if (!isEditing && (!data.password || data.password.length < 8)) {
      return false;
    }
    return true;
  }, {
    message: "Password is required for new teachers and must be at least 8 characters",
    path: ["password"],
  });

  // Initialize form with default values
  const methods = useForm<TeacherFormValues>({
    resolver: zodResolver(dynamicTeacherFormSchema),
    defaultValues: initialData || {
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      gender: "Male",
      bloodGroup: "",
      maritalStatus: "",
      nationality: "Indian",
      religion: "",
      panNumber: "",
      aadharNumber: "",
      
      address: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      permanentAddress: "",
      permanentCity: "",
      permanentState: "",
      permanentCountry: "India",
      permanentPincode: "",
      phone: "",
      alternatePhone: "",
      personalEmail: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      
      qualification: "",
      specialization: "",
      professionalQualifications: "",
      specialCertifications: "",
      yearOfCompletion: "",
      institution: "",
      experience: "",
      certifications: [],
      subjects: [],
      bio: "",
      
      branchId: currentBranchId || "",
      employeeCode: "",
      joinDate: "",
      designation: "Teacher",
      department: "",
      reportingManager: "",
      employeeType: "Permanent",
      branch: "",
      previousExperience: "",
      previousEmployer: "",
      confirmationDate: "",
      isActive: true,
      
      salaryStructure: "",
      pfNumber: "",
      esiNumber: "",
      uanNumber: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      
      officialEmail: "",
      deviceIssued: "",
      accessCardId: "",
      softwareLicenses: "",
      assetReturnStatus: "",
      
      password: "",
      roleId: "",
    },
  });

  // Reset form values when initialData changes (important for edit mode)
  useEffect(() => {
    if (initialData) {
      methods.reset(initialData);
      console.log("Resetting form with initial data:", initialData);
    }
  }, [initialData, methods]);

  const utils = api.useContext();
  const createTeacherMutation = api.teacher.create.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      
      setIsSubmitting(false);
      toast({
        title: "Teacher created",
        description: "Teacher has been successfully created.",
        variant: "default",
      });
      void router.push("/teachers");
    },
    onError: (error) => {
      console.error("Error creating teacher:", error);
      setIsSubmitting(false);
      toast({
        title: "Error creating teacher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTeacherMutation = api.teacher.update.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      void utils.teacher.getById.invalidate();
      
      setIsSubmitting(false);
      toast({
        title: "Teacher updated",
        description: "Teacher has been successfully updated.",
        variant: "default",
      });
      void router.push("/teachers");
    },
    onError: (error) => {
      console.error("Error updating teacher:", error);
      setIsSubmitting(false);
      toast({
        title: "Error updating teacher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeacherFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && initialData?.id) {
        // Update existing teacher
        updateTeacherMutation.mutate({
          id: initialData.id,
          // Basic Info
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          maritalStatus: data.maritalStatus,
          nationality: data.nationality,
          religion: data.religion,
          panNumber: data.panNumber,
          aadharNumber: data.aadharNumber,
          
          // Contact Info
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          pincode: data.pincode,
          permanentAddress: data.permanentAddress,
          permanentCity: data.permanentCity,
          permanentState: data.permanentState,
          permanentCountry: data.permanentCountry,
          permanentPincode: data.permanentPincode,
          phone: data.phone,
          alternatePhone: data.alternatePhone,
          personalEmail: data.personalEmail,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          
          // Educational Qualifications
          qualification: data.qualification,
          specialization: data.specialization,
          professionalQualifications: data.professionalQualifications,
          specialCertifications: data.specialCertifications,
          yearOfCompletion: data.yearOfCompletion,
          institution: data.institution,
          experience: data.experience,
          bio: data.bio,
          
          // Employment Details
          employeeCode: data.employeeCode,
          joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
          designation: data.designation,
          department: data.department,
          reportingManager: data.reportingManager,
          employeeType: data.employeeType,
          previousExperience: data.previousExperience,
          previousEmployer: data.previousEmployer,
          confirmationDate: data.confirmationDate,
          isActive: data.isActive,
          
          // Branch Information
          branchId: data.branchId,
          
          // Salary & Banking Details
          salaryStructure: data.salaryStructure,
          pfNumber: data.pfNumber,
          esiNumber: data.esiNumber,
          uanNumber: data.uanNumber,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          
          // IT & Asset Allocation
          officialEmail: data.officialEmail,
          deviceIssued: data.deviceIssued,
          accessCardId: data.accessCardId,
          softwareLicenses: data.softwareLicenses,
          assetReturnStatus: data.assetReturnStatus,
          
          // User-related fields
          roleId: data.roleId,
        });
      } else {
        // Create new teacher
        createTeacherMutation.mutate({
          // Basic Info
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          maritalStatus: data.maritalStatus,
          nationality: data.nationality,
          religion: data.religion,
          panNumber: data.panNumber,
          aadharNumber: data.aadharNumber,
          
          // Contact Info
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          pincode: data.pincode,
          permanentAddress: data.permanentAddress,
          permanentCity: data.permanentCity,
          permanentState: data.permanentState,
          permanentCountry: data.permanentCountry,
          permanentPincode: data.permanentPincode,
          phone: data.phone,
          alternatePhone: data.alternatePhone,
          personalEmail: data.personalEmail,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          
          // Educational Qualifications
          qualification: data.qualification,
          specialization: data.specialization,
          professionalQualifications: data.professionalQualifications,
          specialCertifications: data.specialCertifications,
          yearOfCompletion: data.yearOfCompletion,
          institution: data.institution,
          experience: data.experience,
          bio: data.bio,
          
          // Employment Details
          employeeCode: data.employeeCode,
          joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
          designation: data.designation,
          department: data.department,
          reportingManager: data.reportingManager,
          employeeType: data.employeeType,
          previousExperience: data.previousExperience,
          previousEmployer: data.previousEmployer,
          confirmationDate: data.confirmationDate,
          isActive: data.isActive,
          
          // Branch Information
          branchId: data.branchId,
          
          // Salary & Banking Details
          salaryStructure: data.salaryStructure,
          pfNumber: data.pfNumber,
          esiNumber: data.esiNumber,
          uanNumber: data.uanNumber,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          
          // IT & Asset Allocation
          officialEmail: data.officialEmail,
          deviceIssued: data.deviceIssued,
          accessCardId: data.accessCardId,
          softwareLicenses: data.softwareLicenses,
          assetReturnStatus: data.assetReturnStatus,
          
          // User Account
          createUser: true, // Always create user accounts for teachers
          email: data.officialEmail, // Use officialEmail for account creation
          password: data.password,
          roleId: data.roleId,
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error in form submission:", error);
      toast({
        title: isEditing ? "Error updating teacher" : "Error creating teacher",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="personal-info" className="rounded-l-md">Personal Info</TabsTrigger>
            <TabsTrigger value="contact-info">Contact Info</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="account-info" className="rounded-r-md">Account</TabsTrigger>
          </TabsList>

          <div className="mt-6 border rounded-md overflow-hidden">
            <TabsContent value="personal-info">
              <PersonalInfoTab branches={branches} />
            </TabsContent>

            <TabsContent value="contact-info">
              <ContactInfoTab />
            </TabsContent>

            <TabsContent value="qualifications">
              <QualificationsTab />
            </TabsContent>

            <TabsContent value="employment">
              <EmploymentTab />
            </TabsContent>

            <TabsContent value="account-info">
              <AccountInfoTab isEditing={isEditing} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between">
          <div>
            {!isFirstTab && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={goToPreviousTab}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/teachers")}
            >
              Cancel
            </Button>
            
            {isLastTab ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Teacher"}
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={goToNextTab}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
} 