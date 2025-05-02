"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/api";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  joinDate: z.string().optional(),
  isActive: z.boolean(),
  employeeCode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditTeacherPage() {
  const params = useParams() || {};
  const teacherId = params.id as string;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: teacher, isLoading, error } = api.teacher.getById.useQuery(
    { id: teacherId },
    { enabled: !!teacherId, retry: 1 }
  );

  useEffect(() => {
    if (teacher) {
      document.title = `Edit ${teacher.firstName} ${teacher.lastName} | ScholaRise ERP`;
    }
  }, [teacher]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      qualification: "",
      specialization: "",
      joinDate: "",
      isActive: true,
      employeeCode: "",
    },
  });

  // Update form values when teacher data is loaded
  useEffect(() => {
    if (teacher) {
      form.reset({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        qualification: teacher.qualification || "",
        specialization: teacher.specialization || "",
        joinDate: teacher.joinDate
          ? new Date(teacher.joinDate).toISOString().split("T")[0]
          : "",
        isActive: teacher.isActive,
        employeeCode: teacher.employeeCode || "",
      });
    }
  }, [teacher, form]);

  const utils = api.useContext();
  const updateTeacherMutation = api.teacher.update.useMutation({
    onSuccess: () => {
      // Invalidate relevant queries
      void utils.teacher.getById.invalidate({ id: teacherId });
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      
      toast({
        title: "Teacher updated",
        description: "Teacher details have been successfully updated.",
        variant: "default",
      });
      
      setIsSubmitting(false);
      void router.push(`/teachers/${teacherId}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      
      toast({
        title: "Error updating teacher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!teacher) return;
    
    setIsSubmitting(true);
    updateTeacherMutation.mutate({
      id: teacherId,
      ...data,
      branchId: teacher.branchId,
      joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="px-4 lg:px-6">
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Error: {error?.message || "Teacher not found"}
          </p>
          <Button asChild>
            <Link href="/teachers">Back to Teachers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/teachers/${teacherId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Edit Teacher</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.firstName} {teacher.lastName}</p>
        </div>
      </div>

      <div className="max-w-3xl">
        <Form form={form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="rounded-md border p-6 space-y-6">
              <h2 className="text-lg font-medium">Personal Information</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code</FormLabel>
                      <FormControl>
                        <Input placeholder="PS-23101" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this teacher
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification</FormLabel>
                      <FormControl>
                        <Input placeholder="M.Sc., B.Ed." {...field} />
                      </FormControl>
                      <FormDescription>
                        Highest educational qualification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input placeholder="Mathematics" {...field} />
                      </FormControl>
                      <FormDescription>
                        Subject specialization or expertise
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Join Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Determines if the teacher is active in the system
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
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/teachers/${teacherId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
