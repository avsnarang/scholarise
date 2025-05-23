import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

const branchFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Branch name is required"),
  code: z.string().min(1, "Branch code is required")
    .max(10, "Branch code must be 10 characters or less")
    .refine(code => /^[A-Za-z0-9]+$/.test(code), {
      message: "Branch code must contain only letters and numbers",
    }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  branch?: {
    id?: string;
    name: string;
    code: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

export function BranchFormModal({ isOpen, onClose, onSuccess, branch }: BranchFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const utils = api.useContext();

  const isEditing = !!branch?.id;

  // Function to check if a branch code already exists
  const checkBranchCode = async (code: string) => {
    try {
      const result = await utils.branch.getByCode.fetch({ code });
      return result;
    } catch (error) {
      // If the branch doesn't exist, that's fine
      return null;
    }
  };

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "",
      phone: "",
      email: "",
    },
  });

  // Reset form with branch data when branch prop changes or modal opens
  useEffect(() => {
    if (branch && isOpen) {
      console.log("Setting form values with branch data:", branch);
      // Add a small delay to ensure the form is ready
      setTimeout(() => {
        form.reset({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address || "",
          city: branch.city || "",
          state: branch.state || "",
          country: branch.country || "",
          phone: branch.phone || "",
          email: branch.email || "",
        });
        console.log("Form values after reset:", form.getValues());
      }, 100);
    } else if (!branch && isOpen) {
      // Reset form when opening for a new branch
      form.reset({
        name: "",
        code: "",
        address: "",
        city: "",
        state: "",
        country: "",
        phone: "",
        email: "",
      });
    }
  }, [branch, isOpen, form]);

  // Watch for code changes to validate uniqueness
  const codeValue = form.watch("code");

  useEffect(() => {
    const validateCode = async () => {
      if (!codeValue || codeValue.length < 1) return;

      // Skip validation if we're editing and the code hasn't changed
      if (isEditing && branch?.code === codeValue) return;

      try {
        const existingBranch = await checkBranchCode(codeValue);
        if (existingBranch) {
          form.setError("code", {
            type: "manual",
            message: `Branch code '${codeValue}' is already in use. Please choose a different code.`,
          });
        } else {
          form.clearErrors("code");
        }
      } catch (error) {
        // If there's an error, it's likely because the branch doesn't exist
        form.clearErrors("code");
      }
    };

    const debounceTimeout = setTimeout(() => {
      void validateCode();
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [codeValue, isEditing, branch?.code, form, checkBranchCode]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [form, onClose]);

  const createBranch = api.branch.create.useMutation({
    onSuccess: () => {
      void utils.branch.getAll.invalidate();
      toast({
        title: "Branch created",
        description: "The branch has been created successfully.",
        variant: "success",
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create branch. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBranch = api.branch.update.useMutation({
    onSuccess: () => {
      void utils.branch.getAll.invalidate();
      toast({
        title: "Branch updated",
        description: "The branch has been updated successfully.",
        variant: "success",
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update branch. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: BranchFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && branch?.id) {
        await updateBranch.mutateAsync({
          id: branch.id,
          ...data,
        });
      } else {
        await createBranch.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Branch" : "Add New Branch"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Campus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Code</FormLabel>
                    <FormControl>
                      <Input placeholder="MAIN" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short code used for identification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 School Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Cityville" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="branch@school.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update Branch" : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
