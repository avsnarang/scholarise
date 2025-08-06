"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileText, 
  Plus, 
  Eye, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Copy,
  Sparkles,
  Settings,
  Wand2,
  Image,
  Video,
  FileIcon,
  Music,
  Type,
  Link,
  Phone,
  MessageSquare,
  X,
  ArrowUp,
  ArrowDown,
  Smartphone,
  Send,
  Upload,
  Trash2,
  Bold,
  Italic,
  Strikethrough,
  Code
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import { WhatsAppMediaUpload } from "@/components/ui/whatsapp-media-upload";
import { TemplateValidationHelper } from "./template-validation-helper";
import { 
  ERP_VARIABLES, 
  TEMPLATE_EXAMPLES,
  type TemplateVariable, 
  parseTemplateVariables,
  renderTemplate,
  validateTemplateVariables,
  getVariableByKey
} from "@/utils/template-variables";
import { 
  type MediaUploadResult,
  type WhatsAppMediaType
} from "@/utils/whatsapp-media";

// Safe template preview component
function SafeTemplatePreview({ 
  templateContent, 
  sampleVariables 
}: { 
  templateContent: string; 
  sampleVariables: Record<string, string> 
}) {
  // Create a completely safe version that won't trigger React JSX evaluation
  const createSafePreview = React.useMemo(() => {
    console.log('SafeTemplatePreview v2.0 - Fixed version running', { templateContent: templateContent.substring(0, 50) + '...', sampleVariables });
    try {
      // First, ensure all sample variables are strings with hardcoded fallbacks
      const safeSampleVariables: Record<string, string> = {
        // Hardcoded fallbacks for common problematic variables
        receipt_number: 'REC-2024-001',
        student_name: 'John Doe',
        payment_amount: '₹5,000',
        payment_date: '15/01/2025',
        parent_name: 'Mr. John Doe',
        school_name: 'Sample School',
        ...sampleVariables  // Override with actual sample variables if they exist
      };
      
      // Ensure all values are strings
      Object.entries(safeSampleVariables).forEach(([key, value]) => {
        safeSampleVariables[key] = String(value || `[${key}]`);
      });

      // Replace variables manually and safely
      let safeContent = templateContent;
      
      // Replace all template variables with their sample values
      Object.entries(safeSampleVariables).forEach(([key, value]) => {
        const variablePattern = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
        safeContent = safeContent.replace(variablePattern, value);
      });

      // Replace any remaining {{...}} patterns with safe placeholders
      safeContent = safeContent.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        console.warn(`Unreplaced template variable: ${variable.trim()}`);
        return `[${variable.trim()}]`;
      });

      // Final safety checks to prevent any React JSX evaluation
      const finalSafeContent = safeContent
        .replace(/\{(?!\{)/g, '[BRACE]')  // Replace single { with safe text
        .replace(/(?<!\})\}/g, '[/BRACE]') // Replace single } with safe text
        .replace(/\$\{/g, '[DOLLAR_BRACE]') // Replace template literals
        .replace(/javascript:/gi, '[BLOCKED_SCRIPT]') // Block any script attempts
        .replace(/<script/gi, '[BLOCKED_SCRIPT_TAG]'); // Block script tags

      console.log('Final safe content:', finalSafeContent.substring(0, 100) + '...');
      return finalSafeContent;
    } catch (error) {
      console.error('Template preview error:', error);
      return `Template preview error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }, [templateContent, sampleVariables]);

  // Render as plain text, never as HTML or JSX
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {createSafePreview}
    </span>
  );
}

// Enhanced schema for rich templates
const enhancedTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]),
  language: z.string().min(1, "Language is required"),
  
  // Body content (required)
  templateBody: z.string().min(1, "Template content is required"),
  
  // Header (optional)
  headerType: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
  headerContent: z.string().optional(),
  headerMediaUrl: z.string().optional(),
  headerFilename: z.string().optional(),
  
  // Footer (optional)
  footerText: z.string().max(60, "Footer text cannot exceed 60 characters").optional(),
  
  // Interactive buttons (optional)
  buttons: z.array(z.object({
    id: z.string(),
    type: z.enum(["CALL_TO_ACTION", "QUICK_REPLY", "URL", "PHONE_NUMBER"]),
    text: z.string().max(25, "Button text cannot exceed 25 characters"),
    url: z.string().optional(),
    phoneNumber: z.string().optional(),
    payload: z.string().optional(),
    order: z.number()
  })).max(3, "Maximum 3 buttons allowed").optional(),
  
  // Interactive type
  interactiveType: z.enum(["BUTTON", "LIST", "CTA_URL"]).optional(),
  
  // Template media
  templateMedia: z.array(z.object({
    id: z.string(),
    type: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"]),
    url: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    supabasePath: z.string(),
    bucket: z.string().optional().default("whatsapp-media")
  })).optional(),
});

type EnhancedTemplateFormData = z.infer<typeof enhancedTemplateSchema>;

interface EnhancedTemplateBuilderProps {
  initialData?: Partial<EnhancedTemplateFormData>;
  onSave: (data: EnhancedTemplateFormData & { templateVariables: string[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  showHeader?: boolean;
}

export function EnhancedTemplateBuilder({ 
  initialData, 
  onSave, 
  onCancel, 
  isLoading, 
  showHeader = true 
}: EnhancedTemplateBuilderProps) {
  const { toast } = useToast();
  
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [sampleVariables, setSampleVariables] = useState<Record<string, string>>({});
  const [variableSearchOpen, setVariableSearchOpen] = useState(false);
  const [showOptionalSections, setShowOptionalSections] = useState({
    header: !!initialData?.headerType,
    footer: !!initialData?.footerText,
    buttons: !!(initialData?.buttons && initialData.buttons.length > 0),
    media: !!(initialData?.templateMedia && initialData.templateMedia.length > 0)
  });

  // Add ref for textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<EnhancedTemplateFormData>({
    resolver: zodResolver(enhancedTemplateSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      category: initialData?.category || "UTILITY",
      language: initialData?.language || "en",
      templateBody: initialData?.templateBody || "",
      headerType: initialData?.headerType,
      headerContent: initialData?.headerContent || "",
      headerMediaUrl: initialData?.headerMediaUrl || "",
      headerFilename: initialData?.headerFilename || "",
      footerText: initialData?.footerText || "",
      buttons: initialData?.buttons || [],
      interactiveType: initialData?.interactiveType,
      templateMedia: initialData?.templateMedia?.map(media => ({
        ...media,
        bucket: media.bucket || "whatsapp-media"
      })) || [],
    },
  });

  const { fields: buttonFields, append: appendButton, remove: removeButton } = useFieldArray({
    control: form.control,
    name: "buttons",
  });

  const templateContent = form.watch("templateBody");
  const headerType = form.watch("headerType");
  const footerText = form.watch("footerText");
  const buttons = form.watch("buttons");
  const templateMedia = form.watch("templateMedia");

  // Parse variables from template content
  useEffect(() => {
    const variables = parseTemplateVariables(templateContent);
    setSelectedVariables(variables);
    
    const newSampleVariables: Record<string, string> = {};
    variables.forEach(variable => {
      const variableInfo = getVariableByKey(variable);
      if (variableInfo) {
        newSampleVariables[variable] = variableInfo.example;
      } else {
        // Provide specific fallbacks for common variables
        switch (variable) {
          case 'receipt_number':
            newSampleVariables[variable] = 'REC-2024-001';
            break;
          case 'student_name':
            newSampleVariables[variable] = 'John Doe';
            break;
          case 'payment_amount':
            newSampleVariables[variable] = '₹5,000';
            break;
          case 'payment_date':
            newSampleVariables[variable] = '15/01/2025';
            break;
          default:
            newSampleVariables[variable] = `Sample ${variable.replace(/_/g, ' ')}`;
        }
        console.warn(`Variable "${variable}" not found in ERP_VARIABLES, using fallback`);
      }
    });
    
    console.log('Template variables debug:', {
      variables,
      sampleVariables: newSampleVariables,
      templateContent: templateContent.substring(0, 100) + '...'
    });
    
    setSampleVariables(newSampleVariables);
  }, [templateContent]);

  const handleVariableInsert = (variable: TemplateVariable) => {
    const textArea = document.querySelector('textarea[name="templateBody"]') as HTMLTextAreaElement;
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const currentValue = form.getValues("templateBody");
      
      const newValue = 
        currentValue.substring(0, start) + 
        `{{${variable.key}}}` + 
        currentValue.substring(end);
      
      form.setValue("templateBody", newValue);
      
      setTimeout(() => {
        textArea.focus();
        textArea.setSelectionRange(start + variable.key.length + 4, start + variable.key.length + 4);
      }, 0);
    }
    setVariableSearchOpen(false);
  };

  const handleTemplateExample = (example: typeof TEMPLATE_EXAMPLES[0]) => {
    form.setValue("name", example.name);
    form.setValue("category", example.category as any);
    form.setValue("templateBody", example.content);
    
    toast({
      title: "Template Loaded",
      description: `"${example.name}" template has been loaded. You can customize it as needed.`,
    });
  };

  const handleAddButton = () => {
    if (buttonFields.length < 3) {
      appendButton({
        id: `btn_${Date.now()}`,
        type: "QUICK_REPLY",
        text: "",
        order: buttonFields.length,
      });
    }
  };

  const handleMediaUpload = (mediaFiles: MediaUploadResult[]) => {
    form.setValue("templateMedia", [...(templateMedia || []), ...mediaFiles]);
  };

  const handleRemoveMedia = (mediaId: string) => {
    const updatedMedia = (templateMedia || []).filter(media => media.id !== mediaId);
    form.setValue("templateMedia", updatedMedia);
  };

  // Only validate when both templateContent exists and sampleVariables are ready
  const validation = useMemo(() => {
    if (!templateContent) {
      return { isValid: true, missingVariables: [], unknownVariables: [] };
    }
    
    const variables = parseTemplateVariables(templateContent);
    
    // If we have variables but no sample variables yet, don't block submission
    if (variables.length > 0 && Object.keys(sampleVariables).length === 0) {
      return { isValid: true, missingVariables: [], unknownVariables: [] };
    }
    
    return validateTemplateVariables(templateContent, sampleVariables);
  }, [templateContent, sampleVariables]);

  const handleSubmit = (data: EnhancedTemplateFormData) => {
    // Perform validation at submit time with fresh data
    const submitValidation = validateTemplateVariables(data.templateBody, sampleVariables);
    
    if (!submitValidation.isValid && submitValidation.missingVariables.length > 0) {
      toast({
        title: "Template Validation Failed",
        description: `Missing variables: ${submitValidation.missingVariables.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    onSave({
      ...data,
      templateVariables: selectedVariables,
    });
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "IMAGE": return <Image className="w-4 h-4" />;
      case "VIDEO": return <Video className="w-4 h-4" />;
      case "DOCUMENT": return <FileIcon className="w-4 h-4" />;
      case "AUDIO": return <Music className="w-4 h-4" />;
      default: return <FileIcon className="w-4 h-4" />;
    }
  };

  const getButtonIcon = (type: string) => {
    switch (type) {
      case "URL": return <Link className="w-4 h-4" />;
      case "PHONE_NUMBER": return <Phone className="w-4 h-4" />;
      case "QUICK_REPLY": return <MessageSquare className="w-4 h-4" />;
      case "CALL_TO_ACTION": return <Send className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Add text formatting functions
  const applyFormatting = (formatType: 'bold' | 'italic' | 'strikethrough' | 'monospace') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const currentValue = form.getValues("templateBody");

    let formattedText = '';
    let wrapper = '';

    switch (formatType) {
      case 'bold':
        wrapper = '*';
        formattedText = `*${selectedText}*`;
        break;
      case 'italic':
        wrapper = '_';
        formattedText = `_${selectedText}_`;
        break;
      case 'strikethrough':
        wrapper = '~';
        formattedText = `~${selectedText}~`;
        break;
      case 'monospace':
        wrapper = '```';
        formattedText = `\`\`\`${selectedText}\`\`\``;
        break;
    }

    // If no text is selected, just insert the formatting characters
    if (selectedText === '') {
      formattedText = formatType === 'monospace' ? '``````' : `${wrapper}${wrapper}`;
    }

    const newValue = 
      currentValue.substring(0, start) + 
      formattedText + 
      currentValue.substring(end);

    form.setValue("templateBody", newValue);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      if (selectedText === '') {
        // Place cursor between the formatting characters
        const cursorPos = formatType === 'monospace' ? start + 3 : start + wrapper.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      } else {
        // Place cursor after the formatted text
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
      }
    }, 0);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
      <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-8">
        {/* Header */}
        {showHeader && (
          <div className="text-left mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create WhatsApp Template
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Build rich, interactive WhatsApp Business messages with media, buttons, and dynamic content
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Form - Left Side */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Basic Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Template Information
                </CardTitle>
                <CardDescription>
                  Basic details about your WhatsApp template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Fee Reminder" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UTILITY">Utility</SelectItem>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Brief description of the template" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Header Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    <div>
                      <CardTitle>Header (Optional)</CardTitle>
                      <CardDescription>Add a header to grab attention</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={showOptionalSections.header}
                    onCheckedChange={(checked) => {
                      setShowOptionalSections(prev => ({ ...prev, header: checked }));
                      if (!checked) {
                        form.setValue("headerType", undefined);
                        form.setValue("headerContent", "");
                        form.setValue("headerMediaUrl", "");
                      }
                    }}
                  />
                </div>
              </CardHeader>
              {showOptionalSections.header && (
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="headerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Type</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value || undefined)} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select header type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TEXT">
                              <div className="flex items-center gap-2">
                                <Type className="w-4 h-4" />
                                Text Header
                              </div>
                            </SelectItem>
                            <SelectItem value="IMAGE">
                              <div className="flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                Image Header
                              </div>
                            </SelectItem>
                            <SelectItem value="VIDEO">
                              <div className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Video Header
                              </div>
                            </SelectItem>
                            <SelectItem value="DOCUMENT">
                              <div className="flex items-center gap-2">
                                <FileIcon className="w-4 h-4" />
                                Document Header
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {headerType === "TEXT" && (
                    <FormField
                      control={form.control}
                      name="headerContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Header Text</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter header text" />
                          </FormControl>
                          <FormDescription>
                            Header text will be displayed prominently at the top
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {headerType && headerType !== "TEXT" && (
                    <>
                      <FormField
                        control={form.control}
                        name="headerMediaUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {headerType === "DOCUMENT" ? "Document URL" : "Media URL"}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={
                                  headerType === "DOCUMENT" 
                                    ? "https://your-domain.com/api/receipts/{{receipt_number}}/pdf"
                                    : "Enter media URL"
                                } 
                              />
                            </FormControl>
                            <FormDescription>
                              {headerType === "DOCUMENT" 
                                ? "URL to the PDF or document file. Use variables like {{receipt_number}} for dynamic documents."
                                : `URL to the ${headerType?.toLowerCase()} file for the header`
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {headerType === "DOCUMENT" && (
                        <FormField
                          control={form.control}
                          name="headerFilename"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Document Filename</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Fee_Receipt_{{receipt_number}}.pdf" 
                                />
                              </FormControl>
                              <FormDescription>
                                Filename that will be shown in WhatsApp. Use variables like &#123;&#123;receipt_number&#125;&#125; for dynamic names.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Main Content */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <div>
                      <CardTitle>Message Content *</CardTitle>
                      <CardDescription>The main body of your WhatsApp message</CardDescription>
                    </div>
                  </div>
                  <Popover open={variableSearchOpen} onOpenChange={setVariableSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variable
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search variables..." />
                        <CommandList>
                          <CommandEmpty>No variables found.</CommandEmpty>
                          {ERP_VARIABLES.map((category) => (
                            <CommandGroup key={category.id} heading={`${category.icon} ${category.name}`}>
                              {category.variables.map((variable) => (
                                <CommandItem
                                  key={variable.key}
                                  onSelect={() => handleVariableInsert(variable)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{variable.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {variable.description}
                                    </span>
                                    <span className="text-xs text-blue-600">
                                      Example: {variable.example}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Text Formatting Toolbar */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2">Format:</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormatting('bold')}
                    className="h-8 px-2"
                    title="Bold (*text*)"
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormatting('italic')}
                    className="h-8 px-2"
                    title="Italic (_text_)"
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormatting('strikethrough')}
                    className="h-8 px-2"
                    title="Strikethrough (~text~)"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormatting('monospace')}
                    className="h-8 px-2"
                    title="Monospace (```text```)"
                  >
                    <Code className="w-4 h-4" />
                  </Button>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Select text and click formatting buttons
                  </span>
                </div>

                <FormField
                  control={form.control}
                  name="templateBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          ref={textareaRef}
                          placeholder="Write your message content here... Use {{variable_name}} for dynamic content."
                          className="min-h-32 font-mono"
                          rows={6}
                        />
                      </FormControl>
                      <FormDescription>
                        <span className="block">Use variables like <code>{"{{student_name}}"}</code> for personalized content</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <strong>Formatting:</strong> *bold*, _italic_, ~strikethrough~, ```monospace```
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Footer Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <div>
                      <CardTitle>Footer (Optional)</CardTitle>
                      <CardDescription>Add a small footer text</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={showOptionalSections.footer}
                    onCheckedChange={(checked) => {
                      setShowOptionalSections(prev => ({ ...prev, footer: checked }));
                      if (!checked) {
                        form.setValue("footerText", "");
                      }
                    }}
                  />
                </div>
              </CardHeader>
              {showOptionalSections.footer && (
                <CardContent>
                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Text</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter footer text" maxLength={60} />
                        </FormControl>
                        <FormDescription>
                          Footer text appears at the bottom. Maximum 60 characters.
                          {footerText && ` (${footerText.length}/60)`}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              )}
            </Card>

            {/* Interactive Buttons */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    <div>
                      <CardTitle>Interactive Buttons (Optional)</CardTitle>
                      <CardDescription>Add up to 3 action buttons</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={showOptionalSections.buttons}
                    onCheckedChange={(checked) => {
                      setShowOptionalSections(prev => ({ ...prev, buttons: checked }));
                      if (!checked) {
                        form.setValue("buttons", []);
                      }
                    }}
                  />
                </div>
              </CardHeader>
              {showOptionalSections.buttons && (
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Add interactive buttons to increase engagement
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddButton}
                      disabled={buttonFields.length >= 3}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Button
                    </Button>
                  </div>

                  {buttonFields.length > 0 && (
                    <div className="space-y-3">
                      {buttonFields.map((field, index) => (
                        <Card key={field.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium">Button {index + 1}</h5>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeButton(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                                        <SelectItem value="URL">Website URL</SelectItem>
                                        <SelectItem value="PHONE_NUMBER">Phone Number</SelectItem>
                                        <SelectItem value="CALL_TO_ACTION">Call to Action</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`buttons.${index}.text`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Button Text</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Button text" maxLength={25} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {form.watch(`buttons.${index}.type`) === "URL" && (
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.url`}
                                render={({ field }) => (
                                  <FormItem className="mt-3">
                                    <FormLabel>Website URL</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="https://example.com" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {form.watch(`buttons.${index}.type`) === "PHONE_NUMBER" && (
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.phoneNumber`}
                                render={({ field }) => (
                                  <FormItem className="mt-3">
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="+1234567890" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {buttonFields.length === 0 && showOptionalSections.buttons && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Smartphone className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">No buttons added yet</p>
                      <p className="text-xs text-gray-400">Add interactive buttons to enhance user engagement</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Media Attachments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    <div>
                      <CardTitle>Media Attachments (Optional)</CardTitle>
                      <CardDescription>Add images, videos, or documents</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={showOptionalSections.media}
                    onCheckedChange={(checked) => {
                      setShowOptionalSections(prev => ({ ...prev, media: checked }));
                      if (!checked) {
                        form.setValue("templateMedia", []);
                      }
                    }}
                  />
                </div>
              </CardHeader>
              {showOptionalSections.media && (
                <CardContent>
                  <WhatsAppMediaUpload
                    onUploadComplete={handleMediaUpload}
                    acceptedTypes={['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO']}
                    maxFiles={5}
                  />

                  {templateMedia && templateMedia.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h5 className="font-medium">Uploaded Media ({templateMedia.length})</h5>
                      <div className="grid grid-cols-1 gap-3">
                        {templateMedia.map((media) => (
                          <Card key={media.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getMediaIcon(media.type)}
                                <div>
                                  <p className="font-medium text-sm">{media.filename}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {media.type} • {(media.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMedia(media.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right Sidebar - Preview & Actions */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {TEMPLATE_EXAMPLES.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleTemplateExample(example)}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {example.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>See how your template will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 max-w-sm mx-auto">
                  {/* Header Preview */}
                  {headerType && (
                    <div className="mb-3 pb-3 border-b">
                      {headerType === "TEXT" && form.getValues("headerContent") && (
                        <div className="font-semibold text-lg">
                          {form.getValues("headerContent")}
                        </div>
                      )}
                      {headerType !== "TEXT" && form.getValues("headerMediaUrl") && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getMediaIcon(headerType)}
                          <span>{headerType} Header</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Content Preview */}
                  <div className="whitespace-pre-wrap text-sm mb-3">
                    {templateContent ? (
                      <SafeTemplatePreview 
                        templateContent={templateContent} 
                        sampleVariables={sampleVariables} 
                      />
                    ) : (
                      <span className="text-gray-400 italic">Start typing your message...</span>
                    )}
                  </div>

                  {/* Footer Preview */}
                  {footerText && (
                    <div className="text-xs text-muted-foreground mb-3 pt-2 border-t">
                      {footerText}
                    </div>
                  )}

                  {/* Buttons Preview */}
                  {buttons && buttons.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {buttons.map((button, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-center gap-2 p-2 border rounded text-sm bg-white dark:bg-gray-700"
                        >
                          {getButtonIcon(button.type)}
                          <span>{button.text || `Button ${index + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Media Preview */}
                  {templateMedia && templateMedia.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-2">
                        {templateMedia.length} media attachment(s)
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Template Validation */}
            <TemplateValidationHelper
              templateHeader={headerType === "TEXT" ? form.getValues("headerContent") : undefined}
              templateBody={templateContent}
              templateVariables={selectedVariables}
            />

            {/* Variables Used */}
            {selectedVariables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="w-5 h-5" />
                    Variables ({selectedVariables.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedVariables.map((variable) => {
                      const variableInfo = getVariableByKey(variable);
                      return (
                        <div
                          key={variable}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {variable}
                            </Badge>
                            {variableInfo && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {variableInfo.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${variable}}}`);
                              toast({
                                description: "Variable copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Validation Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validation.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  Template Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validation.isValid ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Ready to save!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {validation.missingVariables.length > 0 && (
                      <p className="text-sm text-red-600">
                        Missing variables: {validation.missingVariables.join(", ")}
                      </p>
                    )}
                    {validation.unknownVariables.length > 0 && (
                      <p className="text-sm text-orange-600">
                        Unknown variables: {validation.unknownVariables.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-8 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {validation.isValid ? "✅ Template is ready" : `⚠️ Validation errors: ${validation.missingVariables?.join(', ') || 'Unknown'}`}
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !validation.isValid} 
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 