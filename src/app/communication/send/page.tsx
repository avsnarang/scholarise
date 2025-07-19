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
  Building
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

const sendMessageSchema = z.object({
  title: z.string().min(1, "Message title is required"),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
  recipientType: z.enum([
    "ALL_STUDENTS",
    "INDIVIDUAL_STUDENTS",
    "ENTIRE_CLASS",
    "SPECIFIC_SECTION",
    "ALL_TEACHERS", 
    "INDIVIDUAL_TEACHERS",
    "ALL_EMPLOYEES",
    "INDIVIDUAL_EMPLOYEES",
    "PARENTS",
  ]),
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

  const form = useForm<SendMessageFormData>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      title: "",
      customMessage: "",
      recipientType: "ALL_STUDENTS",
      templateId: "",
      templateParameters: {},
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
      });
      setSelectedRecipients([]);
      setSelectedClassIds([]);
      setSelectedSectionIds([]);
      setRecipientType("ALL_STUDENTS");
      setSelectedTemplateId("");
      setSearchTerm("");
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
  }, {
    enabled: !!currentBranchId && !!recipientType,
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
    } else {
      form.setValue("templateParameters", {});
    }
  }, [selectedTemplate, form]);

  const handleRecipientTypeChange = (type: string) => {
    setRecipientType(type);
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

  const requiresClassFilter = ["ENTIRE_CLASS", "SPECIFIC_SECTION"].includes(recipientType);
  const requiresSectionFilter = recipientType === "SPECIFIC_SECTION";
  const requiresIndividualSelection = recipientType.includes("INDIVIDUAL_");

  const onSubmit = async (data: SendMessageFormData) => {
    // Get final recipients list
    let finalRecipients: Recipient[] = [];
    
    if (requiresIndividualSelection) {
      finalRecipients = selectedRecipients;
    } else {
      finalRecipients = recipients || [];
    }

    if (finalRecipients.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one recipient.",
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

    try {
      await sendMessageMutation.mutateAsync({
        ...data,
        recipients: finalRecipients as any,
        branchId: currentBranchId!,
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
                        <h4 className="mb-2 text-sm font-medium">Template Parameters</h4>
                        <p className="mb-4 text-xs text-gray-500">
                          Fill in the dynamic values for this template
                        </p>
                                                 {selectedTemplate.templateVariables.map((variable: string) => (
                           <FormField
                             key={variable}
                             control={form.control}
                             name={`templateParameters.${variable}`}
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel className="capitalize">
                                   {variable.replace(/_/g, " ")}
                                 </FormLabel>
                                 <FormControl>
                                   <Input
                                     placeholder={`Enter ${variable}`}
                                     {...field}
                                     value={field.value || ""}
                                   />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                         ))}
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
                        { value: "SPECIFIC_SECTION", label: "Specific Section", icon: <Building className="w-4 h-4" /> },
                        { value: "ALL_TEACHERS", label: "All Teachers", icon: <UserCheck className="w-4 h-4" /> },
                        { value: "INDIVIDUAL_TEACHERS", label: "Individual Teachers", icon: <UserCheck className="w-4 h-4" /> },
                        { value: "ALL_EMPLOYEES", label: "All Employees", icon: <Briefcase className="w-4 h-4" /> },
                        { value: "INDIVIDUAL_EMPLOYEES", label: "Individual Employees", icon: <Briefcase className="w-4 h-4" /> },
                        { value: "PARENTS", label: "All Parents", icon: <Users className="w-4 h-4" /> }
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

                  {/* Class/Section Filters */}
                  {(requiresClassFilter || requiresSectionFilter) && (
                    <div className="space-y-4">
                      <Separator />
                      {/* Class Selection */}
                      {requiresClassFilter && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">Select Classes</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {classes?.map((classItem) => (
                              <div key={classItem.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`class-${classItem.id}`}
                                  checked={selectedClassIds.includes(classItem.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedClassIds(prev => [...prev, classItem.id]);
                                    } else {
                                      setSelectedClassIds(prev => prev.filter(id => id !== classItem.id));
                                      setSelectedSectionIds(prev => 
                                        prev.filter(id => !sections?.find(s => s.id === id && s.classId === classItem.id))
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`class-${classItem.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {classItem.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section Selection */}
                      {requiresSectionFilter && selectedClassIds.length > 0 && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">Select Sections</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {sections?.map((section) => (
                              <div key={section.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`section-${section.id}`}
                                  checked={selectedSectionIds.includes(section.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedSectionIds(prev => [...prev, section.id]);
                                    } else {
                                      setSelectedSectionIds(prev => prev.filter(id => id !== section.id));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`section-${section.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {section.name} ({section.class?.name})
                                </label>
                              </div>
                            ))}
                          </div>
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
                    const finalRecipients = requiresIndividualSelection ? selectedRecipients : (recipients || []);
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
                        
                        <div className="max-h-32 space-y-1 overflow-y-auto">
                          {finalRecipients.slice(0, 10).map((recipient) => (
                            <div key={recipient.id} className="text-xs text-gray-500">
                              {recipient.name}
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