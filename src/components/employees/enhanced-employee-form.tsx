"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/hooks/useBranchContext";
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
  const goToNextTab = () => {
    if (!isLastTab) {
      // This is safe because we've checked that we're not at the last tab
      const nextTab = tabOrder[currentTabIndex + 1]!;
      setActiveTab(nextTab);
    }
  };

  const goToPreviousTab = () => {
    if (!isFirstTab) {
      // This is safe because we've checked that we're not at the first tab
      const prevTab = tabOrder[currentTabIndex - 1]!;
      setActiveTab(prevTab);
    }
  };

  // Create or update mutation
  const createMutation = api.employee.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      router.push('/employees');
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
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      router.push('/employees');
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
  const { data: branches = [] } = api.branch.getAll.useQuery();

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
      
      createUser: false,
      email: "",
      password: "",
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
              onClick={() => router.push("/employees")}
            >
              Cancel
            </Button>
            
            {isLastTab ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Employee"}
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