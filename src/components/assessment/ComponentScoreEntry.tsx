import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Upload, Download, Users, CheckCircle, AlertCircle } from 'lucide-react';
import type { AssessmentSchema } from '@/types/assessment';

interface ComponentScoreEntryProps {
  schema: AssessmentSchema;
  component: any; // Assessment component
  students: Array<{ id: string; name: string; rollNumber?: string }>;
  existingScores?: any[];
  onSave: (scores: any[]) => Promise<void>;
}

export function ComponentScoreEntry({ 
  schema, 
  component, 
  students, 
  existingScores = [], 
  onSave 
}: ComponentScoreEntryProps) {
  const [scores, setScores] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Initialize scores for this component
  useEffect(() => {
    const initialScores: Record<string, any> = {};
    
    students.forEach(student => {
      const existingScore = existingScores.find(s => s.studentId === student.id);
      
      if (existingScore) {
        const componentScore = existingScore.componentScores?.find(
          (comp: any) => comp.componentId === component.id
        );
        initialScores[student.id] = componentScore || {
          componentId: component.id,
          rawScore: 0,
          subCriteriaScores: component.subCriteria?.map((sub: any) => ({
            subCriteriaId: sub.id,
            score: 0,
            comments: ''
          })) || []
        };
      } else {
        initialScores[student.id] = {
          componentId: component.id,
          rawScore: 0,
          subCriteriaScores: component.subCriteria?.map((sub: any) => ({
            subCriteriaId: sub.id,
            score: 0,
            comments: ''
          })) || []
        };
      }
    });

    setScores(initialScores);
  }, [students, existingScores, component]);

  const updateScore = (studentId: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rawScore: value
      }
    }));
  };

  const updateSubCriteriaScore = (
    studentId: string, 
    subCriteriaId: string, 
    value: number
  ) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        subCriteriaScores: prev[studentId].subCriteriaScores.map((sub: any) =>
          sub.subCriteriaId === subCriteriaId
            ? { ...sub, score: value }
            : sub
        )
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const scoresData = Object.entries(scores).map(([studentId, studentScore]) => ({
        studentId,
        assessmentSchemaId: schema.id,
        componentScores: [studentScore],
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

  const hasSubCriteria = (component.subCriteria?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{component.name}</h3>
          <p className="text-muted-foreground">
            Enter scores for this assessment component (Max: {component.rawMaxScore || component.maxScore})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Scores'}
          </Button>
        </div>
      </div>

      {/* Score Entry Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">S.No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Roll No.</TableHead>
                  {hasSubCriteria ? (
                    component.subCriteria.map((sub: any) => (
                      <TableHead key={sub.id} className="text-center">
                        <div>{sub.name}</div>
                        <div className="text-xs text-muted-foreground">
                          (Max: {sub.maxScore})
                        </div>
                      </TableHead>
                    ))
                  ) : (
                    <TableHead className="text-center">
                      <div>Score</div>
                      <div className="text-xs text-muted-foreground">
                        (Max: {component.rawMaxScore || component.maxScore})
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const studentScore = scores[student.id];

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.rollNumber || '-'}</TableCell>
                      
                      {hasSubCriteria ? (
                        component.subCriteria.map((subCriteria: any) => {
                          const subScore = studentScore?.subCriteriaScores?.find(
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
                                  subCriteria.id,
                                  Number(e.target.value)
                                )}
                                className="w-20 text-center mx-auto"
                              />
                            </TableCell>
                          );
                        })
                      ) : (
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max={component.rawMaxScore || component.maxScore}
                            step="0.5"
                            value={studentScore?.rawScore || 0}
                            onChange={(e) => updateScore(
                              student.id,
                              Number(e.target.value)
                            )}
                            className="w-20 text-center mx-auto"
                          />
                        </TableCell>
                      )}
                      
                      <TableCell className="text-center">
                        {(hasSubCriteria 
                          ? studentScore?.subCriteriaScores?.some((sub: any) => sub.score > 0)
                          : studentScore?.rawScore > 0
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
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
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
              {Object.values(scores).filter(score => 
                hasSubCriteria 
                  ? score?.subCriteriaScores?.some((sub: any) => sub.score > 0)
                  : score?.rawScore > 0
              ).length} completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 