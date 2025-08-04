"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Target,
  Brain,
  Lightbulb,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  PieChart,
  GraduationCap
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useAssessmentSchemas } from "@/hooks/useAssessmentSchemas";
import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";
import { useToast } from "@/components/ui/use-toast";
import { ClassPerformanceChart } from "@/components/examination/ClassPerformanceChart";

interface StudentScore {
  id: string;
  name: string;
  rollNumber?: string;
  admissionNumber?: string;
  score: number;
  percentage: number;
  maxScore: number;
}

interface PerformanceBand {
  name: string;
  range: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  students: StudentScore[];
}

type SortOrder = 'asc' | 'desc' | 'none';

function ExaminationAnalysisPageContent() {
  return (
    <RouteGuard requiredPermissions={[Permission.VIEW_EXAMINATIONS]}>
      <PageWrapper>
        <AnalysisContent />
      </PageWrapper>
    </RouteGuard>
  );
}
// Dynamically import to disable SSR completely
const DynamicExaminationAnalysisPageContent = dynamic(() => Promise.resolve(ExaminationAnalysisPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ExaminationAnalysisPage() {
  return <DynamicExaminationAnalysisPageContent />;
}

function AnalysisContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Results & Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive analysis of student performance and class averages
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="candle" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="candle" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Candle Analysis
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Class Performance
          </TabsTrigger>
        </TabsList>

        {/* Candle Analysis Tab */}
        <TabsContent value="candle" className="space-y-6">
          <CandleAnalysisTab />
        </TabsContent>

        {/* Class Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <ClassPerformanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Candle Analysis Tab Component (Performance Bands Analysis)
function CandleAnalysisTab() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // Filter state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');

  // Data fetching
  const { schemas, isLoading: schemasLoading } = useAssessmentSchemas();
  
  const { data: classes = [], isLoading: classesLoading } = api.class.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      sessionId: currentSessionId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const { data: sections = [], isLoading: sectionsLoading } = api.section.getAll.useQuery(
    { 
      classId: selectedClassId || undefined,
      isActive: true 
    },
    { enabled: !!selectedClassId }
  );

  const { data: subjectsData, isLoading: subjectsLoading } = api.subject.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId }
  );

  const subjects = subjectsData?.items || [];

  // Get students for selected class and section
  const { data: students = [], isLoading: studentsLoading } = api.student.getByClassAndSection.useQuery(
    {
      classId: selectedClassId || "",
      sectionId: selectedSectionId === "all" ? undefined : selectedSectionId || undefined,
      branchId: currentBranchId || "",
      sessionId: currentSessionId || undefined,
    },
    { enabled: !!currentBranchId && !!selectedClassId && !!selectedSectionId }
  );

  // Available schemas based on filters
  const availableSchemas = useMemo(() => {
    if (!selectedClassId || !selectedSubjectId) return [];
    
    return schemas.filter((schema: any) => 
      schema.classId === selectedClassId && 
      schema.subjectId === selectedSubjectId &&
      schema.isPublished
    );
  }, [schemas, selectedClassId, selectedSubjectId]);

  // Available components based on schemas
  const availableComponents = useMemo(() => {
    if (availableSchemas.length === 0) return [];
    
    const components: any[] = [];
    availableSchemas.forEach((schema: any) => {
      if (schema.components && schema.components.length > 0) {
        schema.components.forEach((component: any) => {
          components.push({
            ...component,
            schemaId: schema.id,
            schemaName: schema.name,
            schemaTotalMarks: schema.totalMarks
          });
        });
      }
    });
    
    return components;
  }, [availableSchemas]);

  // Selected component details
  const selectedComponent = useMemo(() => {
    return availableComponents.find((component: any) => component.id === selectedComponentId);
  }, [availableComponents, selectedComponentId]);

  // Get assessment scores for the schema containing the selected component
  const { data: allAssessmentScores = [], isLoading: scoresLoading } = api.examination.getAssessmentScores.useQuery(
    {
      assessmentSchemaId: selectedComponent?.schemaId || "",
    },
    { enabled: !!selectedComponent?.schemaId }
  );

  // Calculate student scores and percentages
  const studentScores: StudentScore[] = useMemo(() => {
    if (!selectedComponent || !students.length || !allAssessmentScores.length) return [];
    
    const scores: StudentScore[] = [];
    
    students.forEach((student: any) => {
      // Find the assessment score for this student
      const assessmentScore = allAssessmentScores.find((score: any) => score.studentId === student.id);
      
      if (assessmentScore) {
        // Find the specific component score
        const componentScore = assessmentScore.componentScores?.find((comp: any) => 
          comp.componentId === selectedComponent.id
        );
        
        const totalScore = componentScore ? (componentScore.calculatedScore || componentScore.rawScore || 0) : 0;
        const maxScore = selectedComponent.rawMaxScore;
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        
        scores.push({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          rollNumber: student.rollNumber?.toString(),
          admissionNumber: student.admissionNumber,
          score: totalScore,
          percentage: Math.round(percentage * 100) / 100,
          maxScore: maxScore
        });
      } else {
        // Include students with no scores as 0
        const maxScore = selectedComponent.rawMaxScore;
        scores.push({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          rollNumber: student.rollNumber?.toString(),
          admissionNumber: student.admissionNumber,
          score: 0,
          percentage: 0,
          maxScore: maxScore
        });
      }
    });

    // Apply sorting
    if (sortOrder === 'asc') {
      scores.sort((a, b) => a.percentage - b.percentage);
    } else if (sortOrder === 'desc') {
      scores.sort((a, b) => b.percentage - a.percentage);
    }

    return scores;
  }, [selectedComponent, allAssessmentScores, students, sortOrder]);

  // Group students by performance bands
  const performanceBands: PerformanceBand[] = useMemo(() => {
    const bands: PerformanceBand[] = [
      {
        name: "Kindle",
        range: "0% - 40%",
        icon: Lightbulb,
        color: "text-red-600",
        bgColor: "bg-red-50 border-red-200",
        students: []
      },
      {
        name: "Amber", 
        range: "40% - 70%",
        icon: Brain,
        color: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
        students: []
      },
      {
        name: "Bright",
        range: "70% - 100%",
        icon: Star,
        color: "text-emerald-600", 
        bgColor: "bg-emerald-50 border-emerald-200",
        students: []
      }
    ];

    studentScores.forEach(student => {
      if (student.percentage >= 0 && student.percentage < 40) {
        bands[0]!.students.push(student);
      } else if (student.percentage >= 40 && student.percentage < 70) {
        bands[1]!.students.push(student);
      } else if (student.percentage >= 70) {
        bands[2]!.students.push(student);
      }
    });

    return bands;
  }, [studentScores]);

  // Statistics
  const statistics = useMemo(() => {
    const totalStudents = studentScores.length;
    const averageScore = totalStudents > 0 
      ? studentScores.reduce((sum, student) => sum + student.percentage, 0) / totalStudents 
      : 0;
    
    const highestScore = studentScores.length > 0 
      ? Math.max(...studentScores.map(s => s.percentage)) 
      : 0;
    
    const lowestScore = studentScores.length > 0 
      ? Math.min(...studentScores.map(s => s.percentage)) 
      : 0;

    return {
      totalStudents,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore: Math.round(highestScore * 10) / 10,
      lowestScore: Math.round(lowestScore * 10) / 10
    };
  }, [studentScores]);

  const handleSortToggle = () => {
    if (sortOrder === 'none') {
      setSortOrder('desc');
    } else if (sortOrder === 'desc') {
      setSortOrder('asc');
    } else {
      setSortOrder('none');
    }
  };

  const getSortIcon = () => {
    switch (sortOrder) {
      case 'asc': return <ArrowUp className="h-4 w-4" />;
      case 'desc': return <ArrowDown className="h-4 w-4" />;
      default: return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  const resetFilters = () => {
    setSelectedClassId("");
    setSelectedSectionId("");
    setSelectedSubjectId("");
    setSelectedComponentId("");
    setSortOrder('none');
  };

  return (
    <>
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Analysis Filters
              </CardTitle>
              <CardDescription>
                Select criteria to analyze student performance by performance bands
              </CardDescription>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section Selection */}
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Select 
                value={selectedSectionId} 
                onValueChange={setSelectedSectionId}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section: any) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Component Selection */}
            <div className="space-y-2">
              <Label htmlFor="component">Assessment Component</Label>
              <Select 
                value={selectedComponentId} 
                onValueChange={setSelectedComponentId}
                disabled={!selectedClassId || !selectedSubjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {availableComponents.map((component: any) => (
                    <SelectItem key={component.id} value={component.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{component.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Raw Max: {component.rawMaxScore} | {component.schemaName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Control */}
            <div className="space-y-2">
              <Label>Sort by Score</Label>
              <Button 
                variant="outline" 
                onClick={handleSortToggle}
                disabled={!selectedComponentId || studentScores.length === 0}
                className="w-full justify-start"
              >
                {getSortIcon()}
                <span className="ml-2">
                  {sortOrder === 'asc' ? 'Ascending' : 
                   sortOrder === 'desc' ? 'Descending' : 
                   'No Sorting'}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {selectedComponentId && selectedComponent ? (
        <div className="space-y-6">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{statistics.totalStudents}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Class Average</p>
                    <p className="text-2xl font-bold">{statistics.averageScore}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Highest Score</p>
                    <p className="text-2xl font-bold">{statistics.highestScore}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lowest Score</p>
                    <p className="text-2xl font-bold">{statistics.lowestScore}%</p>
                  </div>
                  <Target className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Component Analysis: {selectedComponent.name}
              </CardTitle>
              <CardDescription>
                Raw Maximum Score: {selectedComponent.rawMaxScore} | From: {selectedComponent.schemaName}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Performance Bands */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {performanceBands.map((band: PerformanceBand, index: number) => {
              const Icon = band.icon;
              const percentage = statistics.totalStudents > 0 
                ? Math.round((band.students.length / statistics.totalStudents) * 100) 
                : 0;
              
              return (
                <Card key={band.name} className={`border-2 ${band.bgColor}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${band.color}`} />
                        <CardTitle className={band.color}>{band.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {band.range}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{band.students.length}</div>
                      <div className="text-sm text-muted-foreground">
                        {percentage}% of class
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {band.students.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {band.students.map((student: StudentScore) => (
                          <div 
                            key={student.id} 
                            className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{student.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {student.rollNumber && `Roll: ${student.rollNumber}`}
                                  {student.rollNumber && student.admissionNumber && " • "}
                                  {student.admissionNumber && `Adm: ${student.admissionNumber}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm">{student.percentage}%</p>
                                <p className="text-xs text-muted-foreground">
                                  {student.score}/{student.maxScore}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Icon className={`h-8 w-8 mx-auto mb-2 ${band.color} opacity-50`} />
                        <p className="text-sm">No students in this band</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Select Analysis Parameters</h3>
              <p className="text-muted-foreground">
                Choose a class, section, subject, and assessment schema to view performance analysis
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Class Performance Tab Component
function ClassPerformanceTab() {
  return <ClassPerformanceChart />;
} 