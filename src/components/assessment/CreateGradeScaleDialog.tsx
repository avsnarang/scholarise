"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { Award, Plus } from "lucide-react";

const gradeScaleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

type GradeScaleFormData = z.infer<typeof gradeScaleSchema>;

interface CreateGradeScaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  branchId: string;
}

export function CreateGradeScaleDialog({
  open,
  onOpenChange,
  onSuccess,
  branchId,
}: CreateGradeScaleDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(gradeScaleSchema),
    defaultValues: {
      name: "",
      isDefault: false,
      isActive: true,
    },
  });

  const isDefault = watch("isDefault");
  const isActive = watch("isActive");

  const createGradeScale = api.examination.createGradeScale.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade scale created successfully",
      });
      reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    await createGradeScale.mutateAsync({
      ...data,
      branchId,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#00501B]" />
            Create Grade Scale
          </DialogTitle>
          <DialogDescription>
            Create a new grading scale with custom grade ranges. You can add grade ranges after creating the scale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Scale Name</Label>
              <Input
                id="name"
                placeholder="e.g., CBSE Grading, ICSE Grading, Custom Scale"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Enter a descriptive name for your grading scale
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isDefault" className="text-base">Set as Default</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this the default grading scale for new assessments
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={(checked) => setValue("isDefault", checked)}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-base">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Active scales can be used in assessments
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-[#00501B] hover:bg-[#00501B]/90"
            >
              {isSubmitting ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Grade Scale
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 