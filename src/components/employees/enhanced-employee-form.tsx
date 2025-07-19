"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  employeeFormSchema, 
  type EmployeeFormValues,
  convertFormToApiInput,
  convertApiToFormValues
} from "@/server/api/employee-types";

import { PersonalInfoTab } from "./form-tabs/personal-info-tab";
import { ContactInfoTab } from "./form-tabs/contact-info-tab";
import { QualificationsTab } from "./form-tabs/qualifications-tab";
import { EmploymentTab } from "./form-tabs/employment-tab";
import { AccountInfoTab } from "./form-tabs/account-info-tab";

// Props for the component including optional initial data
interface EnhancedEmployeeFormProps {
  initialData?: any; // Using any to avoid type issues with date fields
  isEdit?: boolean;
}

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

export function EnhancedEmployeeForm({ initialData, isEdit = false }: EnhancedEmployeeFormProps) {
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
  const goToNextTab = async () => {
    if (!isLastTab) {
      // Trigger validation for current tab before moving to next
      const isValid = await methods.trigger();
      if (isValid || !formState.isDirty) {
        const nextTab = tabOrder[currentTabIndex + 1]!;
        setActiveTab(nextTab);
      } else {
        // Show toast with validation errors
        toast({
          title: "Please fix errors before continuing",
          description: "Complete all required fields on this tab",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };

  const goToPreviousTab = () => {
    if (!isFirstTab) {
      // This is safe because we've checked that we're not at the first tab
      const prevTab = tabOrder[currentTabIndex - 1]!;
      setActiveTab(prevTab);
    }
  };

  // Get utils for query invalidation
  const utils = api.useContext();

  // Create or update mutation
  const createMutation = api.employee.create.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh the list
      void utils.employee.getAll.invalidate();
      void utils.employee.getStats.invalidate();
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      router.push('/staff/employees');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const updateMutation = api.employee.update.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh the list
      void utils.employee.getAll.invalidate();
      void utils.employee.getStats.invalidate();
      void utils.employee.getById.invalidate();
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      router.push('/staff/employees');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  // Get all branches for the dropdown
  // Get branches - superadmins see all, others see only their assigned branches
  const { isSuperAdmin } = usePermissions();
  const { data: branches = [] } = isSuperAdmin 
    ? api.branch.getAll.useQuery()
    : api.branch.getUserBranches.useQuery();

  // Prepare initial data
  const formattedInitialData = initialData ? convertApiToFormValues(initialData) : undefined;

  // Form setup
  const methods = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema) as any, // Type assertion needed due to complex schema
    defaultValues: formattedInitialData || {
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
      
      designation: "",
      department: "",
      employeeCode: "",
      joinDate: new Date().toISOString().split("T")[0],
      reportingManager: "",
      employeeType: "",
      branch: "",
      previousExperience: "",
      previousEmployer: "",
      confirmationDate: "",
      isActive: true,
      
      branchAccess: currentBranchId ? [currentBranchId] : [],
      
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
      
      email: "",
      password: "",
      roleId: "",
    },
  });

  // Handle form submission
  const onSubmit: SubmitHandler<EmployeeFormValues> = (data) => {
    setIsSubmitting(true);
    
    const apiInput = convertFormToApiInput(data);
    
    if (isEdit && initialData?.id) {
      // Update existing employee
      updateMutation.mutate({
        id: initialData.id,
        ...apiInput,
      });
    } else {
      // Create new employee
      createMutation.mutate({
        ...apiInput,
      });
    }
  };

  // Handle form validation errors
  const onInvalid = (errors: any) => {
    console.log('Form validation errors:', errors);
    
    // Count errors and get first error message
    const errorCount = Object.keys(errors).length;
    const firstError = Object.values(errors)[0] as any;
    const errorMessage = firstError?.message || 'Please fill in all required fields';
    
    // Show toast with validation errors
    toast({
      title: `Please fix ${errorCount} error${errorCount > 1 ? 's' : ''}`,
      description: errorMessage,
      variant: "destructive",
      duration: 5000,
    });

    // Navigate to the tab containing the first error
    const errorFields = Object.keys(errors);
    const personalInfoFields = ['firstName', 'lastName'];
    const contactInfoFields = ['phone', 'address', 'personalEmail'];
    const qualificationFields = ['qualification', 'specialization'];
    const employmentFields = ['designation', 'branchAccess'];
    const accountFields = ['email', 'password', 'roleId'];

    if (errorFields.some(field => personalInfoFields.includes(field))) {
      setActiveTab('personal-info');
    } else if (errorFields.some(field => contactInfoFields.includes(field))) {
      setActiveTab('contact-info');
    } else if (errorFields.some(field => qualificationFields.includes(field))) {
      setActiveTab('qualifications');
    } else if (errorFields.some(field => employmentFields.includes(field))) {
      setActiveTab('employment');
    } else if (errorFields.some(field => accountFields.includes(field))) {
      setActiveTab('account-info');
    }
  };

  // Get form state for error display
  const formState = methods.formState;
  const hasErrors = Object.keys(formState.errors).length > 0;
  
  // Watch form values to provide better validation feedback
  const watchedValues = methods.watch();

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
        {/* Validation Error Summary */}
        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the following errors before submitting:
              <ul className="mt-2 list-disc list-inside">
                {Object.entries(formState.errors).map(([field, error]) => (
                  <li key={field} className="text-sm">
                    <strong>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> {(error as any)?.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
          <TabsList className="w-full flex justify-center">
            <TabsTrigger value="personal-info" className="flex-1">Personal Info</TabsTrigger>
            <TabsTrigger value="contact-info" className="flex-1">Contact Info</TabsTrigger>
            <TabsTrigger value="qualifications" className="flex-1">Qualifications</TabsTrigger>
            <TabsTrigger value="employment" className="flex-1">Employment</TabsTrigger>
            <TabsTrigger value="account-info" className="flex-1">Account</TabsTrigger>
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
              <AccountInfoTab isEdit={isEdit} />
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
              onClick={() => router.push("/staff/employees")}
            >
              Cancel
            </Button>
            
            {isLastTab ? (
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className={hasErrors ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasErrors && !isSubmitting && <AlertCircle className="mr-2 h-4 w-4" />}
                {hasErrors ? "Fix Errors & Submit" : (isEdit ? "Save Changes" : "Create Employee")}
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