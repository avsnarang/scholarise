'use client';

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, Award, FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assessmentCalculator } from '@/lib/assessment-calculator';
import type { AssessmentSchema } from '@/types/assessment';

interface ResultsDashboardProps {
  schema: AssessmentSchema;
  studentScores: any[];
  students: Array<{ id: string; name: string; rollNumber?: string }>;
}

export function ResultsDashboard({ schema, studentScores, students }: ResultsDashboardProps) {
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');

  // Calculate results for all students
  const calculatedResults = useMemo(() => {
    return studentScores.map(studentScore => {
      const student = students.find(s => s.id === studentScore.studentId);
      const result = assessmentCalculator.calculateAssessment(schema, studentScore.componentScores || []);
      
      return {
        studentId: studentScore.studentId,
        studentName: student?.name || 'Unknown',
        rollNumber: student?.rollNumber,
        ...result
      };
    });
  }, [schema, studentScores, students]);

  // Generate class summary
  const classSummary = useMemo(() => {
    return assessmentCalculator.generateClassSummary(schema, studentScores);
  }, [schema, studentScores]);

  // Grade distribution data for pie chart
  const gradeDistributionData = useMemo(() => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347'];
    return Object.entries(classSummary.gradeDistribution).map(([grade, count], index) => ({
      name: grade,
      value: count,
      fill: colors[index % colors.length]
    }));
  }, [classSummary.gradeDistribution]);

  // Component performance data for bar chart
  const componentPerformanceData = useMemo(() => {
    return Object.entries(classSummary.componentAverages).map(([component, average]) => ({
      component,
      average: Number(average.toFixed(1)),
      maximum: schema.components.find(c => c.name === component)?.reducedScore || 0
    }));
  }, [classSummary.componentAverages, schema.components]);

  // Top performers
  const topPerformers = useMemo(() => {
    return calculatedResults
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
      .slice(0, 5);
  }, [calculatedResults]);

  // Students needing attention (bottom 20%)
  const studentsNeedingAttention = useMemo(() => {
    const sortedResults = calculatedResults.sort((a, b) => (a.finalScore || 0) - (b.finalScore || 0));
    const bottomCount = Math.max(1, Math.floor(sortedResults.length * 0.2));
    return sortedResults.slice(0, bottomCount);
  }, [calculatedResults]);

  const handleExportResults = () => {
    // In a real app, this would generate and download a report
    console.log('Exporting results...', calculatedResults);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assessment Results</h2>
          <p className="text-muted-foreground">
            {schema.name} - {calculatedResults.length} students evaluated
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedComponent} onValueChange={setSelectedComponent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select component" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Components</SelectItem>
              {schema.components.map(component => (
                <SelectItem key={component.id} value={component.id}>
                  {component.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportResults} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classSummary.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Evaluated in this assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classSummary.averageScore.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              {classSummary.averagePercentage.toFixed(1)}% of total marks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classSummary.highestScore.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Best performance in class
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((calculatedResults.filter(r => (r.finalPercentage || 0) >= 33).length / calculatedResults.length) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Students above 33%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedView} onValueChange={setSelectedView}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Student Results</TabsTrigger>
          <TabsTrigger value="components">Component Analysis</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gradeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Component Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Component Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={componentPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="component" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="#8884d8" />
                    <Bar dataKey="maximum" fill="#e0e0e0" opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers and Students Needing Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((student, index) => (
                    <div key={student.studentId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <div className="font-medium">{student.studentName}</div>
                          {student.rollNumber && (
                            <div className="text-sm text-muted-foreground">Roll: {student.rollNumber}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{student.finalScore?.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.finalPercentage?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Students Needing Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentsNeedingAttention.map((student) => (
                    <div key={student.studentId} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{student.studentName}</div>
                        {student.rollNumber && (
                          <div className="text-sm text-muted-foreground">Roll: {student.rollNumber}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">{student.finalScore?.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.finalPercentage?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Student Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Student</th>
                      <th className="text-left p-2">Roll No.</th>
                      {schema.components.map(component => (
                        <th key={component.id} className="text-center p-2">{component.name}</th>
                      ))}
                      <th className="text-center p-2">Total</th>
                      <th className="text-center p-2">Percentage</th>
                      <th className="text-center p-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedResults.map((result) => (
                      <tr key={result.studentId} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{result.studentName}</td>
                        <td className="p-2">{result.rollNumber || '-'}</td>
                        {result.componentScores?.map((compScore, index) => (
                          <td key={index} className="text-center p-2">
                            {compScore.calculatedScore?.toFixed(1) || 0}
                          </td>
                        ))}
                        <td className="text-center p-2 font-bold">
                          {result.finalScore?.toFixed(1) || 0}
                        </td>
                        <td className="text-center p-2">
                          {result.finalPercentage?.toFixed(1) || 0}%
                        </td>
                        <td className="text-center p-2">
                          <Badge variant={
                            (result.finalPercentage || 0) >= 75 ? 'default' :
                            (result.finalPercentage || 0) >= 50 ? 'secondary' : 'destructive'
                          }>
                            {assessmentCalculator.calculateGrade(result.finalPercentage || 0)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {schema.components.map((component) => {
              const componentAverage = classSummary.componentAverages[component.name] || 0;
              const componentPercentage = (componentAverage / component.reducedScore) * 100;
              
              return (
                <Card key={component.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {component.name}
                      <Badge variant="outline">
                        {componentAverage.toFixed(1)}/{component.reducedScore}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Class Average:</span>
                        <span className="font-medium">{componentPercentage.toFixed(1)}%</span>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(componentPercentage, 100)}%` }}
                        />
                      </div>

                      {component.formula && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium mb-1">Formula:</div>
                          <code className="text-xs">{component.formula}</code>
                        </div>
                      )}

                      {component.subCriteria.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">Sub-criteria:</div>
                          <div className="space-y-1">
                            {component.subCriteria.map((sub) => (
                              <div key={sub.id} className="flex justify-between text-xs">
                                <span>{sub.name}</span>
                                <span className="text-muted-foreground">Max: {sub.maxScore}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Strongest Component</h4>
                  <p className="text-sm text-blue-700">
                    {Object.entries(classSummary.componentAverages)
                      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} shows the best class performance
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">Area for Improvement</h4>
                  <p className="text-sm text-orange-700">
                    {Object.entries(classSummary.componentAverages)
                      .sort(([,a], [,b]) => a - b)[0]?.[0] || 'N/A'} needs more attention
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Class Performance</h4>
                  <p className="text-sm text-green-700">
                    {classSummary.averagePercentage >= 75 
                      ? 'Excellent class performance overall'
                      : classSummary.averagePercentage >= 60
                      ? 'Good class performance with room for improvement'
                      : 'Class needs significant support and intervention'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {studentsNeedingAttention.length > 0 && (
                    <div className="p-3 border-l-4 border-orange-500 bg-orange-50">
                      <h4 className="font-medium text-orange-900">Individual Support</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        {studentsNeedingAttention.length} students need additional support and remedial classes.
                      </p>
                    </div>
                  )}

                  {classSummary.averagePercentage < 60 && (
                    <div className="p-3 border-l-4 border-red-500 bg-red-50">
                      <h4 className="font-medium text-red-900">Class Intervention</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Consider reviewing teaching methods and providing additional practice materials.
                      </p>
                    </div>
                  )}

                  <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                    <h4 className="font-medium text-blue-900">Next Steps</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Schedule parent-teacher meetings for students scoring below 50% and plan remedial sessions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 