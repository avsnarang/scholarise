"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  ClipboardList, 
  Users, 
  BookOpen, 
  TrendingUp, 
  FileText,
  Plus,
  Eye
} from "lucide-react";
import { api } from "@/utils/api";

export default function ExaminationDashboard() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // Fetch data for dashboard
  const { data: examTypes } = api.examination.getExamTypes.useQuery();
  const { data: examConfigs } = api.examination.getExamConfigurations.useQuery();
  const { data: examSchedules } = api.examination.getExamSchedules.useQuery();
  const { data: assessmentCategories } = api.examination.getAssessmentCategories.useQuery();

  const stats = [
    {
      title: "Active Exam Types",
      value: examTypes?.filter((et: any) => et.isActive).length || 0,
      description: "Currently configured exam types",
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Exam Configurations",
      value: examConfigs?.filter((ec: any) => ec.isActive).length || 0,
      description: "Configured exams for classes",
      icon: ClipboardList,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Scheduled Exams",
      value: examSchedules?.filter((es: any) => es.isActive).length || 0,
      description: "Upcoming exam schedules",
      icon: CalendarDays,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Assessment Categories",
      value: assessmentCategories?.filter((ac: any) => ac.isActive).length || 0,
      description: "Active assessment types",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  const quickActions = [
    {
      title: "Create Exam Type",
      description: "Add a new exam type (Unit Test, Mid Term, etc.)",
      href: "/examination/exam-types",
      icon: Plus,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Configure Exam",
      description: "Set up exam for a class and subject",
      href: "/examination/exam-config",
      icon: ClipboardList,
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      title: "Create Schedule",
      description: "Schedule exams with date and time",
      href: "/examination/schedule",
      icon: CalendarDays,
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      title: "Enter Marks",
      description: "Enter exam marks for students",
      href: "/examination/marks-entry",
      icon: FileText,
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ];

  const recentActivities = [
    {
      type: "exam_created",
      title: "Math Unit Test 1 configured for Class 10-A",
      time: "2 hours ago",
      status: "success",
    },
    {
      type: "schedule_created",
      title: "Science Mid Term scheduled for Dec 15, 2024",
      time: "4 hours ago",
      status: "info",
    },
    {
      type: "marks_entered",
      title: "English marks entered for Class 9-B",
      time: "1 day ago",
      status: "success",
    },
    {
      type: "assessment_created",
      title: "Debate Competition assessment configured",
      time: "2 days ago",
      status: "info",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Examination Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage exams, assessments, and academic evaluations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common examination management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2 w-full"
                  >
                    <div className={`p-2 rounded-lg text-white ${action.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-gray-500">{action.description}</div>
                    </div>
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities and Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest examination-related activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/examination/reports">
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View All Activities
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Exams</CardTitle>
            <CardDescription>
              Scheduled exams for the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examSchedules?.slice(0, 4).map((schedule: any) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">
                      {schedule.examConfig.subject.name} - {schedule.examType.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {schedule.examConfig.class.name}
                      {schedule.examConfig.section && ` - ${schedule.examConfig.section.name}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(schedule.examDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {new Date(schedule.startTime).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/examination/schedule">
                <Button variant="outline" size="sm" className="w-full">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  View All Schedules
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 