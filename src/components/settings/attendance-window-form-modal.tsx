"use client";

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  locationTypeId: z.string({
    required_error: "Please select a location type.",
  }),
  startTime: z.string({
    required_error: "Please select a start time."
  }),
  endTime: z.string({
    required_error: "Please select an end time."
  }),
  isMon: z.boolean().default(true),
  isTue: z.boolean().default(true),
  isWed: z.boolean().default(true),
  isThu: z.boolean().default(true),
  isFri: z.boolean().default(true),
  isSat: z.boolean().default(false),
  isSun: z.boolean().default(false),
  allowLateMarking: z.boolean().default(false),
  lateMarkingGracePeriod: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

type FormSchema = z.infer<typeof formSchema>;

interface AttendanceWindowFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
  branchId: string;
}

export function AttendanceWindowFormModal({
  open,
  onClose,
  onSuccess,
  initialData,
  branchId,
}: AttendanceWindowFormModalProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch location types
  const { data: locationTypes, isLoading: isLoadingTypes } = api.attendanceLocation.getLocationTypes.useQuery(
    { branchId: branchId || "" },
    { enabled: !!branchId && open }
  );

  // Form setup
  const form = useForm<FormSchema>({
    // @ts-ignore - Type mismatch between zod and react-hook-form
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      locationTypeId: "",
      startTime: "09:00",
      endTime: "17:00",
      isMon: true,
      isTue: true,
      isWed: true,
      isThu: true,
      isFri: true,
      isSat: false,
      isSun: false,
      allowLateMarking: false,
      lateMarkingGracePeriod: 0,
      isActive: true,
    },
  });

  // Set initial values when editing
  useEffect(() => {
    if (initialData) {
      console.log("Setting initial form data from:", JSON.stringify(initialData, null, 2));
      console.log("Initial data has ID?", !!initialData.id, "ID:", initialData.id);
      // Ensure all required fields have values
      const formattedData = {
        name: initialData.name || "",
        locationTypeId: initialData.locationTypeId || "",
        startTime: initialData.startTime || "09:00",
        endTime: initialData.endTime || "17:00",
        isMon: initialData.isMon !== undefined ? initialData.isMon : true,
        isTue: initialData.isTue !== undefined ? initialData.isTue : true,
        isWed: initialData.isWed !== undefined ? initialData.isWed : true,
        isThu: initialData.isThu !== undefined ? initialData.isThu : true,
        isFri: initialData.isFri !== undefined ? initialData.isFri : true,
        isSat: initialData.isSat !== undefined ? initialData.isSat : false,
        isSun: initialData.isSun !== undefined ? initialData.isSun : false,
        allowLateMarking: initialData.allowLateMarking !== undefined ? initialData.allowLateMarking : false,
        lateMarkingGracePeriod: initialData.lateMarkingGracePeriod !== undefined ? 
                               Number(initialData.lateMarkingGracePeriod) : 0,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      };
      
      console.log("Setting form values to:", formattedData);
      form.reset(formattedData);
    } else {
      form.reset({
        name: "",
        locationTypeId: "",
        startTime: "09:00",
        endTime: "17:00",
        isMon: true,
        isTue: true,
        isWed: true,
        isThu: true,
        isFri: true,
        isSat: false,
        isSun: false,
        allowLateMarking: false,
        lateMarkingGracePeriod: 0,
        isActive: true,
      });
    }
  }, [initialData, form]);

  // Mutation for create/update
  // @ts-ignore - API routes not fully typed
  const createMutation = api.attendanceWindow.create.useMutation({
    onSuccess: () => {
      handleSuccess("Attendance window created successfully");
    },
    onError: (error) => {
      handleError(error.message || "Failed to create attendance window");
    },
  });

  // @ts-ignore - API routes not fully typed
  const updateMutation = api.attendanceWindow.update.useMutation({
    onMutate: (data) => {
      console.log("Update mutation started with payload:", data);
    },
    onSuccess: (data) => {
      console.log("Update mutation success:", data);
      handleSuccess("Attendance window updated successfully");
    },
    onError: (error) => {
      console.error("Update mutation error:", error);
      // Detailed error handling
      if (error.message) {
        handleError(error.message);
      } else if (error.data?.zodError) {
        handleError("Data validation error. Please check your inputs.");
      } else {
        handleError("Failed to update attendance window. Please try again.");
      }
    },
    onSettled: () => {
      console.log("Update mutation settled (completed regardless of outcome)");
    }
  });

  // Helper functions
  const handleSuccess = (message: string) => {
    console.log("handleSuccess called with message:", message);
    setIsSubmitting(false);
    toast({
      title: "Success",
      description: message,
      variant: "success",
    });
    
    // Make sure onSuccess is called before closing
    if (onSuccess) {
      console.log("Calling onSuccess callback");
      onSuccess();
    }
    
    console.log("Closing modal");
    onClose();
    
    // Fallback - force close after a slight delay in case the above didn't work
    setTimeout(() => {
      console.log("Force closing modal via timeout");
      onClose();
    }, 300);
  };

  const handleError = (message: string) => {
    setIsSubmitting(false);
    toast({
      title: "Error",
      description: message || "An unexpected error occurred",
      variant: "destructive",
    });
  };

  // Form submission
  const onSubmit = (data: FormSchema) => {
    if (!branchId) {
      handleError("No branch selected");
      return;
    }

    setIsSubmitting(true);
    console.log("Form submitted with data:", data);
    console.log("Initial data:", initialData);

    try {
      // Convert the grace period to a number and ensure all boolean fields are properly set
      const payload = {
        ...data,
        branchId,
        locationTypeId: data.locationTypeId || "",
        // Explicitly coerce to number to avoid type issues
        lateMarkingGracePeriod: Number(data.lateMarkingGracePeriod) || 0,
        isMon: Boolean(data.isMon),
        isTue: Boolean(data.isTue),
        isWed: Boolean(data.isWed),
        isThu: Boolean(data.isThu),
        isFri: Boolean(data.isFri),
        isSat: Boolean(data.isSat),
        isSun: Boolean(data.isSun),
        allowLateMarking: Boolean(data.allowLateMarking),
        isActive: Boolean(data.isActive),
      };

      if (initialData && initialData.id) {
        const id = initialData.id;
        console.log("Updating window with ID:", id);
        console.log("Full update payload:", { id, ...payload });
        
        // Ensure the id is included and explicitly passed
        updateMutation.mutate({
          id,
          ...payload,
        });
      } else {
        console.log("Creating with payload:", payload);
        createMutation.mutate(payload);
      }
    } catch (error) {
      console.error("Error processing form submission:", error);
      handleError("Failed to process form submission. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Add"} Attendance Window</DialogTitle>
          <DialogDescription>
            Configure a time window during which attendance can be marked for a specific location type.
          </DialogDescription>
        </DialogHeader>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(onSubmit as any)(e);
          }} 
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Window Name</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Morning Check-in" {...field} />
                </FormControl>
                <FormDescription>
                  Provide a descriptive name for this attendance window.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="locationTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || ""}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingTypes ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : locationTypes && locationTypes.length > 0 ? (
                      locationTypes.map((type: { id: string; name: string }) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-types">No location types available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the location type this window applies to.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <div className="font-medium">Days</div>
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="isMon"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Monday</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isTue"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Tuesday</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isWed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Wednesday</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isThu"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Thursday</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFri"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Friday</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isSat"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Saturday</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isSun"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Sunday</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="allowLateMarking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Allow Late Marking</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Active</FormLabel>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="lateMarkingGracePeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Late Marking Grace Period (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    step="1"
                    {...field}
                    // Ensure value is treated as a number
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value, 10) : 0;
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  How many minutes after the start time should attendance still be accepted before being marked as late.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              // Add explicit form submission handling
              onClick={async (e) => {
                e.preventDefault();
                const formValid = await form.trigger();
                console.log("Form validation triggered, valid:", formValid);
                if (formValid) {
                  form.handleSubmit(onSubmit as any)();
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initialData ? "Updating..." : "Creating..."}
                </>
              ) : initialData ? (
                "Update Window"
              ) : (
                "Create Window"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 