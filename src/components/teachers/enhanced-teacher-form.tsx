import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { PersonalInfoTab } from "./form-tabs/personal-info-tab";
// TODO: Create these components
// import { QualificationsTab } from "./form-tabs/qualifications-tab";
// import { AccountInfoTab } from "./form-tabs/account-info-tab";

// Define a schema for the teacher form
const teacherFormSchema = z.object({
  // Personal Info
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  employeeCode: z.string().optional(),
  joinDate: z.string().optional(),
  isActive: z.boolean(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  
  // Branch Information
  branchId: z.string().min(1, "Branch is required"),
  
  // Qualifications
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  bio: z.string().optional(),
  
  // Address
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  
  // User Account
  createUser: z.boolean(),
  email: z.string().email("Invalid email").optional()
    .refine(email => !email || email.length > 0, "Email is required when creating a user account"),
  password: z.string().optional()
    .refine(password => !password || password.length >= 8, "Password must be at least 8 characters"),
}).refine((data) => {
  // If createUser is true, email and password are required
  if (data.createUser) {
    return !!data.email && !!data.password;
  }
  return true;
}, {
  message: "Email and password are required when creating a user account",
  path: ["createUser"],
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

interface EnhancedTeacherFormProps {
  initialData?: Partial<TeacherFormValues>;
  isEditing?: boolean;
}

export function EnhancedTeacherForm({ initialData, isEditing = false }: EnhancedTeacherFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("personal-info");
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();

  // Fetch all branches for the branch selector
  const { data: branches = [] } = api.branch.getAll.useQuery();

  // Initialize form with default values
  const methods = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: initialData || {
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      gender: "Male",
      employeeCode: "",
      joinDate: new Date().toISOString().split("T")[0],
      isActive: true,
      phone: "",
      alternatePhone: "",
      personalEmail: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      
      branchId: currentBranchId || "",
      
      qualification: "",
      specialization: "",
      experience: "",
      certifications: [],
      subjects: [],
      bio: "",
      
      address: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      
      createUser: false,
      email: "",
      password: "",
    },
  });

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

  const onSubmit = (data: TeacherFormValues) => {
    setIsSubmitting(true);
    
    try {
      createTeacherMutation.mutate({
        firstName: data.firstName,
        lastName: data.lastName,
        employeeCode: data.employeeCode,
        qualification: data.qualification,
        specialization: data.specialization,
        joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
        isActive: data.isActive,
        branchId: data.branchId,
        email: data.createUser ? data.email : undefined,
        password: data.createUser ? data.password : undefined,
      });
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error in form submission:", error);
      toast({
        title: "Error creating teacher",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="personal-info" className="rounded-l-md">Personal Information</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="account-info" className="rounded-r-md">Account</TabsTrigger>
          </TabsList>

          <div className="mt-6 border rounded-md overflow-hidden">
            <TabsContent value="personal-info">
              <PersonalInfoTab branches={branches} />
            </TabsContent>

            <TabsContent value="qualifications">
              <div className="p-6">
                <h3 className="text-xl font-medium text-[#00501B]">Qualifications</h3>
                <p className="text-muted-foreground mt-2">This tab is under development.</p>
              </div>
            </TabsContent>

            <TabsContent value="account-info">
              <div className="p-6">
                <h3 className="text-xl font-medium text-[#00501B]">Account Information</h3>
                <p className="text-muted-foreground mt-2">This tab is under development.</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/teachers")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Teacher"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
} 