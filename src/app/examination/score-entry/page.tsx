"use client";

import React, { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Clock,
  GraduationCap,
  AlertCircle,
  BarChart3
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
  const [existingScores, setExistingScores] = useState<any[]>([]);
  const [activeComponentTab, setActiveComponentTab] = useState<string>("");
  const [componentScores, setComponentScores] = useState<Record<string, any[]>>({});

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
        const hasAssignment = teacherAssignments.some((assignment: any) => 
          assignment.classId === selectedClassId && 
          assignment.subjectId === schema.subjectId &&
          (selectedSectionId === "all" || !assignment.sectionId || assignment.sectionId === selectedSectionId)
        );
        
        return hasAssignment;
      })
    : allAssessments;

  // Fetch students for selected class and section
  const { data: studentsData, isLoading: studentsLoading } = api.student.getAll.useQuery(
    {
      branchId: currentBranchId || undefined,
      sectionId: selectedSectionId || undefined,
      limit: 500
    },
    { enabled: !!currentBranchId && !!selectedSectionId }
  );

  const studentsInClass = studentsData?.items || [];
  const selectedSchema = availableSchemas.find((s: any) => s.id === selectedSchemaId);

  // Set default active component tab when schema changes
  useEffect(() => {
    if (selectedSchema && selectedSchema.type === 'schema' && selectedSchema.components && selectedSchema.components.length > 0) {
      setActiveComponentTab(selectedSchema.components[0].id);
    } else if (selectedSchema) {
      setActiveComponentTab("main");
    } else {
      setActiveComponentTab("");
    }
  }, [selectedSchema]);

  // Transform API response to component-expected format
  const transformScoresForComponent = (apiScores: any[], componentId: string) => {
    const transformedScores: any[] = [];
    
    apiScores.forEach(studentScore => {
      if (studentScore.componentScores && studentScore.componentScores.length > 0) {
        // For schema-based assessments with components
        const componentScore = studentScore.componentScores.find((cs: any) => cs.componentId === componentId);
        if (componentScore) {
          // Transform sub-criteria scores from array to object
          const subCriteriaScores: Record<string, number> = {};
          if (componentScore.subCriteriaScores) {
            componentScore.subCriteriaScores.forEach((scs: any) => {
              subCriteriaScores[scs.subCriteriaId] = scs.score || 0;
            });
          }
          
          transformedScores.push({
            studentId: studentScore.studentId,
            componentId: componentId,
            marksObtained: componentScore.rawScore || componentScore.calculatedScore || 0,
            comments: componentScore.comments || "",
            subCriteriaScores: subCriteriaScores
          });
        }
      } else {
        // For simple assessments or main component scores
        if (componentId === "main" || !componentId) {
          transformedScores.push({
            studentId: studentScore.studentId,
            marksObtained: studentScore.marksObtained || 0,
            comments: studentScore.comments || ""
          });
        }
      }
    });
    
    return transformedScores;
  };

  // Fetch existing scores when schema is selected
  useEffect(() => {
    const fetchExistingScores = async () => {
      if (!selectedSchemaId || !currentBranchId || !selectedSchema) return;
      
      try {
        let scores = [];
        
        if (selectedSchema.type === 'schema') {
          const response = await fetch(`/api/assessment-scores?assessmentSchemaId=${selectedSchemaId}`);
          if (response.ok) {
            scores = await response.json();
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
            scores = data[0]?.result?.data || [];
          }
        }
        
        setExistingScores(scores);
        
        // Transform scores for each component
        const componentScoresMap: Record<string, any[]> = {};
        
        if (selectedSchema.type === 'schema' && selectedSchema.components) {
          selectedSchema.components.forEach((component: any) => {
            componentScoresMap[component.id] = transformScoresForComponent(scores, component.id);
          });
        } else {
          // For simple assessments
          componentScoresMap["main"] = transformScoresForComponent(scores, "main");
        }
        
        setComponentScores(componentScoresMap);
      } catch (error) {
        console.error('Error fetching existing scores:', error);
        setExistingScores([]);
        setComponentScores({});
      }
    };

    fetchExistingScores();
  }, [selectedSchemaId, currentBranchId, selectedClassId, selectedSectionId, selectedSchema]);

  // Component-specific save handler
  const handleSaveScoresForComponent = async (componentId: string, scores: any[]) => {
    if (!selectedSchema) return;
    
    try {
      if (selectedSchema.type === 'schema') {
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
        description: `Saved scores for ${scores.length} students in ${selectedSchema.components?.find((c: any) => c.id === componentId)?.name || 'assessment'}`,
      });
      
      // Refresh the scores for this component
      await refreshComponentScores(componentId);
    } catch (error) {
      toast({
        title: "Error saving scores",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  // Refresh scores for a specific component
  const refreshComponentScores = async (componentId: string) => {
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
      
      // Update component-specific scores
      const transformedScores = transformScoresForComponent(refreshedScores, componentId);
      setComponentScores(prev => ({
        ...prev,
        [componentId]: transformedScores
      }));
      
      // Also update the main existing scores for progress tracking
      setExistingScores(refreshedScores);
    } catch (error) {
      console.error('Error refreshing component scores:', error);
    }
  };

  // Legacy handlers for backward compatibility
  const handleSaveScores = (scores: any[]) => handleSaveScoresForComponent(activeComponentTab || "main", scores);

  // Helper function to refresh existing scores
  const refreshExistingScores = async () => {
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
      console.error('Error refreshing scores:', error);
    }
  };

  const resetForm = () => {
    setSelectedClassId("");
    setSelectedSectionId("");
    setSelectedSchemaId("");
    setExistingScores([]);
    setComponentScores({});
    setActiveComponentTab("");
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Assessment Score Entry</h1>
          <p className="mt-2 text-gray-500">
            Enter and manage student assessment scores
          </p>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to begin score entry.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#00501B]">Assessment Score Entry</h1>
        <p className="mt-2 text-gray-500">
          Enter and manage student assessment scores
        </p>
      </div>

      {/* Assessment Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assessment Configuration
          </CardTitle>
          <CardDescription>
            Configure your assessment parameters to begin score entry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Class Selection */}
            <div className="space-y-2">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md">
                  {classesLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="cursor-pointer hover:bg-accent">
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Section Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Section</Label>
              <Select
                value={selectedSectionId}
                onValueChange={(value) => {
                  setSelectedSectionId(value);
                  setSelectedSchemaId("");
                  setActiveComponentTab("");
                }}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md">
                  {sectionsLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="all" className="cursor-pointer hover:bg-accent">All Sections</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id} className="cursor-pointer hover:bg-accent">
                          {section.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Assessment Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assessment</Label>
              <Select
                value={selectedSchemaId}
                onValueChange={(value) => {
                  setSelectedSchemaId(value);
                  setActiveComponentTab("");
                }}
                disabled={!selectedClassId || !selectedSectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-md">
                  {isLoadingAssessments ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    availableSchemas.map((schema: any) => (
                      <SelectItem key={schema.id} value={schema.id} className="cursor-pointer hover:bg-accent">
                        <div className="py-1">
                          <div className="font-medium text-sm">{schema.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {schema.subject?.name} • {schema.type === 'schema' ? schema.totalMarks : schema.maxMarks} marks
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assessment Summary */}
          {selectedSchema && (
            <div className="pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary" className="flex items-center gap-1">
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
                
                <Button 
                  variant="ghost" 
                  onClick={resetForm}
                  size="sm"
                  className="ml-auto"
                >
                  Clear All
                </Button>
              </div>

              {/* Progress Indicator */}
              {existingScores.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">Score Entry Progress</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      {Math.round((existingScores.length / studentsInClass.length) * 100)}% complete
                    </Badge>
                  </div>
                  <div className="w-full bg-green-100 dark:bg-green-900 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${studentsInClass.length > 0 ? (existingScores.length / studentsInClass.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    {existingScores.length} of {studentsInClass.length} students completed
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Entry Section */}
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
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : studentsInClass.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Score Entry: {selectedSchema.name}
              </CardTitle>
              <CardDescription>
                Enter scores for this assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Check if assessment schema has components */}
              {selectedSchema.type === 'schema' && selectedSchema.components && selectedSchema.components.length > 0 ? (
                // Multi-component assessment with tabs
                <Tabs 
                  value={activeComponentTab || selectedSchema.components[0]?.id} 
                  onValueChange={setActiveComponentTab}
                  className="w-full"
                >
                  <div className="border-b px-6">
                    <TabsList className="bg-transparent h-12 p-0">
                      {selectedSchema.components.map((component: any) => (
                        <TabsTrigger 
                          key={component.id} 
                          value={component.id}
                          className="data-[state=active]:bg-background data-[state=active]:shadow-sm border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                        >
                          <span>{component.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({component.rawMaxScore || component.maxScore})
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  
                  {selectedSchema.components.map((component: any) => (
                    <TabsContent key={component.id} value={component.id} className="m-0">
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
                          admissionNumber: student.admissionNumber,
                        }))}
                        existingScores={componentScores[component.id] || []}
                        onSave={(scores) => handleSaveScoresForComponent(component.id, scores)}
                        branchId={currentBranchId || ""}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                // Single component assessment or assessment configuration
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
                    admissionNumber: student.admissionNumber,
                  }))}
                  existingScores={componentScores["main"] || []}
                  onSave={(scores) => handleSaveScoresForComponent("main", scores)}
                  branchId={currentBranchId || ""}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Students Found</h3>
                <p className="text-muted-foreground max-w-md">
                  No students found for the selected class and section. Please check your selection or contact administration.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-3">Ready to Begin</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Select a class, section, and assessment above to start entering scores for your students.
              </p>
              {isLoadingAssessments && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Loading assessments...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 