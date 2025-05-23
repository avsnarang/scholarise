"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Users, 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Clock,
  ArrowUpCircle,
  ArrowDownCircle
} from "lucide-react";
import { 
  BarChart as BarChartComponent,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format, subDays } from "date-fns";

export default function AdmissionsDashboard() {
  const { currentBranchId } = useBranchContext();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  // Fetch admission stats
  const { data: stats, isLoading: isLoadingStats } = api.admission.getAdmissionStats.useQuery(
    {
      branchId: currentBranchId ?? undefined,
      fromDate: dateRange.from,
      toDate: dateRange.to,
    },
    {
      enabled: !!currentBranchId,
      refetchOnWindowFocus: false,
    }
  );

  // Mock data for charts - in a real implementation, these would come from API
  const leadStatusData = [
    { name: "New", value: stats?.newLeads || 0, color: "#4361ee" },
    { name: "In Progress", value: stats?.inProgressLeads || 0, color: "#3a86ff" },
    { name: "Completed", value: stats?.completedLeads || 0, color: "#4cc9f0" },
  ];

  const applicationStatusData = [
    { name: "Pending", value: stats?.pendingApplications || 0, color: "#fcbf49" },
    { name: "Accepted", value: stats?.acceptedApplications || 0, color: "#06d6a0" },
    { name: "Rejected", value: stats?.rejectedApplications || 0, color: "#ef476f" },
  ];

  // Sample time series data - would come from API in real app
  const leadsByTimeData = [
    { name: "Week 1", leads: 15, applications: 8 },
    { name: "Week 2", leads: 20, applications: 12 },
    { name: "Week 3", leads: 25, applications: 15 },
    { name: "Week 4", leads: 18, applications: 10 },
  ];

  // Stat cards for the dashboard
  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon, 
    trend = 0,
    loading = false
  }: { 
    title: string, 
    value: number | string, 
    description?: string, 
    icon: React.ReactNode,
    trend?: number,
    loading?: boolean
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-[100px] mb-1" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend !== 0 && (
          <div className={`flex items-center text-xs mt-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? (
              <ArrowUpCircle className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownCircle className="h-3 w-3 mr-1" />
            )}
            <span>{Math.abs(trend)}% from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Handle date range change with type conversion
  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
    }
  };

  return (
    <div className="space-y-6">
      {/* Period selector and date range */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <Tabs 
          defaultValue="month"
          value={period}
          onValueChange={(value) => setPeriod(value as any)}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <DatePickerWithRange 
          date={{
            from: dateRange.from,
            to: dateRange.to
          }}
          onDateChange={handleDateRangeChange}
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads || 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          loading={isLoadingStats}
          trend={5}
        />
        <StatCard
          title="Total Applications"
          value={stats?.totalApplications || 0}
          icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
          loading={isLoadingStats}
          trend={8}
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats?.conversionRate || 0}%`}
          icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
          description="Leads to enrollments"
          loading={isLoadingStats}
          trend={2}
        />
        <StatCard
          title="Avg. Decision Time"
          value="6 days"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Application to decision"
          loading={isLoadingStats}
          trend={-3}
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Status</CardTitle>
            <CardDescription>Distribution of leads by status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {leadStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} leads`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Distribution of applications by status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={applicationStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {applicationStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} applications`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time series chart for leads and applications */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Leads & Applications Over Time</CardTitle>
            <CardDescription>Tracking admissions activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChartComponent
                    data={leadsByTimeData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads" fill="#4361ee" name="Leads" />
                    <Bar dataKey="applications" fill="#06d6a0" name="Applications" />
                  </BarChartComponent>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 