"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CalendarIcon, 
  CheckCircle, 
  Loader2, 
  User, 
  Users, 
  MapPin, 
  GraduationCap,
  Phone,
  Mail,
  Calendar as CalendarIconLucide,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { differenceInYears, intervalToDuration } from "date-fns";
import { cn } from "@/lib/utils";

const registrationSchema = z.object({
  // Student Information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.date({ required_error: "Date of birth is required" }),
  gender: z.string().min(1, "Gender is required"),
  classApplying: z.string().min(1, "Class is required"),
  
  // Parent Details
  fatherName: z.string().min(1, "Father's name is required"),
  motherName: z.string().optional(),
  fatherMobile: z.string().min(10, "Father's mobile number is required"),
  motherMobile: z.string().optional(),
  fatherEmail: z.string().email("Valid father's email is required"),
  motherEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  
  // Address
  residentialAddress: z.string().min(1, "Residential address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  
  // Previous School Details
  classLastAttended: z.string().optional(),
  schoolLastAttended: z.string().optional(),
  percentageObtained: z.string().optional(),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  onSuccess?: (inquiry: any) => void;
  className?: string;
  sessionData?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  branchData?: {
    id: string;
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
}

export function RegistrationForm({ onSuccess, className, sessionData, branchData }: RegistrationFormProps) {
  const router = useRouter();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Use passed session data or fetch from context
  const effectiveBranchId = branchData?.id || currentBranchId;
  const effectiveSessionId = sessionData?.id || currentSessionId;

  // Fetch classes from database
  const { data: classesData, isLoading: isLoadingClasses } = api.class.getAll.useQuery({
    branchId: effectiveBranchId || undefined,
    sessionId: effectiveSessionId || undefined,
    isActive: true,
  });

  // Fetch academic sessions only if sessionData is not provided
  const { data: sessionsData } = api.academicSession.getAll.useQuery(undefined, {
    enabled: !sessionData, // Only fetch if sessionData is not provided
  });

  // Get current session data - use passed sessionData or find from context
  const currentSession = sessionData || sessionsData?.find(session => session.id === effectiveSessionId);

  // Function to calculate age as of April 1st of session year
  const calculateAge = (dateOfBirth: Date): { ageText: string; sessionYear: number } | null => {
    if (!currentSession || !dateOfBirth) {
      return null;
    }
    
    // Extract year from session name (e.g., "2025-26" -> 2025)
    const sessionNameMatch = currentSession.name?.match(/(\d{4})/);
    
    if (!sessionNameMatch || !sessionNameMatch[1]) {
      return null;
    }
    
    const sessionYear = parseInt(sessionNameMatch[1]);
    const april1st = new Date(sessionYear, 3, 1); // April 1st of session year (month is 0-indexed)
    
    // Calculate detailed age breakdown
    const duration = intervalToDuration({
      start: dateOfBirth,
      end: april1st
    });
    
    // Build age text
    const parts = [];
    if (duration.years && duration.years > 0) {
      parts.push(`${duration.years} year${duration.years !== 1 ? 's' : ''}`);
    }
    if (duration.months && duration.months > 0) {
      parts.push(`${duration.months} month${duration.months !== 1 ? 's' : ''}`);
    }
    if (duration.days && duration.days > 0) {
      parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
    }
    
    const ageText = parts.length > 0 ? parts.join(', ') : '0 days';
    
    return { ageText, sessionYear };
  };

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "",
      classApplying: "",
      fatherName: "",
      motherName: "",
      fatherMobile: "",
      motherMobile: "",
      fatherEmail: "",
      motherEmail: "",
      residentialAddress: "",
      city: "",
      state: "",
      country: "India",
      classLastAttended: "",
      schoolLastAttended: "",
      percentageObtained: "",
    },
  });

  const createInquiry = api.admissions.createInquiry.useMutation({
    onSuccess: (data) => {
      setSubmittedData(data);
      setIsSubmitted(true);
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      console.error("Registration error:", error);
      // Handle error - show toast or error message
    },
  });

  const onSubmit = (values: RegistrationFormValues) => {
    if (!effectiveBranchId) {
      console.error("No branch selected");
      return;
    }

    // Transform data to match the expected API format
    const transformedValues = {
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      classApplying: values.classApplying,
      parentName: values.fatherName, // Map father's name to parentName for backward compatibility
      parentPhone: values.fatherMobile, // Map father's mobile to parentPhone
      parentEmail: values.fatherEmail, // Map father's email to parentEmail
      address: values.residentialAddress, // Map residential address to address
      // Additional fields for extended data
      motherName: values.motherName || undefined,
      motherMobile: values.motherMobile || undefined,
      motherEmail: values.motherEmail || undefined,
      city: values.city,
      state: values.state,
      country: values.country,
      classLastAttended: values.classLastAttended || undefined,
      schoolLastAttended: values.schoolLastAttended || undefined,
      percentageObtained: values.percentageObtained || undefined,
      branchId: effectiveBranchId,
      sessionId: effectiveSessionId || undefined,
    };

    createInquiry.mutate(transformedValues);
  };

  if (isSubmitted && submittedData) {
    return (
      <div className={cn("w-full px-4 sm:px-6 lg:px-8", className)}>
        <div className="max-w-3xl mx-auto">
          <Card className="border shadow-lg">
            <CardContent className="text-center p-6 sm:p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-gray-600 mb-6">Your admission inquiry has been submitted successfully</p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-1">Registration Number</p>
                <p className="text-lg font-semibold text-[#00501B]">{submittedData.registrationNumber}</p>
              </div>
              
              <div className="space-y-3 mb-8 text-sm text-gray-600">
                <p>
                  We have received your inquiry for admission to <span className="font-medium text-gray-900">{submittedData.classApplying}</span>
                </p>
                <p>
                  Our admission team will contact you within <span className="font-medium">24-48 hours</span> to discuss the next steps
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsSubmitted(false);
                    setSubmittedData(null);
                    form.reset();
                  }}
                  className="w-full sm:w-auto"
                >
                  Submit Another
                </Button>
                <Button 
                  onClick={() => router.push("/")}
                  className="w-full sm:w-auto bg-[#00501B] hover:bg-[#00501B]/90"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full px-4 sm:px-6 lg:px-8", className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-[#00501B] rounded-lg flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">Student Registration</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Please fill out the information below to register your child for admission
        </p>
      </div>

      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* Student Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <User className="w-5 h-5 text-[#00501B]" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => {
                    const ageInfo = calculateAge(field.value);
                    const ageInYears = ageInfo ? Math.floor(differenceInYears(new Date(ageInfo.sessionYear, 3, 1), field.value)) : null;
                    
                    // Find eligible class based on age
                    const eligibleClass = ageInYears && classesData ? 
                      classesData.find(classItem => (classItem as any).age === ageInYears) : null;
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Date of Birth *</FormLabel>
                        <DatePicker
                          value={field.value}
                          onChange={(date: Date) => {
                            field.onChange(date);
                            
                            // Auto-select eligible class when date changes
                            if (date) {
                              const newAgeInfo = calculateAge(date);
                              const newAgeInYears = newAgeInfo ? Math.floor(differenceInYears(new Date(newAgeInfo.sessionYear, 3, 1), date)) : null;
                              const newEligibleClass = newAgeInYears && classesData ? 
                                classesData.find(classItem => (classItem as any).age === newAgeInYears) : null;
                              
                              if (newEligibleClass) {
                                form.setValue("classApplying", newEligibleClass.name);
                              } else {
                                form.setValue("classApplying", "");
                              }
                            }
                          }}
                          placeholder="Select date"
                          className="h-10"
                        />
                        <FormMessage />
                        
                        {ageInfo && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">
                              Age as of April 1st, {ageInfo.sessionYear}: {ageInfo.ageText}
                            </p>
                            {eligibleClass && (
                              <p className="text-sm text-green-600 font-medium">
                                Eligible for: {eligibleClass.name}
                              </p>
                            )}
                            {ageInYears && !eligibleClass && (
                              <p className="text-sm text-orange-600">
                                No class available for age {ageInYears} years
                              </p>
                            )}
                          </div>
                        )}
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Gender *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="classApplying"
                  render={({ field }) => {
                    // Calculate eligible class based on student's age
                    const dateOfBirth = form.watch("dateOfBirth");
                    const ageInfo = calculateAge(dateOfBirth);
                    const ageInYears = ageInfo ? Math.floor(differenceInYears(new Date(ageInfo.sessionYear, 3, 1), dateOfBirth)) : null;
                    const eligibleClass = ageInYears && classesData ? 
                      classesData.find(classItem => (classItem as any).age === ageInYears) : null;
                    
                    // Show only eligible class or all classes if no DOB selected
                    const availableClasses = dateOfBirth && eligibleClass ? [eligibleClass] : classesData || [];
                    const isRestricted = dateOfBirth && !!eligibleClass;
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Class Applying For *
                          {isRestricted && (
                            <span className="text-green-600 text-xs ml-2">(Auto-selected based on age)</span>
                          )}
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value} 
                          disabled={isLoadingClasses || isRestricted}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue 
                                placeholder={
                                  isLoadingClasses ? "Loading..." : 
                                  !dateOfBirth ? "Please select date of birth first" :
                                  isRestricted ? eligibleClass.name :
                                  "Select class"
                                } 
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingClasses ? (
                              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading classes...
                              </div>
                            ) : !dateOfBirth ? (
                              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                Please select date of birth first
                              </div>
                            ) : availableClasses.length > 0 ? (
                              availableClasses.map((classItem) => (
                                <SelectItem key={classItem.id} value={classItem.name}>
                                  {classItem.name}
                                  {(classItem as any).age && (
                                    <span className="text-gray-500 ml-2">(Age: {(classItem as any).age} years)</span>
                                  )}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                No classes available for this age
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <Users className="w-5 h-5 text-[#00501B]" />
                Parent Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Father's Name *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Mother's Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fatherMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Father's Mobile *</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" className="h-10" placeholder="WhatsApp preferred" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motherMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Mother's Mobile</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fatherEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Father's Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motherEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Mother's Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <MapPin className="w-5 h-5 text-[#00501B]" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="residentialAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Residential Address *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[80px] resize-none"
                        placeholder="Enter complete residential address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">City *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">State *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Country *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Previous School Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <BookOpen className="w-5 h-5 text-[#00501B]" />
                Previous School Details
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Optional information about previous education
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="classLastAttended"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Class Last Attended</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="percentageObtained"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Percentage/Grade Obtained</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schoolLastAttended"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Name of School Last Attended</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <Button 
              type="submit" 
              disabled={createInquiry.isPending}
              className="w-full sm:w-auto min-w-[250px] h-12 text-base bg-[#00501B] hover:bg-[#00501B]/90"
            >
              {createInquiry.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Registration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
} 