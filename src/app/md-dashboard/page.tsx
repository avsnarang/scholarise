"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, CardAction } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { 
  GraduationCap, 
  Users, 
  DollarSign, 
  Building2,
  UserCheck,
  UserX,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  School,
  Clock,
  Target,
  BookOpen,
  CreditCard,
  UserPlus,
  BarChart3,
  Activity,
  Loader2
} from "lucide-react";
import { formatIndianCurrency, formatIndianNumber } from "@/lib/utils";
import { FeeCollectionLineChart } from "@/components/ui/fee-collection-line-chart";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";
import { LoadingSkeleton } from "@/components/dashboard/shared-components";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Stats Card Component using the same design as StudentStatsCards
function MDStatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  loading = false, 
  trend, 
  color = "text-[#00501B]" 
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: number;
  color?: string;
}) {
  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {typeof value === 'number' ? formatIndianNumber(value) : value}
        </CardTitle>
        {trend !== undefined && (
          <CardAction>
            <Badge variant="outline" className={trend >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {trend >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {trend >= 0 ? "+" : ""}{trend}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          <div className={`${color}`}>{icon}</div>
          {description}
        </div>
      </CardFooter>
    </Card>
  );
}

function MDDashboardContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all branches stats
  const { data: branchesStats, isLoading: isLoadingBranches } = api.dashboard.getAllBranchesStats.useQuery();

  // Fetch student stats
  const { data: studentStats, isLoading: isLoadingStudents } = api.student.getStats.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined
  });

  // Fetch finance analytics
  const { data: financeAnalytics, isLoading: isLoadingFinance } = api.finance.getFeeCollectionAnalytics.useQuery(
    {
      branchId: currentBranchId || '',
      sessionId: currentSessionId || '',
      days: 30,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch admissions stats
  const { data: admissionStats, isLoading: isLoadingAdmissions } = api.admissions.getDashboardStats.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch transportation stats
  const { data: transportStats, isLoading: isLoadingTransport } = api.transportation.getDashboardStats.useQuery(
    {
      branchId: currentBranchId || '',
      sessionId: currentSessionId || '',
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const isLoading = isLoadingBranches || isLoadingStudents || isLoadingFinance || isLoadingAdmissions;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Calculate aggregated stats
  const totalStudents = branchesStats?.totalStudents || 0;
  const activeStudents = branchesStats?.activeStudents || 0;
  const totalStaff = (branchesStats?.totalTeachers || 0) + (branchesStats?.totalEmployees || 0);
  const totalRevenue = financeAnalytics?.totalCollected || 0;
  const averageAttendance = 88; // Static for now as mentioned in wireframe
  const netPromoterScore = 7.9; // Static for now

  // Prepare branch-wise data
  const branchWiseData = branchesStats?.studentsByBranch?.map(branch => {
    const staffData = branchesStats?.staffByBranch?.find(s => s.branchName === branch.branchName);
    return {
      branch: branch.branchName || 'Unknown',
      students: branch.totalStudents || 0,
      staff: (staffData?.teacherCount || 0) + (staffData?.employeeCount || 0),
      attendance: `${Math.floor(Math.random() * 10 + 85)}%`, // Mock data for now
      feeCollection: formatIndianCurrency(Math.floor(Math.random() * 500000 + 1000000))
    };
  }) || [];

  // Prepare admission funnel data
  const admissionFunnelData = [
    { stage: "Registrations", count: admissionStats?.totalInquiries || 0 },
    { stage: "Applications Completed", count: Math.floor((admissionStats?.totalInquiries || 0) * 0.8) },
    { stage: "Interviews Scheduled", count: admissionStats?.visitedInquiries || 0 },
    { stage: "Offers Given", count: Math.floor((admissionStats?.visitedInquiries || 0) * 0.7) },
    { stage: "Admissions Confirmed", count: admissionStats?.admittedInquiries || 0 }
  ];

  // Prepare fee collection chart data
  const feeCollectionChartData = financeAnalytics?.chartData || [];

  // Prepare staff distribution data
  const staffDistributionData = branchesStats?.staffByBranch?.map(branch => ({
    name: branch.branchName || 'Unknown',
    Teachers: branch.teacherCount || 0,
    Employees: branch.employeeCount || 0
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Level Metrics */}
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-6">
        <MDStatsCard
          title="Total Students Enrolled"
          value={totalStudents}
          description="All branches combined"
          icon={<GraduationCap className="size-4 text-[#00501B] dark:text-[#7AAD8B]" />}
          trend={5}
        />
        
        <MDStatsCard
          title="Active Students"
          value={activeStudents}
          description={`${Math.round((activeStudents / totalStudents) * 100)}% of total`}
          icon={<UserCheck className="size-4 text-[#00501B] dark:text-[#7AAD8B]" />}
          trend={3}
        />

        <MDStatsCard
          title="Monthly Fee Collection"
          value={formatIndianCurrency(totalRevenue)}
          description="Last 30 days"
          icon={<DollarSign className="size-4 text-[#00501B] dark:text-[#7AAD8B]" />}
          trend={8}
        />

        <MDStatsCard
          title="Average Attendance"
          value={`${averageAttendance}%`}
          description="Students & Staff"
          icon={<Clock className="size-4 text-[#00501B] dark:text-[#7AAD8B]" />}
          trend={-2}
        />

        <MDStatsCard
          title="Total Staff"
          value={totalStaff}
          description="Teachers & Employees"
          icon={<Users className="size-4 text-[#00501B] dark:text-[#7AAD8B]" />}
          trend={1}
        />

        <MDStatsCard
          title="Net Promoter Score"
          value={netPromoterScore}
          description="Parent satisfaction"
          icon={<Target className="size-4 text-[#00501B] dark:text-[#7AAD8B]" />}
          trend={4}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="staff">Staff & HR</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Branch-wise Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Branch-wise Summary</CardTitle>
              <CardDescription>Performance metrics across all branches</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Staff</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                    <TableHead className="text-right">Fee Collection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchWiseData.map((branch) => (
                    <TableRow key={branch.branch}>
                      <TableCell className="font-medium">{branch.branch}</TableCell>
                      <TableCell className="text-right">{formatIndianNumber(branch.students)}</TableCell>
                      <TableCell className="text-right">{branch.staff}</TableCell>
                      <TableCell className="text-right">{branch.attendance}</TableCell>
                      <TableCell className="text-right">{branch.feeCollection}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Staff Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Distribution</CardTitle>
                <CardDescription>Teachers and employees by branch</CardDescription>
              </CardHeader>
              <CardContent>
                <VerticalBarChart
                  data={staffDistributionData}
                  index="name"
                  categories={["Teachers", "Employees"]}
                  colors={["green", "amber"]}
                  valueFormatter={(value) => value.toString()}
                  className="h-64"
                />
              </CardContent>
            </Card>

            {/* Transport Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Transportation Overview</CardTitle>
                <CardDescription>Fleet and route statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Buses</span>
                  <span className="font-semibold">{transportStats?.buses?.active || 0} / {transportStats?.buses?.total || 0}</span>
                </div>
                <Progress value={((transportStats?.buses?.active || 0) / (transportStats?.buses?.total || 1)) * 100} />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Routes</span>
                  <span className="font-semibold">{transportStats?.routes?.active || 0} / {transportStats?.routes?.total || 0}</span>
                </div>
                <Progress value={((transportStats?.routes?.active || 0) / (transportStats?.routes?.total || 1)) * 100} />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Students Using Transport</span>
                  <span className="font-semibold">{transportStats?.students?.active || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Collection Analytics</CardTitle>
              <CardDescription>Daily collection trends and fee head breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <FeeCollectionLineChart />
            </CardContent>
          </Card>

          {/* Fee Collection Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatIndianCurrency(financeAnalytics?.totalDue || 0)}</div>
                <p className="text-xs text-muted-foreground">For current month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#00501B]">{formatIndianCurrency(financeAnalytics?.totalCollected || 0)}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financeAnalytics?.totalDue ? 
                    Math.round((financeAnalytics.totalCollected / financeAnalytics.totalDue) * 100) : 0}%
                </div>
                <Progress 
                  value={financeAnalytics?.totalDue ? 
                    (financeAnalytics.totalCollected / financeAnalytics.totalDue) * 100 : 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admissions Tab */}
        <TabsContent value="admissions" className="space-y-6">
          {/* Admissions Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Admissions Funnel</CardTitle>
              <CardDescription>Conversion tracking from inquiry to admission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {admissionFunnelData.map((stage, index) => {
                  const percentage = index === 0 ? 100 : 
                    Math.round((stage.count / (admissionFunnelData[0]?.count || 1)) * 100);
                  
                  return (
                    <div key={stage.stage} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{stage.stage}</span>
                        <span className="font-semibold">{stage.count} ({percentage}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Admission Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admissionStats?.newInquiries || 0}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Contacted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admissionStats?.contactedInquiries || 0}</div>
                <p className="text-xs text-muted-foreground">Follow-ups done</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">School Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admissionStats?.visitedInquiries || 0}</div>
                <p className="text-xs text-muted-foreground">Campus tours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admissionStats?.conversionRate || 0}%</div>
                <p className="text-xs text-muted-foreground">Inquiry to admission</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Staff & HR Tab */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff & HR Snapshot</CardTitle>
              <CardDescription>Comprehensive staff analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart
                data={staffDistributionData}
                index="name"
                categories={["Teachers", "Employees"]}
                colors={["green", "amber"]}
                valueFormatter={(value) => value.toString()}
                className="h-64"
              />
            </CardContent>
          </Card>

          {/* HR Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{branchesStats?.totalTeachers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active: {branchesStats?.activeTeachers || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{branchesStats?.totalEmployees || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active: {branchesStats?.activeEmployees || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Student-Teacher Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {branchesStats?.totalTeachers ? 
                    `${Math.round(totalStudents / branchesStats.totalTeachers)}:1` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Average across branches</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Low Attendance Alert</AlertTitle>
            <AlertDescription>
              Class 8B has attendance below 75% for the past week
            </AlertDescription>
          </Alert>

          <Alert>
            <TrendingDown className="h-4 w-4" />
            <AlertTitle>Fee Collection Drop</AlertTitle>
            <AlertDescription>
              Fee collection is down 15% compared to last month in Majra branch
            </AlertDescription>
          </Alert>

          <Alert>
            <UserX className="h-4 w-4" />
            <AlertTitle>Staff Shortage</AlertTitle>
            <AlertDescription>
              Mathematics department needs 2 more teachers across branches
            </AlertDescription>
          </Alert>

          <Alert className="border-[#00501B] text-[#00501B]">
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Positive Trend</AlertTitle>
            <AlertDescription>
              Admission inquiries up 25% compared to last month
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MDDashboardPage() {
  return <MDDashboardContent />;
}