"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form schema for teacher salary increment
const formSchema = z.object({
  teacherId: z.string({
    required_error: "Please select a teacher",
  }),
  incrementType: z.enum(["amount", "percentage"], {
    required_error: "Please select increment type",
  }),
  incrementAmount: z.number().min(0).optional(),
  incrementPercentage: z.number().min(0).max(100).optional(),
  effectiveDate: z.date({
    required_error: "Please select an effective date",
  }),
  remarks: z.string().optional(),
}).refine((data) => {
  if (data.incrementType === "amount") {
    return data.incrementAmount !== undefined && data.incrementAmount > 0;
  } else {
    return data.incrementPercentage !== undefined && data.incrementPercentage > 0;
  }
}, {
  message: "Please enter a valid increment value",
  path: ["incrementAmount"],
});

type FormValues = z.infer<typeof formSchema>;

export default function SalaryIncrementsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [incrementType, setIncrementType] = useState<"amount" | "percentage">("amount");

  // Fetch teachers
  const { data: teachers, isLoading: isLoadingTeachers } = api.teacher.getAll.useQuery({
    limit: 100,
  });

  // Fetch teacher salary details when a teacher is selected
  const { data: teacherSalaries, isLoading: isLoadingTeacherSalaries } = api.salary.getTeacherSalaryDetails.useQuery(
    { teacherId: selectedTeacher! },
    { enabled: !!selectedTeacher }
  );

  // Get current active salary (if any)
  const activeSalary = teacherSalaries?.find(s => s.isActive);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      incrementType: "amount",
      incrementAmount: 0,
      incrementPercentage: 0,
      effectiveDate: new Date(),
    },
  });

  // Watch increment type to conditionally show fields
  const watchIncrementType = form.watch("incrementType");

  // Handle increment type change
  const handleIncrementTypeChange = (value: "amount" | "percentage") => {
    setIncrementType(value);
    form.setValue("incrementType", value);
    // Reset the other increment value
    if (value === "amount") {
      form.setValue("incrementPercentage", undefined);
    } else {
      form.setValue("incrementAmount", undefined);
    }
  };

  // Increment teacher salary mutation
  const incrementSalary = api.salary.incrementTeacherSalary.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Salary increment applied successfully",
      });
      form.reset();
      setSelectedTeacher(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply salary increment",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(values: FormValues) {
    const payload = {
      teacherId: values.teacherId,
      incrementAmount: values.incrementType === "amount" ? values.incrementAmount : undefined,
      incrementPercentage: values.incrementType === "percentage" ? values.incrementPercentage : undefined,
      effectiveDate: values.effectiveDate,
      remarks: values.remarks,
    };
    
    incrementSalary.mutate(payload);
  }

  if (isLoadingTeachers) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Salary Increments</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/salary/increments/history")}
        >
          View Increment History
        </Button>
      </div>

      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers">Teacher Increments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="teachers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Apply Salary Increment</CardTitle>
              <CardDescription>
                Apply annual or merit-based salary increments to teachers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form form={form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Teacher Selection */}
                    <FormField
                      control={form.control}
                      name="teacherId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teacher</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedTeacher(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select teacher" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers?.items?.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                  {teacher.firstName} {teacher.lastName}
                                  {teacher.employeeCode && ` (${teacher.employeeCode})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Current Salary Display (not editable) */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Current Basic Salary</p>
                      {selectedTeacher ? (
                        isLoadingTeacherSalaries ? (
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        ) : activeSalary ? (
                          <p className="text-xl font-semibold">
                            ₹{(activeSalary.customBasicSalary || activeSalary.structure.basicSalary).toLocaleString()}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">No active salary found</p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">Select a teacher to view current salary</p>
                      )}
                    </div>

                    {/* Increment Type */}
                    <FormField
                      control={form.control}
                      name="incrementType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Increment Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => handleIncrementTypeChange(value as "amount" | "percentage")}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="amount" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Fixed Amount
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="percentage" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Percentage
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Increment Amount (shown if amount type is selected) */}
                    {watchIncrementType === "amount" && (
                      <FormField
                        control={form.control}
                        name="incrementAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Increment Amount (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                value={field.value === 0 ? "" : field.value}
                              />
                            </FormControl>
                            <FormDescription>
                              Fixed amount to add to the current basic salary
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Increment Percentage (shown if percentage type is selected) */}
                    {watchIncrementType === "percentage" && (
                      <FormField
                        control={form.control}
                        name="incrementPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Increment Percentage (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                value={field.value === 0 ? "" : field.value}
                              />
                            </FormControl>
                            <FormDescription>
                              Percentage increase to apply to the current basic salary
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* New Salary Preview */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">New Basic Salary</p>
                      {selectedTeacher && activeSalary ? (
                        <div>
                          {watchIncrementType === "amount" && form.getValues("incrementAmount") ? (
                            <p className="text-xl font-semibold text-green-600">
                              ₹{((activeSalary.customBasicSalary || activeSalary.structure.basicSalary) + 
                                (form.getValues("incrementAmount") || 0)).toLocaleString()}
                            </p>
                          ) : watchIncrementType === "percentage" && form.getValues("incrementPercentage") ? (
                            <p className="text-xl font-semibold text-green-600">
                              ₹{((activeSalary.customBasicSalary || activeSalary.structure.basicSalary) * 
                                (1 + (form.getValues("incrementPercentage") || 0) / 100)).toLocaleString()}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Enter increment value to see preview</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Select a teacher with active salary</p>
                      )}
                    </div>

                    {/* Effective Date */}
                    <FormField
                      control={form.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Effective Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
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
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Date from which the new salary will be effective
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Remarks */}
                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Annual increment, performance bonus, etc."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Reason for the salary increment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={incrementSalary.isPending || !selectedTeacher || !activeSalary}
                    >
                      {incrementSalary.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Apply Increment"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 