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
const departmentFormSchema = z.object({
  name: z.string().min(2, {
    message: "Department name must be at least 2 characters.",
  }),
  code: z.string().min(2, {
    message: "Department code must be at least 2 characters.",
  }),
  description: z.string().optional(),
  type: z.string().min(1, {
    message: "Please select a department type.",
  }),
  isActive: z.boolean(),
  branchId: z.string().min(1, {
    message: "Please select a branch.",
  }),
  headId: z.string().optional(),
});

// Define department types
const departmentTypes = [
  { label: "Academic", value: "Academic" },
  { label: "Administrative", value: "Administrative" },
  { label: "Support", value: "Support" },
  { label: "Research", value: "Research" },
  { label: "Other", value: "Other" },
];

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

type DepartmentFormProps = {
  initialData?: DepartmentFormValues & { id: string };
  branches?: { id: string; name: string }[];
};

export function DepartmentForm({ initialData, branches = [] }: DepartmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up form with default values
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: initialData || {
      name: "",
      code: "",
      description: "",
      type: "",
      isActive: true,
      branchId: branches.length === 1 ? branches[0]!.id : "",
      headId: "",
    },
  });

  // Create and update mutations
  const createDepartment = api.department.create.useMutation({
    onSuccess: () => {
      toast.success("Department created successfully");
      router.push("/departments/list");
    },
    onError: (error) => {
      toast.error(`Error creating department: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const updateDepartment = api.department.update.useMutation({
    onSuccess: () => {
      toast.success("Department updated successfully");
      router.push("/departments/list");
    },
    onError: (error) => {
      toast.error(`Error updating department: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Submit form
  function onSubmit(values: DepartmentFormValues) {
    setIsSubmitting(true);

    if (initialData?.id) {
      // Update existing department
      updateDepartment.mutate({
        id: initialData.id,
        name: values.name,
        description: values.description,
        type: values.type,
        isActive: values.isActive,
        headId: values.headId || null,
      });
    } else {
      // Create new department
      createDepartment.mutate({
        name: values.name,
        code: values.code,
        description: values.description,
        type: values.type,
        branchId: values.branchId,
        isActive: values.isActive,
        headId: values.headId,
      });
    }
  }

  return (
    <div className="space-y-6">
      <Form form={form}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter department name" {...field} />
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
                <FormLabel>Department Code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter department code" 
                    {...field} 
                    disabled={!!initialData?.id} // Disable code editing for existing departments
                  />
                </FormControl>
                <FormDescription>
                  Unique identifier for the department
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
                    placeholder="Enter department description"
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
                    Set whether this department is currently active
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
          onClick={() => router.push("/departments/list")}
        >
          Cancel
        </Button>
        <Button 
          type="button"
          onClick={() => form.handleSubmit(onSubmit)()}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Department" : "Create Department"}
        </Button>
      </div>
    </div>
  );
} 