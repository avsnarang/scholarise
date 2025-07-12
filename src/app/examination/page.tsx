"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardList, 
  Users, 
  BookOpen, 
  TrendingUp, 
  FileText,
  Plus,
  Eye,
  GraduationCap,
  ClipboardCheck,
  Clock,
  BarChart3,
  Target,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Activity,
  PieChart,
  Award,
  BookMarked,
  Timer,
  UserCheck,
  ChevronRight,
  Zap,
  Sparkles,
  TrendingDown
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAssessmentSchemas } from "@/hooks/useAssessmentSchemas";
import { ExaminationNav } from "@/components/examination-nav";

export default function ExaminationDashboard() {
  const { currentBranchId } = useBranchContext();
  
  // Fetch assessment schemas data
  const { schemas, isLoading: schemasLoading } = useAssessmentSchemas();
  
  // Fetch grade scales for dashboard
  const { data: gradeScales } = api.examination.getGradeScales.useQuery({ 
    branchId: currentBranchId || undefined,
    isActive: true 
  });

  // Calculate assessment metrics
  const totalSchemas = schemas?.length || 0;
  const publishedSchemas = schemas?.filter((schema: any) => schema.status === 'PUBLISHED')?.length || 0;
  const draftSchemas = schemas?.filter((schema: any) => schema.status === 'DRAFT')?.length || 0;
  const schemasWithScores = schemas?.filter((schema: any) => schema._count?.studentScores > 0)?.length || 0;
  
  // Calculate completion rate for assessment schemas
  const assessmentCompletionRate = totalSchemas > 0 ? Math.round((schemasWithScores / totalSchemas) * 100) : 0;

  // Grade scale metrics
  const totalGradeScales = gradeScales?.length || 0;
  const defaultGradeScale = gradeScales?.find(scale => scale.isDefault);

  // Simplified stats for minimal design
  const stats = [
    {
      title: "Assessment Schemas",
      value: totalSchemas,
      description: "Total created",
      icon: BookOpen,
    },
    {
      title: "Published",
      value: publishedSchemas,
      description: "Ready for scoring",
      icon: ClipboardCheck,
    },
    {
      title: "With Scores",
      value: schemasWithScores,
      description: "Have student data",
      icon: BarChart3,
    },
    {
      title: "Grade Scales",
      value: totalGradeScales,
      description: defaultGradeScale ? `Default: ${defaultGradeScale.name}` : "Setup required",
      icon: Award,
    },
  ];

  // Simplified quick actions
  const quickActions = [
    {
      title: "Create Schema",
      description: "Build new assessment",
      href: "/examination/assessment-schemas",
      icon: Plus,
    },
    {
      title: "Enter Scores",
      description: "Input student scores",
      href: "/examination/score-entry",
      icon: ClipboardList,
    },
    {
      title: "View Results",
      description: "Analytics dashboard",
      href: "/examination/results-dashboard",
      icon: BarChart3,
    },
    {
      title: "Grade Setup",
      description: "Configure grading",
      href: "/examination/grade-scales",
      icon: Award,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Assessment Center</h1>
        <p className="text-muted-foreground">
          Manage assessments, scoring, and results
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Progress</CardTitle>
          <CardDescription>
            Assessment system setup and usage status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Assessment Completion</span>
              <span>{assessmentCompletionRate}%</span>
            </div>
            <Progress value={assessmentCompletionRate} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total schemas</span>
              <span className="font-medium">{totalSchemas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">With scores</span>
              <span className="font-medium">{schemasWithScores}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common assessment tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent">
                    <Icon className="h-5 w-5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Assessment Schemas */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Schemas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schemas?.slice(0, 4).map((schema: any) => (
                    <div key={schema.id} className="flex items-center space-x-3">
                      <div className={`h-2 w-2 rounded-full ${
                        schema.status === 'PUBLISHED' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {schema.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                                                      {schema.subject?.name} • {schema.termRelation?.name || schema.term}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {schema.totalMarks}M
                      </Badge>
                    </div>
                  ))}
                  {(!schemas || schemas.length === 0) && (
                    <div className="text-center py-6 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No schemas created yet</p>
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link href="/examination/assessment-schemas">
                          Create Schema
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Assessment Engine</span>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Grade Calculation</span>
                    </div>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Score Entry</span>
                    </div>
                    <Badge variant="secondary">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Reports</span>
                    </div>
                    <Badge variant="secondary">Available</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schemas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Schemas</CardTitle>
              <CardDescription>
                Current assessment frameworks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schemas && schemas.length > 0 ? (
                  schemas.map((schema: any) => (
                    <div key={schema.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{schema.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {schema.subject?.name} • {schema.class?.name} • {schema.totalMarks} marks
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={schema.isPublished ? "default" : "secondary"}>
                          {schema.isPublished ? "Published" : "Draft"}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/examination/score-entry">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">No assessment schemas</h3>
                    <p className="text-sm mb-4">Create your first assessment schema to get started</p>
                    <Button asChild>
                      <Link href="/examination/assessment-schemas">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Schema
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest assessment-related updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Assessment schema created</p>
                    <p className="text-xs text-muted-foreground">Math Term-1 evaluation framework</p>
                  </div>
                  <div className="text-xs text-muted-foreground">2h ago</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Scores entered</p>
                    <p className="text-xs text-muted-foreground">Science assessment completed</p>
                  </div>
                  <div className="text-xs text-muted-foreground">4h ago</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Grade scale updated</p>
                    <p className="text-xs text-muted-foreground">CBSE grading system configured</p>
                  </div>
                  <div className="text-xs text-muted-foreground">1d ago</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 