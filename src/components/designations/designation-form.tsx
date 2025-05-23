"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { api } from "@/utils/api";
import { toast } from "sonner";

// Form schema validation
const designationFormSchema = z.object({
  title: z.string().min(2, {
    message: "Designation title must be at least 2 characters.",
  }),
  code: z.string().min(2, {
    message: "Designation code must be at least 2 characters.",
  }),
  description: z.string().optional(),
  category: z.string().min(1, {
    message: "Please select a designation category.",
  }),
  level: z.string().min(1, {
    message: "Please select a designation level.",
  }),
  isActive: z.boolean(),
  branchId: z.string().min(1, {
    message: "Please select a branch.",
  }),
});

// Define designation categories
const designationCategories = [
  { label: "Academic", value: "Academic" },
  { label: "Administrative", value: "Administrative" },
  { label: "Management", value: "Management" },
  { label: "Support", value: "Support" },
  { label: "Technical", value: "Technical" },
  { label: "Other", value: "Other" },
];

// Define designation levels
const designationLevels = [
  { label: "Entry Level", value: "Entry" },
  { label: "Junior", value: "Junior" },
  { label: "Mid-Level", value: "Mid" },
  { label: "Senior", value: "Senior" },
  { label: "Lead", value: "Lead" },
  { label: "Executive", value: "Executive" },
];

type DesignationFormValues = z.infer<typeof designationFormSchema>;

type DesignationFormProps = {
  initialData?: DesignationFormValues & { id: string };
  branches?: { id: string; name: string }[];
};

export function DesignationForm({ initialData, branches = [] }: DesignationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up form with default values
  const form = useForm<DesignationFormValues>({
    resolver: zodResolver(designationFormSchema),
    defaultValues: initialData || {
      title: "",
      code: "",
      description: "",
      category: "",
      level: "",
      isActive: true,
      branchId: branches.length === 1 ? branches[0]!.id : "",
    },
  });

  // Create and update mutations
  const createDesignation = api.designation.create.useMutation({
    onSuccess: () => {
      toast.success("Designation created successfully");
      router.push("/designations/list");
    },
    onError: (error) => {
      toast.error(`Error creating designation: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const updateDesignation = api.designation.update.useMutation({
    onSuccess: () => {
      toast.success("Designation updated successfully");
      router.push("/designations/list");
    },
    onError: (error) => {
      toast.error(`Error updating designation: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Submit form
  function onSubmit(values: DesignationFormValues) {
    setIsSubmitting(true);

    if (initialData?.id) {
      // Update existing designation
      updateDesignation.mutate({
        id: initialData.id,
        title: values.title,
        description: values.description,
        category: values.category,
        level: values.level,
        isActive: values.isActive,
      });
    } else {
      // Create new designation
      createDesignation.mutate({
        title: values.title,
        code: values.code,
        description: values.description,
        category: values.category,
        level: values.level,
        branchId: values.branchId,
        isActive: values.isActive,
      });
    }
  }

  return (
    <div className="space-y-6">
      <Form form={form}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter designation title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation Code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter designation code" 
                    {...field} 
                    disabled={!!initialData?.id} // Disable code editing for existing designations
                  />
                </FormControl>
                <FormDescription>
                  Unique identifier for the designation
                </FormDescription>
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
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {designationCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {designationLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={branches.length === 1 || !!initialData?.id} // Disable if only one branch or editing
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter designation description"
                    className="resize-none"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <FormDescription>
                    Set whether this designation is currently active
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </Form>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/designations/list")}
        >
          Cancel
        </Button>
        <Button 
          type="button"
          onClick={() => form.handleSubmit(onSubmit)()}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Designation" : "Create Designation"}
        </Button>
      </div>
    </div>
  );
} 