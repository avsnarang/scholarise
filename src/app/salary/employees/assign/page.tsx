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
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Form schema for assigning employee salary
const formSchema = z.object({
  employeeId: z.string({
    required_error: "Please select an employee",
  }),
  structureId: z.string({
    required_error: "Please select a salary structure",
  }),
  customBasicSalary: z.number().positive().optional(),
  customDaPercentage: z.number().min(0).max(100).optional(),
  customPfPercentage: z.number().min(0).max(100).optional(),
  customEsiPercentage: z.number().min(0).max(100).optional(),
  additionalAllowances: z.number().min(0),
  startDate: z.date({
    required_error: "Please select a start date",
  }),
  endDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AssignEmployeeSalaryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);

  // Fetch employees
  const { data: employees, isLoading: isLoadingEmployees } = api.employee.getAll.useQuery({
    limit: 100,
  });

  // Fetch active salary structures
  const { data: structures, isLoading: isLoadingStructures } = api.salary.getSalaryStructures.useQuery({
    isActive: true,
  });

  // Get selected structure details
  const selectedStructureDetails = structures?.find((s) => s.id === selectedStructure);

  // Create form with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      additionalAllowances: 0,
    },
  });

  // Assign employee salary mutation
  const assignSalary = api.salary.assignEmployeeSalary.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary assigned to employee successfully",
      });
      router.push("/salary/employees/assign");
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign salary",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(values: FormValues) {
    assignSalary.mutate(values);
  }

  if (isLoadingEmployees || isLoadingStructures) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assign Employee Salary</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Salary Structure</CardTitle>
          <CardDescription>
            Assign a salary structure to an employee with optional custom values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Employee Selection */}
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.items?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} ({employee.designation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Salary Structure Selection */}
              <FormField
                control={form.control}
                name="structureId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Structure</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedStructure(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select salary structure" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {structures?.map((structure) => (
                          <SelectItem key={structure.id} value={structure.id}>
                            {structure.name} - ₹{structure.basicSalary.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom Basic Salary (Optional) */}
              <FormField
                control={form.control}
                name="customBasicSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Basic Salary (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={selectedStructureDetails ? selectedStructureDetails.basicSalary.toString() : "Enter amount"}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to use structure default: 
                      {selectedStructureDetails && ` ₹${selectedStructureDetails.basicSalary.toLocaleString()}`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Allowances */}
              <FormField
                control={form.control}
                name="additionalAllowances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Allowances</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional allowances like HRA, transport allowance, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom DA Percentage (Optional) */}
              <FormField
                control={form.control}
                name="customDaPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom DA Percentage (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder={selectedStructureDetails ? selectedStructureDetails.daPercentage.toString() : "0-100"}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to use structure default: 
                      {selectedStructureDetails && ` ${selectedStructureDetails.daPercentage}%`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom PF Percentage (Optional) */}
              <FormField
                control={form.control}
                name="customPfPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom PF Percentage (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder={selectedStructureDetails ? selectedStructureDetails.pfPercentage.toString() : "0-100"}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to use structure default: 
                      {selectedStructureDetails && ` ${selectedStructureDetails.pfPercentage}%`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Custom ESI Percentage (Optional) */}
              <FormField
                control={form.control}
                name="customEsiPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom ESI Percentage (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder={selectedStructureDetails ? selectedStructureDetails.esiPercentage.toString() : "0-100"}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to use structure default: 
                      {selectedStructureDetails && ` ${selectedStructureDetails.esiPercentage}%`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Date from which this salary structure becomes effective
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date (Optional) */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
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
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={date => date < (form.getValues().startDate || new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Leave empty if this is an ongoing assignment
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
                disabled={assignSalary.isPending}
              >
                {assignSalary.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Salary"
                )}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 