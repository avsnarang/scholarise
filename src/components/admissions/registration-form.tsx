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
  isInternalRegistration?: boolean; // Flag to indicate if it's an internal registration
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

export function RegistrationForm({ onSuccess, className, isInternalRegistration = false, sessionData, branchData }: RegistrationFormProps) {
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
  const calculateAge = (dateOfBirth: Date): { ageText: string; sessionYear: number; ageInYears: number } | null => {
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
    
    // Build age text - simplified for minimal design
    const ageInYears = differenceInYears(april1st, dateOfBirth);
    const ageText = `${ageInYears} years`;
    if (duration.months && duration.months > 0) {
      return { ageText: `${ageInYears} years, ${duration.months} months`, sessionYear, ageInYears };
    }
    
    return { ageText, sessionYear, ageInYears };
  };

  // Function to get eligible classes - simplified
  const getEligibleClasses = (ageInYears: number) => {
    if (!classesData) return [];
    
    return classesData.filter((classItem: any) => {
      if (classItem.age === null || classItem.age === undefined) return true;
      // Student is eligible if their age meets or exceeds the class minimum age
      return ageInYears >= classItem.age;
    });
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
      isInternalRegistration: isInternalRegistration, // Pass the registration source flag
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
                  onClick={() => router.push("https://tsh.edu.in/")}
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
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#00501B]">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 sm:text-3xl dark:text-white">
          Student Registration
        </h1>
        <p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-400">
          Please fill out the information below to register your child for
          admission
        </p>
      </div>

      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* Student Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <User className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        First Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 text-base" />
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
                      <FormLabel className="text-sm font-medium">
                        Last Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12 text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => {
                    const ageInfo = calculateAge(field.value);

                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Date of Birth <span className="text-red-500">*</span>
                        </FormLabel>
                        <DatePicker
                          value={field.value}
                          onChange={(date: Date) => {
                            field.onChange(date);

                            // Auto-select the most appropriate class when date changes
                            if (date) {
                              const newAgeInfo = calculateAge(date);
                              if (newAgeInfo && classesData) {
                                const eligibleClasses = getEligibleClasses(
                                  newAgeInfo.ageInYears,
                                );
                                if (eligibleClasses.length > 0) {
                                  // Find the class with the highest age requirement that the student qualifies for
                                  const bestClass = eligibleClasses.reduce(
                                    (best, current) => {
                                      const currentAge =
                                        (current as any).age || 0;
                                      const bestAge = (best as any).age || 0;
                                      return currentAge > bestAge
                                        ? current
                                        : best;
                                    },
                                  );
                                  form.setValue(
                                    "classApplying",
                                    bestClass.name,
                                  );
                                } else {
                                  form.setValue("classApplying", "");
                                }
                              }
                            }
                          }}
                          placeholder="Select date"
                          className="h-10 border-gray-200 dark:border-[#606060] dark:bg-[#252525] dark:text-white"
                        />
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Gender <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male" className="cursor-pointer">
                            Male
                          </SelectItem>
                          <SelectItem value="Female" className="cursor-pointer">
                            Female
                          </SelectItem>
                          <SelectItem value="Other" className="cursor-pointer">
                            Other
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classApplying"
                  render={({ field }) => {
                    // Calculate eligible class based on student's age
                    const dateOfBirth = form.watch("dateOfBirth");
                    const ageInfo = calculateAge(dateOfBirth);

                    // Auto-select the most appropriate class
                    const selectedClass =
                      ageInfo && classesData
                        ? (() => {
                            const eligibleClasses = getEligibleClasses(
                              ageInfo.ageInYears,
                            );
                            if (eligibleClasses.length > 0) {
                              // Find the class with the highest age requirement that the student qualifies for
                              return eligibleClasses.reduce((best, current) => {
                                const currentAge = (current as any).age || 0;
                                const bestAge = (best as any).age || 0;
                                return currentAge > bestAge ? current : best;
                              });
                            }
                            return null;
                          })()
                        : null;

                    // Auto-set the field value when class is determined
                    if (selectedClass && field.value !== selectedClass.name) {
                      field.onChange(selectedClass.name);
                    }

                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Class Applying For{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        {selectedClass ? (
                          <div className="flex h-10 items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#606060] dark:bg-[#252525] dark:text-white">
                            <span className="text-gray-900">
                              {selectedClass.name}
                            </span>
                            {(selectedClass as any).age && (
                              <span className="text-xs text-gray-500">
                                Age {(selectedClass as any).age}+
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500 dark:border-[#606060] dark:bg-[#252525] dark:text-white">
                            {!dateOfBirth
                              ? "Please select date of birth first"
                              : "No suitable class found"}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              {/* Age Display - positioned after selection fields */}
              {(() => {
                const dateOfBirth = form.watch("dateOfBirth");
                const ageInfo = calculateAge(dateOfBirth);

                return ageInfo ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm text-gray-600">
                      Age as of April 1st, {ageInfo.sessionYear}:{" "}
                      <span className="font-medium text-gray-900">
                        {ageInfo.ageText}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <Users className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                Parent Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Father's Name <span className="text-red-500">*</span>
                      </FormLabel>
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
                      <FormLabel className="text-sm font-medium">
                        Mother's Name
                      </FormLabel>
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
                      <FormLabel className="text-sm font-medium">
                        Father's Mobile <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          className="h-10"
                          placeholder="WhatsApp preferred"
                        />
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
                      <FormLabel className="text-sm font-medium">
                        Mother's Mobile
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fatherEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Father's Email <span className="text-red-500">*</span>
                      </FormLabel>
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
                      <FormLabel className="text-sm font-medium">
                        Mother's Email
                      </FormLabel>
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
                <MapPin className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="residentialAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Residential Address{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-[80px] resize-none dark:border-[#606060] dark:bg-[#252525] dark:text-white"
                        placeholder="Enter complete residential address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        City <span className="text-red-500">*</span>
                      </FormLabel>
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
                      <FormLabel className="text-sm font-medium">
                        State <span className="text-red-500">*</span>
                      </FormLabel>
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
                      <FormLabel className="text-sm font-medium">
                        Country <span className="text-red-500">*</span>
                      </FormLabel>
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
                <BookOpen className="h-5 w-5 text-[#00501B] dark:text-[#7AAD8B]" />
                Previous School Details
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                Optional information about previous education
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormField
                  control={form.control}
                  name="classLastAttended"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Class Last Attended
                      </FormLabel>
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
                      <FormLabel className="text-sm font-medium">
                        Percentage/Grade Obtained
                      </FormLabel>
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
                      <FormLabel className="text-sm font-medium">
                        Name of School Last Attended
                      </FormLabel>
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
              className="h-12 w-full min-w-[250px] bg-[#00501B] text-base hover:bg-[#00501B]/90 sm:w-auto"
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