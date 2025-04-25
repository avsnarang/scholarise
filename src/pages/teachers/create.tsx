import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageWrapper } from "@/components/layout/page-wrapper";
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
import Link from "next/link";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import type { NextPageWithLayout } from "@/pages/_app";

// Define a type for Branch
type Branch = {
  id: string;
  code: string;
  name: string;
};

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  employeeCode: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  joinDate: z.string().optional(),
  isActive: z.boolean().default(true),
  // Branch selection
  branchId: z.string().min(1, "Branch is required"),
  isHQ: z.boolean().default(false),
  // User account fields
  createUser: z.boolean().default(false),
  email: z.string().email("Invalid email address").optional()
    .refine(email => !email || email.length > 0, "Email is required when creating a user account"),
  password: z.string().optional()
    .refine(password => !password || password.length >= 8, "Password must be at least 8 characters"),
}).refine((data) => {
  // If createUser is true, email and password are required
  if (data.createUser) {
    return !!data.email && !!data.password;
  }
  return true;
}, {
  message: "Email and password are required when creating a user account",
  path: ["createUser"],
});

const CreateTeacherPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentBranchId } = useBranchContext();

  // Fetch all branches for the branch selector
  const { data: branches = [] } = api.branch.getAll.useQuery();

  // Function to generate employee code based on branch
  const generateEmployeeCode = (branchId: string): string => {
    if (!branches || branches.length === 0) return "";

    const branch = branches.find((b: Branch) => b.id === branchId);
    if (!branch) return "";

    // Generate prefix based on branch code
    let prefix = "";
    if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
      prefix = "PS";
    } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
      prefix = "JUN";
    } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
      prefix = "MAJ";
    } else {
      // Default prefix if branch doesn't match
      prefix = branch.code;
    }

    // Get current year's last two digits
    const year = new Date().getFullYear().toString().slice(2);

    // Generate a random 3-digit number for uniqueness
    const random = Math.floor(Math.random() * 900) + 100;

    return `${prefix}-${year}${random}`;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      firstName: "",
      lastName: "",
      employeeCode: "",
      qualification: "",
      specialization: "",
      joinDate: new Date().toISOString().split("T")[0],
      isActive: true,
      branchId: currentBranchId || "",
      isHQ: false,
      createUser: false,
      email: "",
      password: "",
    },
  });

  // Effect to set employee code when branch changes
  useEffect(() => {
    if (currentBranchId) {
      const employeeCode = generateEmployeeCode(currentBranchId);
      form.setValue("employeeCode", employeeCode);
    }
  }, [currentBranchId, form, branches]);

  // Watch for branch changes to update employee code
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "branchId" && value.branchId) {
        const employeeCode = generateEmployeeCode(value.branchId as string);
        form.setValue("employeeCode", employeeCode);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, branches]);

  const utils = api.useContext();
  const createTeacherMutation = api.teacher.create.useMutation({
    onSuccess: () => {
      // Invalidate all relevant queries
      void utils.teacher.getAll.invalidate();
      void utils.teacher.getStats.invalidate();
      void utils.class.getAll.invalidate();

      setIsSubmitting(false);
      toast({
        title: "Teacher created",
        description: "Teacher has been successfully created.",
        variant: "default",
      });
      void router.push("/teachers");
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: "Error creating teacher",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    // Ensure employee code follows branch pattern
    let employeeCode = data.employeeCode;
    const branch = branches.find((b: Branch) => b.id === data.branchId);

    if (branch) {
      // Check if employee code follows branch pattern
      let shouldHavePrefix = "";
      if (branch.code === "PS" || branch.name.includes("Paonta Sahib")) {
        shouldHavePrefix = "PS";
      } else if (branch.code === "JUN" || branch.name.includes("Juniors")) {
        shouldHavePrefix = "JUN";
      } else if (branch.code === "MAJ" || branch.name.includes("Majra")) {
        shouldHavePrefix = "MAJ";
      }

      // If employee code doesn't start with the correct prefix, regenerate it
      if (shouldHavePrefix && (!employeeCode || !employeeCode.startsWith(shouldHavePrefix))) {
        employeeCode = generateEmployeeCode(data.branchId);
      }
    }

    void createTeacherMutation.mutateAsync({
      ...data,
      employeeCode,
      // branchId is already included in data
      joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
      // Only include email and password if creating a user account
      email: data.createUser ? data.email : undefined,
      password: data.createUser ? data.password : undefined,
    });
  };

  return (
    <PageWrapper
      title="Add New Teacher"
      action={
        <Link href="/teachers">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <Head>
        <title>Add Teacher | ScholaRise ERP</title>
        <meta name="description" content="Add a new teacher to your school" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="rounded-md border p-6">
        <Form form={form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      Auto-generated based on branch. You can modify if needed.
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

              {/* Branch Selection */}
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch: Branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the branch where this teacher will work
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isHQ"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Headquarters Access</FormLabel>
                      <FormDescription>
                        Allow access to all branches (HQ staff)
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

            {/* User Account Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium">User Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Optionally create login credentials for this teacher
              </p>

              <FormField
                control={form.control}
                name="createUser"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Create User Account</FormLabel>
                      <FormDescription>
                        Create login credentials for this teacher
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

              {form.watch("createUser") && (
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="teacher@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This will be used as the username for login
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Must be at least 8 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Link href="/teachers">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Teacher
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </PageWrapper>
  );
};

CreateTeacherPage.getLayout = (page: React.ReactNode) => {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default CreateTeacherPage;
