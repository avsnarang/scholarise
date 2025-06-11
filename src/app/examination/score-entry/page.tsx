"use client";

import React, { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Calendar, 
  Users, 
  FileText, 
  Save, 
  Search, 
  Clock,
  GraduationCap,
  AlertCircle
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/components/ui/use-toast";
import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";
import { ComponentScoreEntry } from "@/components/assessment/ComponentScoreEntry";

export default function ScoreEntryPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.VIEW_EXAMINATIONS]}>
      <PageWrapper>
        <ScoreEntryContent />
      </PageWrapper>
    </RouteGuard>
  );
}

function ScoreEntryContent() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { isTeacher, teacherId, isAdmin, isSuperAdmin } = useUserRole();
  
  // State
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [existingScores, setExistingScores] = useState<any[]>([]);
  const [activeComponentTab, setActiveComponentTab] = useState<string>("");

  // Get teacher's subject assignments if user is a teacher
  const { data: teacherAssignments = [] } = api.subjectTeacher.getByTeacherId.useQuery(
    { teacherId: teacherId || '' },
    { enabled: isTeacher && !!teacherId }
  );

  // Fetch classes - filter based on teacher assignments if user is a teacher
  const { data: allClasses = [], isLoading: classesLoading } = api.class.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      sessionId: currentSessionId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  // Filter classes based on teacher assignments for teachers
  const classes = isTeacher && !isAdmin && !isSuperAdmin 
    ? allClasses.filter(cls => 
        teacherAssignments.some((assignment: any) => assignment.classId === cls.id)
      )
    : allClasses;

  // Fetch sections for selected class - filter by teacher assignments if user is a teacher
  const { data: allSections = [], isLoading: sectionsLoading } = api.section.getAll.useQuery(
    { 
      classId: selectedClassId || undefined,
      isActive: true 
    },
    { enabled: !!selectedClassId }
  );

  // Filter sections based on teacher assignments for teachers
  const sections = isTeacher && !isAdmin && !isSuperAdmin && selectedClassId
    ? allSections.filter((section: any) => 
        teacherAssignments.some((assignment: any) => 
          assignment.classId === selectedClassId && 
          (assignment.sectionId === section.id || assignment.sectionId === null) // null means all sections
        )
      )
    : allSections;

  // Fetch assessment configurations using tRPC
  const { data: assessmentConfigurations = [], isLoading: configsLoading } = api.examination.getAssessmentConfigurations.useQuery(
    { 
      branchId: currentBranchId || undefined,
      classId: selectedClassId || undefined,
      sectionId: selectedSectionId === "all" ? undefined : selectedSectionId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId && !!selectedClassId }
  );

  // Fetch assessment schemas using direct API call
  const [assessmentSchemas, setAssessmentSchemas] = useState<any[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);

  useEffect(() => {
    const fetchAssessmentSchemas = async () => {
      if (!currentBranchId) {
        setAssessmentSchemas([]);
        return;
      }

      setSchemasLoading(true);
      try {
        const response = await fetch(`/api/assessment-schemas?branchId=${currentBranchId}`);
        if (response.ok) {
          const schemas = await response.json();
          console.log('Assessment schemas response:', schemas);
          
          if (Array.isArray(schemas)) {
            // Filter schemas by selected class
            const filteredSchemas = schemas.filter((schema: any) => {
              if (!selectedClassId) return false;
              
              // Check if schema applies to the selected class
              if (schema.classId === selectedClassId) return true;
              
              // Check appliedClasses for multi-class schemas
              if (schema.appliedClasses && Array.isArray(schema.appliedClasses)) {
                return schema.appliedClasses.some((appliedClass: any) => 
                  appliedClass.classId === selectedClassId &&
                  (selectedSectionId === "all" || !appliedClass.sectionId || appliedClass.sectionId === selectedSectionId)
                );
              }
              
              return false;
            });
            
            const schemasWithType = filteredSchemas.map((schema: any) => ({
              ...schema,
              type: 'schema',
              maxMarks: schema.totalMarks
            }));
            
            // Debug logging for components
            schemasWithType.forEach((schema: any) => {
              if (schema.components && schema.components.length > 0) {
                console.log(`Assessment schema "${schema.name}" has ${schema.components.length} components:`, 
                  schema.components.map((c: any) => ({ id: c.id, name: c.name, maxScore: c.maxScore }))
                );
              }
            });
            
            setAssessmentSchemas(schemasWithType);
          } else {
            setAssessmentSchemas([]);
          }
        } else {
          setAssessmentSchemas([]);
        }
      } catch (error) {
        console.error('Error fetching assessment schemas:', error);
        setAssessmentSchemas([]);
      } finally {
        setSchemasLoading(false);
      }
    };

    fetchAssessmentSchemas();
  }, [currentBranchId, selectedClassId, selectedSectionId]);

  // Combine both types of assessments
  const allAssessments = [
    ...assessmentSchemas,
    ...assessmentConfigurations.map((config: any) => ({
      ...config,
      type: 'configuration'
    }))
  ];

  const isLoadingAssessments = schemasLoading || configsLoading;

  // Filter schemas by teacher's subjects if user is a teacher
  const availableSchemas = isTeacher && !isAdmin && !isSuperAdmin && selectedClassId
    ? allAssessments.filter((schema: any) => {
        // Check if teacher is assigned to this subject for this class
        const hasAssignment = teacherAssignments.some((assignment: any) => 
          assignment.classId === selectedClassId && 
          assignment.subjectId === schema.subjectId &&
          // Also check section assignment if section is selected
          (selectedSectionId === "all" || !assignment.sectionId || assignment.sectionId === selectedSectionId)
        );
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('Schema filtering debug:', {
            schemaName: schema.name,
            schemaSubjectId: schema.subjectId,
            selectedClassId,
            selectedSectionId,
            teacherAssignments: teacherAssignments.map((a: any) => ({
              classId: a.classId,
              subjectId: a.subjectId,
              sectionId: a.sectionId,
              subject: a.subject?.name,
              class: a.class?.name
            })),
            hasAssignment
          });
        }
        
        return hasAssignment;
      })
    : allAssessments;

  // Fetch students for selected class and section
  const { data: studentsData, isLoading: studentsLoading } = api.student.getAll.useQuery(
    {
      branchId: currentBranchId || undefined,
      sectionId: selectedSectionId || undefined,
      search: searchTerm || undefined,
    },
    { enabled: !!currentBranchId && !!selectedSectionId }
  );

  const studentsInClass = studentsData?.items || [];
  const selectedSchema = availableSchemas.find((s: any) => s.id === selectedSchemaId);

  // Set default active component tab when schema changes
  useEffect(() => {
    if (selectedSchema && selectedSchema.type === 'schema' && selectedSchema.components && selectedSchema.components.length > 0) {
      // Multi-component assessment schema - set to first component
      console.log(`Selected schema "${selectedSchema.name}" has ${selectedSchema.components.length} components, setting active tab to:`, selectedSchema.components[0].id);
      setActiveComponentTab(selectedSchema.components[0].id);
    } else if (selectedSchema) {
      // Single component assessment or assessment configuration
      console.log(`Selected schema "${selectedSchema.name}" is single component or configuration, setting active tab to "main"`);
      setActiveComponentTab("main");
    } else {
      setActiveComponentTab("");
    }
  }, [selectedSchema]);

  // Fetch existing scores when schema is selected
  useEffect(() => {
    const fetchExistingScores = async () => {
      if (!selectedSchemaId || !currentBranchId || !selectedSchema) return;
      
      try {
        let scores = [];
        
        if (selectedSchema.type === 'schema') {
          // Fetch scores for assessment schema
          const response = await fetch(`/api/assessment-scores?assessmentSchemaId=${selectedSchemaId}`);
          if (response.ok) {
            scores = await response.json();
          }
        } else if (selectedSchema.type === 'configuration') {
          // Fetch scores for assessment configuration using tRPC
          const response = await fetch(`/api/trpc/examination.getAssessmentMarks?batch=1&input=${encodeURIComponent(JSON.stringify({
            "0": {
              "json": {
                branchId: currentBranchId,
                assessmentConfigId: selectedSchemaId
              }
            }
          }))}`);
          
          if (response.ok) {
            const data = await response.json();
            scores = data[0]?.result?.data || [];
          }
        }
        
        setExistingScores(scores);
      } catch (error) {
        console.error('Error fetching existing scores:', error);
      }
    };

    fetchExistingScores();
  }, [selectedSchemaId, currentBranchId, selectedClassId, selectedSectionId, selectedSchema]);

  const handleSaveScores = async (scores: any[]) => {
    if (!selectedSchema) return;
    
    try {
      if (selectedSchema.type === 'schema') {
        // Save scores for assessment schema
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
      } else if (selectedSchema.type === 'configuration') {
        // Save scores for assessment configuration using tRPC
        for (const score of scores) {
          const response = await fetch('/api/trpc/examination.createAssessmentMarks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assessmentConfigId: selectedSchemaId,
              studentId: score.studentId,
              marksObtained: score.marksObtained,
              comments: score.comments,
              branchId: currentBranchId,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to save score for student ${score.studentId}`);
          }
        }
      }
      
      toast({
        title: "Scores saved successfully",
        description: `Saved scores for ${scores.length} students`,
      });
      
      // Refresh existing scores
      const fetchExistingScores = async () => {
        if (!selectedSchemaId || !currentBranchId || !selectedSchema) return;
        
        try {
          let refreshedScores = [];
          
          if (selectedSchema.type === 'schema') {
            const response = await fetch(`/api/assessment-scores?assessmentSchemaId=${selectedSchemaId}`);
            if (response.ok) {
              refreshedScores = await response.json();
            }
          } else if (selectedSchema.type === 'configuration') {
            const response = await fetch(`/api/trpc/examination.getAssessmentMarks?batch=1&input=${encodeURIComponent(JSON.stringify({
              "0": {
                "json": {
                  branchId: currentBranchId,
                  assessmentConfigId: selectedSchemaId
                }
              }
            }))}`);
            
            if (response.ok) {
              const data = await response.json();
              refreshedScores = data[0]?.result?.data || [];
            }
          }
          
          setExistingScores(refreshedScores);
        } catch (error) {
          console.error('Error fetching existing scores:', error);
        }
      };
      
      fetchExistingScores();
    } catch (error) {
      toast({
        title: "Error saving scores",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedClassId("");
    setSelectedSectionId("");
    setSelectedSchemaId("");
    setSearchTerm("");
    setExistingScores([]);
    setActiveComponentTab("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Score Entry</h1>
          <p className="mt-2 text-gray-500">
            Enter assessment scores for students across different components
          </p>
        </div>
      </div>

      {!currentBranchId || !currentSessionId ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to begin score entry.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Assessment Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Selection</CardTitle>
              <CardDescription>
                Choose the class, section, and assessment schema for score entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Class Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Class</Label>
                  <Select
                    value={selectedClassId}
                    onValueChange={(value) => {
                      setSelectedClassId(value);
                      setSelectedSectionId("");
                      setSelectedSchemaId("");
                      setActiveComponentTab("");
                    }}
                  >
                    <SelectTrigger className="h-11 !bg-white dark:!bg-white border-gray-300">
                      <SelectValue placeholder={
                        classes.length === 0 
                          ? (isTeacher && !isAdmin && !isSuperAdmin ? "No assigned classes" : "No classes available")
                          : "Select class"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {classesLoading ? (
                        <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                      ) : (
                        classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Section</Label>
                  <Select
                    value={selectedSectionId}
                    onValueChange={(value) => {
                      setSelectedSectionId(value);
                      setSelectedSchemaId("");
                      setActiveComponentTab("");
                    }}
                    disabled={!selectedClassId || sections.length === 0}
                  >
                    <SelectTrigger className="h-11 !bg-white dark:!bg-white border-gray-300">
                      <SelectValue placeholder={
                        !selectedClassId 
                          ? "Select class first" 
                          : sections.length === 0 
                            ? (isTeacher && !isAdmin && !isSuperAdmin ? "No assigned sections" : "No sections") 
                            : "Select section"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {sectionsLoading ? (
                        <SelectItem value="loading" disabled>Loading sections...</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="all">All Sections</SelectItem>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              Section {section.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assessment Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Assessment</Label>
                  <Select
                    value={selectedSchemaId}
                    onValueChange={(value) => {
                      setSelectedSchemaId(value);
                      setActiveComponentTab("");
                    }}
                    disabled={!selectedClassId || !selectedSectionId || availableSchemas.length === 0}
                  >
                    <SelectTrigger className="h-11 !bg-white dark:!bg-white border-gray-300">
                      <SelectValue placeholder={
                        !selectedClassId || !selectedSectionId
                          ? "Select class & section first" 
                          : availableSchemas.length === 0 
                            ? (isTeacher && !isAdmin && !isSuperAdmin ? "No assigned assessments" : "No assessments available") 
                            : "Select assessment"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {isLoadingAssessments ? (
                        <SelectItem value="loading" disabled>Loading assessments...</SelectItem>
                      ) : (
                        availableSchemas.map((schema: any) => (
                          <SelectItem key={schema.id} value={schema.id}>
                            <div className="flex items-center gap-3 py-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{schema.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {schema.subject?.name} • {schema.category?.name || schema.term} • {schema.type === 'schema' ? schema.totalMarks : schema.maxMarks} marks
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selection Summary */}
              {selectedSchema && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex flex-wrap items-center gap-4">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {selectedSchema.subject?.name}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {selectedSchema.category?.name || selectedSchema.term}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {studentsInClass.length} students
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      Max: {selectedSchema.type === 'schema' ? selectedSchema.totalMarks : selectedSchema.maxMarks} marks
                    </Badge>
                    
                    <div className="ml-auto">
                      <Button 
                        variant="outline" 
                        onClick={resetForm}
                        size="sm"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Indicator */}
                  {existingScores.length > 0 && (
                    <div className="mt-4 bg-muted/50 rounded-lg p-4">
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

          {/* Component-based Score Entry */}
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
                    Enter scores for this assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Check if assessment schema has components */}
                  {selectedSchema.type === 'schema' && selectedSchema.components && selectedSchema.components.length > 0 ? (
                    // Multi-component assessment with tabs
                    <Tabs 
                      value={activeComponentTab || selectedSchema.components[0]?.id} 
                      onValueChange={setActiveComponentTab}
                      className="w-full"
                    >
                      <TabsList>
                        {selectedSchema.components.map((component: any) => (
                          <TabsTrigger 
                            key={component.id} 
                            value={component.id}
                            className="flex items-center gap-2"
                          >
                            <span>{component.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({component.rawMaxScore || component.maxScore})
                            </span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      
                      {selectedSchema.components.map((component: any) => (
                        <TabsContent key={component.id} value={component.id} className="mt-6">
                          <ComponentScoreEntry
                            schema={{
                              id: selectedSchema.id,
                              name: selectedSchema.name,
                              term: selectedSchema.term,
                              classId: selectedSchema.classId,
                              subjectId: selectedSchema.subjectId || "",
                              totalMarks: selectedSchema.totalMarks,
                              isActive: selectedSchema.isActive,
                              isPublished: selectedSchema.isPublished,
                              createdBy: selectedSchema.createdBy,
                              createdAt: new Date(selectedSchema.createdAt),
                              updatedAt: new Date(selectedSchema.updatedAt),
                              branchId: selectedSchema.branchId,
                              components: selectedSchema.components
                            }}
                            component={component}
                            students={studentsInClass.map((student: any) => ({
                              id: student.id,
                              name: `${student.firstName} ${student.lastName}`,
                              rollNumber: student.rollNumber,
                            }))}
                            existingScores={existingScores}
                            onSave={handleSaveScores}
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    // Single component assessment or assessment configuration
                    <>
                      {selectedSchema.type === 'configuration' && (
                        <Alert className="mb-6">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            This is a simple assessment configuration with single score entry.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <ComponentScoreEntry
                        schema={{
                          id: selectedSchema.id,
                          name: selectedSchema.name,
                          term: selectedSchema.type === 'schema' ? selectedSchema.term : (selectedSchema.category?.name || "Assessment"),
                          classId: selectedSchema.classId,
                          subjectId: selectedSchema.subjectId || "",
                          totalMarks: selectedSchema.type === 'schema' ? selectedSchema.totalMarks : selectedSchema.maxMarks,
                          isActive: selectedSchema.isActive,
                          isPublished: selectedSchema.type === 'schema' ? selectedSchema.isPublished : false,
                          createdBy: selectedSchema.type === 'schema' ? selectedSchema.createdBy : "",
                          createdAt: selectedSchema.type === 'schema' ? new Date(selectedSchema.createdAt) : new Date(),
                          updatedAt: selectedSchema.type === 'schema' ? new Date(selectedSchema.updatedAt) : new Date(),
                          branchId: selectedSchema.branchId,
                          components: selectedSchema.type === 'schema' ? (selectedSchema.components || []) : []
                        }}
                        component={{
                          id: "main",
                          name: selectedSchema.name,
                          maxScore: selectedSchema.type === 'schema' ? selectedSchema.totalMarks : selectedSchema.maxMarks,
                          rawMaxScore: selectedSchema.type === 'schema' ? selectedSchema.totalMarks : selectedSchema.maxMarks
                        }}
                        students={studentsInClass.map((student: any) => ({
                          id: student.id,
                          name: `${student.firstName} ${student.lastName}`,
                          rollNumber: student.rollNumber,
                        }))}
                        existingScores={existingScores}
                        onSave={handleSaveScores}
                      />
                    </>
                  )}
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
                    Select a class, section, and assessment above to start entering scores.
                  </p>
                  {isLoadingAssessments && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm">Loading assessments...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
} 