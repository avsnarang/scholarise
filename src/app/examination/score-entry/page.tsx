"use client";

import React, { useState, useEffect } from 'react';
import { ScoreEntryForm } from '@/components/assessment/ScoreEntryForm';
import { BulkScoreEntry } from '@/components/assessment/BulkScoreEntry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar,
  Search,
  Filter,
  Save,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
  Table
} from 'lucide-react';
import { useAssessmentSchemas } from '@/hooks/useAssessmentSchemas';
import { api } from '@/utils/api';
import { useBranchContext } from '@/hooks/useBranchContext';

export default function ScoreEntryPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [saveType, setSaveType] = useState<'success' | 'error' | ''>('');

  const { currentBranchId } = useBranchContext();
  const { schemas, isLoading: schemasLoading } = useAssessmentSchemas();

  // Fetch classes and sections
  const { data: classes = [], isLoading: classesLoading } = api.class.getAll.useQuery(
    { branchId: currentBranchId || undefined, includeSections: true },
    { enabled: !!currentBranchId }
  );

  // Get students for selected class and section
  const { data: students = [], isLoading: studentsLoading } = api.student.getByClassAndSection.useQuery(
    { 
      classId: selectedClassId,
      sectionId: selectedSectionId || undefined,
      branchId: currentBranchId || '',
    },
    { enabled: !!selectedClassId && !!currentBranchId }
  );

  // Get existing scores using fetch (since we don't have tRPC method yet)
  const [existingScores, setExistingScores] = useState<any[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);

  useEffect(() => {
    if (!selectedSchemaId) {
      setExistingScores([]);
      return;
    }

    const fetchExistingScores = async () => {
      setScoresLoading(true);
      try {
        const response = await fetch(`/api/assessment-scores?assessmentSchemaId=${selectedSchemaId}`);
        if (response.ok) {
          const data = await response.json();
          setExistingScores(data);
        }
      } catch (error) {
        console.error('Error fetching existing scores:', error);
      } finally {
        setScoresLoading(false);
      }
    };

    fetchExistingScores();
  }, [selectedSchemaId]);

  // Filter students based on search term
  const studentsInClass = students.filter((student: any) =>
    !searchTerm || 
    student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected schema details
  const selectedSchema = schemas.find((schema: any) => schema.id === selectedSchemaId);

  // Get available schemas for selected class
  const availableSchemas = schemas.filter((schema: any) => {
    // Check if the schema applies to the selected class
    if (schema.appliedClasses && Array.isArray(schema.appliedClasses)) {
      // Check if any of the applied classes match the selected class
      return schema.appliedClasses.some((appliedClass: any) => 
        appliedClass.classId === selectedClassId
      );
    }
    // Fallback to the original classId field for backward compatibility
    return schema.classId === selectedClassId;
  });

  // Get sections for selected class
  const selectedClass = classes.find((cls: any) => cls.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];

  const handleSaveScores = async (scores: any[]) => {
    setIsLoading(true);
    setSaveMessage('');
    setSaveType('');

    try {
      const response = await fetch('/api/assessment-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scores.map(score => ({
          ...score,
          branchId: currentBranchId,
        }))),
      });

      if (!response.ok) {
        throw new Error('Failed to save scores');
      }

      setSaveMessage('Scores saved successfully!');
      setSaveType('success');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
        setSaveType('');
      }, 3000);
    } catch (error) {
      console.error('Error saving scores:', error);
      setSaveMessage('Failed to save scores. Please try again.');
      setSaveType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedSchemaId('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            Assessment Score Entry
          </h1>
          <p className="text-muted-foreground">
            Enter and manage assessment scores for students
          </p>
        </div>
        
        {/* Quick Stats */}
        {selectedSchema && studentsInClass.length > 0 && (
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{studentsInClass.length}</div>
              <div className="text-xs text-muted-foreground">Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{existingScores.length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {studentsInClass.length - existingScores.length}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        )}
      </div>

      {/* Save Status */}
      {saveMessage && (
        <Alert variant={saveType === 'success' ? 'default' : 'destructive'}>
          {saveType === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Select Class & Assessment
          </CardTitle>
          <CardDescription>
            Choose the class, section, and assessment schema to begin score entry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label>Class</Label>
              {classesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedClassId}
                  onValueChange={(value) => {
                    setSelectedClassId(value);
                    setSelectedSectionId('');
                    setSelectedSchemaId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {cls.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Section Selection */}
            <div className="space-y-2">
              <Label>Section</Label>
              <Select
                value={selectedSectionId}
                onValueChange={setSelectedSectionId}
                disabled={!selectedClassId || availableSections.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedClassId 
                      ? "Select class first" 
                      : availableSections.length === 0 
                        ? "No sections" 
                        : "Select section"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map((section: any) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schema Selection */}
            <div className="space-y-2">
              <Label>Assessment Schema</Label>
              {schemasLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedSchemaId}
                  onValueChange={setSelectedSchemaId}
                  disabled={!selectedClassId || availableSchemas.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedClassId 
                        ? "Select class first" 
                        : availableSchemas.length === 0 
                          ? "No schemas available" 
                          : "Select schema"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSchemas.map((schema: any) => (
                      <SelectItem key={schema.id} value={schema.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{schema.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {schema.term} • {schema.subject?.name}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                onClick={resetForm}
                className="w-full"
              >
                Clear All
              </Button>
            </div>
          </div>

                    {/* Summary Info */}
          {selectedSchema && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex flex-wrap gap-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {selectedSchema.subject?.name}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {selectedSchema.term}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {studentsInClass.length} students
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {selectedSchema.components?.length || 0} components
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  Total Marks: {selectedSchema.totalMarks}
                </Badge>
              </div>
              
              {/* Progress Indicator */}
              {existingScores.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Score Entry Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {existingScores.length} of {studentsInClass.length} students completed
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${studentsInClass.length > 0 ? (existingScores.length / studentsInClass.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

             {/* Student Search */}
       {selectedSchema && studentsInClass.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Entry Form */}
      {selectedSchema ? (
        studentsLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
                          ) : studentsInClass.length > 0 ? (
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center justify-between">
                 <span>Score Entry: {selectedSchema.name}</span>
                 <div className="flex items-center gap-2">
                   <Clock className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm text-muted-foreground">
                     Auto-saves as you type
                   </span>
                 </div>
               </CardTitle>
               <CardDescription>
                 Choose between individual or bulk score entry mode
               </CardDescription>
             </CardHeader>
             <CardContent>
               <Tabs defaultValue="individual" className="w-full">
                 <TabsList className="grid w-full grid-cols-2">
                   <TabsTrigger value="individual" className="flex items-center gap-2">
                     <UserCheck className="h-4 w-4" />
                     Individual Entry
                   </TabsTrigger>
                   <TabsTrigger value="bulk" className="flex items-center gap-2">
                     <Table className="h-4 w-4" />
                     Bulk Entry
                   </TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="individual" className="mt-6">
                   <ScoreEntryForm
                     schema={selectedSchema}
                     students={studentsInClass.map((student: any) => ({
                       id: student.id,
                       name: `${student.firstName} ${student.lastName}`,
                       rollNumber: student.rollNumber,
                     }))}
                     existingScores={existingScores}
                     onSave={handleSaveScores}
                   />
                 </TabsContent>
                 
                 <TabsContent value="bulk" className="mt-6">
                   <BulkScoreEntry
                     schema={selectedSchema}
                     students={studentsInClass.map((student: any) => ({
                       id: student.id,
                       name: `${student.firstName} ${student.lastName}`,
                       rollNumber: student.rollNumber,
                     }))}
                     existingScores={existingScores}
                     onSave={handleSaveScores}
                   />
                 </TabsContent>
               </Tabs>
             </CardContent>
           </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'No students match your search criteria.' 
                    : 'No students found for the selected class and section.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Begin</h3>
              <p className="text-muted-foreground mb-4">
                Select a class, section, and assessment schema above to start entering scores.
              </p>
              {schemasLoading && (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Loading schemas...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 