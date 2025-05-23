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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

// Form schema for processing teacher salary
const teacherFormSchema = z.object({
  teacherId: z.string({
    required_error: "Please select a teacher",
  }),
  teacherSalaryId: z.string({
    required_error: "Please select a salary assignment",
  }),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  otherDeductions: z.number().min(0).default(0),
  otherAdditions: z.number().min(0).default(0),
  remarks: z.string().optional(),
});

// Form schema for processing employee salary
const employeeFormSchema = z.object({
  employeeId: z.string({
    required_error: "Please select an employee",
  }),
  employeeSalaryId: z.string({
    required_error: "Please select a salary assignment",
  }),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  otherDeductions: z.number().min(0).default(0),
  otherAdditions: z.number().min(0).default(0),
  remarks: z.string().optional(),
});

// Define types explicitly
interface TeacherFormValues {
  teacherId: string;
  teacherSalaryId: string;
  month: number;
  year: number;
  otherDeductions: number;
  otherAdditions: number;
  remarks?: string;
}

interface EmployeeFormValues {
  employeeId: string;
  employeeSalaryId: string;
  month: number;
  year: number;
  otherDeductions: number;
  otherAdditions: number;
  remarks?: string;
}

export default function ProcessPaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("teachers");
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  
  // Get current month and year for default values
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = currentDate.getFullYear();

  // Teacher form
  const teacherForm = useForm({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
      otherDeductions: 0,
      otherAdditions: 0,
    },
  }) as any;

  // Employee form
  const employeeForm = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
      otherDeductions: 0,
      otherAdditions: 0,
    },
  }) as any;

  // Fetch teachers
  const { data: teachers, isLoading: isLoadingTeachers } = api.teacher.getAll.useQuery({
    limit: 100,
  });

  // Fetch employees
  const { data: employees, isLoading: isLoadingEmployees } = api.employee.getAll.useQuery({
    limit: 100,
  });

  // Fetch teacher salary assignments when a teacher is selected
  const { data: teacherSalaries, isLoading: isLoadingTeacherSalaries } = api.salary.getTeacherSalaryDetails.useQuery(
    { teacherId: selectedTeacher! },
    { enabled: !!selectedTeacher }
  );

  // Fetch employee salary assignments when an employee is selected
  const { data: employeeSalaries, isLoading: isLoadingEmployeeSalaries } = api.salary.getEmployeeSalaryDetails.useQuery(
    { employeeId: selectedEmployee! },
    { enabled: !!selectedEmployee }
  );

  // Process teacher salary mutation
  const processTeacherSalary = api.salary.processTeacherSalary.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Teacher salary processed successfully",
      });
      teacherForm.reset({
        month: currentMonth,
        year: currentYear,
        otherDeductions: 0,
        otherAdditions: 0,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process salary",
        variant: "destructive",
      });
    },
  });

  // Process employee salary mutation
  const processEmployeeSalary = api.salary.processEmployeeSalary.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee salary processed successfully",
      });
      employeeForm.reset({
        month: currentMonth,
        year: currentYear,
        otherDeductions: 0,
        otherAdditions: 0,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process salary",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers with proper types
  const onSubmitTeacherForm = teacherForm.handleSubmit((values: any) => {
    processTeacherSalary.mutate(values as TeacherFormValues);
  });

  // Handle employee form submission
  const onSubmitEmployeeForm = employeeForm.handleSubmit((values: any) => {
    processEmployeeSalary.mutate(values as EmployeeFormValues);
  });

  // Month names for the dropdown
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Process Salary Payments</h1>
      </div>

      <Tabs defaultValue="teachers" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teachers">Teacher Salaries</TabsTrigger>
          <TabsTrigger value="employees">Employee Salaries</TabsTrigger>
        </TabsList>
        
        {/* Teacher Salary Processing Tab */}
        <TabsContent value="teachers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Process Teacher Salary</CardTitle>
              <CardDescription>
                Process monthly salary for teachers with automatic leave deductions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form form={teacherForm}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Teacher Selection */}
                    <FormField
                      control={teacherForm.control}
                      name="teacherId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teacher</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedTeacher(value);
                              teacherForm.setValue("teacherSalaryId", ""); // Reset salary assignment
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

                    {/* Salary Assignment Selection */}
                    <FormField
                      control={teacherForm.control}
                      name="teacherSalaryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary Assignment</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!selectedTeacher || isLoadingTeacherSalaries}
                          >
                            <FormControl>
                              <SelectTrigger>
                                {isLoadingTeacherSalaries ? (
                                  <div className="flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                  </div>
                                ) : (
                                  <SelectValue placeholder="Select salary assignment" />
                                )}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teacherSalaries
                                ?.filter(s => s.isActive)
                                .map((salary) => (
                                  <SelectItem key={salary.id} value={salary.id}>
                                    {salary.structure.name} - ₹{salary.customBasicSalary || salary.structure.basicSalary}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Only active salary assignments are shown
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Month Selection */}
                    <FormField
                      control={teacherForm.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {monthNames.map((month, index) => (
                                <SelectItem key={index + 1} value={(index + 1).toString()}>
                                  {month}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Year Input */}
                    <FormField
                      control={teacherForm.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="2000"
                              max="2100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Other Deductions */}
                    <FormField
                      control={teacherForm.control}
                      name="otherDeductions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Deductions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional deductions not covered by standard deductions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Other Additions */}
                    <FormField
                      control={teacherForm.control}
                      name="otherAdditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Additions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional payments like bonuses, overtime, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Remarks */}
                    <FormField
                      control={teacherForm.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter any notes about this salary payment"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="submit"
                      disabled={processTeacherSalary.isPending}
                      onClick={onSubmitTeacherForm}
                    >
                      {processTeacherSalary.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Process Salary"
                      )}
                    </Button>
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Employee Salary Processing Tab */}
        <TabsContent value="employees" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Process Employee Salary</CardTitle>
              <CardDescription>
                Process monthly salary for employees with automatic leave deductions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form form={employeeForm}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Employee Selection */}
                    <FormField
                      control={employeeForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedEmployee(value);
                              employeeForm.setValue("employeeSalaryId", ""); // Reset salary assignment
                            }}
                            defaultValue={field.value}
                          >
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

                    {/* Salary Assignment Selection */}
                    <FormField
                      control={employeeForm.control}
                      name="employeeSalaryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary Assignment</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!selectedEmployee || isLoadingEmployeeSalaries}
                          >
                            <FormControl>
                              <SelectTrigger>
                                {isLoadingEmployeeSalaries ? (
                                  <div className="flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                  </div>
                                ) : (
                                  <SelectValue placeholder="Select salary assignment" />
                                )}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employeeSalaries
                                ?.filter(s => s.isActive)
                                .map((salary) => (
                                  <SelectItem key={salary.id} value={salary.id}>
                                    {salary.structure.name} - ₹{salary.customBasicSalary || salary.structure.basicSalary}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Only active salary assignments are shown
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Month Selection */}
                    <FormField
                      control={employeeForm.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {monthNames.map((month, index) => (
                                <SelectItem key={index + 1} value={(index + 1).toString()}>
                                  {month}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Year Input */}
                    <FormField
                      control={employeeForm.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="2000"
                              max="2100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Other Deductions */}
                    <FormField
                      control={employeeForm.control}
                      name="otherDeductions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Deductions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional deductions not covered by standard deductions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Other Additions */}
                    <FormField
                      control={employeeForm.control}
                      name="otherAdditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Additions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional payments like bonuses, overtime, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Remarks */}
                    <FormField
                      control={employeeForm.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter any notes about this salary payment"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="submit"
                      disabled={processEmployeeSalary.isPending}
                      onClick={onSubmitEmployeeForm}
                    >
                      {processEmployeeSalary.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Process Salary"
                      )}
                    </Button>
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 