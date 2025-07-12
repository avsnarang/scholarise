"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/utils/api";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  Save,
  GraduationCap
} from "lucide-react";

const gradeRangeSchema = z.object({
  grade: z.string().min(1, "Grade is required").max(10, "Grade must be less than 10 characters"),
  minPercentage: z.number().min(0, "Minimum percentage must be 0 or greater").max(100, "Minimum percentage cannot exceed 100"),
  maxPercentage: z.number().min(0, "Maximum percentage must be 0 or greater").max(100, "Maximum percentage cannot exceed 100"),
  gradePoint: z.number().optional(),
  description: z.string().optional(),
}).refine(
  (data) => data.minPercentage < data.maxPercentage,
  {
    message: "Minimum percentage must be less than maximum percentage",
    path: ["maxPercentage"],
  }
);

type GradeRangeFormData = z.infer<typeof gradeRangeSchema>;

interface GradeRangesTableProps {
  gradeScale: {
    id: string;
    name: string;
    gradeRanges?: Array<{
      id: string;
      grade: string;
      minPercentage: number;
      maxPercentage: number;
      gradePoint?: number | null;
      description?: string | null;
      order: number;
    }>;
  };
  onRefresh: () => void;
}

export function GradeRangesTable({ gradeScale, onRefresh }: GradeRangesTableProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GradeRangeFormData>({
    resolver: zodResolver(gradeRangeSchema),
    defaultValues: {
      grade: "",
      minPercentage: 0,
      maxPercentage: 100,
      gradePoint: undefined,
      description: "",
    },
  });

  // Mutations
  const createGradeRange = api.examination.createGradeRange.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade range created successfully",
      });
      form.reset();
      setIsCreateDialogOpen(false);
      onRefresh();
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

  const updateGradeRange = api.examination.updateGradeRange.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade range updated successfully",
      });
      form.reset();
      setEditingRange(null);
      onRefresh();
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

  const deleteGradeRange = api.examination.deleteGradeRange.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade range deleted successfully",
      });
      onRefresh();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sortedGradeRanges = gradeScale.gradeRanges?.sort((a, b) => b.minPercentage - a.minPercentage) || [];

  const handleCreateRange = () => {
    form.reset({
      grade: "",
      minPercentage: 0,
      maxPercentage: 100,
      gradePoint: undefined,
      description: "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleEditRange = (range: any) => {
    form.reset({
      grade: range.grade,
      minPercentage: range.minPercentage,
      maxPercentage: range.maxPercentage,
      gradePoint: range.gradePoint || undefined,
      description: range.description || "",
    });
    setEditingRange(range);
  };

  const handleDeleteRange = async (rangeId: string) => {
    if (confirm("Are you sure you want to delete this grade range? This action cannot be undone.")) {
      await deleteGradeRange.mutateAsync({ id: rangeId });
    }
  };

  const onSubmit = async (data: GradeRangeFormData) => {
    setIsSubmitting(true);
    
    // Check for overlapping ranges
    const otherRanges = sortedGradeRanges.filter(range => 
      editingRange ? range.id !== editingRange.id : true
    );
    
    const hasOverlap = otherRanges.some(range => {
      const rangeStart = range.minPercentage;
      const rangeEnd = range.maxPercentage;
      const newStart = data.minPercentage;
      const newEnd = data.maxPercentage;
      
      return (newStart >= rangeStart && newStart < rangeEnd) ||
             (newEnd > rangeStart && newEnd <= rangeEnd) ||
             (newStart <= rangeStart && newEnd >= rangeEnd);
    });
    
    if (hasOverlap) {
      toast({
        title: "Error",
        description: "Grade ranges cannot overlap. Please adjust the percentage ranges.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingRange) {
        await updateGradeRange.mutateAsync({
          id: editingRange.id,
          data: {
            ...data,
            gradeScaleId: gradeScale.id,
          },
        });
      } else {
        await createGradeRange.mutateAsync({
          ...data,
          gradeScaleId: gradeScale.id,
        });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDialogClose = () => {
    if (!isSubmitting) {
      form.reset();
      setIsCreateDialogOpen(false);
      setEditingRange(null);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-600 text-white";
    if (percentage >= 80) return "bg-blue-600 text-white";
    if (percentage >= 70) return "bg-yellow-600 text-white";
    if (percentage >= 60) return "bg-orange-600 text-white";
    return "bg-red-600 text-white";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Grade Ranges
          </h4>
          <p className="text-sm text-muted-foreground">
            Configure percentage ranges for each grade in this scale
          </p>
        </div>
        <Button 
          onClick={handleCreateRange}
          size="sm"
          className="bg-[#00501B] hover:bg-[#00501B]/90"
        >
          <Plus className="mr-2 h-3 w-3" />
          Add Range
        </Button>
      </div>

      {sortedGradeRanges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <GraduationCap className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">No grade ranges configured yet</p>
          <Button 
            onClick={handleCreateRange}
            variant="outline"
            size="sm"
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Your First Range
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Percentage Range</TableHead>
                <TableHead>Grade Point</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGradeRanges.map((range) => (
                <TableRow key={range.id}>
                  <TableCell>
                    <Badge className={getGradeColor(range.minPercentage)}>
                      {range.grade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">
                      {range.minPercentage}% - {range.maxPercentage}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {range.gradePoint ? range.gradePoint.toFixed(1) : "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {range.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRange(range)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRange(range.id)}
                        disabled={deleteGradeRange.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingRange} onOpenChange={() => handleDialogClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRange ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingRange ? "Edit Grade Range" : "Add Grade Range"}
            </DialogTitle>
            <DialogDescription>
              {editingRange 
                ? "Update the grade range details below." 
                : "Add a new grade range to this grading scale."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., A1, A, B+"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gradePoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Point (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="e.g., 4.0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Excellent, Outstanding Performance"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for this grade range
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="bg-[#00501B] hover:bg-[#00501B]/90"
              >
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingRange ? "Update Range" : "Add Range"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 