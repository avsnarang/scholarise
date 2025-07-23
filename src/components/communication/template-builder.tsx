"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  Search,
  Tag,
  Settings,
  Wand2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

import { 
  ERP_VARIABLES, 
  TEMPLATE_EXAMPLES,
  type TemplateVariable, 
  type VariableCategory,
  parseTemplateVariables,
  renderTemplate,
  validateTemplateVariables,
  getVariableByKey
} from "@/utils/template-variables";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(["AUTHENTICATION", "MARKETING", "UTILITY"]),
  language: z.string().min(1, "Language is required"),
  templateBody: z.string().min(1, "Template content is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateBuilderProps {
  initialData?: Partial<TemplateFormData>;
  onSave: (data: TemplateFormData & { templateVariables: string[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  showHeader?: boolean; // Whether to show the internal header
}

export function TemplateBuilder({ initialData, onSave, onCancel, isLoading, showHeader = true }: TemplateBuilderProps) {
  const { toast } = useToast();
  
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [sampleVariables, setSampleVariables] = useState<Record<string, string>>({});
  const [cursorPosition, setCursorPosition] = useState(0);
  const [variableSearchOpen, setVariableSearchOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      category: initialData?.category || "UTILITY",
      language: initialData?.language || "en",
      templateBody: initialData?.templateBody || "",
    },
  });

  const templateContent = form.watch("templateBody");

  // Parse variables from template content
  useEffect(() => {
    const variables = parseTemplateVariables(templateContent);
    setSelectedVariables(variables);
    
    // Initialize sample variables
    const newSampleVariables: Record<string, string> = {};
    variables.forEach(variable => {
      const variableInfo = getVariableByKey(variable);
      newSampleVariables[variable] = variableInfo?.example || `[${variable}]`;
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
      
      // Set cursor position after the inserted variable
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

  const validation = validateTemplateVariables(templateContent, sampleVariables);

  const handleSubmit = (data: TemplateFormData) => {
    if (!validation.isValid) {
      toast({
        title: "Template Validation Failed",
        description: `Missing variables: ${validation.missingVariables.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    onSave({
      ...data,
      templateVariables: selectedVariables,
    });
  };

  const filteredVariables = categoryFilter === "all" 
    ? ERP_VARIABLES 
    : ERP_VARIABLES.filter(cat => cat.id === categoryFilter);

  return (
    <div className="space-y-6">
      <Form form={form} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Header */}
          {showHeader && (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Template Builder</h2>
                <p className="text-muted-foreground">
                  Create WhatsApp message templates with dynamic variables
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {previewMode ? "Edit" : "Preview"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !validation.isValid}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-6">
              {!previewMode ? (
                <>
                  {/* Template Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Template Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name</FormLabel>
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
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                                  <SelectItem value="UTILITY">Utility</SelectItem>
                                  <SelectItem value="MARKETING">Marketing</SelectItem>
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

                  {/* Template Content */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          Template Content
                        </span>
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
                                {filteredVariables.map((category) => (
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
                      </CardTitle>
                      <CardDescription>
                        Write your template content. Use variables like <code>{"{{student_name}}"}</code> for dynamic content.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="templateBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter your template content here..."
                                className="min-h-48"
                                onSelect={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  setCursorPosition(target.selectionStart);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Variables are automatically detected from your content. Use {"{{"} and {"}}"} to wrap variable names.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Validation Alerts */}
                      {validation.unknownVariables.length > 0 && (
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Unknown variables detected: <strong>{validation.unknownVariables.join(", ")}</strong>
                            <br />
                            Consider using predefined ERP variables for better data integration.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* Preview Mode */
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Template Preview
                    </CardTitle>
                    <CardDescription>
                      Preview how your template will look with sample data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="whitespace-pre-wrap font-mono text-sm">
                        {renderTemplate(templateContent, sampleVariables)}
                      </div>
                    </div>
                    {selectedVariables.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Sample Variable Values:</h4>
                        <div className="space-y-2">
                          {selectedVariables.map((variable) => (
                            <div key={variable} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {sampleVariables[variable]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Quick Templates
                  </CardTitle>
                  <CardDescription>
                    Start with a pre-built template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
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
                  </div>
                </CardContent>
              </Card>

              {/* Variables Used */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Variables ({selectedVariables.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedVariables.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No variables detected. Add variables to your template content.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Validation Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {validation.isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    Validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {validation.isValid ? (
                    <p className="text-sm text-green-600">Template is valid and ready to use!</p>
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
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !validation.isValid}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
      </Form>
    </div>
  );
} 