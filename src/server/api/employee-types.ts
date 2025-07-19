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
  
  // User Account - Always required for employees
  email: z.string().email("Valid email is required"),
  password: z.string().optional(),
  roleId: z.string().min(1, "Role is required"),
}).superRefine((data, ctx) => {
  // Validate password for new employees (in edit mode, password is optional)
  if (data.password && data.password.length > 0 && data.password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password must be at least 8 characters",
      path: ["password"],
    });
  }
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
    createUser: true, // Always create user accounts for employees
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

  // Helper function to safely convert null/undefined to empty string
  const safeString = (value: any): string => {
    return value == null ? "" : String(value);
  };

  // Check if user already has a user account (Supabase)
  const hasUserAccount = !!(apiData.userId || apiData.clerkId);

  // Extract roleId from userRoles if available (similar to teacher implementation)
  const roleId = apiData.userRoles && apiData.userRoles.length > 0 
    ? apiData.userRoles[0].roleId 
    : (apiData.roleId || "");

  // Use officialEmail as the login email for existing users
  const loginEmail = hasUserAccount 
    ? (apiData.officialEmail || apiData.email || "")
    : (apiData.email || "");

  return {
    // Personal Info - ensure no null values
    firstName: safeString(apiData.firstName),
    lastName: safeString(apiData.lastName),
    middleName: safeString(apiData.middleName),
    dateOfBirth: formatDate(apiData.dateOfBirth),
    gender: apiData.gender || undefined,
    bloodGroup: safeString(apiData.bloodGroup),
    maritalStatus: safeString(apiData.maritalStatus),
    nationality: safeString(apiData.nationality),
    religion: safeString(apiData.religion),
    panNumber: safeString(apiData.panNumber),
    aadharNumber: safeString(apiData.aadharNumber),
    
    // Contact Information
    address: safeString(apiData.address),
    city: safeString(apiData.city),
    state: safeString(apiData.state),
    country: safeString(apiData.country),
    pincode: safeString(apiData.pincode),
    permanentAddress: safeString(apiData.permanentAddress),
    permanentCity: safeString(apiData.permanentCity),
    permanentState: safeString(apiData.permanentState),
    permanentCountry: safeString(apiData.permanentCountry),
    permanentPincode: safeString(apiData.permanentPincode),
    phone: safeString(apiData.phone),
    alternatePhone: safeString(apiData.alternatePhone),
    personalEmail: safeString(apiData.personalEmail),
    emergencyContactName: safeString(apiData.emergencyContactName),
    emergencyContactPhone: safeString(apiData.emergencyContactPhone),
    emergencyContactRelation: safeString(apiData.emergencyContactRelation),
    
    // Educational Qualifications
    qualification: safeString(apiData.qualification),
    specialization: safeString(apiData.specialization),
    professionalQualifications: safeString(apiData.professionalQualifications),
    specialCertifications: safeString(apiData.specialCertifications),
    yearOfCompletion: safeString(apiData.yearOfCompletion),
    institution: safeString(apiData.institution),
    experience: safeString(apiData.experience),
    bio: safeString(apiData.bio),
    certifications: apiData.certifications || [],
    subjects: apiData.subjects || [],
    
    // Employment Details
    employeeCode: safeString(apiData.employeeCode),
    designation: safeString(apiData.designation),
    department: safeString(apiData.department),
    joinDate: formatDate(apiData.joinDate),
    reportingManager: safeString(apiData.reportingManager),
    employeeType: safeString(apiData.employeeType),
    branch: safeString(apiData.branch),
    previousExperience: safeString(apiData.previousExperience),
    previousEmployer: safeString(apiData.previousEmployer),
    confirmationDate: formatDate(apiData.confirmationDate),
    isActive: apiData.isActive ?? true,
    branchAccess: apiData.branchAccess || (apiData.branchId ? [apiData.branchId] : []),
    
    // Salary & Banking Details
    salaryStructure: safeString(apiData.salaryStructure),
    pfNumber: safeString(apiData.pfNumber),
    esiNumber: safeString(apiData.esiNumber),
    uanNumber: safeString(apiData.uanNumber),
    bankName: safeString(apiData.bankName),
    accountNumber: safeString(apiData.accountNumber),
    ifscCode: safeString(apiData.ifscCode),
    
    // IT & Asset Allocation
    officialEmail: safeString(apiData.officialEmail),
    deviceIssued: safeString(apiData.deviceIssued),
    accessCardId: safeString(apiData.accessCardId),
    softwareLicenses: safeString(apiData.softwareLicenses),
    assetReturnStatus: safeString(apiData.assetReturnStatus),
    
    // User Account - Always required for employees
    email: safeString(loginEmail) || safeString(apiData.officialEmail) || "",
    password: safeString(apiData.password),
    roleId: roleId || "",
  };
} 