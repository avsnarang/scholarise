
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { EnhancedCalendar } from "@/components/ui/enhanced-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Simple date formatter function to avoid date-fns dependency issues
function formatDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  isActive: z.boolean().default(false),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}) as any;

type FormValues = z.infer<typeof formSchema>;

interface AcademicSessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData?: any;
  onSuccess: () => void;
}

export function AcademicSessionFormModal({
  isOpen,
  onClose,
  sessionData,
  onSuccess,
}: AcademicSessionFormModalProps) {
  const { toast } = useToast();
  const isEditMode = !!sessionData;
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Create and update mutations
  const createMutation = api.academicSession.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Academic session created",
        description: "The academic session has been created successfully.",
        variant: "success",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create academic session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = api.academicSession.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Academic session updated",
        description: "The academic session has been updated successfully.",
        variant: "success",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update academic session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set up form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: sessionData?.name || "",
      startDate: sessionData?.startDate ? new Date(sessionData.startDate) : new Date(),
      endDate: sessionData?.endDate ? new Date(sessionData.endDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      isActive: sessionData?.isActive ?? false,
    },
  });

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    if (isEditMode) {
      updateMutation.mutate({
        id: sessionData.id,
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        isActive: values.isActive,
      });
    } else {
      createMutation.mutate(values);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Academic Session" : "Add New Academic Session"}</DialogTitle>
        </DialogHeader>

        <div>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2023-2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            type="button"
                            disabled={isSubmitting}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              formatDate(field.value)
                            ) : (
                              <span>Select start date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <EnhancedCalendar
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                            setStartDateOpen(false);
                          }}
                          disabled={isSubmitting}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            type="button"
                            disabled={isSubmitting}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              formatDate(field.value)
                            ) : (
                              <span>Select end date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <EnhancedCalendar
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                            setEndDateOpen(false);
                          }}
                          disabled={isSubmitting}
                        />
                      </PopoverContent>
                    </Popover>
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
                      Mark this session as active
                    </div>
                    {field.value && (
                      <div className="text-xs text-amber-600">
                        Note: Setting this session as active will deactivate all other sessions
                      </div>
                    )}
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
                type="submit"
                disabled={isSubmitting}
                className="bg-[#00501B] hover:bg-[#00501B]/90 text-white"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
