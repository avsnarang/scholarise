"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
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
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAssessmentSchemas } from "@/hooks/useAssessmentSchemas";
import { useExaminationAutoRefresh } from "@/hooks/useExaminationRefresh";
import { ExaminationNav } from "@/components/examination-nav";

function ExaminationDashboardContent() {
  const { currentBranchId } = useBranchContext();
  
  // Auto-refresh examination data for live updates
  useExaminationAutoRefresh({
    interval: 30000, // Refresh every 30 seconds
    onFocus: true,
    enabled: true
  });
  
  // Fetch assessment schemas data
  const { schemas, isLoading: schemasLoading } = useAssessmentSchemas();
  
  // Fetch grade scales for dashboard
  const { data: gradeScales } = api.examination.getGradeScales.useQuery({ 
    branchId: currentBranchId || undefined,
    isActive: true 
  });

  // Calculate assessment metrics
  const totalSchemas = schemas?.length || 0;
  const publishedSchemas = schemas?.filter((schema: any) => schema.isPublished)?.length || 0;
  const draftSchemas = schemas?.filter((schema: any) => !schema.isPublished)?.length || 0;
  const schemasWithScores = schemas?.filter((schema: any) => schema._count?.studentAssessmentScores > 0)?.length || 0;
  
  // Calculate additional metrics
  const activeSchemas = schemas?.filter((schema: any) => schema.isActive && schema.isPublished)?.length || 0;
  const totalScoresRecorded = schemas?.reduce((total: number, schema: any) => {
    return total + (schema._count?.studentAssessmentScores || 0);
  }, 0) || 0;

  // Calculate completion rate for assessment schemas
  const assessmentCompletionRate = totalSchemas > 0 ? Math.round((schemasWithScores / totalSchemas) * 100) : 0;

  // Grade scale metrics
  const totalGradeScales = gradeScales?.length || 0;
  const defaultGradeScale = gradeScales?.find(scale => scale.isDefault);

  // Simplified stats for minimal design
  const stats = [
    {
      title: "Total Schemas",
      value: totalSchemas,
      description: `${publishedSchemas} published, ${draftSchemas} draft`,
      icon: BookOpen,
      trend: 5, // Placeholder trend data
      footerIcon: BookOpen,
      footerTitle: "Assessment Schemas",
      footerDescription: "All created assessment frameworks"
    },
    {
      title: "Active Assessments",
      value: activeSchemas,
      description: "Currently accepting scores",
      icon: ClipboardCheck,
      trend: 12,
      footerIcon: ClipboardCheck,
      footerTitle: "Active Assessments",
      footerDescription: totalSchemas > 0 
        ? `${Math.round((activeSchemas / totalSchemas) * 100)}% of total schemas`
        : "No active assessments"
    },
    {
      title: "Student Scores",
      value: totalScoresRecorded,
      description: `Across ${schemasWithScores} assessments`,
      icon: BarChart3,
      trend: 8,
      footerIcon: BarChart3,
      footerTitle: "Score Entries",
      footerDescription: schemasWithScores > 0 
        ? `Data recorded for ${schemasWithScores} assessments`
        : "No scores recorded yet"
    },
    {
      title: "Grade Scales",
      value: totalGradeScales,
      description: defaultGradeScale ? `Default: ${defaultGradeScale.name}` : "Setup required",
      icon: Award,
      trend: 0,
      footerIcon: Award,
      footerTitle: "Grading Systems",
      footerDescription: defaultGradeScale 
        ? `Using ${defaultGradeScale.name} as default`
        : "Configure grading scales"
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
    <div className="space-y-6 @container/main">
      {/* Simple Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Assessment Center</h1>
        <p className="text-muted-foreground">
          Manage assessments, scoring, and results
        </p>
      </div>

      {/* Overview Cards */}
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {stats.map((stat) => {
          const FooterIcon = stat.footerIcon;
          return (
            <Card key={stat.title} className="@container/card">
              <CardHeader>
                <CardDescription>{stat.title}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {stat.value.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline" className={stat.trend >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
                    {stat.trend >= 0 ? (
                      <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
                    ) : (
                      <IconTrendingDown className="text-[#A65A20]" />
                    )}
                    {stat.trend >= 0 ? "+" : ""}{stat.trend}%
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  <FooterIcon className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
                  {stat.footerTitle}
                </div>
                <div className="text-muted-foreground">
                  {stat.footerDescription}
                </div>
              </CardFooter>
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
                        schema.isPublished ? 'bg-green-500' : 'bg-yellow-500'
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
// Dynamically import to disable SSR completely
const DynamicExaminationDashboardContent = dynamic(() => Promise.resolve(ExaminationDashboardContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ExaminationDashboardPage() {
  return <DynamicExaminationDashboardContent />;
} 