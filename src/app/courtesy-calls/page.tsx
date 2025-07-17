"use client";

import React, { useState, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Filter,
  Download,
  Loader2,
  Eye,
  EyeOff,
  School,
  UserCheck,
  Clock,
} from "lucide-react";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";
import { LineChart } from "@/components/LineChart";
import VerticalBarChart from "@/components/ui/vertical-bar-chart";
import { AreaChart } from "@/components/ui/area-chart";
import { format, subDays } from "date-fns";
import { type DateRange } from "react-day-picker";

const TIME_PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom Range" },
];

export default function CourtesyCallsDashboardPage() {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { can } = usePermissions();

  // State for filters
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Check permissions
  const canViewDashboard = can(Permission.VIEW_COURTESY_CALLS_DASHBOARD);

  // Get analytics parameters
  const getAnalyticsParams = () => {
    if (selectedPeriod === "custom" && dateRange?.from && dateRange?.to) {
      return {
        startDate: dateRange.from,
        endDate: dateRange.to,
      };
    } else if (selectedPeriod !== "custom") {
      return {
        days: parseInt(selectedPeriod),
      };
    }
    return {
      days: 30, // fallback
    };
  };

  // Fetch classes for filtering
  const { data: sectionsData } = api.section.getAll.useQuery(
    {
      includeClass: true,
      isActive: true,
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Process classes data
  const classes = useMemo(() => {
    if (!sectionsData) return [];
    const classMap = new Map();
    sectionsData.forEach((section) => {
      if (section.class) {
        classMap.set(section.class.id, section.class);
      }
    });
    return Array.from(classMap.values()).sort((a, b) => {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  }, [sectionsData]);

  // Fetch dashboard analytics
  const {
    data: analyticsData,
    isLoading,
    isFetching,
    error,
  } = api.courtesyCalls.getDashboardAnalytics.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
      classId: selectedClassId || undefined,
      ...getAnalyticsParams(),
    },
    {
      enabled: !!currentBranchId && canViewDashboard,
      refetchOnWindowFocus: false,
    }
  );

  // Loading skeletons
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );

  // Individual stat card component with loading state
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    subtitle, 
    trend, 
    isPositiveTrend,
    isUpdating 
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle: string;
    trend?: number;
    isPositiveTrend?: boolean;
    isUpdating?: boolean;
  }) => (
    <Card className="relative">
      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center z-10">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground">
          {trend !== undefined && (
            <>
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(trend)}% from last period
            </>
          )}
          {trend === undefined && subtitle}
        </div>
      </CardContent>
    </Card>
  );

  // Access control
  if (!canViewDashboard) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <EyeOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              You don't have permission to view the courtesy calls dashboard.
              Please contact your administrator.
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Handle filter changes
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setShowCustomDates(value === "custom");
  };

  const handleClassChange = (value: string) => {
    setSelectedClassId(value === "all" ? "" : value);
  };

  // Calculate period label for display
  const getPeriodLabel = () => {
    if (selectedPeriod === "custom" && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`;
    }
    return TIME_PERIODS.find(p => p.value === selectedPeriod)?.label || "Last 30 days";
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Courtesy Calls Dashboard</h1>
            <p className="text-muted-foreground">
              Analytics and insights for courtesy call feedback
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Badge>
            {analyticsData && (
              <Badge variant="secondary" className="text-sm">
                {getPeriodLabel()}
              </Badge>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Period</label>
                <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showCustomDates && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <DatePickerWithRange
                    date={dateRange || { from: undefined, to: undefined }}
                    onDateChange={setDateRange}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Class Filter</label>
                <Select value={selectedClassId || "all"} onValueChange={handleClassChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
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

        {/* Loading State - Only show full skeleton on initial load */}
        {isLoading && <LoadingSkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Activity className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
                <p className="text-muted-foreground">
                  {error.message || "Failed to load dashboard data"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content - Show even during refetch, just update stat cards */}
        {(analyticsData || (!isLoading && !error)) && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Feedback"
                  value={analyticsData?.summary.totalFeedback || 0}
                  icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                  subtitle=""
                  trend={analyticsData?.summary.growthRate}
                  isPositiveTrend={(analyticsData?.summary.growthRate ?? 0) >= 0}
                  isUpdating={isFetching && !isLoading}
                />

                <StatCard
                  title="Teacher Feedback"
                  value={analyticsData?.summary.teacherFeedback || 0}
                  icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
                  subtitle={`${(analyticsData?.summary.totalFeedback || 0) > 0 
                    ? Math.round(((analyticsData?.summary.teacherFeedback || 0) / (analyticsData?.summary.totalFeedback || 1)) * 100)
                    : 0}% of total feedback`}
                  isUpdating={isFetching && !isLoading}
                />

                <StatCard
                  title="Head Feedback"
                  value={analyticsData?.summary.headFeedback || 0}
                  icon={<School className="h-4 w-4 text-muted-foreground" />}
                  subtitle={`${(analyticsData?.summary.totalFeedback || 0) > 0 
                    ? Math.round(((analyticsData?.summary.headFeedback || 0) / (analyticsData?.summary.totalFeedback || 1)) * 100)
                    : 0}% of total feedback`}
                  isUpdating={isFetching && !isLoading}
                />

                <StatCard
                  title="Students Contacted"
                  value={analyticsData?.summary.uniqueStudents || 0}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                  subtitle={`Avg ${analyticsData?.summary.avgFeedbackPerStudent || 0} feedback per student`}
                  isUpdating={isFetching && !isLoading}
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feedback by Type Chart */}
                {(analyticsData?.charts?.feedbackByType?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Feedback Distribution</CardTitle>
                      <CardDescription>
                        Breakdown by caller type
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <VerticalBarChart
                          data={analyticsData?.charts?.feedbackByType || []}
                          title=""
                          metricLabel="Feedback Count"
                          valueFormatter={(value) => value.toString()}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Class-wise Distribution */}
                {(analyticsData?.charts?.classWiseDistribution?.length || 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Classes by Feedback</CardTitle>
                      <CardDescription>
                        Classes with most courtesy call feedback
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <VerticalBarChart
                          data={(analyticsData?.charts?.classWiseDistribution || []).map(item => ({
                            name: item.name,
                            value: item.count,
                          }))}
                          title=""
                          metricLabel="Feedback Count"
                          valueFormatter={(value) => value.toString()}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              {/* Daily Trends Line Chart */}
              {(analyticsData?.charts?.dailyTrends?.length || 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Feedback Trends Over Time</CardTitle>
                    <CardDescription>
                      Daily courtesy call feedback activity by caller type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <LineChart
                        data={analyticsData?.charts?.dailyTrends || []}
                        index="date"
                        categories={["Teacher", "Head", "Total"]}
                        colors={["blue", "green", "purple"]}
                        valueFormatter={(value) => value.toString()}
                        yAxisWidth={50}
                        showLegend={true}
                        className="h-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Volume Trends */}
              {(analyticsData?.charts?.dailyTrends?.length || 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Volume Trends</CardTitle>
                    <CardDescription>
                      Total feedback volume over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <AreaChart
                        data={analyticsData?.charts?.dailyTrends || []}
                        index="date"
                        categories={["Total"]}
                        colors={["#3b82f6"]}
                        valueFormatter={(value) => value.toString()}
                        showAnimation={true}
                        className="h-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest courtesy call feedback entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(analyticsData?.recentActivity || []).map((activity, index) => (
                      <div
                        key={activity.id}
                        className="flex items-start justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{activity.studentName}</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.className}
                            </Badge>
                            <Badge
                              variant={activity.callerType === "TEACHER" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {activity.callerType === "TEACHER" ? "Teacher" : "Head"}
                            </Badge>
                            {activity.isPrivate && (
                              <Badge variant="destructive" className="text-xs">
                                Private
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            by {activity.callerName}
                          </p>
                          <p className="text-sm line-clamp-2">
                            {activity.feedback}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground ml-4">
                          {format(new Date(activity.callDate), "MMM dd, h:mm a")}
                        </div>
                      </div>
                    ))}
                    
                    {(analyticsData?.recentActivity?.length || 0) === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent activity found for the selected period.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageWrapper>
  );
} 