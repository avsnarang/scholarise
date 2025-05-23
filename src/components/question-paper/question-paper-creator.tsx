"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, ChevronRight, Plus } from "lucide-react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface BlueprintSection {
  id: string;
  name: string;
  questionCount: number;
  instructions?: string;
  sectionOrder: number;
}

interface BlueprintChapter {
  chapter: {
    id: string;
    name: string;
    questions: Question[];
  };
}

interface Blueprint {
  id: string;
  name: string;
  class: {
    name: string;
    section: string;
  };
  board?: {
    name: string;
  };
  sections: BlueprintSection[];
  chapters: BlueprintChapter[];
}

interface QuestionWithSelected extends Question {
  selected?: boolean;
}

interface Question {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  marks: number;
  chapterId: string;
  subTopicId?: string;
  isActive: boolean;
  isAIGenerated: boolean;
}

const questionPaperFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
  blueprintId: z.string().min(1, "Blueprint is required"),
  sections: z.array(
    z.object({
      blueprintSectionId: z.string(),
      name: z.string().min(1, "Section name is required"),
      instructions: z.string().optional(),
      questions: z.array(
        z.object({
          questionId: z.string().min(1, "Question is required"),
          marks: z.number().int().positive().optional(),
          questionOrder: z.number().int().nonnegative(),
        })
      ),
    })
  ),
});

type QuestionPaperFormValues = z.infer<typeof questionPaperFormSchema>;

