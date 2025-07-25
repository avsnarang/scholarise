"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { 
  Send, 
  Users, 
  MessageSquare, 
  ArrowLeft,
  AlertCircle,
  Search,
  Plus,
  X,
  GraduationCap,
  UserCheck,
  Briefcase,
  School,
  Building,
  Check,
  ChevronsUpDown
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { TemplateVariableMapper } from "@/components/communication/template-variable-mapper";
import { TemplateDataPreview } from "@/components/communication/template-data-preview";

const sendMessageSchema = z.object({
  title: z.string().min(1, "Message title is required"),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
  recipientType: z.enum([
    "ALL_STUDENTS",
    "INDIVIDUAL_STUDENTS", 
    "ENTIRE_CLASS",
    "INDIVIDUAL_SECTION",
    "TEACHERS",
    "EMPLOYEES",
  ]),
  contactType: z.array(z.enum(["STUDENT", "FATHER", "MOTHER"])).optional(), // For student-related selections
  selectedTeachers: z.array(z.string()).optional(), // For individual teacher selection
  selectedEmployees: z.array(z.string()).optional(), // For individual employee selection
  templateParameters: z.record(z.string()).optional(),
});

type SendMessageFormData = z.infer<typeof sendMessageSchema>;

interface Recipient {
  id: string;
  name: string;
  phone: string;
  type: string;
  additional?: any;
}

