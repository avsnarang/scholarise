import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the form schema
export const classFormSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  section: z.string().min(1, "Section is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  isActive: z.boolean(),
  branchId: z.string().min(1, "Branch is required"),
  sessionId: z.string().min(1, "Academic session is required"),
  teacherId: z.string().optional().nullable(),
});

// Define the form values type from the schema
export type ClassFormValues = z.infer<typeof classFormSchema>;

export interface ClassFormProps {
  classData?: any;
  onSuccess: () => void;
  branchId: string;
  sessionId: string;
  onCancel?: () => void;
  isEditMode?: boolean;
}

export function ClassForm({
  classData,
  onSuccess,
  branchId,
  sessionId,
  onCancel,
  isEditMode = false,
}: ClassFormProps) {
  const { toast } = useToast();

  // Get teachers for the branch
  const { data: teacherData } = api.teacher.getAll.useQuery(
    { branchId, isActive: true },
    { enabled: !!branchId }
  );

  // Extract teachers from the response
  const teachers = teacherData?.items;

  // Create and update mutations
  const createMutation = api.class.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Class created",
        description: "The class has been created successfully.",
        variant: "success",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create class. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = api.class.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Class updated",
        description: "The class has been updated successfully.",
        variant: "success",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update class. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set up form
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: classData?.name || "",
      section: classData?.section || "",
      capacity: classData?.capacity || 30,
      isActive: classData?.isActive ?? true,
      branchId: branchId || "",
      sessionId: sessionId || "",
      teacherId: classData?.teacherId || null,
    },
  });

  // Update form values when classData changes
  useEffect(() => {
    if (classData) {
      form.reset({
        name: classData.name || "",
        section: classData.section || "",
        capacity: classData.capacity || 30,
        isActive: classData.isActive ?? true,
        branchId: branchId || "",
        sessionId: sessionId || "",
        teacherId: classData.teacherId || null,
      });
    } else {
      form.reset({
        name: "",
        section: "",
        capacity: 30,
        isActive: true,
        branchId: branchId || "",
        sessionId: sessionId || "",
        teacherId: null,
      });
    }
  }, [classData, form, branchId, sessionId]);

  // Form submission handler
  const handleSubmit = () => {
    const values = form.getValues();
    console.log("Form values:", values);

    // Check if branchId and sessionId are set
    if (!values.branchId || !values.sessionId) {
      console.error("Missing required values:", {
        branchId: values.branchId,
        sessionId: values.sessionId
      });

      // Use the global values if form values are missing
      if (!values.branchId) {
        values.branchId = branchId || "";
        console.log("Using global branchId:", branchId);
      }

      if (!values.sessionId) {
        values.sessionId = sessionId || "";
        console.log("Using global sessionId:", sessionId);
      }

      // Update the form values
      form.setValue("branchId", values.branchId);
      form.setValue("sessionId", values.sessionId);
    }

    if (isEditMode) {
      console.log("Updating class with data:", {
        id: classData.id,
        name: values.name,
        section: values.section,
        capacity: values.capacity,
        isActive: values.isActive,
        teacherId: values.teacherId || null,
      });

      updateMutation.mutate({
        id: classData.id,
        name: values.name,
        section: values.section,
        capacity: Number(values.capacity), // Convert to number
        isActive: values.isActive,
        teacherId: values.teacherId || null,
      });
    } else {
      // Check again if we have the required values
      if (!values.branchId || !values.sessionId) {
        toast({
          title: "Error",
          description: "Branch and academic session are required. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const createData = {
        name: values.name,
        section: values.section,
        capacity: Number(values.capacity), // Convert to number
        isActive: values.isActive,
        branchId: values.branchId,
        sessionId: values.sessionId,
        teacherId: values.teacherId || null,
      };

      console.log("Creating class with data:", createData);
      console.log("Branch ID:", values.branchId);
      console.log("Session ID:", values.sessionId);

      createMutation.mutate(createData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Form form={form}>
      {/* Override any remaining blue focus rings with the new color theme */}
      <style jsx global>{`
        /* Specific overrides for the form components */
        .dark button[data-state=open],
        .dark [data-state=open],
        .dark [data-state=checked] {
          border-color: var(--primary) !important;
          outline-color: var(--primary) !important;
        }

        .dark [role="combobox"]:focus,
        .dark [role="listbox"] {
          border-color: var(--primary) !important;
          outline-color: var(--primary) !important;
          --ring: var(--primary) !important;
        }

        .dark [data-highlighted] {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }
        
        .dark select:focus,
        .dark button:focus,
        .dark input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 1px var(--primary) !important;
        }
      `}</style>
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log("Form submitted");
          handleSubmit();
        }}
        className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="dark:text-gray-200">Class Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. Class 1" 
                    {...field} 
                    className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary dark:focus-visible:ring-primary"
                  />
                </FormControl>
                <FormMessage className="text-red-500 dark:text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="dark:text-gray-200">Section *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. A" 
                    {...field} 
                    className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary dark:focus-visible:ring-primary"
                  />
                </FormControl>
                <FormMessage className="text-red-500 dark:text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="dark:text-gray-200">Capacity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 30"
                    {...field}
                    className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary dark:focus-visible:ring-primary"
                  />
                </FormControl>
                <FormMessage className="text-red-500 dark:text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="dark:text-gray-200">Class Teacher</FormLabel>
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger 
                      className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:focus:ring-primary data-[state=open]:border-primary dark:data-[state=open]:border-primary"
                    >
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="dark:bg-[#202020] dark:border-[#303030] border-primary/20 dark:border-primary/20">
                    <SelectItem value="none" className="dark:text-gray-300 dark:hover:bg-[#303030] hover:bg-primary/10 dark:hover:bg-primary/10">
                      None
                    </SelectItem>
                    {teachers?.map((teacher) => (
                      <SelectItem 
                        key={teacher.id} 
                        value={teacher.id}
                        className="dark:text-gray-300 dark:hover:bg-[#303030] hover:bg-primary/10 dark:hover:bg-primary/10"
                      >
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-red-500 dark:text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-[#303030] dark:bg-[#202020]/80">
              <div className="space-y-0.5">
                <FormLabel className="dark:text-gray-200">Active</FormLabel>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Mark this class as active or inactive
                </div>
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

        <div className="flex justify-end space-x-4 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              console.log("Submit button clicked");
              handleSubmit();
            }}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 