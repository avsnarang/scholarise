"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusCircle, Users, FileText, CheckCircle, TrendingUp, TrendingDown,
  Calendar, Phone, MapPin, ClipboardCheck, Clock, 
  BarChart3, PieChart, UserCheck, AlertCircle, ArrowRight,
  UserPlus, Target, Activity, Bell, Settings
} from "lucide-react";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import Link from "next/link";
import React from "react"; // Added missing import for React

interface DashboardStats {
  totalInquiries: number;
  newInquiries: number;
  contactedInquiries: number;
  visitedInquiries: number;
  admittedInquiries: number;
  conversionRate: number;
}

const quickActions = [
  { title: "New Registration", href: "/admissions/register", icon: <UserPlus /> },
  { title: "View Inquiries", href: "/admissions/inquiries", icon: <Users /> },
  { title: "Staff Management", href: "/admissions/staff", icon: <UserCheck /> },
  { title: "Settings", href: "/admissions/settings", icon: <Settings /> },
];

export function EnhancedAdmissionsDashboard() {
  const router = useRouter();
  const { currentBranchId, currentBranch } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // API calls using the new simplified admission system
  const { data: stats, isLoading: statsLoading } = api.admissions.getDashboardStats.useQuery({
    fromDate: dateRange.from,
    toDate: dateRange.to,
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
  });

  const { data: recentActivity } = api.admissions.getRecentActivity.useQuery({
    limit: 10,
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
  });

  const dashboardStats: DashboardStats = {
    totalInquiries: stats?.totalInquiries || 0,
    newInquiries: stats?.newInquiries || 0,
    contactedInquiries: stats?.contactedInquiries || 0,
    visitedInquiries: stats?.visitedInquiries || 0,
    admittedInquiries: stats?.admittedInquiries || 0,
    conversionRate: stats?.conversionRate || 0,
  };

  // Calculate key metrics
  const metrics = [
    { 
      title: "Total Inquiries", 
      value: dashboardStats.totalInquiries.toString(), 
      icon: <Users className="h-6 w-6 text-blue-600" />, 
      trend: "+12%", 
      changeType: "increase" as const
    },
    { 
      title: "New Inquiries", 
      value: dashboardStats.newInquiries.toString(), 
      icon: <UserPlus className="h-6 w-6 text-green-600" />, 
      trend: "+8%", 
      changeType: "increase" as const
    },
    { 
      title: "Conversion Rate", 
      value: `${dashboardStats.conversionRate}%`, 
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />, 
      trend: dashboardStats.conversionRate > 15 ? "Good" : "Fair", 
      changeType: dashboardStats.conversionRate > 15 ? "increase" : "neutral" as const
    },
    { 
      title: "Admissions", 
      value: dashboardStats.admittedInquiries.toString(), 
      icon: <CheckCircle className="h-6 w-6 text-green-500" />, 
      footerText: "View Details" 
    },
  ];

  // Mock chart data for now
  const inquiryTrendsData = [
    { name: 'Jan', value: 45 },
    { name: 'Feb', value: 52 },
    { name: 'Mar', value: 38 },
    { name: 'Apr', value: 67 },
    { name: 'May', value: 72 },
    { name: 'Jun', value: 58 },
    { name: 'Jul', value: 83 },
  ];

  const statusDistribution = [
    { name: 'New', value: dashboardStats.newInquiries },
    { name: 'Contacted', value: dashboardStats.contactedInquiries },
    { name: 'Visited', value: dashboardStats.visitedInquiries },
    { name: 'Admitted', value: dashboardStats.admittedInquiries },
  ];

  const recentInquiries = recentActivity || [];

  return (
    <div className="w-full p-2">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admissions Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Comprehensive overview of admission inquiries and student registrations</p>
      </div>

      {/* Academic Session Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-auto">
          <div className="bg-blue-50 dark:bg-gray-800/30 rounded-lg px-4 py-3 border border-blue-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Academic Session</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              {currentBranch?.name || "All Branches"} • {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
                     <DatePickerWithRange
             date={dateRange}
             onDateChange={(range) => {
               if (range?.from && range?.to) {
                 setDateRange({ from: range.from, to: range.to });
               }
             }}
          />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.title} className="shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="uppercase tracking-wider text-xs">{metric.title}</CardDescription>
                {metric.icon}
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                    {metric.value}
                  </CardTitle>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              {metric.trend && (
                <Badge variant="outline"
                  className={`${metric.changeType === 'increase' ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-900/30' 
                                : metric.changeType === 'decrease' ? 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-700 dark:bg-red-900/30'
                                : 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:bg-blue-900/30'} px-2 py-0.5 text-xs`}>
                  {metric.changeType === 'increase' ? (
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  ) : metric.changeType === 'decrease' ? (
                    <TrendingDown className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Target className="h-3.5 w-3.5 mr-1" />
                  )}
                  {metric.trend}
                </Badge>
              )}
              {metric.footerText && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Link href="/admissions/inquiries" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                    {metric.footerText} <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link href={action.href} key={action.title} className="block bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 text-center group">
              <div className="flex justify-center mb-2">
                {React.cloneElement(action.icon, { className: 'h-7 w-7 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform' })}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-300">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts and Activity Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 md:max-w-md h-auto sm:h-12 bg-muted/30 dark:bg-gray-800/50 p-1 rounded-lg gap-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
            <Activity className="w-4 h-4 mr-2" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
            <PieChart className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Inquiry Trends</CardTitle>
                <CardDescription>Monthly inquiry submissions over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <VerticalBarChart
                    data={inquiryTrendsData}
                    index="name"
                    categories={["value"]}
                    colors={["blue"]}
                    valueFormatter={(value: number) => value.toString()}
                    className="h-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Status Breakdown</CardTitle>
                <CardDescription>Current inquiry status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          item.name === 'New' ? 'bg-blue-500' :
                          item.name === 'Contacted' ? 'bg-orange-500' :
                          item.name === 'Visited' ? 'bg-purple-500' : 'bg-green-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex justify-between items-center">
                Recent Inquiries
                <Link href="/admissions/inquiries" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </CardTitle>
              <CardDescription>Latest admission inquiries and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentInquiries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent inquiries found.</p>
                    <Link href="/admissions/register" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                      Create first inquiry
                    </Link>
                  </div>
                ) : (
                  recentInquiries.map((inquiry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{inquiry.studentName || `Student ${index + 1}`}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{inquiry.parentName || "Parent Name"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline"
                          className={
                            inquiry.status === 'NEW' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                            inquiry.status === 'CONTACTED' ? 'text-orange-600 border-orange-200 bg-orange-50' :
                            inquiry.status === 'VISITED' ? 'text-purple-600 border-purple-200 bg-purple-50' :
                            'text-green-600 border-green-200 bg-green-50'
                          }
                        >
                          {inquiry.status || 'NEW'}
                        </Badge>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(inquiry.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Conversion Rate
                </CardTitle>
                <CardDescription>Inquiry to admission conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {dashboardStats.conversionRate}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {dashboardStats.conversionRate > 15 ? 'Excellent' : 'Good'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Avg Response Time
                </CardTitle>
                <CardDescription>Time to first contact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    2.4h
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Average response time
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  Success Rate
                </CardTitle>
                <CardDescription>Visited to admitted ratio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {dashboardStats.visitedInquiries > 0 ? 
                      Math.round((dashboardStats.admittedInquiries / dashboardStats.visitedInquiries) * 100) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Visit conversion rate
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { EnhancedAdmissionsDashboard as AdmissionsDashboard }; 