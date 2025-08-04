"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BarChart3,
  PieChart,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Layers
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAssessmentSchemas } from "@/hooks/useAssessmentSchemas";
import { useExaminationAutoRefresh } from "@/hooks/useExaminationRefresh";

function ExaminationReportsPageContent() {
  const { currentBranchId } = useBranchContext();
  const [selectedSchema, setSelectedSchema] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // Auto-refresh examination data for live reports
  useExaminationAutoRefresh({
    interval: 45000, // Refresh every 45 seconds
    onFocus: true,
    enabled: true
  });
  
  // Fetch assessment schemas data
  const { schemas, isLoading: schemasLoading } = useAssessmentSchemas();
  const { data: classes } = api.class.getAll.useQuery();
  const { data: gradeScales } = api.examination.getGradeScales.useQuery({ 
    branchId: currentBranchId || undefined,
    isActive: true 
  });

  // Calculate metrics
  const totalSchemas = schemas?.length || 0;
  const publishedSchemas = schemas?.filter((schema: any) => schema.isPublished)?.length || 0;
  const schemasWithScores = schemas?.filter((schema: any) => schema._count?.studentAssessmentScores > 0)?.length || 0;
  const totalGradeScales = gradeScales?.length || 0;

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = "text-gray-900" }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    trend?: { value: number; isPositive: boolean };
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
            {trend && (
              <div className="flex items-center mt-1">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assessment Reports</h1>
        <p className="text-gray-600 mt-2">
          View detailed assessment reports and analytics for the modern assessment system
        </p>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>
            Select criteria to generate assessment reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schema">Assessment Schema</Label>
              <Select value={selectedSchema} onValueChange={setSelectedSchema}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemas?.map((schema: any) => (
                    <SelectItem key={schema.id} value={schema.id}>
                      {schema.name} - {schema.subject?.name} - {schema.class?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="class">Class Analysis</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema-details">Schema Details</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard
              title="Assessment Schemas"
              value={totalSchemas}
              subtitle="Total created"
              icon={Layers}
            />
            <StatCard
              title="Published Schemas"
              value={publishedSchemas}
              subtitle="Ready for scoring"
              icon={CheckCircle}
              color="text-green-600"
            />
            <StatCard
              title="With Score Data"
              value={schemasWithScores}
              subtitle="Have student scores"
              icon={Target}
              color="text-blue-600"
            />
            <StatCard
              title="Grade Scales"
              value={totalGradeScales}
              subtitle="Configured"
              icon={Award}
              color="text-purple-600"
            />
          </div>

          {/* Assessment Schemas Table */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Schemas Overview</CardTitle>
              <CardDescription>
                Summary of all assessment schemas in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schema Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Student Scores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemas?.map((schema: any) => (
                    <TableRow key={schema.id}>
                      <TableCell className="font-medium">{schema.name}</TableCell>
                      <TableCell>{schema.subject?.name || "-"}</TableCell>
                      <TableCell>{schema.class?.name || "-"}</TableCell>
                                                      <TableCell>{schema.termRelation?.name || schema.term}</TableCell>
                      <TableCell>{schema.totalMarks}</TableCell>
                      <TableCell>
                        <Badge variant={schema.isPublished ? "default" : "secondary"}>
                          {schema.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>{schema.components?.length || 0}</TableCell>
                      <TableCell>{schema._count?.studentAssessmentScores || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!schemas || schemas.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No assessment schemas found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Details Tab */}
        <TabsContent value="schema-details" className="space-y-6">
          {selectedSchema ? (
            (() => {
              const schema = schemas?.find((s: any) => s.id === selectedSchema);
              if (!schema) return null;

              return (
                <>
                  {/* Schema Info */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>{schema.name}</CardTitle>
                          <CardDescription>
                                                                  {schema.subject?.name} - {schema.class?.name} - {schema.termRelation?.name || schema.term}
                          </CardDescription>
                        </div>
                        <Button>
                          <Download className="h-4 w-4 mr-2" />
                          Export Details
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Marks</p>
                          <p className="text-2xl font-bold">{schema.totalMarks}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Components</p>
                          <p className="text-2xl font-bold">{schema.components?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Student Scores</p>
                          <p className="text-2xl font-bold">{schema._count?.studentAssessmentScores || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Status</p>
                          <Badge variant={schema.isPublished ? "default" : "secondary"} className="text-lg px-3 py-1">
                            {schema.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Components */}
                  {schema.components && schema.components.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Assessment Components</CardTitle>
                        <CardDescription>
                          Breakdown of assessment components and weightings
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead>Raw Max Score</TableHead>
                              <TableHead>Reduced Score</TableHead>
                              <TableHead>Weightage</TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead>Sub-criteria</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schema.components.map((component: any) => (
                              <TableRow key={component.id}>
                                <TableCell className="font-medium">{component.name}</TableCell>
                                <TableCell>{component.rawMaxScore}</TableCell>
                                <TableCell>{component.reducedScore}</TableCell>
                                <TableCell>{component.weightage}</TableCell>
                                <TableCell>{component.order}</TableCell>
                                <TableCell>{component.subCriteria?.length || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Assessment Schema</h3>
                <p className="text-gray-600">
                  Choose an assessment schema to view detailed information.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Assessment Schemas</span>
                    <span className="font-semibold">{totalSchemas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Published Schemas</span>
                    <span className="font-semibold">{publishedSchemas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Schemas with Data</span>
                    <span className="font-semibold">{schemasWithScores}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Classes</span>
                    <span className="font-semibold">{classes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Grade Scales</span>
                    <span className="font-semibold">{totalGradeScales}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Assessment Engine</span>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Grade Calculation</span>
                    </div>
                    <Badge variant="default">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Score Entry</span>
                    </div>
                    <Badge variant="default">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Report Generation</span>
                    </div>
                    <Badge variant="default">Ready</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Progress</CardTitle>
              <CardDescription>
                Assessment system implementation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Assessment Schema Creation</span>
                    <span>{totalSchemas > 0 ? "100%" : "0%"}</span>
                  </div>
                  <Progress value={totalSchemas > 0 ? 100 : 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Schema Publishing</span>
                    <span>{totalSchemas > 0 ? Math.round((publishedSchemas / totalSchemas) * 100) : 0}%</span>
                  </div>
                  <Progress value={totalSchemas > 0 ? (publishedSchemas / totalSchemas) * 100 : 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Score Data Collection</span>
                    <span>{totalSchemas > 0 ? Math.round((schemasWithScores / totalSchemas) * 100) : 0}%</span>
                  </div>
                  <Progress value={totalSchemas > 0 ? (schemasWithScores / totalSchemas) * 100 : 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Grade Scale Setup</span>
                    <span>{totalGradeScales > 0 ? "100%" : "0%"}</span>
                  </div>
                  <Progress value={totalGradeScales > 0 ? 100 : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicExaminationReportsPageContent = dynamic(() => Promise.resolve(ExaminationReportsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ExaminationReportsPage() {
  return <DynamicExaminationReportsPageContent />;
} 