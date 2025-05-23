import { z } from "zod";

// Define schema for the API
export const employeeApiSchema = z.object({
  // Personal Info
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  middleName: z.string().optional(),
  dateOfBirth: z.date().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
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
  personalEmail: z.string().optional(),
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
  experience: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  bio: z.string().optional(),
  
  // Employment Details
  employeeCode: z.string().optional(),
  designation: z.string(),
  department: z.string().optional(),
  joinDate: z.date().optional(),
  reportingManager: z.string().optional(),
  employeeType: z.string().optional(),
  branch: z.string().optional(),
  previousExperience: z.string().optional(),
  previousEmployer: z.string().optional(),
  confirmationDate: z.date().optional(),
  branchAccess: z.array(z.string()).min(1, "At least one branch must be selected"),
  isActive: z.boolean().default(true),
  
  // Salary & Banking Details
  salaryStructure: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  
  // IT & Asset Allocation
  officialEmail: z.string().optional(),
  deviceIssued: z.string().optional(),
  accessCardId: z.string().optional(),
  softwareLicenses: z.string().optional(),
  assetReturnStatus: z.string().optional(),
  
  // User Account
  createUser: z.boolean().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  roleId: z.string().optional(),
});

// Schema for form values (with string dates)
export const employeeFormSchema = z.object({
  // Personal Info
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
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
  experience: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  bio: z.string().optional(),
  
  // Employment Details
  employeeCode: z.string().optional(),
  joinDate: z.string().optional(),
  designation: z.string().min(1, {
    message: "Designation is required.",
  }),
  department: z.string().optional(),
  reportingManager: z.string().optional(),
  employeeType: z.string().optional(),
  branch: z.string().optional(),
  previousExperience: z.string().optional(),
  previousEmployer: z.string().optional(),
  confirmationDate: z.string().optional(),
  isActive: z.boolean().default(true),
  
  // Branch Information
  branchAccess: z.array(z.string()).min(1, "At least one branch must be selected"),
  
  // Salary & Banking Details
  salaryStructure: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  
  // IT & Asset Allocation
  officialEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  deviceIssued: z.string().optional(),
  accessCardId: z.string().optional(),
  softwareLicenses: z.string().optional(),
  assetReturnStatus: z.string().optional(),
  
  // User Account
  createUser: z.boolean().default(false),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().optional()
    .refine(password => !password || password.length >= 8, "Password must be at least 8 characters"),
  roleId: z.string().optional(),
}).refine((data) => {
  // If createUser is true, email and role are required
  if (data.createUser) {
    return !!data.email && !!data.roleId;
  }
  return true;
}, {
  message: "Email and role are required when creating a user account",
  path: ["email"],
});

// Type for the form values
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

// Type for the API input
export type EmployeeApiInput = z.infer<typeof employeeApiSchema>;

// Function to convert form values to API input
export function convertFormToApiInput(formValues: EmployeeFormValues): EmployeeApiInput {
  return {
    ...formValues,
    dateOfBirth: formValues.dateOfBirth ? new Date(formValues.dateOfBirth) : undefined,
    joinDate: formValues.joinDate ? new Date(formValues.joinDate) : undefined,
    confirmationDate: formValues.confirmationDate ? new Date(formValues.confirmationDate) : undefined,
    branchAccess: formValues.branchAccess || [],
  };
}

// Function to convert API data to form values
export function convertApiToFormValues(apiData: any): EmployeeFormValues {
  // Helper function to safely format a date value
  const formatDate = (dateValue: any): string | undefined => {
    if (!dateValue) return undefined;
    
    try {
      // If it's already a string, try to create a Date from it
      if (typeof dateValue === 'string') {
        // If it looks like an ISO string, just split it
        if (dateValue.includes('T')) {
          return dateValue.split('T')[0];
        }
        // Otherwise return as is if it's a valid date string
        return dateValue;
      }
      
      // If it's a Date object, convert to ISO and get the date part
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      
      // For any other type, try to make it a Date first
      return new Date(dateValue).toISOString().split('T')[0];
    } catch (error) {
      console.error(`Error formatting date: ${error}`);
      return undefined;
    }
  };

  // Check if user already has a Clerk account
  const hasClerkAccount = !!(apiData.clerkId || apiData.userId);

  return {
    ...apiData,
    dateOfBirth: formatDate(apiData.dateOfBirth),
    joinDate: formatDate(apiData.joinDate),
    confirmationDate: formatDate(apiData.confirmationDate),
    certifications: apiData.certifications || [],
    subjects: apiData.subjects || [],
    // Set createUser to true if user already has a clerk account
    createUser: hasClerkAccount || apiData.createUser || false,
    email: apiData.email || "",
    password: apiData.password || "",
    branchAccess: apiData.branchAccess || (apiData.branchId ? [apiData.branchId] : []),
    roleId: apiData.roleId || "",
  };
} 