export default function QuestionPaperCreator() {
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("blueprint");
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, string[]>>({});
  const [showAIQuestions, setShowAIQuestions] = useState<boolean>(true);
  const [showManualQuestions, setShowManualQuestions] = useState<boolean>(true);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [subtypeFilter, setSubtypeFilter] = useState<string>("All");
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<QuestionPaperFormValues>({
    resolver: zodResolver(questionPaperFormSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: 180,
      blueprintId: "",
      sections: [],
    },
  });

  // Get data from API
  const { data: blueprints, isLoading: isLoadingBlueprints } = api.questionPaper.getBlueprints.useQuery();
  const { data: blueprint, isLoading: isLoadingBlueprint } = api.questionPaper.getBlueprintById.useQuery(
    { id: selectedBlueprintId },
    { enabled: !!selectedBlueprintId }
  );

  // Create question paper mutation
  const createQuestionPaper = api.questionPaper.createQuestionPaper.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question paper created successfully",
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

  // Handle blueprint selection
  const handleBlueprintSelect = (blueprintId: string) => {
    setSelectedBlueprintId(blueprintId);
    form.setValue("blueprintId", blueprintId);
    
    // Reset selected questions when changing blueprint
    setSelectedQuestions({});
  };

  // Initialize sections when blueprint changes
  if (blueprint && form.getValues("sections").length === 0) {
    // Initialize the sections array based on blueprint
    const initialSections = blueprint.sections.map((section: BlueprintSection) => ({
      blueprintSectionId: section.id,
      name: section.name,
      instructions: section.instructions || "",
      questions: [],
    }));
    form.setValue("sections", initialSections);

    // Initialize selectedQuestions state
    const initialSelectedQuestionsState: Record<string, string[]> = {};
    blueprint.sections.forEach((section: BlueprintSection) => {
      initialSelectedQuestionsState[section.id] = [];
    });
    setSelectedQuestions(initialSelectedQuestionsState);
  }

  // Handle question selection
  const toggleQuestionSelection = (sectionId: string, questionId: string) => {
    setSelectedQuestions((prev) => {
      const sectionQuestions = [...(prev[sectionId] || [])];
      const index = sectionQuestions.indexOf(questionId);
      
      if (index === -1) {
        // Add the question if not already selected
        sectionQuestions.push(questionId);
      } else {
        // Remove the question if already selected
        sectionQuestions.splice(index, 1);
      }
      
      return { ...prev, [sectionId]: sectionQuestions };
    });
  };

  // Check if a question is selected
  const isQuestionSelected = (sectionId: string, questionId: string) => {
    return selectedQuestions[sectionId]?.includes(questionId) || false;
  };

  // Update form when questions are selected
  React.useEffect(() => {
    if (blueprint && Object.keys(selectedQuestions).length > 0) {
      const updatedSections = form.getValues("sections").map((section, sectionIndex) => {
        const sectionId = blueprint.sections[sectionIndex]?.id;
        if (!sectionId) return section;
        
        const selectedSectionQuestions = selectedQuestions[sectionId] || [];
        
        const sectionQuestions = selectedSectionQuestions.map((questionId, index) => ({
          questionId,
          questionOrder: index,
          marks: undefined, // Default marks from the question will be used
        }));
        
        return {
          ...section,
          questions: sectionQuestions,
        };
      });
      
      form.setValue("sections", updatedSections);
    }
  }, [blueprint, selectedQuestions, form]);

  function onSubmit(values: QuestionPaperFormValues) {
    // Validate that each section has the required number of questions
    if (blueprint) {
      const validationErrors = blueprint.sections.map((section: BlueprintSection, index: number) => {
        const formSection = values.sections[index];
        if (formSection && formSection.questions.length !== section.questionCount) {
          return `Section ${section.name} requires exactly ${section.questionCount} questions. You have selected ${formSection.questions.length}.`;
        }
        return null;
      }).filter(Boolean);

      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors.join(" "),
          variant: "destructive",
        });
        return;
      }
    }

    createQuestionPaper.mutate(values);
  }

  const renderQuestionsList = (sectionId: string, chapterId: string, questions: QuestionWithSelected[]) => {
    // Apply filters
    const filteredQuestions = questions.filter(question => {
      if (!showAIQuestions && question.isAIGenerated) return false;
      if (!showManualQuestions && !question.isAIGenerated) return false;
      if (difficultyFilter !== "All" && question.difficulty !== difficultyFilter) return false;
      
      // Apply new category filter
      if (categoryFilter !== "All") {
        const questionCategory = (question as any).category || "Objective"; // Default to Objective if not specified
        if (categoryFilter !== questionCategory) return false;
      }
      
      // Apply new subtype filter
      if (subtypeFilter !== "All") {
        const questionSubtype = (question as any).subtype || question.type;
        if (subtypeFilter !== questionSubtype) return false;
      }
      
      return true;
    });

    // Get unique subtypes for the dropdown
    const availableSubtypes = Array.from(
      new Set(
        questions.map(q => (q as any).subtype || q.type)
      )
    ).filter(Boolean);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={showAIQuestions} 
              onCheckedChange={() => setShowAIQuestions(!showAIQuestions)}
              id={`ai-questions-${sectionId}`}
            />
            <Label htmlFor={`ai-questions-${sectionId}`} className="text-xs">AI-Generated</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={showManualQuestions} 
              onCheckedChange={() => setShowManualQuestions(!showManualQuestions)}
              id={`manual-questions-${sectionId}`}
            />
            <Label htmlFor={`manual-questions-${sectionId}`} className="text-xs">Manual</Label>
          </div>
          
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Levels</SelectItem>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard (HOTS)</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              <SelectItem value="Objective">Objective</SelectItem>
              <SelectItem value="Subjective">Subjective</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={subtypeFilter} 
            onValueChange={setSubtypeFilter} 
            disabled={availableSubtypes.length === 0}
          >
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <SelectValue placeholder="Question Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              
              {/* Only show relevant subtypes based on category selection */}
              {categoryFilter === "All" || categoryFilter === "Objective" ? (
                <SelectItem value="MCQ">Multiple Choice</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Objective" ? (
                <SelectItem value="TrueFalse">True/False</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Objective" ? (
                <SelectItem value="FillInBlanks">Fill in the Blanks</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Objective" ? (
                <SelectItem value="MatchTheFollowing">Match the Following</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Objective" ? (
                <SelectItem value="AssertionReasoning">Assertion/Reasoning</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Subjective" ? (
                <SelectItem value="Descriptive">Descriptive</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Subjective" ? (
                <SelectItem value="Analytical">Analytical</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Subjective" ? (
                <SelectItem value="Evaluative">Evaluative</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Subjective" ? (
                <SelectItem value="Comparative">Comparative</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Subjective" ? (
                <SelectItem value="ApplicationBased">Application-Based</SelectItem>
              ) : null}
              
              {categoryFilter === "All" || categoryFilter === "Subjective" ? (
                <SelectItem value="CaseStudy">Case Study</SelectItem>
              ) : null}
              
              {/* Add dynamic subtypes from available questions */}
              {availableSubtypes
                .filter(subtype => 
                  !["MCQ", "TrueFalse", "FillInBlanks", "MatchTheFollowing", "AssertionReasoning",
                    "Descriptive", "Analytical", "Evaluative", "Comparative", "ApplicationBased", "CaseStudy"].includes(subtype)
                )
                .map(subtype => (
                  <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 pl-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((question) => (
              <div
                key={question.id}
                className={`flex items-start rounded-md border p-3 ${
                  isQuestionSelected(sectionId, question.id) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Checkbox
                  checked={isQuestionSelected(sectionId, question.id)}
                  onCheckedChange={() => toggleQuestionSelection(sectionId, question.id)}
                  className="mr-2 mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge>{(question as any).subtype || question.type}</Badge>
                      <Badge variant="outline">{question.difficulty}</Badge>
                      <Badge variant="secondary">{question.marks} marks</Badge>
                      {question.isAIGenerated && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">AI</Badge>
                      )}
                      {(question as any).category && (
                        <Badge variant="outline" className={(question as any).category === "Objective" ? 
                                                   "bg-green-50 text-green-800 border-green-200" : 
                                                   "bg-purple-50 text-purple-800 border-purple-200"}>
                          {(question as any).category}
                        </Badge>
                      )}
                    </div>
                    {isQuestionSelected(sectionId, question.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="mt-1">{question.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              <p>No questions match the selected filters.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Form form={form} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="blueprint">1. Select Blueprint</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedBlueprintId}>
              2. Paper Details
            </TabsTrigger>
            <TabsTrigger value="questions" disabled={!selectedBlueprintId}>
              3. Select Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blueprint">
            <Card>
              <CardHeader>
                <CardTitle>Select a Blueprint</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="blueprintId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blueprint</FormLabel>
                        <Select
                          onValueChange={(value) => handleBlueprintSelect(value)}
                          value={field.value}
                          disabled={isLoadingBlueprints}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a blueprint" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {blueprints?.map((blueprint: Blueprint) => (
                              <SelectItem key={blueprint.id} value={blueprint.id}>
                                {blueprint.name} - {blueprint.class.name} {blueprint.class.section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {blueprint && (
                    <div className="mt-6 rounded-md border p-4">
                      <h3 className="mb-2 text-lg font-medium">
                        {blueprint.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Class: {blueprint.class.name} {blueprint.class.section} | 
                        Board: {blueprint.board?.name || "N/A"}
                      </p>
                      
                      <div className="mt-4">
                        <h4 className="font-medium">Sections:</h4>
                        <ul className="ml-6 mt-2 list-disc space-y-1">
                          {blueprint.sections.map((section: BlueprintSection) => (
                            <li key={section.id}>
                              {section.name} - {section.questionCount} questions
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium">Chapters:</h4>
                        <ul className="ml-6 mt-2 list-disc space-y-1">
                          {blueprint.chapters.map((ch: BlueprintChapter) => (
                            <li key={ch.chapter.id}>{ch.chapter.name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  disabled={!selectedBlueprintId}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Question Paper Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paper Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter paper title" {...field} />
                      </FormControl>
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

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
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
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("blueprint")}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab("questions")}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Select Questions</CardTitle>
              </CardHeader>
              
              <CardContent>
                {blueprint && (
                  <Tabs defaultValue={blueprint.sections[0]?.id.toString()}>
                    <TabsList className="mb-4">
                      {blueprint.sections.map((section: BlueprintSection) => (
                        <TabsTrigger key={section.id} value={section.id}>
                          {section.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {blueprint.sections.map((section: BlueprintSection) => {
                      const sectionId = section.id;
                      const requiredCount = section.questionCount;
                      const selectedCount = selectedQuestions[sectionId]?.length || 0;
                      const isComplete = selectedCount === requiredCount;
                      const hasExcess = selectedCount > requiredCount;

                      return (
                        <TabsContent key={section.id} value={section.id}>
                          <div className="mb-4">
                            <Alert variant={isComplete ? "default" : hasExcess ? "destructive" : "warning"}>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Question Selection</AlertTitle>
                              <AlertDescription>
                                {isComplete
                                  ? `Perfect! You've selected exactly ${requiredCount} questions.`
                                  : hasExcess
                                  ? `Too many questions! Please select exactly ${requiredCount} questions. You've selected ${selectedCount}.`
                                  : `Please select ${requiredCount} questions for this section. You've selected ${selectedCount} so far.`}
                              </AlertDescription>
                            </Alert>
                          </div>

                          <FormField
                            control={form.control}
                            name={`sections.${blueprint.sections.findIndex((s: BlueprintSection) => s.id === section.id)}.instructions`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Section Instructions</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter instructions for this section" 
                                    {...field} 
                                    defaultValue={section.instructions || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="mt-6">
                            <h3 className="mb-2 text-lg font-medium">Available Questions</h3>
                            <p className="text-sm text-muted-foreground">
                              Select {requiredCount} questions for this section from the chapters below.
                            </p>

                            <Accordion type="multiple" className="mt-4">
                              {blueprint.chapters.map((ch: BlueprintChapter) => {
                                const chapterQuestions = ch.chapter.questions?.filter(
                                  (q: Question) => q.isActive
                                ) || [];

                                return (
                                  <AccordionItem key={ch.chapter.id} value={ch.chapter.id}>
                                    <AccordionTrigger>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{ch.chapter.name}</span>
                                        <Badge variant="outline" className="ml-2">
                                          {chapterQuestions.length} questions
                                        </Badge>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      {chapterQuestions.length > 0 ? (
                                        renderQuestionsList(sectionId, ch.chapter.id, chapterQuestions)
                                      ) : (
                                        <p className="py-2 pl-4 text-sm text-muted-foreground">
                                          No questions available for this chapter.
                                        </p>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setActiveTab("details")}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuestionPaper.isPending}
                >
                  {createQuestionPaper.isPending ? "Creating..." : "Create Question Paper"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </Form>
    </div>
  );
}