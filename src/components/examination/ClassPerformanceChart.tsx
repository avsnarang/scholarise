"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart } from "@/components/LineChart";
import type { TooltipProps } from "@/components/LineChart";
import { TrendingUp, Filter } from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useAssessmentSchemas } from "@/hooks/useAssessmentSchemas";

interface SectionPerformance {
  sectionName: string;
  sectionId: string;
  teacherName?: string;
  subjects: Record<string, number>; // subjectName -> average percentage
}

export function ClassPerformanceChart() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // Filter state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");

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

  const { data: subjectsData, isLoading: subjectsLoading } = api.subject.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId }
  );

  const subjects = subjectsData?.items || [];

  // Get sections for selected class
  const { data: sections = [], isLoading: sectionsLoading } = api.section.getAll.useQuery(
    { 
      classId: selectedClassId || undefined,
      isActive: true 
    },
    { enabled: !!selectedClassId }
  );

  // Available schemas for the selected class
  const availableSchemas = useMemo(() => {
    if (!selectedClassId) return [];
    
    return schemas.filter((schema: any) => 
      schema.classId === selectedClassId && schema.isPublished
    );
  }, [schemas, selectedClassId]);

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
            schemaTotalMarks: schema.totalMarks,
            subjectId: schema.subjectId
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

  // Get subject teachers for each section
  const { data: subjectTeachers = [], isLoading: teachersLoading } = api.teacher.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined,
      isActive: true 
    },
    { enabled: !!currentBranchId && !!selectedClassId }
  );

  // Get all assessment scores for the selected component's schema (we'll filter by section later)
  const { data: allAssessmentScores = [], isLoading: scoresLoading } = api.examination.getAssessmentScores.useQuery(
    {
      assessmentSchemaId: selectedComponent?.schemaId || "",
    },
    { enabled: !!selectedComponent?.schemaId }
  );

  // Get all students for the selected class (we'll group by section later)
  const { data: allStudents = [], isLoading: allStudentsLoading } = api.student.getByClassAndSection.useQuery(
    {
      classId: selectedClassId || "",
      branchId: currentBranchId || "",
      sessionId: currentSessionId || undefined,
    },
    { enabled: !!currentBranchId && !!selectedClassId }
  );

  // Calculate performance data for chart
  const chartData = useMemo(() => {
    if (!selectedComponent || !sections.length || !allStudents.length) return [];

    const performanceData: any[] = [];

    sections.forEach((section: any) => {
      // Filter students for this section
      const sectionStudents = allStudents.filter((student: any) => 
        student.section?.id === section.id
      );
      
      if (!sectionStudents.length) return;

      // Calculate average for the selected schema's subject
      const componentSubject = subjects.find(subject => subject.id === selectedComponent.subjectId);
      if (!componentSubject) return;

      // Filter scores for students in this section
      const validScores = allAssessmentScores.filter((score: any) => 
        sectionStudents.some((student: any) => student.id === score.studentId)
      );

      let averagePercentage = 0;
      if (validScores.length > 0) {
        const totalPercentage = validScores.reduce((sum: number, score: any) => {
          // Find the specific component score
          const componentScore = score.componentScores?.find((comp: any) => 
            comp.componentId === selectedComponent.id
          );
          
          const totalScore = componentScore ? (componentScore.calculatedScore || componentScore.rawScore || 0) : 0;
          const maxScore = selectedComponent.rawMaxScore;
          const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
          return sum + percentage;
        }, 0);
        averagePercentage = totalPercentage / validScores.length;
      }

      // Find teacher for this section and subject
      const teachersArray = Array.isArray(subjectTeachers) ? subjectTeachers : (subjectTeachers?.items || []);
      const sectionTeacher = teachersArray.find((teacher: any) => 
        teacher.subjectTeachers?.some((st: any) => 
          st.subjectId === selectedComponent.subjectId && 
          st.sectionId === section.id
        )
      );

      const dataPoint: any = {
        section: section.name,
        teacher: sectionTeacher ? 
          `${sectionTeacher.firstName} ${sectionTeacher.lastName}` : 
          "Not Assigned"
      };

      // Show the selected component's performance
      dataPoint[`${componentSubject.name} - ${selectedComponent.name}`] = Math.round(averagePercentage * 10) / 10;

      performanceData.push(dataPoint);
    });

    return performanceData;
  }, [selectedComponent, sections, allStudents, allAssessmentScores, subjects, subjectTeachers, schemas, selectedClassId]);

  // Get colors for subjects
  const getSubjectColors = (subjectCount: number): string[] => {
    const colors = ['green', 'blue', 'red', 'amber', 'violet', 'indigo', 'cyan', 'pink'];
    return Array.from({ length: subjectCount }, (_, i) => colors[i % colors.length]!);
  };

  // For now, show only the selected schema's subject
  const displaySubjects = useMemo(() => {
    if (!selectedComponent) return [];
    const subject = subjects.find(s => s.id === selectedComponent.subjectId);
    return subject ? [`${subject.name} - ${selectedComponent.name}`] : [];
  }, [selectedComponent, subjects]);

  const colors = getSubjectColors(displaySubjects.length);
  const valueFormatter = (number: number) => `${number.toFixed(1)}%`;

  const CustomTooltip = ({ payload, active, label }: TooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;

    const sectionData = chartData.find(item => item.section === label);
    
    return (
      <div className="rounded-md border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 border-b border-gray-200 pb-2 dark:border-gray-600">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            Section: {label}
          </p>
          {sectionData?.teacher && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Teacher: {sectionData.teacher}
            </p>
          )}
        </div>
        <div className="space-y-1">
          {payload
            .filter(item => (item.value as number) > 0)
            .map((item, index) => (
              <div key={index} className="flex items-center justify-between space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.dataKey}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {valueFormatter(item.value as number)}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    );
  };

  const resetFilters = () => {
    setSelectedClassId("");
    setSelectedComponentId("");
  };

  const isLoading = classesLoading || subjectsLoading || sectionsLoading || teachersLoading || 
    scoresLoading || allStudentsLoading;

  return (
    <>
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Performance Filters
              </CardTitle>
              <CardDescription>
                Select class and assessment schema to view subject-wise performance across sections
              </CardDescription>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Component Selection */}
            <div className="space-y-2">
              <Label htmlFor="component">Assessment Component</Label>
              <Select 
                value={selectedComponentId} 
                onValueChange={setSelectedComponentId}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment component" />
                </SelectTrigger>
                <SelectContent>
                  {availableComponents.map((component: any) => (
                    <SelectItem key={component.id} value={component.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{component.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Subject: {subjects.find(s => s.id === component.subjectId)?.name} • Raw Max: {component.rawMaxScore} • From: {component.schemaName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {selectedClassId && selectedComponentId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Component Performance by Section
            </CardTitle>
            <CardDescription>
              Average performance across different sections with subject teachers
              {selectedComponent && (
                <span className="block mt-1">
                  Component: {selectedComponent.name} • Subject: {subjects.find(s => s.id === selectedComponent.subjectId)?.name} • From: {selectedComponent.schemaName}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : chartData.length > 0 && displaySubjects.length > 0 ? (
              <div className="space-y-4">
                <LineChart
                  className="h-80"
                  data={chartData}
                  index="section"
                  categories={displaySubjects}
                  colors={colors}
                  valueFormatter={valueFormatter}
                  yAxisWidth={60}
                  showLegend={true}
                  customTooltip={CustomTooltip}
                />
                
                {/* Teacher Names Display */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Teachers by Section:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                    {chartData.map((item: any, index: number) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="font-medium">{item.section}</div>
                        <div className="text-gray-600 dark:text-gray-400 truncate">
                          {item.teacher}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : !isLoading && chartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No performance data available for the selected criteria.</p>
                  <p className="text-sm mt-1">Make sure students have assessment scores for this component.</p>
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No components found for the selected criteria.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Select Performance Parameters</h3>
              <p className="text-muted-foreground">
                Choose a class and assessment component to view component-wise performance chart
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
} 