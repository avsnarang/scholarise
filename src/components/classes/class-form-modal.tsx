import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
const formSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  section: z.string().min(1, "Section is required"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  isActive: z.boolean(),
  branchId: z.string().min(1, "Branch is required"),
  sessionId: z.string().min(1, "Academic session is required"),
  teacherId: z.string().optional().nullable(),
});

// Define the form values type from the schema
type FormValues = z.infer<typeof formSchema>;

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData?: any;
  onSuccess: () => void;
  branchId: string;
  sessionId: string;
}

export function ClassFormModal({
  isOpen,
  onClose,
  classData,
  onSuccess,
  branchId,
  sessionId,
}: ClassFormModalProps) {
  const { toast } = useToast();
  const isEditMode = !!classData;

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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Class" : "Add New Class"}</DialogTitle>
        </DialogHeader>

        <Form form={form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submitted");
              handleSubmit();
            }}
            className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Class 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. A" {...field} />
                    </FormControl>
                    <FormMessage />
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
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Teacher</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a teacher" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {teachers?.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.firstName} {teacher.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <div className="text-sm text-gray-500">
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  console.log("Submit button clicked");
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
