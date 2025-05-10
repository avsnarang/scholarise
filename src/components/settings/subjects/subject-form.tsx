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

// Define types for API data
interface Class {
  id: string;
  name: string;
  section: string;
  branchId: string;
  sessionId: string;
}

interface ClassSubject {
  classId: string;
  class: Class;
}

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  classIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SubjectFormProps {
  subjectId?: string;
}

export function SubjectForm({ subjectId }: SubjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!subjectId;
  
  // Access global contexts
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  // Fetch all classes for class selection
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
  
  // Create class options for multi-select
  const classOptions = classes.map((cls: Class) => ({
    value: cls.id,
    label: `${cls.name} - ${cls.section}`,
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
      router.push("/settings/subjects");
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
      router.push("/settings/subjects");
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
                    Subject Name <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter subject name" />
                  </FormControl>
                  <FormDescription>
                    The display name of the subject
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
                  <FormLabel>CBSE Subject Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter CBSE code" />
                  </FormControl>
                  <FormDescription>
                    The official CBSE code for this subject
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
                    {...field}
                    placeholder="Enter a brief description of the subject"
                    className="resize-none min-h-[100px]"
                  />
                </FormControl>
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
                <FormLabel>Associated Classes</FormLabel>
                <FormControl>
                  <MultiCombobox
                    options={classOptions}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder={classes.length > 0 
                      ? "Select classes" 
                      : "No classes available"}
                    emptyMessage="No classes found."
                    searchPlaceholder="Search select classes..."
                    className="w-full"
                  />
                </FormControl>
                <FormDescription>
                  {currentBranchId && currentSessionId 
                    ? `Showing classes for selected branch and academic session (${classes.length} classes available)`
                    : "Please select a branch and academic session to filter classes"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Active Status */}
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Active subjects can be assigned to classes and students
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/settings/subjects")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
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
          </div>
        </div>
      </Form>
    </div>
  );
} 