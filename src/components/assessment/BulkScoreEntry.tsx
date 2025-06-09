import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Upload, Download, Users, CheckCircle, AlertCircle } from 'lucide-react';
import type { AssessmentSchema } from '@/types/assessment';

interface BulkScoreEntryProps {
  schema: AssessmentSchema;
  students: Array<{ id: string; name: string; rollNumber?: string }>;
  existingScores?: any[];
  onSave: (scores: any[]) => Promise<void>;
}

export function BulkScoreEntry({ schema, students, existingScores = [], onSave }: BulkScoreEntryProps) {
  const [scores, setScores] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(schema.components[0]?.id || '');

  // Initialize scores
  useEffect(() => {
    const initialScores: Record<string, any> = {};
    
    students.forEach(student => {
      const existingScore = existingScores.find(s => s.studentId === student.id);
      
      if (existingScore) {
        initialScores[student.id] = existingScore;
      } else {
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

  const updateScore = (studentId: string, componentId: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        componentScores: prev[studentId].componentScores.map((comp: any) =>
          comp.componentId === componentId
            ? { ...comp, rawScore: value }
            : comp
        )
      }
    }));
  };

  const updateSubCriteriaScore = (
    studentId: string, 
    componentId: string, 
    subCriteriaId: string, 
    value: number
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
                    ? { ...sub, score: value }
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
    try {
      const scoresData = Object.values(scores).map(studentScore => ({
        ...studentScore,
        assessmentSchemaId: schema.id,
        enteredBy: 'current-user',
        enteredAt: new Date(),
        updatedAt: new Date()
      }));

      await onSave(scoresData);
    } catch (error) {
      console.error('Error saving scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedComponentData = schema.components.find(c => c.id === selectedComponent);
  const hasSubCriteria = (selectedComponentData?.subCriteria?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Bulk Score Entry</h3>
          <p className="text-muted-foreground">
            Enter scores for all students efficiently
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Template
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save All Scores'}
          </Button>
        </div>
      </div>

      {/* Component Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Component</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedComponent} onValueChange={setSelectedComponent}>
            <TabsList className="grid w-full grid-cols-3">
              {schema.components.slice(0, 3).map((component) => (
                <TabsTrigger key={component.id} value={component.id}>
                  {component.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Score Entry Table */}
      {selectedComponentData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedComponentData.name}</span>
              <Badge variant="outline">
                Max Score: {selectedComponentData.rawMaxScore}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Roll No.</TableHead>
                    {hasSubCriteria ? (
                      selectedComponentData.subCriteria.map(sub => (
                        <TableHead key={sub.id} className="text-center">
                          {sub.name}
                          <div className="text-xs text-muted-foreground">
                            (Max: {sub.maxScore})
                          </div>
                        </TableHead>
                      ))
                    ) : (
                      <TableHead className="text-center">
                        Score
                        <div className="text-xs text-muted-foreground">
                          (Max: {selectedComponentData.rawMaxScore})
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => {
                    const studentScore = scores[student.id];
                    const componentScore = studentScore?.componentScores?.find(
                      (comp: any) => comp.componentId === selectedComponent
                    );

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.rollNumber || '-'}</TableCell>
                        
                        {hasSubCriteria ? (
                          selectedComponentData.subCriteria.map(subCriteria => {
                            const subScore = componentScore?.subCriteriaScores?.find(
                              (sub: any) => sub.subCriteriaId === subCriteria.id
                            );
                            
                            return (
                              <TableCell key={subCriteria.id} className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max={subCriteria.maxScore}
                                  step="0.5"
                                  value={subScore?.score || 0}
                                  onChange={(e) => updateSubCriteriaScore(
                                    student.id,
                                    selectedComponent,
                                    subCriteria.id,
                                    Number(e.target.value)
                                  )}
                                  className="w-20 text-center"
                                />
                              </TableCell>
                            );
                          })
                        ) : (
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max={selectedComponentData.rawMaxScore}
                              step="0.5"
                              value={componentScore?.rawScore || 0}
                              onChange={(e) => updateScore(
                                student.id,
                                selectedComponent,
                                Number(e.target.value)
                              )}
                              className="w-20 text-center"
                            />
                          </TableCell>
                        )}
                        
                        <TableCell className="text-center">
                          {(hasSubCriteria 
                            ? componentScore?.subCriteriaScores?.some((sub: any) => sub.score > 0)
                            : componentScore?.rawScore > 0
                          ) ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Summary */}
            <div className="mt-6 flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {students.length} students
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {Object.values(scores).filter(score => {
                      const compScore = score.componentScores?.find(
                        (comp: any) => comp.componentId === selectedComponent
                      );
                      return hasSubCriteria 
                        ? compScore?.subCriteriaScores?.some((sub: any) => sub.score > 0)
                        : compScore?.rawScore > 0;
                    }).length} completed
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 