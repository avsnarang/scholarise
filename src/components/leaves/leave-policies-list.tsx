"use client";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Info, Pencil, Trash2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const policyFormSchema = z.object({
  name: z.string().min(1, "Policy name is required"),
  description: z.string().optional(),
  maxDaysPerYear: z.preprocess(
    (value) => (value === "" ? undefined : Number(value)),
    z.number().min(1, "Maximum days must be at least 1")
  ),
  isPaid: z.boolean().default(true),
  applicableRoles: z.array(z.string()).default(["Teacher", "Employee"]),
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

interface LeavePolicy {
  id: string;
  name: string;
  description: string | null;
  maxDaysPerYear: number;
  isPaid: boolean;
  applicableRoles: string[];
}

interface LeavePoliciesListProps {
  branchId: string;
}

export function LeavePoliciesList({ branchId }: LeavePoliciesListProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPolicyForm, setShowNewPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletePolicy, setDeletePolicy] = useState<LeavePolicy | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const utils = api.useContext();

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      maxDaysPerYear: 30,
      isPaid: true,
      applicableRoles: ["Teacher", "Employee"],
    },
  });

  const editForm = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      maxDaysPerYear: 30,
      isPaid: true,
      applicableRoles: ["Teacher", "Employee"],
    },
  });

  const { data: policies, isLoading } = api.leave.getPolicies.useQuery({
    branchId,
  });

  const createPolicy = api.leave.createPolicy.useMutation({
    onSuccess: () => {
      void utils.leave.getPolicies.invalidate();
      toast({
        title: "Policy created",
        description: "The leave policy has been created successfully.",
      });
      form.reset();
      setIsSubmitting(false);
      setShowNewPolicyForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const updatePolicy = api.leave.updatePolicy.useMutation({
    onSuccess: () => {
      void utils.leave.getPolicies.invalidate();
      toast({
        title: "Policy updated",
        description: "The leave policy has been updated successfully.",
      });
      editForm.reset();
      setIsSubmitting(false);
      setShowEditDialog(false);
      setEditingPolicy(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const deleteLeavePolicy = api.leave.deletePolicy.useMutation({
    onSuccess: () => {
      void utils.leave.getPolicies.invalidate();
      toast({
        title: "Policy deleted",
        description: "The leave policy has been deleted successfully.",
      });
      setShowDeleteDialog(false);
      setDeletePolicy(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PolicyFormValues) => {
    setIsSubmitting(true);
    try {
      await createPolicy.mutateAsync({
        ...data,
        branchId,
      });
    } catch (error) {
      console.error("Error creating policy:", error);
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (data: PolicyFormValues) => {
    if (!editingPolicy) return;
    setIsSubmitting(true);
    try {
      await updatePolicy.mutateAsync({
        id: editingPolicy.id,
        ...data,
      });
    } catch (error) {
      console.error("Error updating policy:", error);
      setIsSubmitting(false);
    }
  };

  const handleEditPolicy = (policy: LeavePolicy) => {
    setEditingPolicy(policy);
    editForm.reset({
      name: policy.name,
      description: policy.description || "",
      maxDaysPerYear: policy.maxDaysPerYear,
      isPaid: policy.isPaid,
      applicableRoles: policy.applicableRoles,
    });
    setShowEditDialog(true);
  };

  const handleDeletePolicy = (policy: LeavePolicy) => {
    setDeletePolicy(policy);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletePolicy) return;
    await deleteLeavePolicy.mutateAsync({ id: deletePolicy.id });
  };

  return (
    <div className="space-y-8">
      {/* Policies List */}
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <div className="bg-white">
          <div className="flex justify-between items-center p-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Leave Policies</h3>
              <p className="text-sm text-slate-500">Manage organization-wide leave policies</p>
            </div>
            <Button 
              onClick={() => setShowNewPolicyForm(true)}
              variant="outline" 
              className="flex items-center gap-1 border-slate-300 text-[#00501B] hover:bg-[#00501B]/5 hover:text-[#00501B] hover:border-[#00501B]"
            >
              <Plus className="h-4 w-4" />
              <span>New Policy</span>
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#00501B]" />
              <span className="ml-2 text-slate-600">Loading policies...</span>
            </div>
          ) : !policies?.length ? (
            <div className="py-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 font-medium">No leave policies found</p>
              <p className="text-slate-400 mt-1">Create your first policy to start managing leaves</p>
              <Button 
                onClick={() => setShowNewPolicyForm(true)}
                className="mt-4 bg-[#00501B] hover:bg-[#004016]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create First Policy
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-medium">Policy Name</TableHead>
                    <TableHead className="font-medium">Description</TableHead>
                    <TableHead className="font-medium">Max Days</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                    <TableHead className="font-medium">Applicable To</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies?.map((policy) => (
                    <TableRow key={policy.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell className="text-slate-600 max-w-[200px] truncate">{policy.description || "—"}</TableCell>
                      <TableCell>
                        <span className="font-medium">{policy.maxDaysPerYear}</span>
                        <span className="text-xs text-slate-500 ml-1">days/year</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={policy.isPaid ? "success" : "outline"}
                          className={policy.isPaid ? 
                            "bg-green-50 text-green-700 border-green-200 hover:bg-green-50" : 
                            "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100"}
                        >
                          {policy.isPaid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {policy.applicableRoles.map((role) => (
                            <Badge 
                              key={role} 
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditPolicy(policy)}
                          >
                            <Pencil className="h-4 w-4 text-slate-600" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeletePolicy(policy)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* New Policy Form */}
      <Dialog open={showNewPolicyForm} onOpenChange={setShowNewPolicyForm}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Create New Leave Policy</DialogTitle>
            <DialogDescription>
              Add a new leave policy to manage employee time off.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Policy Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Annual Leave" className="border-slate-300" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Enter a descriptive name for this leave policy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxDaysPerYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Maximum Days Per Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="border-slate-300"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Maximum number of days allowed per year
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-base font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add details about this leave policy" 
                        className="resize-none border-slate-300 min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Optional: Provide more information about eligibility and rules
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base font-medium">Paid Leave</FormLabel>
                      <FormDescription className="text-xs text-slate-500">
                        If checked, this leave will not reduce salary
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicableRoles"
                render={() => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <div className="space-y-1 leading-none w-full">
                      <FormLabel className="text-base font-medium">Applicable To</FormLabel>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="teachers"
                            checked={form.watch("applicableRoles").includes("Teacher")}
                            onCheckedChange={(checked) => {
                              const current = form.watch("applicableRoles");
                              if (checked) {
                                form.setValue("applicableRoles", [...current, "Teacher"]);
                              } else {
                                form.setValue(
                                  "applicableRoles",
                                  current.filter((role) => role !== "Teacher")
                                );
                              }
                            }}
                          />
                          <label htmlFor="teachers" className="text-sm font-medium leading-none">
                            Teachers
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="employees"
                            checked={form.watch("applicableRoles").includes("Employee")}
                            onCheckedChange={(checked) => {
                              const current = form.watch("applicableRoles");
                              if (checked) {
                                form.setValue("applicableRoles", [...current, "Employee"]);
                              } else {
                                form.setValue(
                                  "applicableRoles",
                                  current.filter((role) => role !== "Employee")
                                );
                              }
                            }}
                          />
                          <label htmlFor="employees" className="text-sm font-medium leading-none">
                            Employees
                          </label>
                        </div>
                      </div>
                      <FormDescription className="text-xs text-slate-500 mt-2">
                        Select the staff categories this policy applies to
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                type="button"
                variant="outline" 
                disabled={isSubmitting}
                onClick={() => setShowNewPolicyForm(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#00501B] hover:bg-[#004016]"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Policy</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Leave Policy</DialogTitle>
            <DialogDescription>
              Update the details of this leave policy.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editForm.handleSubmit(onEditSubmit as any)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Policy Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Annual Leave" className="border-slate-300" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Enter a descriptive name for this leave policy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="maxDaysPerYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Maximum Days Per Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="border-slate-300"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Maximum number of days allowed per year
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-base font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add details about this leave policy" 
                        className="resize-none border-slate-300 min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Optional: Provide more information about eligibility and rules
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base font-medium">Paid Leave</FormLabel>
                      <FormDescription className="text-xs text-slate-500">
                        If checked, this leave will not reduce salary
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="applicableRoles"
                render={() => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <div className="space-y-1 leading-none w-full">
                      <FormLabel className="text-base font-medium">Applicable To</FormLabel>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-teachers"
                            checked={editForm.watch("applicableRoles").includes("Teacher")}
                            onCheckedChange={(checked) => {
                              const current = editForm.watch("applicableRoles");
                              if (checked) {
                                editForm.setValue("applicableRoles", [...current, "Teacher"]);
                              } else {
                                editForm.setValue(
                                  "applicableRoles",
                                  current.filter((role) => role !== "Teacher")
                                );
                              }
                            }}
                          />
                          <label htmlFor="edit-teachers" className="text-sm font-medium leading-none">
                            Teachers
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-employees"
                            checked={editForm.watch("applicableRoles").includes("Employee")}
                            onCheckedChange={(checked) => {
                              const current = editForm.watch("applicableRoles");
                              if (checked) {
                                editForm.setValue("applicableRoles", [...current, "Employee"]);
                              } else {
                                editForm.setValue(
                                  "applicableRoles",
                                  current.filter((role) => role !== "Employee")
                                );
                              }
                            }}
                          />
                          <label htmlFor="edit-employees" className="text-sm font-medium leading-none">
                            Employees
                          </label>
                        </div>
                      </div>
                      <FormDescription className="text-xs text-slate-500 mt-2">
                        Select the staff categories this policy applies to
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#00501B] hover:bg-[#004016]"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Delete Leave Policy</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <span className="font-medium">{deletePolicy?.name}</span> leave policy. 
              This action cannot be undone and may affect existing leave balances and applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletePolicy(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLeavePolicy.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Policy</span>
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 