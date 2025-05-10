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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  code: z.string().min(1, {
    message: "Code is required.",
  }),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormSchema = z.infer<typeof formSchema>;

interface AttendanceTypeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
  branchId: string;
}

export function AttendanceTypeFormModal({
  open,
  onClose,
  onSuccess,
  initialData,
  branchId,
}: AttendanceTypeFormModalProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const form = useForm<FormSchema>({
    // @ts-ignore - Type mismatch between zod and react-hook-form
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isDefault: false,
      isActive: true,
    },
  });

  // Set initial values when editing
  useEffect(() => {
    if (initialData) {
      const formattedData = {
        name: initialData.name,
        code: initialData.code,
        description: initialData.description || "",
        isDefault: initialData.isDefault || false,
        isActive: initialData.isActive !== false, // default to true if undefined
      };
      
      form.reset(formattedData);
    } else {
      form.reset({
        name: "",
        code: "",
        description: "",
        isDefault: false,
        isActive: true,
      });
    }
  }, [initialData, form]);

  // Mutation for create/update
  // @ts-ignore - API routes not fully typed
  const createMutation = api.attendanceLocation.createLocationType.useMutation({
    onSuccess: () => {
      handleSuccess("Location type created successfully");
    },
    onError: (error) => {
      handleError(error.message);
    },
  });

  // @ts-ignore - API routes not fully typed
  const updateMutation = api.attendanceLocation.updateLocationType.useMutation({
    onSuccess: () => {
      handleSuccess("Location type updated successfully");
    },
    onError: (error) => {
      handleError(error.message);
    },
  });

  // Helper functions
  const handleSuccess = (message: string) => {
    setIsSubmitting(false);
    toast({
      title: "Success",
      description: message,
      variant: "success",
    });
    onClose();
    if (onSuccess) onSuccess();
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

    const payload = {
      ...data,
      branchId,
    };

    if (initialData) {
      updateMutation.mutate({
        id: initialData.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Add"} Location Type</DialogTitle>
          <DialogDescription>
            Define types of locations where attendance can be marked (e.g., School, Office, Field).
          </DialogDescription>
        </DialogHeader>

        {/* @ts-ignore - Type mismatch between zod and react-hook-form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type Name</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., School Campus" {...field} />
                </FormControl>
                <FormDescription>
                  A descriptive name for this location type.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type Code</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., SCH" {...field} />
                </FormControl>
                <FormDescription>
                  A short code to identify this location type.
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
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional details about this location type" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Default Type</FormLabel>
                    <FormDescription>
                      Set as default for new locations
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

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Can be used for new locations
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initialData ? "Updating..." : "Creating..."}
                </>
              ) : initialData ? (
                "Update Type"
              ) : (
                "Create Type"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 