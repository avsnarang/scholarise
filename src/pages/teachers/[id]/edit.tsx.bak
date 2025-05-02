import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
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
import { api } from "@/utils/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  joinDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const EditTeacherPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teacher, isLoading } = api.teacher.getById.useQuery(
    { id: id as string },
    { enabled: !!id }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      qualification: "",
      specialization: "",
      joinDate: "",
      isActive: true,
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
      });
    }
  }, [teacher, form]);

  const updateTeacherMutation = api.teacher.update.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      void router.push(`/teachers/${id}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      alert(`Error updating teacher: ${error.message}`);
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!teacher) return;
    
    setIsSubmitting(true);
    void updateTeacherMutation.mutateAsync({
      id: id as string,
      ...data,
      branchId: teacher.branchId,
      joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-[500px]" />
        </div>
      </Layout>
    );
  }

  if (!teacher) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-bold">Teacher not found</h1>
          <p className="text-gray-500">The teacher you are trying to edit does not exist.</p>
          <Link href="/teachers" className="mt-4">
            <Button>Back to Teachers</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{`Edit ${teacher.firstName} ${teacher.lastName} | ScholaRise ERP`}</title>
        <meta name="description" content={`Edit teacher details for ${teacher.firstName} ${teacher.lastName}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href={`/teachers/${id}`}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Edit Teacher</h1>
            </div>
          </div>

          <div className="rounded-md border p-6">
            <Form form={form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
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
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <FormDescription>
                            Whether this teacher is currently active
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

                <div className="flex justify-end gap-2">
                  <Link href={`/teachers/${id}`}>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default EditTeacherPage;
