import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Calendar, Loader2, CalendarIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBranchContext } from "@/hooks/useBranchContext";

const formSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  policyId: z.string().min(1, "Leave type is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface LeavePolicy {
  id: string;
  name: string;
  description: string | null;
  maxDaysPerYear: number;
  isPaid: boolean;
  applicableRoles: string[];
}

interface LeaveApplicationFormProps {
  policies: LeavePolicy[];
  teacherId?: string;
  employeeId?: string;
}

export function LeaveApplicationForm({ policies, teacherId, employeeId }: LeaveApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const { toast } = useToast();
  const utils = api.useContext();
  const { currentBranchId } = useBranchContext();

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

  // Get leave balance for the selected policy
  const { data: leaveBalances, refetch: refetchBalances } = api.leave.getLeaveBalance.useQuery(
    {
      teacherId,
      employeeId,
      year: new Date().getFullYear(),
      branchId: currentBranchId || "",
    },
    {
      enabled: !!(teacherId || employeeId) && !!currentBranchId,
      refetchOnWindowFocus: false,
    }
  );

  const selectedPolicyBalance = leaveBalances?.find(
    balance => balance.policy.id === selectedPolicyId
  );

  const createApplication = api.leave.createApplication.useMutation({
    onSuccess: async (newApplication) => {
      // Invalidate and refetch relevant queries
      await Promise.all([
        utils.leave.getApplications.invalidate(),
        refetchBalances(),
      ]);
      
      toast({
        title: "Success",
        description: `Your leave application has been submitted successfully. Application will be reviewed shortly.`,
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
    
    // Enhanced date validation
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (startDate > endDate) {
      toast({
        title: "Invalid dates",
        description: "Start date must be before or equal to end date",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    // Check if start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      toast({
        title: "Invalid start date",
        description: "Leave cannot be applied for past dates",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Check if weekend dates are allowed (optional validation)
    const isWeekend = (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6; // Sunday = 0, Saturday = 6
    };

    // Calculate leave days excluding weekends (optional - depends on policy)
    const totalDays = calculateDays();
    
    if (selectedPolicyBalance && totalDays && selectedPolicyBalance.remainingDays < totalDays) {
      toast({
        title: "Insufficient leave balance",
        description: `You have ${selectedPolicyBalance.remainingDays} days remaining, but requested ${totalDays} days.`,
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
    
    // Calculate difference in days (inclusive)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays;
  };

  const leaveDays = calculateDays();

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get maximum date (1 year from now)
  const getMaxDate = () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return oneYearFromNow.toISOString().split('T')[0];
  };

  return (
    <Form form={form}>
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
                        <div className="flex items-center justify-between w-full">
                          <span>{policy.name}</span>
                          <div className="flex items-center gap-2 ml-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              policy.isPaid ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {policy.isPaid ? "Paid" : "Unpaid"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {policy.maxDaysPerYear} days/year
                            </span>
                          </div>
                        </div>
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

          {/* Leave Balance Display */}
          {selectedPolicyBalance && (
            <div className="sm:col-span-2">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-700">Available Balance</h4>
                    <p className="text-sm text-slate-500">{selectedPolicy?.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#00501B]">
                      {selectedPolicyBalance.remainingDays}
                    </div>
                    <div className="text-sm text-slate-500">
                      of {selectedPolicyBalance.totalDays} days remaining
                    </div>
                  </div>
                </div>
                {selectedPolicyBalance.remainingDays <= 5 && (
                  <Alert className="mt-3 bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700">
                      Low leave balance! You have only {selectedPolicyBalance.remainingDays} days remaining.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

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
                        min={getMinDate()}
                        max={getMaxDate()}
                        className="border-slate-300 pl-10 h-10" 
                      />
                      <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-slate-500">
                    Leave start date (cannot be in the past)
                  </FormDescription>
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
                        min={form.watch("startDate") || getMinDate()}
                        max={getMaxDate()}
                        className="border-slate-300 pl-10 h-10" 
                      />
                      <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs text-slate-500">
                    Leave end date (inclusive)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Leave Duration Summary */}
          {leaveDays && selectedPolicy && (
            <div className="sm:col-span-2">
              <Alert className={`${
                selectedPolicyBalance && leaveDays > selectedPolicyBalance.remainingDays 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <AlertDescription className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    You are applying for <span className="font-semibold mx-1">{leaveDays} days</span> of {selectedPolicy.name}
                    {selectedPolicyBalance && (
                      <span className="ml-2 text-sm">
                        (Balance after: {selectedPolicyBalance.remainingDays - leaveDays} days)
                      </span>
                    )}
                  </AlertDescription>
                  
                  <div className="text-sm mt-2 sm:mt-0">
                    Max allowed: <span className="font-semibold">{selectedPolicy.maxDaysPerYear} days/year</span>
                  </div>
                </div>
                
                {selectedPolicyBalance && leaveDays > selectedPolicyBalance.remainingDays && (
                  <div className="mt-2 text-sm">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Insufficient balance! You need {leaveDays - selectedPolicyBalance.remainingDays} more days.
                  </div>
                )}
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
                    placeholder="Please provide a detailed reason for your leave application. Include any relevant information that will help in the approval process."
                    className="resize-none border-slate-300 min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs text-slate-500">
                  Minimum 10 characters. Clear details help expedite the approval process.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {selectedPolicy && (
              <span>
                {selectedPolicy.description && (
                  <span className="italic">{selectedPolicy.description}</span>
                )}
              </span>
            )}
          </div>
          
          <Button 
            type="submit" 
            disabled={isSubmitting || Boolean(selectedPolicyBalance && leaveDays && leaveDays > selectedPolicyBalance.remainingDays)}
            className="bg-[#00501B] hover:bg-[#004016] text-white disabled:opacity-50"
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
    </Form>
  );
} 