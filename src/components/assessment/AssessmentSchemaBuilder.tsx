'use client';

import React, { useState, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, Eye, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formulaEvaluator, FORMULA_TEMPLATES, applyFormulaTemplate } from '@/lib/assessment-formula';
import { assessmentCalculator } from '@/lib/assessment-calculator';
import type { CreateAssessmentSchemaInput, AssessmentSchemaTemplate } from '@/types/assessment';

// Validation schema
const assessmentSchemaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  term: z.string().min(1, 'Term is required'),
  classIds: z.array(z.string()).min(1, 'At least one Class & Section is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  totalMarks: z.number().min(1, 'Total marks must be positive'),
  description: z.string().optional(),
  components: z.array(z.object({
    name: z.string().min(1, 'Component name is required'),
    description: z.string().optional(),
    rawMaxScore: z.number().min(1, 'Raw max score must be positive'),
    reducedScore: z.number().min(0, 'Reduced score must be non-negative (0 means no reduction)'),
    weightage: z.number().min(0, 'Weightage must be non-negative'),
    formula: z.string().optional(),
    order: z.number(),
    subCriteria: z.array(z.object({
      name: z.string().min(1, 'Sub-criteria name is required'),
      description: z.string().optional(),
      maxScore: z.number().min(1, 'Max score must be positive'),
      order: z.number()
    }))
  })).min(1, 'At least one component is required')
});

interface AssessmentSchemaBuilderProps {
  initialData?: CreateAssessmentSchemaInput;
  classes: Array<{ id: string; name: string; sections?: Array<{ id: string; name: string }> }>;
  subjects: Array<{ id: string; name: string }>;
  terms: Array<{ id: string; name: string; description?: string | null }>;
  onSave: (data: CreateAssessmentSchemaInput) => Promise<void>;
  onPreview?: (data: CreateAssessmentSchemaInput) => void;
}

