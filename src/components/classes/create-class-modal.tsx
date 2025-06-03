"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Step 1: Class creation schema (basic class info)
const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
  grade: z.number().int().min(1).max(12).optional(),
});

// Step 2: Section creation schema (for the current combined model)
const sectionSchema = z.object({
  section: z.string().min(1, "Section name is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  teacherId: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0),
});

const sectionsArraySchema = z.object({
  sections: z.array(sectionSchema).min(1, "At least one section is required"),
});

type ClassFormValues = z.infer<typeof classSchema>;
type SectionFormValues = z.infer<typeof sectionSchema>;
type SectionsFormValues = z.infer<typeof sectionsArraySchema>;

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branchId: string;
  sessionId: string;
}

export function CreateClassModal({
  isOpen,
  onClose,
  onSuccess,
  branchId,
  sessionId,
}: CreateClassModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [classInfo, setClassInfo] = useState<ClassFormValues | null>(null);

  // Get teachers for the branch
  const { data: teacherData } = api.teacher.getAll.useQuery(
    { branchId, isActive: true },
    { enabled: !!branchId }
  );
  const teachers = teacherData?.items || [];

  // Step 1: Class form
  const classForm = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      isActive: true,
      displayOrder: 0,
      grade: undefined,
    },
  });

  // Step 2: Sections form
  const sectionsForm = useForm<SectionsFormValues>({
    resolver: zodResolver(sectionsArraySchema),
    defaultValues: {
      sections: [
        {
          section: "A",
          capacity: 30,
          teacherId: null,
          displayOrder: 0,
        },
      ],
    },
  });

  // Create class mutation (for the current combined model)
  const createClassMutation = api.class.create.useMutation();
  const createSectionMutation = api.section.create.useMutation();

  const handleClassSubmit = (values: ClassFormValues) => {
    setClassInfo(values);
    setStep(2);
  };

  const handleSectionsSubmit = async (values: SectionsFormValues) => {
    if (!classInfo) return;

    try {
      // First, create the class
      const newClass = await createClassMutation.mutateAsync({
        name: classInfo.name,
        isActive: classInfo.isActive,
        displayOrder: classInfo.displayOrder,
        grade: classInfo.grade,
        branchId,
        sessionId,
      });

      // Then create sections for this class
      const sectionPromises = values.sections.map((section, index) => 
        createSectionMutation.mutateAsync({
          name: section.section,
          capacity: section.capacity,
          teacherId: section.teacherId,
          classId: newClass.id,
          displayOrder: index,
        })
      );

      await Promise.all(sectionPromises);
      
      toast({
        title: "Class and sections created",
        description: `Class "${classInfo.name}" with ${values.sections.length} section(s) created successfully.`,
        variant: "success",
      });
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error creating class and sections:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create class and sections. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addSection = () => {
    const currentSections = sectionsForm.getValues("sections");
    const nextLetter = String.fromCharCode(65 + currentSections.length); // A, B, C, etc.
    
    sectionsForm.setValue("sections", [
      ...currentSections,
      {
        section: nextLetter,
        capacity: 30,
        teacherId: null,
        displayOrder: currentSections.length,
      },
    ]);
  };

  const removeSection = (index: number) => {
    const currentSections = sectionsForm.getValues("sections");
    if (currentSections.length > 1) {
      const newSections = currentSections.filter((_, i) => i !== index);
      sectionsForm.setValue("sections", newSections);
    }
  };

  const handleClose = () => {
    setStep(1);
    setClassInfo(null);
    classForm.reset({
      name: "",
      isActive: true,
      displayOrder: 0,
      grade: undefined,
    });
    sectionsForm.reset({
      sections: [
        {
          section: "A",
          capacity: 30,
          teacherId: null,
          displayOrder: 0,
        },
      ],
    });
    onClose();
  };

  const handleBack = () => {
    setStep(1);
  };

  const isSubmitting = createClassMutation.isPending || createSectionMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={step === 1 ? 'text-primary font-medium' : 'text-gray-600'}>
                Class Info
              </span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={step === 2 ? 'text-primary font-medium' : 'text-gray-600'}>
                Add Sections
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Class Info */}
        {step === 1 && (
          <Form form={classForm} onSubmit={classForm.handleSubmit(handleClassSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={classForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-gray-200">Class Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Grade 1, Class 10, Nursery" 
                        {...field} 
                        className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={classForm.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-gray-200">Grade</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g. 1" 
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={classForm.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-gray-200">Display Order</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      {...field}
                      value={field.value?.toString() || "0"}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 dark:text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={classForm.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm dark:border-[#303030] dark:bg-[#202020]/80">
                  <div className="space-y-0.5">
                    <FormLabel className="dark:text-gray-200">Active</FormLabel>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Mark this class as active or inactive
                    </div>
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

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Continue to Sections
              </Button>
            </div>
          </Form>
        )}

        {/* Step 2: Add Sections */}
        {step === 2 && classInfo && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Class "{classInfo.name}" info saved!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Now add sections for this class.
                  </p>
                </div>
              </div>
            </div>

            <Form form={sectionsForm} onSubmit={sectionsForm.handleSubmit(handleSectionsSubmit)} className="space-y-6">
              <div className="space-y-4">
                {sectionsForm.watch("sections").map((_, index) => (
                  <div key={index} className="p-4 border rounded-lg dark:border-[#303030] bg-gray-50 dark:bg-[#202020]/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {classInfo.name} - Section {index + 1}
                      </h4>
                      {sectionsForm.watch("sections").length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={sectionsForm.control}
                        name={`sections.${index}.section`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Section Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. A, B, C" 
                                {...field} 
                                className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 dark:text-red-400" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={sectionsForm.control}
                        name={`sections.${index}.capacity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Capacity *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder="30"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                                className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:placeholder-gray-400 focus-visible:ring-primary"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 dark:text-red-400" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={sectionsForm.control}
                        name={`sections.${index}.teacherId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Class Teacher</FormLabel>
                            <Select
                              value={field.value || "none"}
                              onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                            >
                              <FormControl>
                                <SelectTrigger className="dark:bg-[#202020] dark:border-[#303030] dark:text-white dark:focus:ring-primary">
                                  <SelectValue placeholder="Select teacher" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="dark:bg-[#202020] dark:border-[#303030]">
                                <SelectItem value="none" className="dark:text-gray-300">
                                  No teacher assigned
                                </SelectItem>
                                {teachers.map((teacher) => (
                                  <SelectItem 
                                    key={teacher.id} 
                                    value={teacher.id}
                                    className="dark:text-gray-300"
                                  >
                                    {teacher.firstName} {teacher.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-red-500 dark:text-red-400" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addSection}
                className="w-full dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Section
              </Button>

              <div className="flex justify-between space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
                >
                  Back to Class Info
                </Button>
                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Class & Sections
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 