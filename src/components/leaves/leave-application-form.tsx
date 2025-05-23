import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
  policyId: z.string().min(1, "Leave type is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface LeaveApplicationFormProps {
  policies: {
    id: string;
    name: string;
    description?: string | null;
    maxDaysPerYear: number;
    isPaid: boolean;
  }[];
  teacherId?: string;
  employeeId?: string;
}

export function LeaveApplicationForm({ policies, teacherId, employeeId }: LeaveApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const { toast } = useToast();
  const utils = api.useContext();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
      policyId: "",
    },
  });

  const selectedPolicy = selectedPolicyId 
    ? policies.find(policy => policy.id === selectedPolicyId) 
    : null;

  const createApplication = api.leave.createApplication.useMutation({
    onSuccess: () => {
      void utils.leave.getApplications.invalidate();
      void utils.leave.getLeaveBalance.invalidate();
      toast({
        title: "Success",
        description: "Your leave application has been submitted successfully.",
        variant: "default",
      });
      form.reset();
      setIsSubmitting(false);
      setSelectedPolicyId(null);
    },
    onError: (error) => {
      console.error("Error creating application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave application. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (startDate > endDate) {
      toast({
        title: "Invalid dates",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      toast({
        title: "Invalid start date",
        description: "Start date cannot be in the past",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      await createApplication.mutateAsync({
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        policyId: data.policyId,
        teacherId,
        employeeId,
      });
    } catch (error) {
      // Error is handled in onError callback
      console.error("Error submitting form:", error);
    }
  };

  // Calculate the number of leave days
  const calculateDays = () => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return null;
    
    // Calculate difference in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include end date
    
    return diffDays;
  };

  const leaveDays = calculateDays();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="policyId"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-base font-medium">Leave Type</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedPolicyId(value);
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="border-slate-300 h-10">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {policies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      <span className="flex items-center">
                        {policy.name}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${policy.isPaid ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {policy.isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs text-slate-500">
                Select the type of leave you want to apply for
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-base font-medium">Start Date</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type="date" 
                      {...field} 
                      className="border-slate-300 pl-10 h-10" 
                    />
                    <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-base font-medium">End Date</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type="date" 
                      {...field} 
                      className="border-slate-300 pl-10 h-10" 
                    />
                    <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {leaveDays && selectedPolicy && (
          <div className="sm:col-span-2">
            <Alert className={`bg-blue-50 border-blue-200 text-blue-800`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  You are applying for <span className="font-semibold mx-1">{leaveDays} days</span> of {selectedPolicy.name}
                </AlertDescription>
                
                <div className="text-sm mt-2 sm:mt-0">
                  Max allowed: <span className="font-semibold">{selectedPolicy.maxDaysPerYear} days/year</span>
                </div>
              </div>
            </Alert>
          </div>
        )}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem className="sm:col-span-2 space-y-2">
              <FormLabel className="text-base font-medium">Reason for Leave</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide a detailed reason for your leave"
                  className="resize-none border-slate-300 min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs text-slate-500">
                Please provide clear details as this will help in the approval process
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#00501B] hover:bg-[#004016] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit Application
            </>
          )}
        </Button>
      </div>
    </form>
  );
} 