export default function SendMessagePage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  // Controlled state to avoid form.watch() issues
  const [recipientType, setRecipientType] = useState<string>("ALL_STUDENTS");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
      contactType: ["STUDENT"],
      selectedTeachers: [],
      selectedEmployees: [],
    },
  });

  // Fetch templates
  const { data: templates } = api.communication.getTemplates.useQuery({
    isActive: true,
  });

  // Send message mutation
  const sendMessageMutation = api.communication.sendMessage.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Message Sent Successfully",
        description: `Message sent to ${data.totalRecipients} recipients. ${data.successfulSent} successful, ${data.failed} failed.`,
      });
      // Reset form and selections
      form.reset({
        title: "",
        customMessage: "",
        recipientType: "ALL_STUDENTS",
        templateId: "",
        templateParameters: {},
        contactType: ["STUDENT"],
        selectedTeachers: [],
        selectedEmployees: [],
      });
      setSelectedRecipients([]);
      setSelectedClassIds([]);
      setSelectedSectionIds([]);
      setSelectedTeachers([]);
      setSelectedEmployees([]);
      setRecipientType("ALL_STUDENTS");
      setSelectedTemplateId("");
      setSearchTerm("");
      setContactType(["STUDENT"]);
      setClassComboboxOpen(false);
      setSectionComboboxOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch classes for filtering
  const { data: classes } = api.class.getAll.useQuery({
    branchId: currentBranchId!,
    sessionId: currentSessionId!,
  }, {
    enabled: !!currentBranchId && !!currentSessionId,
  });

  // Fetch sections for filtering
  const { data: sections } = api.section.getAll.useQuery({
    classId: selectedClassIds[0],
    branchId: currentBranchId!,
    sessionId: currentSessionId!,
  }, {
    enabled: selectedClassIds.length > 0 && !!currentBranchId && !!currentSessionId,
  });

  // Fetch teachers
  const { data: teachersData } = api.teacher.getAll.useQuery({
    branchId: currentBranchId!,
  }, {
    enabled: !!currentBranchId,
  });

  // Fetch employees
  const { data: employeesData } = api.employee.getAll.useQuery({
    branchId: currentBranchId!,
  }, {
    enabled: !!currentBranchId,
  });

  // Extract teachers and employees arrays
  const teachers = teachersData?.items || [];
  const employees = employeesData?.items || [];

  // Map individual recipient types to their corresponding ALL types for API call
  const getApiRecipientType = (type: string) => {
    switch (type) {
      case "INDIVIDUAL_STUDENTS":
        return "ALL_STUDENTS";
      case "INDIVIDUAL_TEACHERS":
        return "ALL_TEACHERS";
      case "INDIVIDUAL_EMPLOYEES":
        return "ALL_EMPLOYEES";
      default:
        return type;
    }
  };

  // Fetch recipients based on current selection
  const { data: recipients, isLoading: recipientsLoading } = api.communication.getRecipients.useQuery({
    recipientType: getApiRecipientType(recipientType) as any,
    branchId: currentBranchId!,
    classIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
    sectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
    contactType: ["ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType) ? contactType as ("STUDENT" | "FATHER" | "MOTHER")[] : undefined,
  }, {
    enabled: !!currentBranchId && !!recipientType,
    refetchOnMount: true,
  });

  // Get selected template
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  // Filter recipients for individual selection
  const filteredRecipients = recipients?.filter(recipient =>
    recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipient.phone.includes(searchTerm)
  ) || [];

  // Clear selections when recipient type changes
  useEffect(() => {
    setSelectedRecipients([]);
    setSelectedClassIds([]);
    setSelectedSectionIds([]);
    setSearchTerm("");
  }, [recipientType]);

  // Clear selected recipients when contact type changes for student-related recipients
  useEffect(() => {
    if (["ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType)) {
      setSelectedRecipients([]);
    }
  }, [contactType, recipientType]);

  // Update form when controlled state changes
  useEffect(() => {
    form.setValue("recipientType", recipientType as any);
  }, [recipientType, form]);

  useEffect(() => {
    form.setValue("templateId", selectedTemplateId || "");
  }, [selectedTemplateId, form]);

  // Reset template parameters when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const params: Record<string, string> = {};
      selectedTemplate.templateVariables?.forEach((variable: string) => {
        params[variable] = "";
      });
      form.setValue("templateParameters", params);
      
      // Reset data mappings when template changes
      setTemplateDataMappings({});
    } else {
      form.setValue("templateParameters", {});
      setTemplateDataMappings({});
    }
  }, [selectedTemplate, form]);

  const handleRecipientTypeChange = (type: string) => {
    setRecipientType(type);
    // Reset selections when changing recipient type
    setSelectedRecipients([]);
    setSelectedClassIds([]);
    setSelectedSectionIds([]);
    setSelectedTeachers([]);
    setSelectedEmployees([]);
    setSearchTerm("");
    // Reset combobox states
    setClassComboboxOpen(false);
    setSectionComboboxOpen(false);
    // Reset contact type to default for student-related selections
    if (["ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(type)) {
      setContactType(["STUDENT"]);
    }
  };

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

  const requiresClassFilter = ["ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType);
  const requiresSectionFilter = recipientType === "INDIVIDUAL_SECTION";
  const requiresIndividualSelection = recipientType.includes("INDIVIDUAL_");

  const onSubmit = async (data: SendMessageFormData) => {
    // Get final recipients list based on recipient type
    let finalRecipients: Recipient[] = [];
    
    if (recipientType === "TEACHERS") {
      // Use selected teachers
      if (selectedTeachers.length === 0) {
        toast({
          title: "No Teachers Selected",
          description: "Please select at least one teacher.",
          variant: "destructive",
        });
        return;
      }
      
      finalRecipients = selectedTeachers.map(teacherId => {
        const teacher = teachers.find(t => t.id === teacherId);
        return {
          id: teacherId,
          name: `${teacher?.firstName} ${teacher?.lastName}`,
          phone: teacher?.phone || '',
          type: "teacher",
        };
      }).filter(r => r.phone);
      
    } else if (recipientType === "EMPLOYEES") {
      // Use selected employees
      if (selectedEmployees.length === 0) {
        toast({
          title: "No Employees Selected",
          description: "Please select at least one employee.",
          variant: "destructive",
        });
        return;
      }
      
      finalRecipients = selectedEmployees.map(employeeId => {
        const employee = employees.find(e => e.id === employeeId);
        return {
          id: employeeId,
          name: `${employee?.firstName} ${employee?.lastName}`,
          phone: employee?.phone || '',
          type: "employee",
        };
      }).filter(r => r.phone);
      
    } else if (requiresIndividualSelection) {
      finalRecipients = selectedRecipients;
    } else {
      finalRecipients = recipients || [];
    }

    if (finalRecipients.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one recipient with a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!data.templateId && !data.customMessage) {
      toast({
        title: "Message Content Required",
        description: "Please select a template or enter a custom message.",
        variant: "destructive",
      });
      return;
    }

    // Validate contact type selection for student-related recipients
    if (["ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType)) {
      if (contactType.length === 0) {
        toast({
          title: "Contact Type Required",
          description: "Please select at least one contact type (Student, Father, or Mother).",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Build template parameters from data mappings
      let templateParameters = data.templateParameters || {};
      
      if (data.templateId && Object.keys(templateDataMappings).length > 0) {
        // Use data mappings to build parameters for first recipient (for validation)
        const { buildTemplateParameters } = await import("@/utils/template-data-mapper");
        const dataMappings = Object.entries(templateDataMappings).map(([variableName, mapping]) => ({
          variableName,
          dataField: mapping.dataField,
          fallbackValue: mapping.fallbackValue
        }));
        
        const recipientParameters = buildTemplateParameters(finalRecipients, dataMappings);
        
        // Use first recipient's parameters for the mutation (individual parameters will be built per recipient in the backend)
        if (finalRecipients.length > 0 && finalRecipients[0]) {
          templateParameters = recipientParameters[finalRecipients[0].id] || {};
        }
      }

      await sendMessageMutation.mutateAsync({
        ...data,
        templateParameters,
        templateDataMappings: Object.keys(templateDataMappings).length > 0 ? templateDataMappings : undefined,
        recipients: finalRecipients as any,
        branchId: currentBranchId!,
        contactType: contactType,
        selectedTeachers: selectedTeachers,
        selectedEmployees: selectedEmployees,
      } as any);
    } catch (error) {
      // Error handled in mutation onError
      console.error("Send message error:", error);
    }
  };

  if (!hasPermission("create_communication_message")) {
    return (
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
    );
  }

  return (
    <div className="w-full px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Send Message</h1>
            <p className="text-muted-foreground">Compose and send WhatsApp messages to your selected recipients</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href={`/communication`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Message Composition */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Message Details
                  </CardTitle>
                  <CardDescription>
                    Enter the basic information for your message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter a descriptive title for this message"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This title will help you identify the message in logs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Template Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp Template</label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={setSelectedTemplateId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an approved template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex w-full items-center justify-between">
                              <span>{template.name}</span>
                              <Badge
                                className="ml-2"
                                variant={
                                  template.status === "APPROVED"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {template.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Select a pre-approved WhatsApp template. Custom messages require template approval.
                    </p>
                  </div>

                  {/* Template Parameters */}
                  {selectedTemplate && selectedTemplate.templateVariables?.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Template Variables Mapping</h4>
                        <p className="mb-4 text-xs text-gray-500">
                          Map each template variable to recipient data fields. Data will be automatically populated based on each recipient.
                        </p>
                        {selectedTemplate.templateVariables.map((variable: string, index: number) => (
                          <TemplateVariableMapper
                            key={variable}
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
                        
                        {/* Preview Section */}
                        {Object.keys(templateDataMappings).length > 0 && recipients && recipients.length > 0 && (
                          <TemplateDataPreview 
                            dataMappings={templateDataMappings}
                            recipients={recipients}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Message */}
                  <FormField
                    control={form.control}
                    name="customMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Message {!selectedTemplateId && "*"}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your message content..."
                            rows={4}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          {selectedTemplateId 
                            ? "Optional: Add additional text to the template"
                            : "Enter the message you want to send to recipients"
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Template Preview */}
                  {selectedTemplate && (
                    <div className="space-y-2">
                      <Separator />
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Template Preview</h4>
                        <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
                          <p className="text-sm whitespace-pre-wrap">
                            {selectedTemplate.templateBody}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recipient Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Recipients
                  </CardTitle>
                  <CardDescription>
                    Choose who will receive this message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recipient Type Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Recipient Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { value: "ALL_STUDENTS", label: "All Students", icon: <GraduationCap className="w-4 h-4" /> },
                        { value: "INDIVIDUAL_STUDENTS", label: "Individual Students", icon: <GraduationCap className="w-4 h-4" /> },
                        { value: "ENTIRE_CLASS", label: "Entire Class", icon: <School className="w-4 h-4" /> },
                        { value: "INDIVIDUAL_SECTION", label: "Individual Section", icon: <Building className="w-4 h-4" /> },
                        { value: "TEACHERS", label: "Teachers", icon: <UserCheck className="w-4 h-4" /> },
                        { value: "EMPLOYEES", label: "Employees", icon: <Briefcase className="w-4 h-4" /> }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={recipientType === option.value ? "default" : "outline"}
                          className="justify-start h-auto p-3"
                          onClick={() => handleRecipientTypeChange(option.value)}
                        >
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span className="text-xs">{option.label}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Type Selection for Students */}
                  {["ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType) && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <label className="text-sm font-medium mb-3 block">Contact Type</label>
                        <div className="flex gap-2">
                          {[
                            { value: "STUDENT", label: "Student Phone", icon: <GraduationCap className="w-4 h-4" /> },
                            { value: "FATHER", label: "Father Phone", icon: <Users className="w-4 h-4" /> },
                            { value: "MOTHER", label: "Mother Phone", icon: <Users className="w-4 h-4" /> }
                          ].map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={contactType.includes(option.value) ? "default" : "outline"}
                              size="sm"
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
                              <div className="flex items-center gap-1">
                                {option.icon}
                                <span className="text-xs">{option.label}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Select which phone numbers to send messages to. You can select multiple options.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Teacher Multi-Select */}
                  {recipientType === "TEACHERS" && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <label className="text-sm font-medium mb-3 block">Select Teachers</label>
                        <div className="space-y-2">
                          <Input
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                          />
                          
                          {/* Select All Option */}
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="select-all-teachers"
                                checked={selectedTeachers.length === teachers.length && teachers.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTeachers(teachers.map(t => t.id));
                                  } else {
                                    setSelectedTeachers([]);
                                  }
                                }}
                              />
                              <label
                                htmlFor="select-all-teachers"
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                Select All Teachers
                              </label>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {teachers.length} total
                            </span>
                          </div>
                          
                          <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                            {teachers.filter(teacher => 
                              `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((teacher) => (
                              <div key={teacher.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                <Checkbox
                                  id={`teacher-${teacher.id}`}
                                  checked={selectedTeachers.includes(teacher.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTeachers(prev => [...prev, teacher.id]);
                                    } else {
                                      setSelectedTeachers(prev => prev.filter(id => id !== teacher.id));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`teacher-${teacher.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer flex-1"
                                >
                                  {teacher.firstName} {teacher.lastName}
                                  {teacher.designation && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({teacher.designation})
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                          {selectedTeachers.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {selectedTeachers.length} teacher(s) selected
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employee Multi-Select */}
                  {recipientType === "EMPLOYEES" && (
                    <div className="space-y-4">
                      <Separator />
                      <div>
                        <label className="text-sm font-medium mb-3 block">Select Employees</label>
                        <div className="space-y-2">
                          <Input
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                          />
                          
                          {/* Select All Option */}
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="select-all-employees"
                                checked={selectedEmployees.length === employees.length && employees.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedEmployees(employees.map(e => e.id));
                                  } else {
                                    setSelectedEmployees([]);
                                  }
                                }}
                              />
                              <label
                                htmlFor="select-all-employees"
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                Select All Employees
                              </label>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {employees.length} total
                            </span>
                          </div>
                          
                          <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                            {employees.filter(employee => 
                              `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((employee) => (
                              <div key={employee.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                <Checkbox
                                  id={`employee-${employee.id}`}
                                  checked={selectedEmployees.includes(employee.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedEmployees(prev => [...prev, employee.id]);
                                    } else {
                                      setSelectedEmployees(prev => prev.filter(id => id !== employee.id));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`employee-${employee.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer flex-1"
                                >
                                  {employee.firstName} {employee.lastName}
                                  {employee.designation && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({employee.designation})
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                          {selectedEmployees.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {selectedEmployees.length} employee(s) selected
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Class/Section Filters */}
                  {(requiresClassFilter || requiresSectionFilter) && (
                    <div className="space-y-4">
                      <Separator />
                      
                      {/* Class Multi-Select Combobox */}
                      {requiresClassFilter && (
                        <div>
                          <label className="text-sm font-medium mb-3 block">Select Classes</label>
                          <Popover open={classComboboxOpen} onOpenChange={setClassComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={classComboboxOpen}
                                className="w-full justify-between h-auto min-h-10"
                              >
                                <div className="flex flex-wrap gap-1">
                                  {selectedClassIds.length === 0 ? (
                                    <span className="text-muted-foreground">Select classes...</span>
                                  ) : (
                                    selectedClassIds.map(classId => {
                                      const classItem = classes?.find(c => c.id === classId);
                                      return (
                                        <Badge key={classId} variant="secondary" className="mr-1">
                                          {classItem?.name}
                                          <X 
                                            className="ml-1 h-3 w-3 cursor-pointer" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedClassIds(prev => prev.filter(id => id !== classId));
                                              setSelectedSectionIds(prev => 
                                                prev.filter(id => !sections?.find(s => s.id === id && s.classId === classId))
                                              );
                                            }}
                                          />
                                        </Badge>
                                      );
                                    })
                                  )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search classes..." />
                                <CommandList>
                                  <CommandEmpty>No classes found.</CommandEmpty>
                                  <CommandGroup>
                                    {classes?.map((classItem) => (
                                      <CommandItem
                                        key={classItem.id}
                                        value={classItem.name}
                                        onSelect={() => {
                                          const isSelected = selectedClassIds.includes(classItem.id);
                                          if (isSelected) {
                                            setSelectedClassIds(prev => prev.filter(id => id !== classItem.id));
                                            setSelectedSectionIds(prev => 
                                              prev.filter(id => !sections?.find(s => s.id === id && s.classId === classItem.id))
                                            );
                                          } else {
                                            setSelectedClassIds(prev => [...prev, classItem.id]);
                                          }
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedClassIds.includes(classItem.id) ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {classItem.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {selectedClassIds.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {selectedClassIds.length} class(es) selected
                            </p>
                          )}
                        </div>
                      )}

                      {/* Section Multi-Select Combobox */}
                      {requiresSectionFilter && selectedClassIds.length > 0 && (
                        <div>
                          <label className="text-sm font-medium mb-3 block">Select Sections</label>
                          <Popover open={sectionComboboxOpen} onOpenChange={setSectionComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={sectionComboboxOpen}
                                className="w-full justify-between h-auto min-h-10"
                              >
                                <div className="flex flex-wrap gap-1">
                                  {selectedSectionIds.length === 0 ? (
                                    <span className="text-muted-foreground">Select sections...</span>
                                  ) : (
                                    selectedSectionIds.map(sectionId => {
                                      const section = sections?.find(s => s.id === sectionId);
                                      return (
                                        <Badge key={sectionId} variant="secondary" className="mr-1">
                                          {section?.name} ({section?.class?.name})
                                          <X 
                                            className="ml-1 h-3 w-3 cursor-pointer" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSectionIds(prev => prev.filter(id => id !== sectionId));
                                            }}
                                          />
                                        </Badge>
                                      );
                                    })
                                  )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search sections..." />
                                <CommandList>
                                  <CommandEmpty>No sections found.</CommandEmpty>
                                  <CommandGroup>
                                    {sections?.filter(section => selectedClassIds.includes(section.classId)).map((section) => (
                                      <CommandItem
                                        key={section.id}
                                        value={`${section.name} ${section.class?.name}`}
                                        onSelect={() => {
                                          const isSelected = selectedSectionIds.includes(section.id);
                                          if (isSelected) {
                                            setSelectedSectionIds(prev => prev.filter(id => id !== section.id));
                                          } else {
                                            setSelectedSectionIds(prev => [...prev, section.id]);
                                          }
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            selectedSectionIds.includes(section.id) ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {section.name} ({section.class?.name})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {selectedSectionIds.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {selectedSectionIds.length} section(s) selected
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Selection */}
                  {requiresIndividualSelection && recipients && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Select Individual Recipients</h4>
                        {selectedRecipients.length > 0 && (
                          <Badge variant="secondary">{selectedRecipients.length} selected</Badge>
                        )}
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search by name or phone number..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Actions */}
                      {filteredRecipients.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllFilteredRecipients}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Select All ({filteredRecipients.length})
                          </Button>
                          {selectedRecipients.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearAllSelections}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Clear All
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Recipients List */}
                      <div className="max-h-80 overflow-y-auto space-y-2">
                        {recipientsLoading ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <span className="text-sm text-gray-600 mt-2">Loading recipients...</span>
                          </div>
                        ) : filteredRecipients.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">No recipients found</p>
                          </div>
                        ) : (
                          filteredRecipients.map((recipient) => (
                            <div
                              key={recipient.id}
                              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isRecipientSelected(recipient)
                                  ? "bg-blue-50 border-blue-200"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => toggleRecipient(recipient)}
                            >
                              <Checkbox
                                checked={isRecipientSelected(recipient)}
                                onChange={() => {}} // Controlled by parent click
                              />
                              
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-xs">
                                  {getInitials(recipient.name)}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {recipient.name}
                                  </p>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {recipient.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500">{recipient.phone}</p>
                              </div>

                              <div className="flex-shrink-0">
                                {getRecipientIcon(recipient.type)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipients Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Calculate final recipients based on recipient type
                    let finalRecipients: Recipient[] = [];
                    
                    if (recipientType === "TEACHERS") {
                      // Use selected teachers
                      finalRecipients = selectedTeachers.map(teacherId => {
                        const teacher = teachers.find(t => t.id === teacherId);
                        return {
                          id: teacherId,
                          name: `${teacher?.firstName} ${teacher?.lastName}`,
                          phone: teacher?.phone || '',
                          type: "teacher",
                        };
                      }).filter(r => r.phone);
                    } else if (recipientType === "EMPLOYEES") {
                      // Use selected employees
                      finalRecipients = selectedEmployees.map(employeeId => {
                        const employee = employees.find(e => e.id === employeeId);
                        return {
                          id: employeeId,
                          name: `${employee?.firstName} ${employee?.lastName}`,
                          phone: employee?.phone || '',
                          type: "employee",
                        };
                      }).filter(r => r.phone);
                    } else if (requiresIndividualSelection) {
                      finalRecipients = selectedRecipients;
                    } else {
                      finalRecipients = recipients || [];
                    }
                    
                    return finalRecipients.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">No recipients selected</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Total Recipients</span>
                          <Badge variant="outline">{finalRecipients.length}</Badge>
                        </div>
                        
                        {/* Contact Type Breakdown for Student-related recipients */}
                        {["ALL_STUDENTS", "INDIVIDUAL_STUDENTS", "ENTIRE_CLASS", "INDIVIDUAL_SECTION"].includes(recipientType) && contactType.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-medium text-gray-600">Contact Types:</span>
                            <div className="flex flex-wrap gap-1">
                              {contactType.map(type => {
                                const typeCount = finalRecipients.filter(r => r.type === type.toLowerCase()).length;
                                return (
                                  <Badge key={type} variant="secondary" className="text-xs">
                                    {type === "STUDENT" ? "Student" : type === "FATHER" ? "Father" : "Mother"}: {typeCount}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="max-h-32 space-y-1 overflow-y-auto">
                          {finalRecipients.slice(0, 10).map((recipient) => (
                            <div key={recipient.id} className="text-xs text-gray-500 flex justify-between">
                              <span>{recipient.name}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {recipient.type}
                              </Badge>
                            </div>
                          ))}
                          {finalRecipients.length > 10 && (
                            <div className="text-xs text-gray-400">
                              +{finalRecipients.length - 10} more recipients
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={sendMessageMutation.isPending}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>

                    <p className="text-center text-xs text-gray-500">
                      By clicking send, you confirm that this message complies with WhatsApp's business policies
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
} 