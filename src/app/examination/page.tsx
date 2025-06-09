"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, 
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
  ArrowUpRight,
  ArrowDownRight,
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
  
  // Fetch additional data for dashboard
  const { data: examTypes } = api.examination.getExamTypes.useQuery({ 
    branchId: currentBranchId || undefined,
    isActive: true 
  });
  const { data: examConfigs } = api.examination.getExamConfigurations.useQuery({ 
    branchId: currentBranchId || undefined,
    isActive: true 
  });
  const { data: examSchedules } = api.examination.getExamSchedules.useQuery({ 
    branchId: currentBranchId || undefined,
    isActive: true 
  });
  const { data: assessmentCategories } = api.examination.getAssessmentCategories.useQuery({ 
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

  // Legacy exam metrics
  const totalExams = examConfigs?.length || 0;
  const scheduledExams = examSchedules?.filter(schedule => {
    const examDate = new Date(schedule.examDate);
    return examDate >= new Date();
  })?.length || 0;

  // Get upcoming exams (next 7 days)
  const upcomingExams = examSchedules?.filter(schedule => {
    const examDate = new Date(schedule.examDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return examDate >= today && examDate <= nextWeek;
  }).slice(0, 4) || [];

  // Enhanced stats with brand colors only - Assessment-focused
  const enhancedStats = [
    {
      title: "Assessment Schemas",
      value: totalSchemas,
      change: totalSchemas > 0 ? "+25%" : "0%",
      trend: "up" as const,
      description: "Active evaluation frameworks",
      icon: BookOpen,
      colorVariant: "primary" as const, // #00501B
      href: "/examination/assessment-schemas",
    },
    {
      title: "Published Schemas",
      value: publishedSchemas,
      change: publishedSchemas > 0 ? "+18%" : "0%",
      trend: "up" as const, 
      description: "Ready for score entry",
      icon: ClipboardCheck,
      colorVariant: "secondary" as const, // #A65A20
      href: "/examination/score-entry",
    },
    {
      title: "With Score Data",
      value: schemasWithScores,
      change: schemasWithScores > 0 ? "+22%" : "0%",
      trend: "up" as const,
      description: "Schemas with student scores",
      icon: BarChart3,
      colorVariant: "primary" as const, // #00501B
      href: "/examination/results-dashboard",
    },
    {
      title: "Draft Schemas",
      value: draftSchemas,
      change: draftSchemas > 0 ? "+5%" : "0%",
      trend: "up" as const,
      description: "Under development",
      icon: Award,
      colorVariant: "secondary" as const, // #A65A20
      href: "/examination/grade-scales",
    },
  ];

  // Modern quick actions with brand colors - Assessment-focused
  const quickActions = [
    {
      title: "Create Assessment Schema",
      description: "Build evaluation frameworks",
      href: "/examination/assessment-schemas",
      icon: Plus,
      colorVariant: "primary" as const,
      badge: "Primary",
    },
    {
      title: "Enter Scores",
      description: "Input student assessment scores",
      href: "/examination/score-entry",
      icon: ClipboardList,
      colorVariant: "secondary" as const,
      badge: "Active",
    },
    {
      title: "View Results",
      description: "Analytics & performance insights",
      href: "/examination/results-dashboard",
      icon: BarChart3,
      colorVariant: "primary" as const,
      badge: "Insights",
    },
    {
      title: "Grade Configuration",
      description: "Setup grading scales",
      href: "/examination/grade-scales",
      icon: Award,
      colorVariant: "secondary" as const,
      badge: "Essential",
    },
    {
      title: "Schedule Exams", 
      description: "Plan examination dates",
      href: "/examination/schedule",
      icon: CalendarDays,
      colorVariant: "primary" as const,
      badge: "Planning",
    },
    {
      title: "Traditional Exams",
      description: "Legacy examination system",
      href: "/examination/traditional",
      icon: FileText,
      colorVariant: "secondary" as const,
      badge: "Legacy",
    },
  ];

  // Enhanced activity feed - Assessment-focused
  const recentActivities = [
    {
      id: 1,
      type: "schema_created",
      title: "Math Term-1 Assessment Schema created",
      subtitle: "Components: PT + MA + SE + Portfolio + Main Exam",
      time: "2 hours ago",
      status: "success",
      icon: BookOpen,
      avatar: "MT",
    },
    {
      id: 2,
      type: "scores_entered",
      title: "Science Assessment scores entered",
      subtitle: "Class 10-A • 28/30 students completed",
      time: "4 hours ago", 
      status: "info",
      icon: ClipboardList,
      avatar: "SA",
    },
    {
      id: 3,
      type: "results_generated",
      title: "English Term-1 results processed",
      subtitle: "Grade distribution: A(8), B(15), C(5), D(2)",
      time: "1 day ago",
      status: "success",
      icon: CheckCircle2,
      avatar: "EM",
    },
    {
      id: 4,
      type: "assessment",
      title: "Project submission due",
      subtitle: "Computer Science • 15 pending",
      time: "2 days ago",
      status: "warning",
      icon: AlertCircle,
      avatar: "PS",
    },
  ];

  const getColorClasses = (variant: "primary" | "secondary") => {
    if (variant === "primary") {
      return {
        bg: "bg-[#00501B]",
        bgLight: "bg-[#00501B]/10",
        bgHover: "hover:bg-[#00501B]/20",
        text: "text-[#00501B]",
        border: "border-[#00501B]/20",
        gradient: "from-[#00501B] to-[#00501B]/80",
      };
    } else {
      return {
        bg: "bg-[#A65A20]",
        bgLight: "bg-[#A65A20]/10",
        bgHover: "hover:bg-[#A65A20]/20",
        text: "text-[#A65A20]",
        border: "border-[#A65A20]/20",
        gradient: "from-[#A65A20] to-[#A65A20]/80",
      };
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Enhanced Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00501B] to-[#A65A20]">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Assessment & Examination Hub</h1>
                <p className="text-muted-foreground">
                  Modern assessment engine with comprehensive evaluation frameworks
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20">
              <Activity className="mr-1.5 h-3 w-3" />
              Live
            </Badge>
            <Button size="sm" className="bg-gradient-to-r from-[#00501B] to-[#A65A20] hover:from-[#00501B]/90 hover:to-[#A65A20]/90">
              <Sparkles className="mr-2 h-4 w-4" />
              Quick Setup
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="border-0 bg-gradient-to-r from-[#00501B]/5 to-[#A65A20]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Assessment Implementation Progress</p>
                <div className="flex items-center gap-4">
                  <Progress value={assessmentCompletionRate} className="w-48" />
                  <span className="text-sm font-medium">{assessmentCompletionRate}% Complete</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalSchemas} assessment schemas • {schemasWithScores} with score data
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{publishedSchemas}</p>
                <p className="text-sm text-muted-foreground">Published schemas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <ExaminationNav />

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {enhancedStats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.trend === "up";
          const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
          const colors = getColorClasses(stat.colorVariant);
          
          return (
            <Card key={stat.title} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <Link href={stat.href} className="absolute inset-0 z-10" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isPositive ? 'bg-[#00501B]/10 text-[#00501B]' : 'bg-red-50 text-red-600'
                      }`}>
                        <TrendIcon className="h-3 w-3" />
                        {stat.change}
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    </div>
                  </div>
                  <div className={`rounded-2xl p-3 bg-gradient-to-br ${colors.gradient} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#00501B]" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common assessment and evaluation tasks
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const colors = getColorClasses(action.colorVariant);
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-xl p-3 text-white shadow-lg bg-gradient-to-br ${colors.gradient} group-hover:scale-110 transition-transform`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{action.title}</p>
                            <Badge variant="secondary" className="text-xs">
                              {action.badge}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Performance Metrics */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-[#00501B]" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assessment Completion</span>
                    <span className="text-sm font-medium">{assessmentCompletionRate}%</span>
                  </div>
                  <Progress value={assessmentCompletionRate} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Student Participation</span>
                    <span className="text-sm font-medium">87%</span>
                  </div>
                  <Progress value={87} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Marks Entry</span>
                    <span className="text-sm font-medium">73%</span>
                  </div>
                  <Progress value={73} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Assessment Schemas */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-[#00501B]" />
                  Assessment Schemas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schemas?.slice(0, 4).map((schema: any) => (
                  <div key={schema.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${schema.status === 'PUBLISHED' ? 'bg-[#00501B]' : 'bg-[#A65A20]'}`} />
                      <span className="font-medium">{schema.name}</span>
                    </div>
                    <Badge variant="outline">{schema.term}</Badge>
                  </div>
                ))}
                {(!schemas || schemas.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No assessment schemas created</p>
                    <Button asChild className="mt-3" size="sm">
                      <Link href="/examination/assessment-schemas">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Schema
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#00501B]" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-[#00501B]/10">
                    <div className="text-2xl font-bold text-[#00501B]">{totalSchemas}</div>
                    <div className="text-xs text-[#00501B]">Total Schemas</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[#A65A20]/10">
                    <div className="text-2xl font-bold text-[#A65A20]">{publishedSchemas}</div>
                    <div className="text-xs text-[#A65A20]">Published</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[#00501B]/10">
                    <div className="text-2xl font-bold text-[#00501B]">{draftSchemas}</div>
                    <div className="text-xs text-[#00501B]">In Draft</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[#A65A20]/10">
                    <div className="text-2xl font-bold text-[#A65A20]">{schemasWithScores}</div>
                    <div className="text-xs text-[#A65A20]">With Scores</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#00501B]" />
                Upcoming Exams
              </CardTitle>
              <CardDescription>
                Scheduled exams for the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingExams.length > 0 ? (
                  upcomingExams.map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00501B]/10">
                        <Calendar className="h-6 w-6 text-[#00501B]" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{schedule.examConfig.subject.name}</h3>
                          <Badge variant="outline">{schedule.examType.name}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {schedule.examConfig.class.name}
                          {schedule.examConfig.section && ` - ${schedule.examConfig.section.name}`}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(schedule.examDate).toLocaleDateString()} at{" "}
                            {new Date(schedule.startTime).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          {schedule.room && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {schedule.room}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-muted-foreground mb-2">No upcoming exams</h3>
                    <p className="text-sm text-muted-foreground mb-4">Schedule some exams to see them here</p>
                    <Button asChild className="bg-[#00501B] hover:bg-[#00501B]/90">
                      <Link href="/examination/schedule">
                        <Plus className="mr-2 h-4 w-4" />
                        Schedule Exam
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#00501B]" />
                Recent Activities
              </CardTitle>
              <CardDescription>
                Latest examination-related activities and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  const statusColors = {
                    success: "bg-[#00501B]/10 text-[#00501B] border-[#00501B]/20",
                    info: "bg-[#A65A20]/10 text-[#A65A20] border-[#A65A20]/20", 
                    warning: "bg-orange-100 text-orange-600 border-orange-200",
                  };
                  
                  return (
                    <div key={activity.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${statusColors[activity.status as keyof typeof statusColors]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{activity.title}</h3>
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {activity.avatar}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <Button variant="outline" asChild>
                  <Link href="/examination/reports">
                    <Eye className="mr-2 h-4 w-4" />
                    View All Activities
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 