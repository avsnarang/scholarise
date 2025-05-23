"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";

const blueprintFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  classId: z.string().min(1, "Class is required"),
  boardId: z.string().optional(),
  chapters: z.array(z.string()).min(1, "At least one chapter is required"),
  sections: z.array(
    z.object({
      name: z.string().min(1, "Section name is required"),
      description: z.string().optional(),
      questionCount: z.number().int().positive("Must be a positive number"),
      objectiveQuestionCount: z.number().int().nonnegative("Must be a non-negative number"),
      subjectiveQuestionCount: z.number().int().nonnegative("Must be a non-negative number"),
      requiredSubtypes: z.array(z.string()).optional(),
      instructions: z.string().optional(),
      sectionOrder: z.number().int().nonnegative("Must be a non-negative number"),
    })
  ).min(1, "At least one section is required"),
});

type BlueprintFormValues = z.infer<typeof blueprintFormSchema>;

const defaultSectionValues = {
  name: "",
  description: "",
  questionCount: 0,
  objectiveQuestionCount: 0,
  subjectiveQuestionCount: 0,
  requiredSubtypes: [],
  instructions: "",
  sectionOrder: 0,
};

export default function BlueprintCreator() {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<BlueprintFormValues>({
    resolver: zodResolver(blueprintFormSchema),
    defaultValues: {
      name: "",
      description: "",
      classId: "",
      boardId: "",
      chapters: [],
      sections: [{ ...defaultSectionValues, name: "Section A", sectionOrder: 0 }],
    },
  });

  // Get data from API
  const { data: classes, isLoading: isLoadingClasses } = api.class.getAll.useQuery();
  const { data: boards, isLoading: isLoadingBoards } = api.questionPaper.getBoards.useQuery();
  const { data: subjects } = api.subject.getAll.useQuery();
  
  const { data: chapters, isLoading: isLoadingChapters } = api.questionPaper.getChaptersBySubject.useQuery(
    { subjectId: selectedSubject },
    { enabled: !!selectedSubject }
  );

  // Create blueprint mutation
  const createBlueprint = api.questionPaper.createBlueprint.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blueprint created successfully",
      });
      router.push("/question-papers");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: BlueprintFormValues) {
    // Ensure sectionOrder is properly set for each section
    const updatedSections = values.sections.map((section, index) => ({
      ...section,
      sectionOrder: index,
    }));
    
    createBlueprint.mutate({
      ...values,
      sections: updatedSections
    });
  }

  // Handle adding and removing sections
  function addSection() {
    const currentSections = form.getValues("sections");
    form.setValue("sections", [
      ...currentSections,
      {
        ...defaultSectionValues,
        name: `Section ${String.fromCharCode(65 + currentSections.length)}`, // A, B, C, etc.
        sectionOrder: currentSections.length,
      },
    ]);
  }

  function removeSection(index: number) {
    const currentSections = form.getValues("sections");
    if (currentSections.length > 1) {
      const updatedSections = currentSections.filter((_, i) => i !== index);
      
      // Update section orders to be sequential
      const reorderedSections = updatedSections.map((section, idx) => ({
        ...section,
        sectionOrder: idx,
        name: `Section ${String.fromCharCode(65 + idx)}`, // Update names to be sequential
      }));
      
      form.setValue("sections", reorderedSections);
    }
  }

  return (
    <div>
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blueprint Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter blueprint name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your question paper blueprint
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter a description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingClasses}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes?.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="boardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education Board (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingBoards}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select board" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {boards && boards.length > 0 ? (
                          boards.map((board: { id: string; name: string }) => (
                            <SelectItem key={board.id} value={board.id}>
                              {board.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">
                            No boards found.{" "}
                            <Link href="/settings/boards" className="text-blue-500 hover:underline">
                              Manage boards
                            </Link>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The education board that this blueprint follows
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chapter Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select
                  onValueChange={(value) => setSelectedSubject(value)}
                  value={selectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.items.map((subject: { id: string; name: string }) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormField
                control={form.control}
                name="chapters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chapters</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={
                          chapters?.map((chapter: { name: string; id: string }) => ({
                            label: chapter.name,
                            value: chapter.id,
                          })) || []
                        }
                        selected={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select chapters"
                      />
                    </FormControl>
                    <FormDescription>
                      Select chapters to include in this blueprint
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sections</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </CardHeader>
          <CardContent>
            {form.getValues("sections").map((_, index) => (
              <div key={index} className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    Section {String.fromCharCode(65 + index)}
                  </h3>
                  {form.getValues("sections").length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="rounded-md border p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`sections.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`sections.${index}.questionCount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Questions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`sections.${index}.objectiveQuestionCount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objective Questions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`sections.${index}.subjectiveQuestionCount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subjective Questions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`sections.${index}.requiredSubtypes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Required Subtypes</FormLabel>
                          <FormControl>
                            <MultiSelect
                              options={[
                                { label: "MCQ", value: "MCQ" },
                                { label: "True/False", value: "TrueFalse" },
                                { label: "Fill in the Blanks", value: "FillInBlanks" },
                                { label: "Match the Following", value: "MatchTheFollowing" },
                                { label: "Assertion/Reasoning", value: "AssertionReasoning" },
                                { label: "Descriptive", value: "Descriptive" },
                                { label: "Analytical", value: "Analytical" },
                                { label: "Evaluative", value: "Evaluative" },
                                { label: "Comparative", value: "Comparative" },
                                { label: "Application-Based", value: "ApplicationBased" },
                                { label: "Case Study", value: "CaseStudy" },
                                { label: "Opinion-Based", value: "OpinionBased" },
                                { label: "Exploratory", value: "Exploratory" },
                                { label: "Cause and Effect", value: "CauseEffect" },
                                { label: "Hypothetical", value: "Hypothetical" },
                                { label: "Interpretive", value: "Interpretive" },
                                { label: "Justification", value: "Justification" }
                              ]}
                              selected={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select required subtypes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`sections.${index}.instructions`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter section instructions" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <input
                    type="hidden"
                    {...form.register(`sections.${index}.sectionOrder`)}
                    value={index}
                  />
                </div>
                
                {index < form.getValues("sections").length - 1 && (
                  <Separator className="my-6" />
                )}
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/question-papers")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBlueprint.isPending}>
              {createBlueprint.isPending ? "Creating..." : "Create Blueprint"}
            </Button>
          </CardFooter>
        </Card>
      </Form>
    </div>
  );
} 