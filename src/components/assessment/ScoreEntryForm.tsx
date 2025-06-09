'use client';

import React, { useState, useEffect } from 'react';
import { Save, Calculator, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { assessmentCalculator } from '@/lib/assessment-calculator';
import type { AssessmentSchema, ComponentScore, SubCriteriaScore } from '@/types/assessment';

interface ScoreEntryFormProps {
  schema: AssessmentSchema;
  students?: Array<{ id: string; name: string; rollNumber?: string }>;
  existingScores?: any[];
  onSave: (scores: any[]) => Promise<void>;
}

export function ScoreEntryForm({ schema, students = [], existingScores = [], onSave }: ScoreEntryFormProps) {
  // Guard clause for required props
  if (!schema) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No assessment schema provided
      </div>
    );
  }
  const [scores, setScores] = useState<Record<string, any>>({});
  const [calculatedResults, setCalculatedResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>(students?.[0]?.id || '');

  // Initialize scores from existing data
  useEffect(() => {
    const initialScores: Record<string, any> = {};
    
    students.forEach(student => {
      const existingScore = existingScores.find(s => s.studentId === student.id);
      
      if (existingScore) {
        initialScores[student.id] = existingScore;
      } else {
        // Initialize empty scores
        initialScores[student.id] = {
          studentId: student.id,
          componentScores: schema.components.map(component => ({
            componentId: component.id,
            rawScore: 0,
            subCriteriaScores: component.subCriteria.map(sub => ({
              subCriteriaId: sub.id,
              score: 0,
              comments: ''
            }))
          }))
        };
      }
    });

    setScores(initialScores);
  }, [students, existingScores, schema]);

  // Calculate results when scores change
  useEffect(() => {
    const results: Record<string, any> = {};
    
    Object.entries(scores).forEach(([studentId, studentScore]) => {
      try {
        const result = assessmentCalculator.calculateAssessment(schema, studentScore.componentScores || []);
        results[studentId] = result;
      } catch (error) {
        console.error(`Error calculating for student ${studentId}:`, error);
      }
    });

    setCalculatedResults(results);
  }, [scores, schema]);

  const updateComponentScore = (studentId: string, componentId: string, field: string, value: any) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        componentScores: prev[studentId].componentScores.map((comp: any) =>
          comp.componentId === componentId
            ? { ...comp, [field]: value }
            : comp
        )
      }
    }));
  };

  const updateSubCriteriaScore = (
    studentId: string, 
    componentId: string, 
    subCriteriaId: string, 
    field: string, 
    value: any
  ) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        componentScores: prev[studentId].componentScores.map((comp: any) =>
          comp.componentId === componentId
            ? {
                ...comp,
                subCriteriaScores: comp.subCriteriaScores.map((sub: any) =>
                  sub.subCriteriaId === subCriteriaId
                    ? { ...sub, [field]: value }
                    : sub
                )
              }
            : comp
        )
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      // Validate scores
      const validationErrors: string[] = [];
      
      Object.entries(scores).forEach(([studentId, studentScore]) => {
        const student = students.find(s => s.id === studentId);
        const studentName = student?.name || `Student ${studentId}`;

        studentScore.componentScores?.forEach((compScore: any, compIndex: number) => {
          const component = schema.components[compIndex];
          if (!component) return; // Guard clause
          
          if (compScore.rawScore > component.rawMaxScore) {
            validationErrors.push(
              `${studentName}: ${component.name} score (${compScore.rawScore}) exceeds maximum (${component.rawMaxScore})`
            );
          }

          compScore.subCriteriaScores?.forEach((subScore: any, subIndex: number) => {
            const subCriteria = component.subCriteria[subIndex];
            if (!subCriteria) return; // Guard clause
            
            if (subScore.score > subCriteria.maxScore) {
              validationErrors.push(
                `${studentName}: ${component.name} - ${subCriteria.name} score (${subScore.score}) exceeds maximum (${subCriteria.maxScore})`
              );
            }
          });
        });
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Prepare data for saving
      const scoresData = Object.values(scores).map(studentScore => ({
        ...studentScore,
        assessmentSchemaId: schema.id,
        enteredBy: 'current-user', // In real app, get from auth context
        enteredAt: new Date(),
        updatedAt: new Date()
      }));

      await onSave(scoresData);
    } catch (error) {
      console.error('Error saving scores:', error);
      setErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const selectedStudentScore = scores[selectedStudent];
  const selectedStudentResult = calculatedResults[selectedStudent];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Score Entry</h2>
          <p className="text-muted-foreground">
            {schema.name} - {students.length} students
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Scores'}
        </Button>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedStudent === student.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setSelectedStudent(student.id)}
                >
                  <div className="font-medium">{student.name}</div>
                  {student.rollNumber && (
                    <div className="text-sm opacity-75">Roll: {student.rollNumber}</div>
                  )}
                  {calculatedResults[student.id] && (
                    <div className="text-sm opacity-75">
                      Score: {calculatedResults[student.id].finalScore?.toFixed(1) || 0}/{schema.totalMarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score Entry Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedStudentData?.name}
              {selectedStudentData?.rollNumber && ` (Roll: ${selectedStudentData.rollNumber})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStudentScore && (
              <Tabs defaultValue="0">
                <TabsList className="grid w-full grid-cols-3">
                  {schema.components.slice(0, 3).map((component, index) => (
                    <TabsTrigger key={component.id} value={index.toString()}>
                      {component.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {schema.components.map((component, componentIndex) => (
                  <TabsContent key={component.id} value={componentIndex.toString()} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{component.name}</h3>
                      <Badge variant="outline">
                        Max: {component.rawMaxScore} → {component.reducedScore}
                      </Badge>
                    </div>

                    {component.subCriteria.length > 0 ? (
                      <div className="space-y-4">
                        <h4 className="font-medium">Sub-criteria Scores</h4>
                        {component.subCriteria.map((subCriteria, subIndex) => {
                          const subScore = selectedStudentScore.componentScores[componentIndex]?.subCriteriaScores[subIndex];
                          
                          return (
                            <div key={subCriteria.id} className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>{subCriteria.name} (Max: {subCriteria.maxScore})</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max={subCriteria.maxScore}
                                  step="0.5"
                                  value={subScore?.score || 0}
                                  onChange={(e) => updateSubCriteriaScore(
                                    selectedStudent,
                                    component.id,
                                    subCriteria.id,
                                    'score',
                                    Number(e.target.value)
                                  )}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Comments</Label>
                                <Textarea
                                  placeholder="Optional comments"
                                  value={subScore?.comments || ''}
                                  onChange={(e) => updateSubCriteriaScore(
                                    selectedStudent,
                                    component.id,
                                    subCriteria.id,
                                    'comments',
                                    e.target.value
                                  )}
                                  rows={2}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Raw Score (Max: {component.rawMaxScore})</Label>
                        <Input
                          type="number"
                          min="0"
                          max={component.rawMaxScore}
                          step="0.5"
                          value={selectedStudentScore.componentScores[componentIndex]?.rawScore || 0}
                          onChange={(e) => updateComponentScore(
                            selectedStudent,
                            component.id,
                            'rawScore',
                            Number(e.target.value)
                          )}
                        />
                      </div>
                    )}

                    {component.formula && (
                      <div className="p-3 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">Formula:</Label>
                        <code className="text-sm block mt-1">{component.formula}</code>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Calculation Results */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStudentResult && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold">
                    {selectedStudentResult.finalScore?.toFixed(1) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    out of {schema.totalMarks}
                  </div>
                  <div className="text-sm font-medium">
                    {selectedStudentResult.finalPercentage?.toFixed(1) || 0}%
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Component Breakdown</h4>
                  {selectedStudentResult.componentScores?.map((compResult: any, index: number) => {
                    const component = schema.components.find(c => c.id === compResult.componentId);
                    return (
                      <div key={compResult.componentId} className="flex justify-between text-sm">
                        <span>{component?.name}</span>
                        <span className="font-medium">
                          {compResult.calculatedScore?.toFixed(1) || 0}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedStudentResult.errors && selectedStudentResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside text-xs">
                        {selectedStudentResult.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 