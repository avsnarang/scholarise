"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";

// Define types based on actual API response
interface ClassData {
  id: string;
  name: string;
  branchId: string;
  sessionId: string;
  // Note: no section field - sections are separate entities
}

interface ClassSubject {
  classId: string;
  class: {
    id: string;
    name: string;
  };
}

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  isOptional: z.boolean(),
  classIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubjectFormProps {
  subjectId?: string;
  redirectPath?: string;
}

export function SubjectForm({ subjectId, redirectPath = "/settings/subjects" }: SubjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!subjectId;
  
  // Access global contexts
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  // Get all classes for class selection
  const { data: classesData, isLoading: isLoadingClasses } = api.class.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      sessionId: currentSessionId || undefined,
      isActive: true 
    },
    { enabled: true }
  );
  
  // Use the classes data directly as it's already an array
  const classes = classesData || [];
  
  // Create class options for multi-select - just show class name since sections are separate
  const classOptions = classes.map((cls: ClassData) => ({
    value: cls.id,
    label: cls.name, // Just the class name, no section
  }));

  // Fetch subject data for editing
  const { data: subjectData, isLoading: isLoadingSubject } = api.subject.getById.useQuery(
    { id: subjectId || "" },
    { enabled: !!subjectId }
  );

  // Set up form
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

  // Mutations
  const createSubject = api.subject.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Subject Created",
        description: "The subject has been created successfully.",
      });
      router.push(redirectPath);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subject. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const updateSubject = api.subject.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Subject Updated",
        description: "The subject has been updated successfully.",
      });
      router.push(redirectPath);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subject. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditing && subjectData) {
      // Get class IDs from subject's classes
      const selectedClassIds = subjectData.classes.map((cs: any) => cs.classId);
      
      form.reset({
        name: subjectData.name,
        code: subjectData.code || "",
        description: subjectData.description || "",
        isActive: subjectData.isActive,
        isOptional: subjectData.isOptional,
        classIds: selectedClassIds,
      });
    }
  }, [isEditing, subjectData, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && subjectId) {
        await updateSubject.mutateAsync({
          id: subjectId,
          ...data,
        });
      } else {
        await createSubject.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsSubmitting(false);
    }
  };

  if (isEditing && (isLoadingSubject)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B]" />
        <span className="ml-2">Loading subject data...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Subject Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Subject Name 
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Mathematics, Physics, English"
                    />
                  </FormControl>
                  <FormDescription>
                    The display name that will appear throughout the system
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CBSE Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    CBSE Subject Code
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., 041, 042, 301"
                    />
                  </FormControl>
                  <FormDescription>
                    Official CBSE code for board examination reporting
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
                <FormLabel>
                  Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Brief description of the subject, its scope, and objectives..."
                    className="resize-none min-h-[120px]"
                  />
                </FormControl>
                <FormDescription>
                  Provide context about the subject for teachers and administrators
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
                <FormLabel>
                  Associated Classes
                </FormLabel>
                <FormControl>
                  <MultiCombobox
                    options={classOptions}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder={classes.length > 0 
                      ? "Select classes for this subject" 
                      : "No classes available"}
                    emptyMessage="No classes found."
                    searchPlaceholder="Search classes..."
                    className="w-full max-h-32"
                  />
                </FormControl>
                <FormDescription>
                  {currentBranchId && currentSessionId 
                    ? `${classes.length} classes available for the selected branch and academic session`
                    : "Please select a branch and academic session to view available classes"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Show selected classes preview */}
          {(form.watch("classIds")?.length || 0) > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">
                Selected Classes ({form.watch("classIds")?.length || 0})
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(redirectPath)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="glowing"
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
          </div>
        </div>
      </Form>
    </div>
  );
} 