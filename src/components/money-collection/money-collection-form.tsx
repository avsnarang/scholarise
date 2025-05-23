"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useGlobalSessionFilter } from "@/hooks/useGlobalSessionFilter";

import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import styles from "./styles.module.css";

const formSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title must be at most 100 characters" }),
  description: z.string().optional(),
  classIds: z.array(z.string()).optional(),
});

interface MoneyCollectionFormProps {
  branches: any[];
  classes: any[];
  initialData?: any;
}

export function MoneyCollectionForm({
  branches,
  classes,
  initialData,
}: MoneyCollectionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    initialData?.classIds || []
  );
  const { filterByCurrentBranch, branchId } = useGlobalBranchFilter();
  const { sessionId, withSessionFilter } = useGlobalSessionFilter();
  
  // Clean branch ID string to handle potential format issues
  const cleanBranchId = (id: string | null | undefined) => {
    if (!id) return '';
    // Remove any non-alphanumeric characters that could be causing issues
    return id.replace(/[^a-zA-Z0-9]/g, '');
  };
  
  // Filter classes by both branch and session
  const filteredClasses = classes.filter(cls => {
    // Branch filter
    const branchMatch = cls.branchId === branchId || 
                        cleanBranchId(cls.branchId) === cleanBranchId(branchId);
    
    // Session filter - only if sessionId is available
    const sessionMatch = !sessionId || cls.sessionId === sessionId;
    
    return branchMatch && sessionMatch;
  });

  // Format classes for the MultiSelect component
  const classOptions = filteredClasses.map(cls => ({
    value: cls.id,
    label: `${cls.name} ${cls.section}`
  }));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description,
          classIds: initialData.classIds || [],
        }
      : {
          title: "",
          description: "",
          classIds: [],
        },
  });

  // Moving toggleClass to useCallback to prevent recreating on every render
  const handleClassesChange = useCallback((newSelectedClassIds: string[]) => {
    setSelectedClasses(newSelectedClassIds);
  }, []);

  // Effect to update form value when selectedClasses changes
  useEffect(() => {
    form.setValue("classIds", selectedClasses);
  }, [selectedClasses, form]);

  const { mutate: createMoneyCollection, isPending: isCreating } =
    api.moneyCollection.create.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Money collection created successfully.",
        });
        router.push("/money-collection");
        router.refresh();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const { mutate: updateMoneyCollection, isPending: isUpdating } =
    api.moneyCollection.update.useMutation({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Money collection updated successfully.",
        });
        router.push("/money-collection");
        router.refresh();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Check if branchId exists
    if (!branchId) {
      toast({
        title: "Error",
        description: "Branch ID is required. Please select a branch.",
        variant: "destructive",
      });
      return;
    }

    // Clean and validate branch ID
    const cleanedBranchId = cleanBranchId(branchId);
    if (!cleanedBranchId) {
      toast({
        title: "Error",
        description: "Invalid branch ID format.",
        variant: "destructive",
      });
      return;
    }

    // Process class IDs if available
    const processedClassIds = values.classIds?.length 
      ? values.classIds.map(id => cleanBranchId(id)).filter(Boolean)
      : undefined;
    
    console.log("Processed class IDs:", processedClassIds);

    // Process session ID if available
    console.log("Current session ID:", sessionId);
    const cleanedSessionId = sessionId ? cleanBranchId(sessionId) : null;
    console.log("Cleaned session ID:", cleanedSessionId);

    // Create submission object with explicit field names
    const submissionValues: {
      title: string;
      description?: string;
      branchId: string;
      classIds?: string[];
      sessionId?: string;
    } = {
      title: values.title,
      description: values.description,
      branchId: cleanedBranchId,
    };

    // Add classIds if available
    if (processedClassIds && processedClassIds.length > 0) {
      submissionValues.classIds = processedClassIds;
    }

    // Add sessionId if available and valid
    if (cleanedSessionId) {
      submissionValues.sessionId = cleanedSessionId;
    }

    // Log the final submission with all fields explicitly set
    console.log("Final submission with explicit fields:", JSON.stringify(submissionValues, null, 2));

    // Submit to the backend
    if (initialData) {
      updateMoneyCollection({
        id: initialData.id,
        data: submissionValues,
      });
    } else {
      createMoneyCollection(submissionValues);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border p-6">
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter collection title" {...field} />
                </FormControl>
                <FormDescription>
                  A descriptive title for the money collection (e.g., "Field Trip Contribution", "Sports Day Fee")
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter collection description"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Provide details about what the collection is for
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6">
            <FormField
              control={form.control}
              name="classIds"
              render={({ field }) => (
                <FormItem className="class-selector">
                  <FormLabel>Classes (Optional)</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={classOptions}
                      defaultValue={selectedClasses}
                      onValueChange={handleClassesChange}
                      placeholder="Select classes"
                      maxCount={5}
                      variant="secondary"
                      className={cn(styles.smallMultiCombobox)}
                    />
                  </FormControl>
                  <FormDescription>
                    Select one or more classes for this collection, or leave empty for all classes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/money-collection")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
            >
              {initialData
                ? isUpdating
                  ? "Updating..."
                  : "Update Collection"
                : isCreating
                ? "Creating..."
                : "Create Collection"}
            </Button>
          </div>
      </Form>
    </div>
  );
} 