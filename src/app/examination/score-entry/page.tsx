"use client";

import React, { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Snowflake,
  FilePen
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

  // Legacy assessment configurations no longer available
  const assessmentConfigurations: any[] = [];
  const configsLoading = false;

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

  // Helper function to get schema status
  const getSchemaStatus = (schema: any) => {
    if (!schema.isPublished && schema.isActive) {
      return 'draft';
    } else if (schema.isPublished && schema.isActive) {
      return 'published';
    } else if (schema.isPublished && !schema.isActive) {
      return 'frozen';
    }
    return 'inactive';
  };

  // Backend already filters schemas for teachers, so we just need to filter by selected class/section
  const availableSchemas = selectedClassId
    ? allAssessments.filter((schema: any) => {
        // Check if schema applies to the selected class
        if (schema.classId === selectedClassId) {
          // Check if schema applies to the selected section (if specific section is selected)
          if (selectedSectionId && selectedSectionId !== "all") {
            if (schema.appliedClasses && Array.isArray(schema.appliedClasses)) {
              return schema.appliedClasses.some((appliedClass: any) => 
                appliedClass.classId === selectedClassId &&
                (!appliedClass.sectionId || appliedClass.sectionId === selectedSectionId)
              );
            }
            return true; // If no appliedClasses, assume it applies to all sections
          }
          return true; // If "all" sections selected or no section specified
        }
        
        // Check appliedClasses for multi-class schemas
        if (schema.appliedClasses && Array.isArray(schema.appliedClasses)) {
          return schema.appliedClasses.some((appliedClass: any) => 
            appliedClass.classId === selectedClassId &&
            (selectedSectionId === "all" || !appliedClass.sectionId || appliedClass.sectionId === selectedSectionId)
          );
        }
        
        return false;
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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessment Score Entry</h1>
          <p className="text-sm text-muted-foreground">
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
    <div className="space-y-4">
      {/* Compact Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessment Score Entry</h1>
          <p className="text-sm text-muted-foreground">
            Enter and manage student assessment scores
          </p>
        </div>
      </div>

      {/* Minimalist Assessment Configuration */}
      <div className="bg-background border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Assessment Configuration</h2>
        </div>
        
        <div className="p-6">
          {/* Enhanced Dropdown Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Class</label>
              <Select
                value={selectedClassId}
                onValueChange={(value) => {
                  setSelectedClassId(value);
                  setSelectedSectionId("");
                  setSelectedSchemaId("");
                  setActiveComponentTab("");
                }}
              >
                <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 hover:bg-muted/70 transition-colors">
                  <SelectValue placeholder="Select class" className="font-medium" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg">
                  {classesLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Section</label>
              <Select
                value={selectedSectionId}
                onValueChange={(value) => {
                  setSelectedSectionId(value);
                  setSelectedSchemaId("");
                  setActiveComponentTab("");
                }}
                disabled={!selectedClassId}
              >
                <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 hover:bg-muted/70 transition-colors disabled:opacity-50">
                  <SelectValue placeholder="Select section" className="font-medium" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg">
                  {sectionsLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assessment</label>
              <Select
                value={selectedSchemaId}
                onValueChange={(value) => {
                  setSelectedSchemaId(value);
                  setActiveComponentTab("");
                }}
                disabled={!selectedClassId || !selectedSectionId}
              >
                <SelectTrigger className="h-12 bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 hover:bg-muted/70 transition-colors disabled:opacity-50">
                  <SelectValue placeholder="Select assessment" className="font-medium">
                    {selectedSchema && (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{selectedSchema.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedSchema.subject?.name} • {selectedSchema.type === 'schema' ? selectedSchema.totalMarks : selectedSchema.maxMarks} marks
                          </div>
                        </div>
                        {getSchemaStatus(selectedSchema) === 'published' && (
                          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 ml-2">
                            Published
                          </Badge>
                        )}
                        {getSchemaStatus(selectedSchema) === 'frozen' && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200 ml-2">
                            Frozen
                          </Badge>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg">
                  {isLoadingAssessments ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    availableSchemas.map((schema: any) => (
                      <SelectItem 
                        key={schema.id} 
                        value={schema.id}
                        data-status={getSchemaStatus(schema)}
                      >
                        <div className="py-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{schema.name}</span>
                            {getSchemaStatus(schema) === 'frozen' && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Frozen
                              </Badge>
                            )}
                            {getSchemaStatus(schema) === 'published' && (
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                Published
                              </Badge>
                            )}
                          </div>
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

          {/* Enhanced Assessment Summary */}
          {selectedSchema && (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-1 h-16 bg-primary rounded-full"></div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">{selectedSchema.name}</h3>
                        {getSchemaStatus(selectedSchema) === 'published' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            Published
                          </div>
                        )}
                        {getSchemaStatus(selectedSchema) === 'frozen' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            <Snowflake className="h-3 w-3" />
                            Frozen
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium">{selectedSchema.subject?.name}</span>
                        <span className="mx-2">•</span>
                        <span>{selectedSchema.type === 'schema' ? selectedSchema.totalMarks : selectedSchema.maxMarks} marks</span>
                        {getSchemaStatus(selectedSchema) === 'frozen' && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-amber-600 font-medium">Read-only mode</span>
                          </>
                        )}
                      </div>
                      {selectedSchema.components && selectedSchema.components.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {selectedSchema.components.length} component{selectedSchema.components.length !== 1 ? 's' : ''} configured
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">{studentsInClass.length}</div>
                    <div className="text-sm text-muted-foreground">students</div>
                  </div>
                </div>
                
                {/* Enhanced Frozen Alert */}
                {getSchemaStatus(selectedSchema) === 'frozen' && (
                  <div className="mt-4 p-4 bg-amber-50/80 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <Snowflake className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-amber-800">Assessment Frozen</div>
                        <div className="text-xs text-amber-700">This assessment is locked and can only be viewed. No changes can be made to scores.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Score Entry: {selectedSchema.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Check if assessment schema has components */}
              {selectedSchema.type === 'schema' && selectedSchema.components && selectedSchema.components.length > 0 ? (
                // Multi-component assessment with material tabs
                <div className="w-full">
                  {/* Material Tab Navigation */}
                  <div className="border-b border-border bg-background">
                    <div className="flex">
                      {selectedSchema.components.map((component: any, index: number) => {
                        const isActive = (activeComponentTab || selectedSchema.components[0]?.id) === component.id;
                        return (
                          <button
                            key={component.id}
                            onClick={() => setActiveComponentTab(component.id)}
                            className={`
                              relative flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 
                              border-b-2 text-center
                              ${isActive 
                                ? 'text-primary border-primary bg-primary/5' 
                                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30'
                              }
                            `}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>{component.name}</span>
                              <span className={`
                                text-xs px-2 py-0.5 rounded-full
                                ${isActive 
                                  ? 'bg-primary/20 text-primary' 
                                  : 'bg-muted text-muted-foreground'
                                }
                              `}>
                                {component.rawMaxScore || component.maxScore}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {selectedSchema.components.map((component: any) => (
                    <div 
                      key={component.id} 
                      className={`${(activeComponentTab || selectedSchema.components[0]?.id) === component.id ? 'block' : 'hidden'}`}
                    >
                      <ComponentScoreEntry
                        schema={{
                          id: selectedSchema.id,
                          name: selectedSchema.name,
                          term: selectedSchema.termRelation?.name || selectedSchema.term,
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
                        onRefresh={() => refreshComponentScores(component.id)}
                        branchId={currentBranchId || ""}
                        />
                    </div>
                  ))}
                </div>
              ) : (
                // Single component assessment or assessment configuration
                <ComponentScoreEntry
                  schema={{
                    id: selectedSchema.id,
                    name: selectedSchema.name,
                                          term: selectedSchema.type === 'schema' ? (selectedSchema.termRelation?.name || selectedSchema.term) : (selectedSchema.category?.name || "Assessment"),
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
                  onRefresh={() => refreshComponentScores("main")}
                  branchId={currentBranchId || ""}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  No students found for the selected class and section. Please check your selection.
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
              <p className="text-muted-foreground text-sm mb-4 max-w-md">
                Select a class, section, and assessment above to start entering scores.
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