export function AssessmentSchemaBuilder({
  initialData,
  classes,
  subjects,
  terms,
  onSave,
  onPreview
}: AssessmentSchemaBuilderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [realtimeValidationErrors, setRealtimeValidationErrors] = useState<string[]>([]);
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);

  const form = useForm<CreateAssessmentSchemaInput>({
    resolver: zodResolver(assessmentSchemaSchema),
    defaultValues: initialData || {
      name: '',
      term: '',
      classIds: [],
      subjectId: '',
      totalMarks: 100,
      description: '',
      components: [{
        name: '',
        description: '',
        rawMaxScore: 0,
        reducedScore: 0,
        weightage: 1,
        formula: '',
        order: 0,
        subCriteria: []
      }]
    }
  });

  const { fields: componentFields, append: appendComponent, remove: removeComponent } = useFieldArray({
    control: form.control,
    name: 'components'
  });

  // Watch specific form values to prevent infinite loops
  const totalMarks = form.watch('totalMarks');
  const components = form.watch('components');

  // Real-time validation function
  const validateFormRealtime = useCallback(() => {
    const errors: string[] = [];

    if (components && components.length > 0 && totalMarks > 0) {
      // Filter out components that haven't been properly configured
      const validComponents = components.filter((component: any) => 
        component && (component.rawMaxScore > 0 || component.reducedScore > 0)
      );
      
      // Check component scores total vs schema total marks
      const componentScoresTotal = validComponents.reduce((sum: number, component: any) => {
        // Use reduced score if it's > 0, otherwise use raw max score
        const componentScore = (component.reducedScore > 0) ? component.reducedScore : component.rawMaxScore;
        return sum + (componentScore || 0);
      }, 0);

      // Use a small epsilon for floating-point comparison
      const epsilon = 0.001;
      const difference = Math.abs(componentScoresTotal - totalMarks);

      // Only validate if we have at least one valid component
      if (validComponents.length > 0 && difference > epsilon) {
        // Debug logging only when there's an issue
        console.log('🔍 Frontend Validation Issue:');
        console.log('Total marks from form:', totalMarks, typeof totalMarks);
        console.log('Valid components:', validComponents.length, 'of', components.length);
        console.log('Calculated total:', componentScoresTotal, typeof componentScoresTotal);
        console.log('Difference:', difference.toFixed(3));
        
        if (componentScoresTotal > totalMarks) {
          errors.push(`⚠️ Component scores total (${componentScoresTotal}) exceeds schema total marks (${totalMarks}) by ${(componentScoresTotal - totalMarks).toFixed(2)}. Please increase total marks or decrease component scores.`);
        } else {
          errors.push(`⚠️ Component scores total (${componentScoresTotal}) is less than schema total marks (${totalMarks}) by ${(totalMarks - componentScoresTotal).toFixed(2)}. Please decrease total marks or increase component scores.`);
        }
      }

      // Check sub-criteria totals within each component
      validComponents.forEach((component, index) => {
        if (!component?.subCriteria || component.subCriteria.length === 0) return;
        
        const subCriteriaTotal = component.subCriteria.reduce((sum: number, subCriteria: any) => {
          return sum + (subCriteria?.maxScore || 0);
        }, 0);

        if (subCriteriaTotal > component.rawMaxScore) {
          errors.push(`⚠️ Sub-criteria total (${subCriteriaTotal}) in "${component.name || `Component ${index + 1}`}" exceeds component raw max score (${component.rawMaxScore}). Please adjust sub-criteria scores or increase component raw max score.`);
        }
      });
    }

    setRealtimeValidationErrors(errors);
  }, [totalMarks, components]);

  // Run real-time validation when form values change
  React.useEffect(() => {
    validateFormRealtime();
  }, [validateFormRealtime]);

  const handleSave = useCallback(async (data: CreateAssessmentSchemaInput) => {
    setIsLoading(true);
    setValidationErrors([]);

    try {
      // Validate the schema
      const { term, ...dataWithoutTerm } = data;
      const mockSchema = {
        ...dataWithoutTerm,
        id: 'temp',
        termId: term, // Map term to termId for the new interface
        classId: data.classIds[0] || 'temp', // Use first selected class for validation
        isActive: true,
        isPublished: false,
        createdBy: 'temp',
        createdAt: new Date(),
        updatedAt: new Date(),
        branchId: 'temp',
        components: data.components.map(comp => ({
          ...comp,
          id: 'temp',
          assessmentSchemaId: 'temp',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          subCriteria: comp.subCriteria.map(sub => ({
            ...sub,
            id: 'temp',
            componentId: 'temp',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        }))
      };

      const validation = assessmentCalculator.validateSchema(mockSchema);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        return;
      }

      await onSave(data);
    } catch (error) {
      console.error('Error saving assessment schema:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setIsLoading(false);
    }
  }, [onSave]);

  const handlePreview = useCallback(() => {
    const data = form.getValues();
    onPreview?.(data);
  }, [form, onPreview]);

  const addComponent = useCallback(() => {
    appendComponent({
      name: '',
      description: '',
      rawMaxScore: 0,
      reducedScore: 0,
      weightage: 1,
      formula: '',
      order: componentFields.length,
      subCriteria: []
    });
  }, [appendComponent, componentFields.length]);

  const loadTemplate = useCallback((template: AssessmentSchemaTemplate) => {
    form.setValue('name', `${template.subject} ${template.term}`);
    // Find the term ID by name for the template
    const termMatch = terms.find(t => t.name === template.term);
    if (termMatch) {
      form.setValue('term', termMatch.id);
    }
    form.setValue('totalMarks', template.totalMarks);
    
    const components = template.components.map((comp, index) => ({
      name: comp.name,
      description: '',
      rawMaxScore: comp.rawTotal,
      reducedScore: comp.reducedTo,
      weightage: 1,
      formula: comp.formula,
      order: index,
      subCriteria: comp.subCriteria?.map((sub, subIndex) => ({
        name: sub.name,
        description: '',
        maxScore: sub.max,
        order: subIndex
      })) || []
    }));

    form.setValue('components', components);
  }, [form, terms]);

  // Sample templates
  const templates: AssessmentSchemaTemplate[] = [
    {
      term: "Term-1",
      subject: "English",
      totalMarks: 100,
      components: [
        {
          name: "Periodic Test",
          rawTotal: 40,
          reducedTo: 5,
          formula: "(raw / 40) * 5"
        },
        {
          name: "Multiple Assessment",
          rawTotal: 30,
          reducedTo: 5,
          formula: "(sum(subScores) / 30) * 5",
          subCriteria: [
            { name: "Individual Activities", max: 5 },
            { name: "Handwriting", max: 5 },
            { name: "Reading/Oral", max: 5 },
            { name: "Conceptual Work", max: 5 },
            { name: "Group Activity", max: 10 }
          ]
        },
        {
          name: "Subject Enrichment",
          rawTotal: 10,
          reducedTo: 5,
          formula: "(raw / 10) * 5"
        },
        {
          name: "Portfolio",
          rawTotal: 10,
          reducedTo: 5,
          formula: "(raw / 10) * 5"
        },
        {
          name: "Half Yearly Exam",
          rawTotal: 80,
          reducedTo: 80,
          formula: "raw"
        }
      ]
    },
    {
      term: "Term-2",
      subject: "Mathematics",
      totalMarks: 100,
      components: [
        {
          name: "Class Test",
          rawTotal: 20,
          reducedTo: 10,
          formula: "(raw / 20) * 10"
        },
        {
          name: "Assignment",
          rawTotal: 50,
          reducedTo: 0, // No reduction - raw score will be used
          formula: "raw"
        },
        {
          name: "Final Exam",
          rawTotal: 40,
          reducedTo: 40,
          formula: "raw"
        }
      ]
    }
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Assessment Schema Builder</h2>
            <p className="text-muted-foreground">
              Create customizable assessment schemas with dynamic scoring formulas
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assessment Templates</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {templates.map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => loadTemplate(template)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{template.subject} - {template.term}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {template.components.map((comp, compIndex) => (
                            <Badge key={compIndex} variant="secondary">
                              {comp.name} ({comp.rawTotal}→{comp.reducedTo})
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            
            <Button 
              onClick={form.handleSubmit(handleSave)} 
              disabled={isLoading || realtimeValidationErrors.length > 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Schema'}
            </Button>
            {realtimeValidationErrors.length > 0 && (
              <p className="text-xs text-amber-600 ml-2">
                Please fix validation warnings before saving
              </p>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Real-time Validation Warnings */}
        {realtimeValidationErrors.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <HelpCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium text-sm">Validation Warnings:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {realtimeValidationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Assessment Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., English Term-1 Evaluation"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="term">Term</Label>
                  <Controller
                    name="term"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-md">
                          {terms.map((term) => (
                            <SelectItem key={term.id} value={term.id}>
                              {term.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.term && (
                    <p className="text-sm text-destructive">{form.formState.errors.term.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classIds">Classes & Sections</Label>
                  <Controller
                    name="classIds"
                    control={form.control}
                    render={({ field }) => {
                      // Create flat list of class-section options for MultiSelect
                      const classOptions = classes.flatMap((cls) => 
                        cls.sections && cls.sections.length > 0 
                          ? cls.sections.map((section) => ({
                              value: `${cls.id}-${section.id}`,
                              label: `${cls.name} - ${section.name}`,
                            }))
                          : [{
                              value: cls.id,
                              label: cls.name,
                            }]
                      );

                      return (
                        <MultiSelect
                          options={classOptions}
                          selected={field.value || []}
                          onValueChange={field.onChange}
                          placeholder="Select classes & sections"
                          maxCount={2}
                          className="w-full"
                        />
                      );
                    }}
                  />
                  {form.formState.errors.classIds && (
                    <p className="text-sm text-destructive">{form.formState.errors.classIds.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjectId">Subject</Label>
                  <Controller
                    name="subjectId"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-md">
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.subjectId && (
                    <p className="text-sm text-destructive">{form.formState.errors.subjectId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalMarks">Total Marks</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="totalMarks"
                      type="number"
                      min="1"
                      className="flex-1"
                      {...form.register('totalMarks', { valueAsNumber: true })}
                    />
                    {(() => {
                      if (!components || components.length === 0 || !totalMarks) return null;
                      
                      // Filter out components that haven't been properly configured
                      const validComponents = components.filter((component: any) => 
                        component && (component.rawMaxScore > 0 || component.reducedScore > 0)
                      );
                      
                      const componentScoresTotal = validComponents.reduce((sum: number, component: any) => {
                        const componentScore = (component.reducedScore > 0) ? component.reducedScore : component.rawMaxScore;
                        return sum + (componentScore || 0);
                      }, 0);

                      // Use epsilon for floating-point comparison
                      const epsilon = 0.001;
                      const difference = Math.abs(componentScoresTotal - totalMarks);

                      if (validComponents.length === 0) {
                        return null; // No components configured yet
                      } else if (difference <= epsilon) {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                  ✓ {componentScoresTotal}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Component scores total matches schema total marks</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      } else {
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="bg-amber-100 text-amber-800 border-amber-200">
                                  ⚠️ {componentScoresTotal}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Component scores total: {componentScoresTotal} (should be {totalMarks})</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }
                    })()}
                  </div>
                  {form.formState.errors.totalMarks && (
                    <p className="text-sm text-destructive">{form.formState.errors.totalMarks.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Components */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assessment Components</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Define the components that make up this assessment
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {componentFields.map((field, index) => (
                  <ComponentBuilder
                    key={field.id}
                    index={index}
                    form={form}
                    onRemove={() => removeComponent(index)}
                    canRemove={componentFields.length > 1}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Formula Help Dialog */}
        <Dialog open={showFormulaHelp} onOpenChange={setShowFormulaHelp}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Formula Help</DialogTitle>
            </DialogHeader>
            <FormulaHelp />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Component Builder Sub-component
interface ComponentBuilderProps {
  index: number;
  form: any;
  onRemove: () => void;
  canRemove: boolean;
}

function ComponentBuilder({ index, form, onRemove, canRemove }: ComponentBuilderProps) {
  const { fields: subCriteriaFields, append: appendSubCriteria, remove: removeSubCriteria } = useFieldArray({
    control: form.control,
    name: `components.${index}.subCriteria`
  });

  const addSubCriteria = useCallback(() => {
    appendSubCriteria({
      name: '',
      description: '',
      maxScore: 0,
      order: subCriteriaFields.length
    });
  }, [appendSubCriteria, subCriteriaFields.length]);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Component {index + 1}</CardTitle>
          {canRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Component Name</Label>
            <Input
              placeholder="e.g., Periodic Test"
              {...form.register(`components.${index}.name`)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Optional description"
              {...form.register(`components.${index}.description`)}
            />
          </div>

          <div className="space-y-2">
            <Label>Raw Max Score</Label>
            <Input
              type="number"
              min="1"
              {...form.register(`components.${index}.rawMaxScore`, { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Reduced Score
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>The final marks after reduction. Set to 0 for no reduction (raw score will be used as-is).</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              {...form.register(`components.${index}.reducedScore`, { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>Weightage</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              {...form.register(`components.${index}.weightage`, { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Formula (Optional)
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Custom calculation formula. Leave empty for default percentage calculation.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              placeholder="e.g., (raw / rawMax) * 5"
              {...form.register(`components.${index}.formula`)}
            />
          </div>
        </div>

        {/* Sub-criteria */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Sub-criteria</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSubCriteria}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sub-criteria
            </Button>
          </div>

          {subCriteriaFields.map((subField, subIndex) => (
            <div key={subField.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Individual Activities"
                  {...form.register(`components.${index}.subCriteria.${subIndex}.name`)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  min="1"
                  {...form.register(`components.${index}.subCriteria.${subIndex}.maxScore`, { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSubCriteria(subIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Formula Help Component
function FormulaHelp() {
  const availableFunctions = formulaEvaluator.getAvailableFunctions();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Available Variables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(availableFunctions).map(([func, description]) => (
            <div key={func} className="p-3 border rounded-lg">
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{func}</code>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-3">Formula Templates</h3>
        <div className="space-y-3">
          {Object.entries(FORMULA_TEMPLATES).map(([name, template]) => (
            <div key={name} className="p-3 border rounded-lg">
              <h4 className="font-medium">{name.replace(/_/g, ' ')}</h4>
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded block mt-1">{template}</code>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-3">Example Formulas</h3>
        <div className="space-y-3">
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium">Simple Percentage Reduction</h4>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded block mt-1">(raw / rawMax) * 5</code>
            <p className="text-sm text-muted-foreground mt-1">Converts raw score to 5 marks</p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium">Sub-criteria Sum</h4>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded block mt-1">(sum(subScores) / totalMax) * 5</code>
            <p className="text-sm text-muted-foreground mt-1">Sums all sub-criteria and reduces to 5 marks</p>
          </div>
          
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium">Pass Raw Score</h4>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded block mt-1">raw</code>
            <p className="text-sm text-muted-foreground mt-1">Uses raw score as-is (for main exams)</p>
          </div>
        </div>
      </div>
    </div>
  );
} 