"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Check, Plus, Trash2, ArrowLeft, ArrowRight, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Step 1: Class edit schema
const classEditSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  grade: z.number().int().min(1).max(12).optional().nullable(),
  description: z.string().optional().nullable(),
});

// Step 2: Section edit schema
const sectionEditSchema = z.object({
  id: z.string().optional(), // For existing sections
  name: z.string().min(1, "Section name is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1").default(30),
  teacherId: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isNew: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
});

const sectionsEditSchema = z.object({
  sections: z.array(sectionEditSchema).min(1, "At least one section is required"),
});

type ClassEditFormValues = z.input<typeof classEditSchema>;
type SectionEditFormValues = z.input<typeof sectionEditSchema>;
type SectionsEditFormValues = z.input<typeof sectionsEditSchema>;

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  branchId: string;
  sessionId: string;
}

export function EditClassModal({
  isOpen,
  onClose,
  classId,
  branchId,
  sessionId,
}: EditClassModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [classData, setClassData] = useState<ClassEditFormValues | null>(null);
  const { toast } = useToast();

  // Debug logging
  console.log("EditClassModal rendered - currentStep:", currentStep, "isOpen:", isOpen);

  // Fetch class data with sections
  const { data: existingClass, isLoading: isLoadingClass } = api.class.getById.useQuery(
    { id: classId, includeSections: true },
    { enabled: !!classId && isOpen }
  );

  // Get teachers for the branch
  const { data: teacherData } = api.teacher.getAll.useQuery(
    { branchId, isActive: true },
    { enabled: !!branchId && isOpen }
  );

  const teachers = teacherData?.items || [];

  // Step 1: Class form
  const classForm = useForm({
    resolver: zodResolver(classEditSchema),
    defaultValues: {
      name: "",
      isActive: true,
      displayOrder: 0,
      grade: null,
      description: null,
    },
  });

  // Step 2: Sections form
  const sectionsForm = useForm({
    resolver: zodResolver(sectionsEditSchema),
    defaultValues: {
      sections: [],
    },
  });

  // Update mutations
  const updateClassMutation = api.class.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Class updated successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update class.",
        variant: "destructive",
      });
    },
  });

  const updateSectionMutation = api.section.update.useMutation();
  const createSectionMutation = api.section.create.useMutation();
  const deleteSectionMutation = api.section.delete.useMutation();

  // Reset forms when class data loads
  useEffect(() => {
    if (existingClass && isOpen) {
      // Reset class form
      classForm.reset({
        name: existingClass.name,
        isActive: existingClass.isActive,
        displayOrder: existingClass.displayOrder || 0,
        grade: existingClass.grade || null,
        description: existingClass.description || null,
      });

      // Reset sections form
      const sectionsData = existingClass.sections?.map((section, index) => ({
        id: section.id,
        name: section.name,
        capacity: section.capacity,
        teacherId: section.teacherId,
        displayOrder: section.displayOrder || index,
        isActive: section.isActive,
        isNew: false,
        isDeleted: false,
      })) || [];

      sectionsForm.reset({
        sections: sectionsData,
      });
    }
  }, [existingClass, isOpen, classForm, sectionsForm]);

  // Reset step and clear data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setClassData(null);
    }
  }, [isOpen]);

  // Handle step 1 submission
  const handleStep1Submit = (data: ClassEditFormValues) => {
    console.log("Step 1 form submitted with data:", data);
    setClassData(data);
    setCurrentStep(2);
  };

  // Add new section
  const addSection = () => {
    const currentSections = sectionsForm.getValues("sections");
    const newSection: SectionEditFormValues = {
      name: "",
      capacity: 30,
      teacherId: null,
      displayOrder: currentSections.length,
      isActive: true,
      isNew: true,
      isDeleted: false,
    };
    sectionsForm.setValue("sections", [...currentSections, newSection]);
  };

  // Remove section
  const removeSection = (index: number) => {
    const currentSections = sectionsForm.getValues("sections");
    const section = currentSections[index];
    
    if (section?.id && !section.isNew) {
      // Mark existing section as deleted
      const updatedSections = [...currentSections];
      updatedSections[index] = { ...section, isDeleted: true };
      sectionsForm.setValue("sections", updatedSections);
    } else {
      // Remove new section completely
      const updatedSections = currentSections.filter((_, i) => i !== index);
      sectionsForm.setValue("sections", updatedSections);
    }
  };

  // Handle final submission
  const handleFinalSubmit = async (sectionsData: SectionsEditFormValues) => {
    if (!classData) return;

    try {
      // Update class - filter out null/undefined values
      const updateData: any = {
        id: classId,
        name: classData.name,
        isActive: classData.isActive,
        displayOrder: classData.displayOrder,
      };
      
      // Only include grade if it's not null
      if (classData.grade !== null && classData.grade !== undefined) {
        updateData.grade = classData.grade;
      }
      
      // Only include description if it's not null/undefined
      if (classData.description !== null && classData.description !== undefined) {
        updateData.description = classData.description;
      }

      await updateClassMutation.mutateAsync(updateData);

      // Process sections
      const sections = sectionsData.sections.filter(section => !section.isDeleted);
      
      for (const section of sections) {
        if (section.isNew) {
          // Create new section
          await createSectionMutation.mutateAsync({
            name: section.name,
            capacity: section.capacity,
            teacherId: section.teacherId || null,
            displayOrder: section.displayOrder || 0,
            classId: classId,
            isActive: section.isActive,
          });
        } else if (section.id) {
          // Update existing section
          await updateSectionMutation.mutateAsync({
            id: section.id,
            name: section.name,
            capacity: section.capacity,
            teacherId: section.teacherId || null,
            displayOrder: section.displayOrder || 0,
            isActive: section.isActive,
          });
        }
      }

      // Delete marked sections
      const sectionsToDelete = sectionsData.sections.filter(section => section.isDeleted && section.id);
      for (const section of sectionsToDelete) {
        if (section.id) {
          await deleteSectionMutation.mutateAsync({ id: section.id });
        }
      }

      toast({
        title: "Success",
        description: "Class and sections updated successfully.",
        variant: "success",
      });

      onClose();
      window.location.reload(); // Refresh the page to show updated data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update class and sections.",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = updateClassMutation.isPending || 
                     updateSectionMutation.isPending || 
                     createSectionMutation.isPending || 
                     deleteSectionMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={currentStep === 1 ? 'text-primary font-medium' : 'text-gray-600'}>
                Class Info
              </span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={currentStep === 2 ? 'text-primary font-medium' : 'text-gray-600'}>
                Edit Sections
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoadingClass ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading class data...</span>
          </div>
        ) : (
          <>
            {/* Step 1: Class Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
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
                        <FormLabel className="dark:text-gray-200">Active Status</FormLabel>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Mark this class as active or inactive
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    className="dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onClick={async () => {
                      const result = await classForm.trigger(); // Validate the form
                      if (result) {
                        const data = classForm.getValues();
                        handleStep1Submit(data);
                      }
                    }}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Continue to Sections
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Edit Sections */}
            {currentStep === 2 && classData && (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Class "{classData.name}" info updated!
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        Now edit sections for this class.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {sectionsForm.watch("sections").map((section, index) => {
                    if (section.isDeleted) return null;
                    
                    return (
                      <div key={index} className="p-4 border rounded-lg dark:border-[#303030] bg-gray-50 dark:bg-[#202020]/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {classData.name} - {section.isNew ? "New Section" : `Section ${section.name}`}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={sectionsForm.control}
                            name={`sections.${index}.name`}
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
                                <FormLabel className="dark:text-gray-200">Section Teacher</FormLabel>
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
                    );
                  })}
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
                    onClick={() => setCurrentStep(1)}
                    className="dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
                  >
                    Back to Class Info
                  </Button>
                  <div className="flex space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose}
                      className="dark:bg-[#202020] dark:text-gray-200 dark:border-[#303030] dark:hover:bg-[#303030]"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      disabled={isSubmitting}
                      onClick={async () => {
                        const result = await sectionsForm.trigger(); // Validate the form
                        if (result) {
                          const data = sectionsForm.getValues();
                          handleFinalSubmit(data);
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Class & Sections
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 