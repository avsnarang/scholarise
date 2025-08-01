"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  isOptional: z.boolean(),
  classIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId?: string | null;
  onSuccess?: () => void;
}

export function SubjectFormModal({ 
  open, 
  onOpenChange, 
  subjectId = null, 
  onSuccess 
}: SubjectFormModalProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const utils = api.useUtils();

  const isEditing = !!subjectId;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
      isOptional: false,
      classIds: [],
    },
  });

  // Fetch existing subject data for editing
  const { data: subjectData, isLoading: isLoadingSubject } = api.subject.getById.useQuery(
    { id: subjectId! },
    { enabled: !!subjectId }
  );

  // Fetch classes with sections for multi-select
  const { data: classesData, isLoading: isLoadingClasses } = api.class.getAll.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
      isActive: true,
      includeSections: true,
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const classes = classesData || [];

  // Create subject mutation
  const createSubject = api.subject.create.useMutation({
    onSuccess: async () => {
      // Invalidate and refetch subject queries
      await utils.subject.getAll.invalidate();
      
      toast({
        title: "Success",
        description: "The subject has been created successfully.",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subject. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update subject mutation
  const updateSubject = api.subject.update.useMutation({
    onSuccess: async () => {
      // Invalidate and refetch subject queries
      await utils.subject.getAll.invalidate();
      
      toast({
        title: "Success",
        description: "The subject has been updated successfully.",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subject. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (subjectData && isEditing) {
      const selectedClassIds = subjectData.classes?.map((cs: any) => cs.class.id) || [];
      
      form.reset({
        name: subjectData.name,
        code: subjectData.code || "",
        description: subjectData.description || "",
        isActive: subjectData.isActive,
        isOptional: (subjectData as any).isOptional ?? false,
        classIds: selectedClassIds,
      });
    }
  }, [subjectData, isEditing, form]);

  // Reset form when modal opens for new subject
  useEffect(() => {
    if (open && !isEditing) {
      form.reset({
        name: "",
        code: "",
        description: "",
        isActive: true,
        isOptional: false,
        classIds: [],
      });
    }
  }, [open, isEditing, form]);

  const onSubmit = (data: FormValues, event?: React.BaseSyntheticEvent) => {
    // Prevent default form submission behavior
    event?.preventDefault();
    
    // Extract class IDs from combined class-section values
    const extractedClassIds = data.classIds?.map(classId => {
      // If it contains a dash, it's a class-section combination, extract just the class ID
      if (classId.includes('-')) {
        const classIdPart = classId.split('-')[0];
        return classIdPart || classId; // fallback to original if split fails
      }
      return classId;
    }).filter((classId): classId is string => Boolean(classId)) || [];

    // Remove duplicates (in case multiple sections from same class were selected)
    const uniqueClassIds = [...new Set(extractedClassIds)];

    const processedData = {
      ...data,
      classIds: uniqueClassIds,
    };

    if (isEditing) {
      updateSubject.mutate({
        id: subjectId,
        ...processedData,
      });
    } else {
      createSubject.mutate(processedData);
    }
  };

  const isSubmitting = createSubject.isPending || updateSubject.isPending;

  // Prepare class-section options for multi-select (similar to assessment schema)
  const classOptions = classes.flatMap((cls: any) => 
    cls.sections && cls.sections.length > 0 
      ? cls.sections.map((section: any) => ({
          value: `${cls.id}-${section.id}`,
          label: `${cls.name} - ${section.name}`,
        }))
      : [{
          value: cls.id,
          label: cls.name,
        }]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Subject" : "Create New Subject"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the subject details below." 
              : "Fill in the details below to create a new subject."
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingSubject && isEditing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading subject data...</span>
          </div>
        ) : (
          <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subject Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter subject name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subject Code */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MATH101" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional code for the subject
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter subject description..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description of the subject
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Associated Classes */}
              <FormField
                control={form.control}
                name="classIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Classes & Sections</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={classOptions}
                        selected={field.value || []}
                        onValueChange={field.onChange}
                        placeholder={classes.length > 0 
                          ? "Select classes and sections for this subject" 
                          : "No classes available"}
                        maxCount={3}
                        className="w-full"
                        disabled={isLoadingClasses}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentBranchId && currentSessionId 
                        ? `${classOptions.length} class-section combinations available for the selected branch and academic session`
                        : "Please select a branch and academic session to view available classes and sections"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show selected classes preview */}
              {(form.watch("classIds")?.length || 0) > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-sm font-medium mb-2">
                    Selected Classes & Sections ({form.watch("classIds")?.length || 0})
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
                    {form.watch("classIds")?.slice(0, 12).map((classId: string) => {
                      const className = classOptions.find(c => c.value === classId)?.label;
                      return (
                        <Badge key={classId} variant="secondary" className="text-xs px-1.5 py-0.5 justify-center truncate">
                          {className}
                        </Badge>
                      );
                    })}
                    {(form.watch("classIds")?.length || 0) > 12 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 justify-center border-dashed">
                        +{(form.watch("classIds")?.length || 0) - 12} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Subject Type */}
              <FormField
                control={form.control}
                name="isOptional"
                render={({ field }) => (
                  <FormItem className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Optional Subject
                        </FormLabel>
                        <FormDescription>
                          Optional subjects can be individually assigned to students. 
                          Compulsory subjects are automatically assigned to all students in the mapped classes.
                        </FormDescription>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              {/* Active Status */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Active Subject
                        </FormLabel>
                        <FormDescription>
                          Active subjects are available for class assignments and appear in subject selection lists. 
                          Inactive subjects are hidden from new assignments but preserve existing data.
                        </FormDescription>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="default"
                  className="bg-[#00501B] hover:bg-[#00501B]/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{isEditing ? "Update Subject" : "Create Subject"}</>
                  )}
                </Button>
              </DialogFooter>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
} 