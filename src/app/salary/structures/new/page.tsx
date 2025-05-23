"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { api } from "@/utils/api";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const salaryStructureSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  basicSalary: z.coerce.number().positive({
    message: "Basic salary must be a positive number.",
  }),
  daPercentage: z.coerce.number().min(0).max(100, {
    message: "DA percentage must be between 0 and 100.",
  }),
  pfPercentage: z.coerce.number().min(0).max(100, {
    message: "PF percentage must be between 0 and 100.",
  }),
  esiPercentage: z.coerce.number().min(0).max(100, {
    message: "ESI percentage must be between 0 and 100.",
  }),
});

type SalaryStructureFormValues = z.infer<typeof salaryStructureSchema>;

export default function NewSalaryStructurePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSalaryStructure = api.salary.createSalaryStructure.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary structure created successfully",
      });
      router.push("/salary/structures");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create salary structure",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const form = useForm<SalaryStructureFormValues>({
    resolver: zodResolver(salaryStructureSchema),
    defaultValues: {
      name: "",
      description: "",
      basicSalary: 0,
      daPercentage: 0,
      pfPercentage: 0,
      esiPercentage: 0,
    },
  });

  function onSubmit(values: SalaryStructureFormValues) {
    setIsSubmitting(true);
    createSalaryStructure.mutate(values);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Salary Structure</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      <div className="mx-auto max-w-2xl">
        <Form form={form}>
          <div className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Basic Salary Structure" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique name for this salary structure
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Standard salary structure for teaching staff"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of the salary structure
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="basicSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Basic Salary (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormDescription>
                    Base salary amount before allowances and deductions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="daPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DA (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Dearness Allowance percentage of basic salary
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pfPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PF (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provident Fund percentage of basic salary
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="esiPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ESI (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Employee State Insurance percentage of basic salary
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Salary Structure"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
} 