"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Save, X, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

const feedbackSchema = z.object({
  purpose: z.string().optional(),
  feedback: z.string().min(1, "Feedback is required"),
  followUp: z.string().optional(),
  isPrivate: z.boolean(),
  callDate: z.date(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  section?: {
    name: string;
    class?: {
      name: string;
    };
  };
  parent?: {
    fatherName?: string;
    motherName?: string;
    guardianName?: string;
    fatherMobile?: string;
    motherMobile?: string;
  };
}

interface ExistingFeedback {
  id: string;
  purpose?: string;
  feedback: string;
  followUp?: string;
  isPrivate: boolean;
  callDate: Date;
}

interface FeedbackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  existingFeedback?: ExistingFeedback | null;
  onSubmit: (data: FeedbackFormData) => Promise<void>;
  isLoading: boolean;
}

export function FeedbackFormModal({
  isOpen,
  onClose,
  student,
  existingFeedback,
  onSubmit,
  isLoading,
}: FeedbackFormModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Determine if user is a head (has administrative roles)
  // Check for administrative roles that should have private feedback
  const isHeadUser = user?.roles?.some((role: string) => 
    ['admin', 'Admin', 'principal', 'Principal', 'super_admin', 'SuperAdmin', 'Super Admin'].includes(role)
  ) || ['admin', 'Admin', 'principal', 'Principal', 'super_admin', 'SuperAdmin', 'Super Admin'].includes(user?.role || '');

  // Debug logging
  console.log('FeedbackFormModal - Role Detection:', {
    userRoles: user?.roles,
    userRole: user?.role,
    isHeadUser,
  });

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      purpose: "",
      feedback: "",
      followUp: "",
      isPrivate: isHeadUser, // Head feedback is always private
      callDate: new Date(),
    },
  });

  // Reset form when modal opens/closes or when existing feedback changes
  useEffect(() => {
    if (isOpen && existingFeedback) {
      form.reset({
        purpose: existingFeedback.purpose || "",
        feedback: existingFeedback.feedback,
        followUp: existingFeedback.followUp || "",
        isPrivate: isHeadUser ? true : existingFeedback.isPrivate, // Force private for heads
        callDate: existingFeedback.callDate,
      });
    } else if (isOpen && !existingFeedback) {
      form.reset({
        purpose: "",
        feedback: "",
        followUp: "",
        isPrivate: isHeadUser, // Head feedback is always private
        callDate: new Date(),
      });
    }
  }, [isOpen, existingFeedback, form, isHeadUser]);

  const handleSubmit = async (data: FeedbackFormData) => {
    try {
      // Head feedback is always private, regardless of form input
      const submissionData = {
        ...data,
        isPrivate: isHeadUser ? true : data.isPrivate,
      };

      await onSubmit(submissionData);
      toast({
        title: "Success",
        description: existingFeedback
          ? "Feedback updated successfully"
          : "Feedback added successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save feedback",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!student) return null;

  const parentContact =
    student.parent?.fatherMobile ||
    student.parent?.motherMobile ||
    "Not available";

  const parentName =
    student.parent?.fatherName ||
    student.parent?.motherName ||
    student.parent?.guardianName ||
    "Not available";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {existingFeedback ? "Edit" : "Add"} Courtesy Call Feedback
          </DialogTitle>
          <DialogDescription>
            {existingFeedback
              ? "Update the feedback for this courtesy call"
              : "Record feedback from your courtesy call"}
          </DialogDescription>
        </DialogHeader>

        {/* Student Information */}
        <div className="bg-muted/50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {student.firstName}{" "}
              {student.lastName}
            </div>
            <div>
              <span className="font-medium">Admission No:</span>{" "}
              {student.admissionNumber}
            </div>
            <div>
              <span className="font-medium">Class:</span>{" "}
              {student.section?.class?.name
                ? `${student.section.class.name} - ${student.section.name}`
                : "Not assigned"}
            </div>
            <div>
              <span className="font-medium">Parent:</span> {parentName}
            </div>
            <div className="md:col-span-2">
              <span className="font-medium">Contact:</span> {parentContact}
            </div>
          </div>
        </div>

        {/* Privacy Notice for Heads */}
        {isHeadUser && (
          <Alert className="mb-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              As an administrative head, all your feedback is automatically marked as private 
              and will only be visible to users with higher administrative privileges.
            </AlertDescription>
          </Alert>
        )}

        <Form form={form} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Call Date */}
            <FormField
              control={form.control}
              name="callDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Call Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Purpose */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose of Call</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Academic performance, behavior, attendance..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Feedback */}
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Feedback <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide detailed feedback about the conversation with the parent/guardian..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow Up */}
            <FormField
              control={form.control}
              name="followUp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Actions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any follow-up actions required or commitments made..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Private Feedback - Only show for teachers, heads always have private feedback */}
            {!isHeadUser && (
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Private Feedback</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark as private to restrict visibility to higher-level staff only
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
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {existingFeedback ? "Update" : "Save"} Feedback
              </Button>
            </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 