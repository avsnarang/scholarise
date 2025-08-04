"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Users, 
  MessageSquare, 
  ArrowLeft,
  AlertCircle,
  Plus,
  X,
  GraduationCap,
  UserCheck,
  Briefcase,
  School,
  Building,
  Check,
  ChevronsUpDown,
  Loader,
  Phone,
  ChevronRight,
  Eye,
  ArrowRight,
  FileText,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { TemplateVariableMapper } from "@/components/communication/template-variable-mapper";
import { TemplateDataPreview } from "@/components/communication/template-data-preview";
import { MultiSelect } from "@/components/ui/multi-select";
import { extractRecipientData } from "@/utils/template-data-mapper";
import { PageGuard } from "@/components/auth/page-guard";
import { Permission } from "@/types/permissions";

const sendMessageSchema = z.object({
  title: z.string().min(1, "Message title is required"),
  customMessage: z.string().optional(),
  recipientType: z.string().min(1, "Recipient type is required"),
  templateId: z.string().optional(),
  templateParameters: z.record(z.string()).optional(),
  templateDataMappings: z.record(z.object({
    dataField: z.string(),
    fallbackValue: z.string()
  })).optional(),
  contactType: z.array(z.string()).min(1, "At least one contact type is required"),
  selectedTeachers: z.array(z.string()).optional(),
  selectedEmployees: z.array(z.string()).optional(),
});

type SendMessageFormData = z.infer<typeof sendMessageSchema>;

interface Recipient {
  id: string;
  name: string;
  phone: string;
  type: string;
  additional?: Record<string, any>;
}

// Steps for the wizard
const STEPS = [
  { id: 'recipients', title: 'Select Recipients', description: 'Choose who will receive your message' },
  { id: 'template', title: 'Message Content', description: 'Select template and customize content' },
  { id: 'review', title: 'Review & Send', description: 'Review and confirm your message' }
];

function SendMessagePageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  
  // Controlled state to avoid form.watch() issues
  const [recipientType, setRecipientType] = useState<string>("ALL_STUDENTS");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [contactType, setContactType] = useState<string[]>(["STUDENT"]); // Default to student contact
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [classComboboxOpen, setClassComboboxOpen] = useState(false);
  const [sectionComboboxOpen, setSectionComboboxOpen] = useState(false);
  const [templateDataMappings, setTemplateDataMappings] = useState<Record<string, { dataField: string; fallbackValue: string }>>({});

  const form = useForm<SendMessageFormData>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      title: "",
      customMessage: "",
      recipientType: "ALL_STUDENTS",
      templateId: "",
      templateParameters: {},
      templateDataMappings: {},
      contactType: ["STUDENT"],
      selectedTeachers: [],
      selectedEmployees: [],
    },
  });

  // Fetch templates with auto-refresh
  const utils = api.useUtils();
  const { data: templates, refetch: refetchTemplates } = api.communication.getTemplates.useQuery({
    isActive: true,
  }, {
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount
    staleTime: 0, // Consider data immediately stale to encourage refetching
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Fetch classes when needed
  const { data: classes } = api.class.getAll.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { enabled: !!currentBranchId && !!currentSessionId && (recipientType.includes("CLASS") || recipientType === "INDIVIDUAL_SECTION") }
  );

  // Fetch sections when needed  
  const { data: sections } = api.section.getAll.useQuery(
    { branchId: currentBranchId! },
    { enabled: !!currentBranchId && recipientType === "INDIVIDUAL_SECTION" }
  );



  // Fetch teachers
  const { data: teachersData } = api.teacher.getAll.useQuery(
    { branchId: currentBranchId! },
    { enabled: !!currentBranchId && recipientType === "TEACHERS" }
  );

  // Fetch employees
  const { data: employeesData } = api.employee.getAll.useQuery(
    { branchId: currentBranchId! },
    { enabled: !!currentBranchId && recipientType === "EMPLOYEES" }
  );

  // Extract teachers and employees arrays
  const teachers = teachersData?.items || [];
  const employees = employeesData?.items || [];

  // Fetch recipients for non-individual selections
  const { data: recipients } = api.communication.getRecipients.useQuery(
    {
      branchId: currentBranchId!,
      recipientType: recipientType as any,
      classIds: selectedClassIds,
      sectionIds: selectedSectionIds,
      contactType: contactType as any[],
    },
    {
      enabled: !!currentBranchId && !["INDIVIDUAL_STUDENTS", "INDIVIDUAL_TEACHERS", "INDIVIDUAL_EMPLOYEES"].includes(recipientType)
    }
  );

  // Send message mutation
  const sendMessageMutation = api.communication.sendMessage.useMutation({
    onSuccess: (data) => {
      toast({
        title: "✅ Message Sent Successfully",
        description: `Your message has been queued for delivery to ${data.totalRecipients} recipient(s).`,
        duration: 5000,
      });
      
      // Reset form and navigate to history
      form.reset();
      setCurrentStep(0);
      window.location.href = '/communication/history';
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to Send Message",
        description: error.message || "There was an error sending your message.",
        variant: "destructive",
        duration: 7000,
      });
    },
  });

  // Get selected template
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  // Helper function to get class recipient counts
  const getClassCounts = (classId: string) => {
    if (!recipients) return { students: 0, fathers: 0, mothers: 0, total: 0 };
    
    const classRecipients = recipients.filter(r => 
      r.additional?.student?.class?.name === classes?.find(c => c.id === classId)?.name
    );
    
    const students = classRecipients.filter(r => r.type === 'student').length;
    const fathers = classRecipients.filter(r => r.type === 'father').length;
    const mothers = classRecipients.filter(r => r.type === 'mother').length;
    
    return {
      students,
      fathers,
      mothers,
      total: students + fathers + mothers
    };
  };

  // Helper function to calculate final recipients
  const calculateFinalRecipients = () => {
    let finalRecipients: Recipient[] = [];
    
    if (recipientType === "TEACHERS") {
      finalRecipients = selectedTeachers.map(teacherId => {
        const teacher = teachers.find(t => t.id === teacherId);
        return {
          id: teacherId,
          name: `${teacher?.firstName} ${teacher?.lastName}`,
          phone: teacher?.phone || '',
          type: "teacher",
          additional: {
            contactPersonName: `${teacher?.firstName} ${teacher?.lastName}`,
            firstName: teacher?.firstName,
            lastName: teacher?.lastName,
            employeeCode: teacher?.employeeCode,
            designation: teacher?.designation
          }
        };
      }).filter(r => r.phone);
    } else if (recipientType === "EMPLOYEES") {
      finalRecipients = selectedEmployees.map(employeeId => {
        const employee = employees.find(e => e.id === employeeId);
        return {
          id: employeeId,
          name: `${employee?.firstName} ${employee?.lastName}`,
          phone: employee?.phone || '',
          type: "employee",
          additional: {
            contactPersonName: `${employee?.firstName} ${employee?.lastName}`,
            firstName: employee?.firstName,
            lastName: employee?.lastName,
            designation: employee?.designation
          }
        };
      }).filter(r => r.phone);
    } else {
      finalRecipients = recipients || [];
    }

    return finalRecipients;
  };

  // Calculate progress based on current step and form completion
  const getProgress = () => {
    let progress = (currentStep / (STEPS.length - 1)) * 100;

    // Add partial progress within each step
    if (currentStep === 0) {
      if (recipientType) progress += 10;
      if (contactType.length > 0) progress += 10;
    } else if (currentStep === 1) {
      if (selectedTemplateId) progress += 10;
      if (form.getValues('title')) progress += 10;
    }
    
    return Math.min(progress, 100);
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // Recipients step
        if (recipientType === "INDIVIDUAL_SECTION") {
          return recipientType && contactType.length > 0 && selectedClassIds.length > 0 && selectedSectionIds.length > 0;
        } else if (recipientType === "ENTIRE_CLASS") {
          return recipientType && contactType.length > 0 && selectedClassIds.length > 0;
        } else if (recipientType === "TEACHERS") {
          return recipientType && selectedTeachers.length > 0;
        } else if (recipientType === "EMPLOYEES") {
          return recipientType && selectedEmployees.length > 0;
        } else {
          return recipientType && contactType.length > 0;
        }
      case 1: // Template step
        return selectedTemplateId && form.getValues('title');
      case 2: // Review step
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep() && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRecipientTypeChange = (newType: string) => {
    setRecipientType(newType);
    form.setValue("recipientType", newType);
    // Reset selections when type changes
    setSelectedRecipients([]);
    setSelectedClassIds([]);
    setSelectedSectionIds([]);
    setSelectedTeachers([]);
    setSelectedEmployees([]);
    
    // Set default contact types for ALL_CONTACTS
    if (newType === "ALL_CONTACTS") {
      setContactType(["STUDENT", "FATHER", "MOTHER"]);
    }
  };

  // Helper functions for individual recipient selection
  const toggleRecipient = (recipient: Recipient) => {
    setSelectedRecipients(prev => {
      const isSelected = prev.some(r => r.id === recipient.id);
      if (isSelected) {
        return prev.filter(r => r.id !== recipient.id);
      } else {
        return [...prev, recipient];
      }
    });
  };

  const isRecipientSelected = (recipient: Recipient) => {
    return selectedRecipients.some(r => r.id === recipient.id);
  };

  const selectAllFilteredRecipients = () => {
    const filteredRecipients = recipients || [];
    
    const newSelections = filteredRecipients.filter(
      recipient => !isRecipientSelected(recipient)
    );
    setSelectedRecipients(prev => [...prev, ...newSelections]);
  };

  const clearAllSelections = () => {
    setSelectedRecipients([]);
  };

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case "student":
        return <GraduationCap className="w-4 h-4 text-blue-500" />;
      case "teacher":
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case "employee":
        return <Briefcase className="w-4 h-4 text-purple-500" />;
      case "parent":
        return <Users className="w-4 h-4 text-orange-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Form submission handler
  const onSubmit = async (data: SendMessageFormData) => {
    try {
      const finalRecipients = calculateFinalRecipients();

    if (finalRecipients.length === 0) {
      toast({
        title: "No Recipients Selected",
          description: "Please select at least one recipient before sending the message.",
        variant: "destructive",
      });
      return;
    }

      // Prepare template data mappings and parameters for backend
      const templateMappings: Record<string, { dataField: string; fallbackValue: string }> = {};
      const templateParams: Record<string, string> = {};
      
      if (selectedTemplate?.templateVariables && templateDataMappings) {
        selectedTemplate.templateVariables.forEach(variable => {
          const mapping = templateDataMappings[variable];
          if (mapping) {
            templateMappings[variable] = {
              dataField: mapping.dataField,
              fallbackValue: mapping.fallbackValue
            };
            // Send fallback value for validation, backend will resolve actual values
            templateParams[variable] = mapping.fallbackValue || `[${variable}]`;
          } else {
            // If no mapping is configured, use default fallback
            templateMappings[variable] = {
              dataField: "custom",
              fallbackValue: `[${variable}]`
            };
            templateParams[variable] = `[${variable}]`;
          }
        });
      }

      await sendMessageMutation.mutateAsync({
        title: data.title,
        customMessage: data.customMessage,
        templateId: selectedTemplateId || undefined,
        templateParameters: templateParams, // Send for validation
        templateDataMappings: templateMappings, // Send for actual data resolution
        recipients: finalRecipients,
        recipientType: recipientType as any,
        contactType: contactType as any[],
        branchId: currentBranchId!,
      });
    } catch (error) {
      console.error("Error in onSubmit:", error);
    }
  };

  // Template parameters effect
  useEffect(() => {
    if (selectedTemplate) {
      const templateParams: Record<string, string> = {};
      selectedTemplate.templateVariables?.forEach((variable: string) => {
        templateParams[variable] = `{{${variable}}}`;
      });
      form.setValue("templateParameters", templateParams);
    }
  }, [selectedTemplate, form]);

  if (!hasPermission("create_communication_message")) {
    return (
      <PageGuard permissions={[Permission.CREATE_COMMUNICATION_MESSAGE]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Access Denied
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You don't have permission to send messages.
            </p>
          </div>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard permissions={[Permission.CREATE_COMMUNICATION_MESSAGE]}>
      <div className="w-full bg-gradient-to-br from-background via-background to-muted/20 flex flex-col min-h-screen">
        <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-3 rounded-xl">
                <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Send Message
                </h1>
                <p className="text-muted-foreground mt-1">
                  Create and send WhatsApp messages to your selected recipients
                </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit">
              <Link href="/communication" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div key={step.id} className={cn(
                  "flex items-center gap-3 flex-1",
                  index < STEPS.length - 1 && "pr-4"
                )}>
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold text-sm transition-all",
                    index <= currentStep 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-background text-muted-foreground border-muted-foreground/30"
                  )}>
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                              </div>
                  <div className="flex-1">
                    <div className={cn(
                      "font-medium text-sm transition-colors",
                      index <= currentStep ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                            </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                              </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className={cn(
                    "w-5 h-5 transition-colors ml-2",
                    index < currentStep ? "text-primary" : "text-muted-foreground/50"
                  )} />
                )}
                            </div>
              ))}
                        </div>
            <Progress value={getProgress()} className="h-2" />
                    </div>

                 <FormProvider {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 flex flex-col min-h-0">
                         {/* Step Content */}
             <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
              
                             {/* Main Content Area */}
               <div className="flex-1 min-h-0">

                                 {/* Step 1: Recipients */}
                 {currentStep === 0 && (
                   <Card className="border-2 border-primary/20 shadow-lg max-h-[calc(100vh-200px)]">
                     <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                         <Users className="h-5 w-5 text-primary" />
                    Select Recipients
                  </CardTitle>
                  <CardDescription>
                         Choose who will receive your WhatsApp message
                  </CardDescription>
                </CardHeader>
                     <CardContent className="space-y-4 pt-4 overflow-y-auto">
                      
                  {/* Recipient Type Selection */}
                      <div className="space-y-4">
                        <label className="text-sm font-semibold text-foreground">Recipient Groups</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                            { value: "ALL_CONTACTS", label: "All Contacts", icon: <Users className="w-5 h-5" />, description: "Send to everyone (students, teachers, employees, parents)" },
                            { value: "ALL_STUDENTS", label: "All Students", icon: <GraduationCap className="w-5 h-5" />, description: "Send to all enrolled students" },
                            { value: "ENTIRE_CLASS", label: "Entire Class", icon: <School className="w-5 h-5" />, description: "Select specific classes" },
                            { value: "INDIVIDUAL_SECTION", label: "Specific Sections", icon: <Building className="w-5 h-5" />, description: "Choose class sections" },
                            { value: "TEACHERS", label: "Teachers", icon: <UserCheck className="w-5 h-5" />, description: "Send to teaching staff" },
                            { value: "EMPLOYEES", label: "Employees", icon: <Briefcase className="w-5 h-5" />, description: "Send to non-teaching staff" },
                      ].map((option) => (
                            <Card
                          key={option.value}
                              className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                                recipientType === option.value 
                                  ? "border-primary bg-primary/5 shadow-md" 
                                  : "border-muted hover:border-primary/50"
                              )}
                          onClick={() => handleRecipientTypeChange(option.value)}
                        >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    recipientType === option.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                  )}>
                            {option.icon}
                          </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{option.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                                  </div>
                                  {recipientType === option.value && (
                                    <Check className="w-5 h-5 text-primary" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                      ))}
                    </div>
                  </div>

                  {/* Contact Type Selection for Students */}
                      {["ALL_CONTACTS", "ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType) && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                            <label className="text-sm font-semibold text-foreground mb-3 block">Contact Preference</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                                { value: "STUDENT", label: "Student Phone", icon: <GraduationCap className="w-4 h-4" />, description: "Direct to students" },
                                { value: "FATHER", label: "Father's Phone", icon: <Users className="w-4 h-4" />, description: "Contact fathers" },
                                { value: "MOTHER", label: "Mother's Phone", icon: <Users className="w-4 h-4" />, description: "Contact mothers" }
                          ].map((option) => (
                                <Card
                              key={option.value}
                                  className={cn(
                                    "cursor-pointer transition-all duration-200 border-2",
                                    contactType.includes(option.value) 
                                      ? "border-primary bg-primary/5" 
                                      : "border-muted hover:border-primary/50"
                                  )}
                              onClick={() => {
                                setContactType(prev => {
                                  if (prev.includes(option.value)) {
                                    return prev.filter(type => type !== option.value);
                                  } else {
                                    return [...prev, option.value];
                                  }
                                });
                              }}
                            >
                                  <CardContent className="p-3">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "p-1.5 rounded transition-colors",
                                        contactType.includes(option.value) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                      )}>
                                {option.icon}
                              </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-xs">{option.label}</div>
                                        <div className="text-xs text-muted-foreground">{option.description}</div>
                                      </div>
                                      {contactType.includes(option.value) && (
                                        <Check className="w-4 h-4 text-primary" />
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                          ))}
                        </div>
                            <p className="text-xs text-muted-foreground mt-3">
                              You can select multiple contact types to reach more recipients.
                        </p>
                      </div>
                    </div>
                  )}

                      {/* Class Selection for Class-based Recipients */}
                      {recipientType === "ENTIRE_CLASS" && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                            <label className="text-sm font-semibold text-foreground mb-3 block">Select Classes</label>
                        <MultiSelect
                          options={classes?.map(classItem => {
                                            const counts = getClassCounts(classItem.id);
                            const countText = counts.total > 0 ? ` (${counts.total} recipients)` : '';
                            return {
                              label: `${classItem.name}${countText}`,
                              value: classItem.id,
                              icon: GraduationCap
                            };
                          }) || []}
                          selected={selectedClassIds}
                          onValueChange={setSelectedClassIds}
                          placeholder="Search and select classes..."
                          maxCount={3}
                          className="w-full"
                        />
                        {selectedClassIds.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {selectedClassIds.length} class(es) selected
                          </p>
                        )}
                          </div>
                        </div>
                      )}

                      {/* Section Selection for Section-based Recipients */}
                      {recipientType === "INDIVIDUAL_SECTION" && (
                        <div className="space-y-4">
                          <Separator />
                          <div>
                                  <label className="text-sm font-semibold text-foreground mb-3 block">Select Sections</label>
                            <MultiSelect
                              options={sections?.map(section => {
                                const className = classes?.find(c => c.id === section.classId)?.name || 'Unknown Class';
                                return {
                                  label: `${className} - ${section.name}`,
                                  value: section.id,
                                  icon: Building
                                };
                              }) || []}
                              selected={selectedSectionIds}
                              onValueChange={(newSectionIds) => {
                                setSelectedSectionIds(newSectionIds);
                                // Update selectedClassIds based on selected sections
                                const classIds = newSectionIds.map(sectionId => {
                                  const section = sections?.find(s => s.id === sectionId);
                                  return section?.classId;
                                }).filter(Boolean) as string[];
                                setSelectedClassIds([...new Set(classIds)]); // Remove duplicates
                              }}
                              placeholder="Search and select sections (Class - Section)..."
                              maxCount={3}
                              className="w-full"
                            />
                          
                                  {selectedSectionIds.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-2">
                                      {selectedSectionIds.length} section(s) selected
                                    </p>
                              )}
                              
                            {(!sections || sections.length === 0) && (
                                <div className="text-center py-4 text-muted-foreground mt-4">
                                <p className="text-sm">No sections available</p>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Teacher Selection */}
                      {recipientType === "TEACHERS" && (
                        <div className="space-y-4">
                          <Separator />
                          <div>
                            <label className="text-sm font-semibold text-foreground mb-3 block">Select Teachers</label>
                            <MultiSelect
                              options={teachers?.map(teacher => ({
                                label: `${teacher.firstName} ${teacher.lastName}${teacher.designation ? ` - ${teacher.designation}` : ''}`,
                                value: teacher.id,
                                icon: UserCheck
                              })) || []}
                              selected={selectedTeachers}
                              onValueChange={setSelectedTeachers}
                              placeholder="Search and select teachers..."
                              maxCount={2}
                                className="w-full"
                              />
                          {selectedTeachers.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-2">
                              {selectedTeachers.length} teacher(s) selected
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                      {/* Employee Selection */}
                  {recipientType === "EMPLOYEES" && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                            <label className="text-sm font-semibold text-foreground mb-3 block">Select Employees</label>
                        <MultiSelect
                          options={employees?.map(employee => ({
                            label: `${employee.firstName} ${employee.lastName}${employee.designation ? ` - ${employee.designation}` : ''}`,
                            value: employee.id,
                            icon: Briefcase
                          })) || []}
                          selected={selectedEmployees}
                          onValueChange={setSelectedEmployees}
                          placeholder="Search and select employees..."
                          maxCount={2}
                            className="w-full"
                          />
                          {selectedEmployees.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-2">
                              {selectedEmployees.length} employee(s) selected
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                  </CardContent>
                </Card>
              )}

              {/* Step 2: Template & Message */}
                 {currentStep === 1 && (
                   <Card className="border-2 border-primary/20 shadow-lg max-h-[calc(100vh-200px)]">
                     <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                       <CardTitle className="flex items-center gap-2">
                         <FileText className="h-5 w-5 text-primary" />
                         Message Content
                       </CardTitle>
                       <CardDescription>
                         Select a WhatsApp template and customize your message
                       </CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4 pt-4 overflow-y-auto">
                      
                      {/* Message Title */}
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Message Title *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter a descriptive title for this message"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This title will help you identify the message in logs and reports
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Template Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-foreground">WhatsApp Template *</label>
                        
                        <Select
                          value={selectedTemplateId}
                          onValueChange={setSelectedTemplateId}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a WhatsApp template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex items-center gap-2 py-1">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{template.name}</span>
                                      <Badge variant={template.status === "APPROVED" ? "default" : "secondary"} className="text-xs">
                                        {template.status}
                                        </Badge>
                                    </div>
                                    {template.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                                    )}
                                </div>
                                        </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(!templates || templates.length === 0) && (
                          <div className="text-center py-6 text-muted-foreground">
                            <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No approved templates available</p>
                            <p className="text-xs">Create templates in the Templates section first</p>
                    </div>
                  )}

                        
                      </div>

                      {/* Template Variables Mapping */}
                      {selectedTemplate && selectedTemplate.templateVariables && selectedTemplate.templateVariables.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Template Variables</h4>
                                <p className="text-xs text-muted-foreground">
                              Configure how template variables will be populated with recipient data
                            </p>
                              </div>
                              <Button
                                type="button"
                                variant="glowing"
                                size="sm"
                                onClick={() => {
                                  // Scroll to preview section on the right
                                  const previewSection = document.getElementById('template-preview-section');
                                  if (previewSection) {
                                    previewSection.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Preview →
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              {selectedTemplate.templateVariables.map((variable, index) => (
                                <TemplateVariableMapper
                                  key={`${selectedTemplate.id}-${variable}-${index}`}
                                  variableName={variable}
                                  variableIndex={index + 1}
                                  mapping={templateDataMappings[variable]}
                                  onMappingChange={(dataField, fallbackValue) => {
                                     setTemplateDataMappings(prev => ({
                                       ...prev,
                                       [variable]: { dataField, fallbackValue }
                                     }));
                                   }}
                                />
                              ))}
                      </div>
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>
                )}

                                 {/* Step 3: Review & Send */}
                 {currentStep === 2 && (
                   <Card className="border-2 border-primary/20 shadow-lg max-h-[calc(100vh-200px)]">
                     <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                       <CardTitle className="flex items-center gap-2">
                         <Eye className="h-5 w-5 text-primary" />
                         Review & Send
                       </CardTitle>
                       <CardDescription>
                         Review your message details before sending
                       </CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4 pt-4 overflow-y-auto">
                      
                      {/* Message Summary */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Message Details</h4>
                          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Title:</span>
                              <span className="text-sm font-medium">{form.getValues('title')}</span>
                                </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Template:</span>
                              <span className="text-sm font-medium">{selectedTemplate?.name}</span>
                              </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Recipient Type:</span>
                              <span className="text-sm font-medium capitalize">{recipientType.replace(/_/g, ' ')}</span>
                                </div>
                          </div>
                              </div>

                        {/* Template Preview */}
                        {selectedTemplate && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Message Preview</h4>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg shadow-sm">
                                                                 <TemplateDataPreview
                                   dataMappings={templateDataMappings}
                                   recipients={[{
                                     id: "sample",
                                     name: "John Doe",
                                     phone: "+1234567890",
                                     type: "student",
                                     additional: {
                                       // Student data
                                       student: {
                                         name: "John Doe",
                                         firstName: "John",
                                         admissionNumber: "ADM2024001",
                                         rollNumber: "101",
                                         class: { name: "Class 10" },
                                         section: { name: "A" }
                                       },
                                       // Contact person data
                                       contactPersonName: "John Doe",
                                       firstName: "John",
                                       lastName: "Doe",
                                       // Parent data
                                       parent: {
                                         fatherName: "Mr. John Doe Sr.",
                                         motherName: "Mrs. Jane Doe",
                                         guardianName: "Mr. John Doe Sr."
                                       },
                                       // Staff data
                                       employeeCode: "EMP001",
                                       designation: "Teacher",
                                       // Financial data
                                       totalFeeDue: "5000",
                                       currentDue: "2500",
                                       dueDate: "2024-01-31",
                                       lastPaymentDate: "2023-12-15",
                                       nextInstallment: "2500",
                                       // Academic data
                                       academicSession: "2023-24",
                                       currentTerm: "First Term",
                                       attendancePercentage: "95%",
                                       lastExamResult: "A Grade",
                                       // Other data
                                       schoolName: "Demo School",
                                       branchName: "Main Campus"
                                     },
                                     // Direct properties for backwards compatibility
                                     className: "Class 10"
                                   }]}
                                 />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Final Send Button */}
                      <div className="space-y-4">
                        <Separator />
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full h-12 text-base font-semibold"
                          disabled={sendMessageMutation.isPending}
                        >
                          {sendMessageMutation.isPending ? (
                            <>
                              <Loader className="mr-2 h-5 w-5 animate-spin" />
                              Sending Message...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-5 w-5" />
                              Send Message Now
                            </>
                  )}
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                          By clicking send, you confirm that this message complies with WhatsApp's business policies and your organization's communication guidelines.
                        </p>
                      </div>

                </CardContent>
              </Card>
                )}

            </div>

              {/* Sidebar - Recipient Summary & Template Preview */}
               <div className="w-full lg:w-96 xl:w-[420px] 2xl:w-[480px] flex flex-col gap-6">
              <Card>
                <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5" />
                    Recipients Summary
                  </CardTitle>
                </CardHeader>
                   <CardContent className="space-y-4">
                  {(() => {
                      // Calculate final recipients based on current step and selections
                    let finalRecipients: Recipient[] = [];
                    
                      if (recipientType === "TEACHERS" && selectedTeachers.length > 0) {
                      finalRecipients = selectedTeachers.map(teacherId => {
                        const teacher = teachers.find(t => t.id === teacherId);
                        return {
                          id: teacherId,
                          name: `${teacher?.firstName} ${teacher?.lastName}`,
                          phone: teacher?.phone || '',
                          type: "teacher",
                          additional: {
                            contactPersonName: `${teacher?.firstName} ${teacher?.lastName}`,
                            firstName: teacher?.firstName,
                            lastName: teacher?.lastName,
                            employeeCode: teacher?.employeeCode,
                            designation: teacher?.designation
                          }
                        };
                      }).filter(r => r.phone);
                      } else if (recipientType === "EMPLOYEES" && selectedEmployees.length > 0) {
                      finalRecipients = selectedEmployees.map(employeeId => {
                        const employee = employees.find(e => e.id === employeeId);
                        return {
                          id: employeeId,
                          name: `${employee?.firstName} ${employee?.lastName}`,
                          phone: employee?.phone || '',
                          type: "employee",
                          additional: {
                            contactPersonName: `${employee?.firstName} ${employee?.lastName}`,
                            firstName: employee?.firstName,
                            lastName: employee?.lastName,
                            designation: employee?.designation
                          }
                        };
                      }).filter(r => r.phone);
                      } else if (recipients) {
                        finalRecipients = recipients;
                    }
                    
                    return finalRecipients.length === 0 ? (
                        <div className="text-center py-6">
                          <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground">No recipients selected</p>
                          <p className="text-xs text-muted-foreground">Complete step 1 to see recipients</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                            <span className="text-sm font-semibold">Total Recipients</span>
                            <Badge variant="default" className="text-base px-3 py-1">
                              {finalRecipients.length}
                            </Badge>
                        </div>
                        
                          {/* Contact Type Breakdown */}
                        {["ALL_CONTACTS", "ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType) && contactType.length > 0 && (
                          <div className="space-y-2">
                              <span className="text-xs font-semibold text-muted-foreground">Contact Types:</span>
                              <div className="space-y-1">
                              {contactType.map(type => {
                                const typeCount = finalRecipients.filter(r => r.type === type.toLowerCase()).length;
                                return (
                                    <div key={type} className="flex items-center justify-between py-1">
                                      <span className="text-xs text-muted-foreground capitalize">
                                        {type === "STUDENT" ? "Students" : type === "FATHER" ? "Fathers" : "Mothers"}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {typeCount}
                                  </Badge>
                                    </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                          {/* Sample Recipients */}
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-muted-foreground">Sample Recipients:</span>
                            <div className="max-h-96 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 border border-muted/20 rounded-lg p-2">
                              {finalRecipients.length > 0 ? (
                                finalRecipients.map((recipient, index) => (
                                  <div key={recipient.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 hover:bg-muted/50 rounded-lg min-w-0 transition-colors">
                                    <span className="text-xs font-medium truncate flex-1 min-w-0 max-w-[60%] sm:max-w-[70%] md:max-w-[75%]" title={recipient.name}>{recipient.name}</span>
                                    <Badge variant="outline" className="text-xs ml-2 capitalize flex-shrink-0">
                                {recipient.type}
                              </Badge>
                            </div>
                                ))
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                  <p className="text-xs">No recipients to display</p>
                                </div>
                              )}
                            </div>
                            {finalRecipients.length > 0 && (
                              <div className="text-center">
                                <span className="text-xs text-muted-foreground">
                                  Showing {finalRecipients.length} recipient{finalRecipients.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

                                 {/* Enhanced Template Preview */}
                 {selectedTemplate && (
              <div id="template-preview-section" className="space-y-4">


                {/* Raw Template Preview */}
              <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Raw Template
                       </CardTitle>
                     </CardHeader>
                  <CardContent>
                    <div className="text-sm bg-muted/50 p-3 rounded border font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {selectedTemplate.templateBody}
                      </div>
                  </CardContent>
                </Card>

                {/* Live Preview with Variable Substitution */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 flex-1 flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base text-green-800 dark:text-green-200">
                      <Eye className="h-4 w-4" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-sm flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">WhatsApp Message</div>
                          <div className="text-xs text-muted-foreground">Sample Preview</div>
                  </div>
                        </div>
                      
                      <div className="text-sm leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto">
                        {(() => {
                          let previewText = selectedTemplate.templateBody;
                          
                          // Create comprehensive sample recipient data that matches the expected structure
                          const sampleRecipient = {
                            id: "sample-recipient",
                            name: "John Doe",
                            phone: "+1234567890",
                            type: "student",
                            additional: {
                              // Student data
                              student: {
                                name: "John Doe",
                                firstName: "John",
                                admissionNumber: "ADM2024001",
                                rollNumber: "101",
                                class: { name: "Class 10" },
                                section: { name: "A" }
                              },
                              // Contact person data
                              contactPersonName: "John Doe",
                              firstName: "John",
                              lastName: "Doe",
                              // Parent data
                              parent: {
                                fatherName: "Mr. John Doe Sr.",
                                motherName: "Mrs. Jane Doe",
                                guardianName: "Mr. John Doe Sr."
                              },
                              // Staff data
                              employeeCode: "EMP001",
                              designation: "Teacher",
                              // Financial data
                              totalFeeDue: "5000",
                              currentDue: "2500",
                              dueDate: "2024-01-31",
                              lastPaymentDate: "2023-12-15",
                              nextInstallment: "2500",
                              // Academic data
                              academicSession: "2023-24",
                              currentTerm: "First Term",
                              attendancePercentage: "95%",
                              lastExamResult: "A Grade",
                              // Other data
                              schoolName: "Demo School",
                              branchName: "Main Campus"
                            },
                            // Direct properties for backwards compatibility
                            className: "Class 10"
                          };
                          
                          // Replace variables with actual data extraction logic
                          if (selectedTemplate.templateVariables) {
                            selectedTemplate.templateVariables.forEach(variable => {
                              const mapping = templateDataMappings[variable];
                              let replacementValue = "";
                              
                              if (mapping?.dataField) {
                                if (mapping.dataField === 'custom_value') {
                                  // For custom values, use the fallback value directly
                                  replacementValue = mapping.fallbackValue || `[${variable}]`;
                                } else {
                                  // Use the same data extraction logic as the backend
                                  replacementValue = extractRecipientData(sampleRecipient, mapping.dataField, mapping.fallbackValue);
                                }
                              } else {
                                // No mapping configured yet
                                replacementValue = `[${variable}]`;
                              }
                              
                              const regex = new RegExp(`{{${variable}}}`, 'g');
                              previewText = previewText.replace(regex, replacementValue);
                            });
                          }
                          
                          return previewText;
                        })()}
                      </div>
                      
                      <div className="mt-3 pt-2 border-t flex-shrink-0">
                        <div className="text-xs text-muted-foreground">
                          💡 Sample data preview. Real messages use actual recipient data.
                        </div>
                      </div>
                    </div>
                </CardContent>
              </Card>
              </div>
                )}
            </div>
          </div>

                         {/* Navigation Buttons */}
             <div className="flex justify-between items-center pt-6 border-t-2 border-border/20 mt-6 px-2">
                             <Button
                 type="button"
                 variant="outline"
                 onClick={handlePrevious}
                 disabled={currentStep === 0}
                 className="min-w-32 h-12 text-base"
                 size="lg"
               >
                 <ArrowLeft className="mr-2 h-5 w-5" />
                 Previous
               </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>

              {currentStep < STEPS.length - 1 ? (
                                 <Button
                   type="button"
                   onClick={handleNext}
                   disabled={!canProceedToNextStep()}
                   className="min-w-32 h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                   size="lg"
                 >
                   Next
                   <ArrowRight className="ml-2 h-5 w-5" />
                 </Button>
              ) : (
                                 <Button
                   type="submit"
                   disabled={sendMessageMutation.isPending || !selectedTemplateId}
                   className="min-w-32 h-12 text-base bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg"
                   size="lg"
                 >
                                     {sendMessageMutation.isPending ? (
                     <>
                       <Loader className="mr-2 h-5 w-5 animate-spin" />
                       Sending...
                     </>
                   ) : (
                     <>
                       <Send className="mr-2 h-5 w-5" />
                       Send Message
                     </>
                   )}
                </Button>
              )}
            </div>

        </form>
      </FormProvider>
      </div>
    </div>
    </PageGuard>
  );
}
// Dynamically import to disable SSR completely
const DynamicSendMessagePageContent = dynamic(() => Promise.resolve(SendMessagePageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function SendMessagePage() {
  return <DynamicSendMessagePageContent />;
} 