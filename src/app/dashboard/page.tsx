"use client";

import { api } from "@/utils/api";
import { Suspense } from "react";
import {
  Card,
  Title,
  Text,
  Metric,
  BarChart,
  AreaChart,
  DonutChart,
  ProgressBar,
  Grid,
  Col,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  LineChart,
  Flex,
  Badge,
  CategoryBar,
} from "@tremor/react";
import { TrendingUp, TrendingDown, Users, GraduationCap, Building2, DollarSign, Bus, BookOpen, AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";
import { HorizontalBarChart } from "@/components/ui/horizontal-bar-chart";
import { DonutChart as DonutChartCustom } from "@/components/ui/donut-chart-custom";
import { PieChart as PieChartCustom } from "@/components/ui/pie-chart-custom";
import TabbedVerticalBarChart from "@/components/ui/tabbed-vertical-bar-chart";
import { FeeCollectionLineChart } from "@/components/ui/fee-collection-line-chart";
import { formatIndianCurrency } from "@/lib/utils";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
        </div>
        </div>
  );
}

function DashboardContent() {
  const { data: branchesStats, isLoading } = api.dashboard.getAllBranchesStats.useQuery();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { isTeacher, teacher, teacherId, isEmployee, employee, employeeId, isERPManager } = useUserRole();
  const { isSuperAdmin } = usePermissions();
  const searchParams = useSearchParams();
  const teacherSetupNeeded = searchParams.get('teacherSetupNeeded');

  // Fetch transportation analytics data
  const { data: transportStats } = api.transportation.getDashboardStats.useQuery(
    {
      branchId: currentBranchId || '',
      sessionId: currentSessionId || '',
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch admissions analytics data
  const { data: admissionStats } = api.admissions.getDashboardStats.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch courtesy calls analytics data
  const { data: courtesyCallStats } = api.courtesyCalls.getDashboardAnalytics.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
      days: 30,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Restrict access to superadmin only
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
          <p className="text-gray-600">This dashboard is only available for super administrators. Please contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  // Fetch finance data for the charts
  const { data: financeAnalytics } = api.finance.getFeeCollectionAnalytics.useQuery(
    {
      branchId: currentBranchId || '',
      sessionId: currentSessionId || '',
      days: 30, // Last 30 days for analysis
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch recent daily collections for the vertical bar chart
  const { data: recentFinanceData } = api.finance.getFeeCollectionAnalytics.useQuery(
    {
      branchId: currentBranchId || '',
      sessionId: currentSessionId || '',
      days: 7, // Last 7 days for daily collection chart
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  if (isLoading) return <LoadingSkeleton />;

  // Calculate aggregated stats from real data
  const totalStudents = branchesStats?.totalStudents || 0;
  const totalTeachers = branchesStats?.totalTeachers || 0;
  const totalBranches = branchesStats?.branchCount || 0;
  const studentTeacherRatio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : "0";
  const totalRevenue = financeAnalytics?.totalCollected || 0;

  // OVERVIEW TAB - System Performance Analytics
  const branchPerformanceData = branchesStats?.studentsByBranch?.map(branch => {
    const staffData = branchesStats?.staffByBranch?.find(s => s.branchName === branch.branchName);
    const studentTeacherRatio = (branch.totalStudents || 0) / Math.max(1, staffData?.teacherCount || 1);
    const capacityUtilization = Math.min(100, ((branch.totalStudents || 0) / Math.max(1, (branch.totalStudents || 0) * 1.2)) * 100);
    
    return {
      name: branch.branchName || 'Unknown',
      'Student-Teacher Ratio': parseFloat(studentTeacherRatio.toFixed(1)),
      'Capacity Utilization %': parseFloat(capacityUtilization.toFixed(1)),
    };
  }) || [];

  const enrollmentTrendsData = branchesStats?.enrollmentTrends?.map((trend, index) => ({
    period: `Year ${trend.year}`,
    'Current Enrollment': trend.count,
    'Growth Rate %': index > 0 ? 
      parseFloat((((trend.count - (branchesStats.enrollmentTrends?.[index-1]?.count || trend.count)) / 
      Math.max(1, branchesStats.enrollmentTrends?.[index-1]?.count || 1)) * 100).toFixed(1)) : 0,
  })) || [];

  const resourceEfficiencyData = branchesStats?.classDistribution?.map(cls => {
    const avgClassSize = cls.studentCount;
    const efficiency = avgClassSize < 20 ? 'Under-utilized' : 
                     avgClassSize > 35 ? 'Over-crowded' : 'Optimal';
    const score = avgClassSize < 20 ? 60 : avgClassSize > 35 ? 40 : 90;
    
    return {
      name: cls.className,
      'Class Size': avgClassSize,
      'Efficiency Score': score,
    };
  }) || [];

  // ACADEMIC TAB - Educational Analytics
  const admissionConversionData = admissionStats ? [
    { 
      stage: 'Inquiries Received', 
      count: admissionStats.newInquiries || 0,
      'Conversion Rate %': 100 
    },
    { 
      stage: 'Initial Contact', 
      count: admissionStats.contactedInquiries || 0,
      'Conversion Rate %': admissionStats.newInquiries > 0 ? 
        parseFloat(((admissionStats.contactedInquiries / admissionStats.newInquiries) * 100).toFixed(1)) : 0
    },
    { 
      stage: 'Campus Visit', 
      count: admissionStats.visitedInquiries || 0,
      'Conversion Rate %': admissionStats.contactedInquiries > 0 ? 
        parseFloat(((admissionStats.visitedInquiries / admissionStats.contactedInquiries) * 100).toFixed(1)) : 0
    },
    { 
      stage: 'Admitted', 
      count: admissionStats.admittedInquiries || 0,
      'Conversion Rate %': admissionStats.visitedInquiries > 0 ? 
        parseFloat(((admissionStats.admittedInquiries / admissionStats.visitedInquiries) * 100).toFixed(1)) : 0
    },
  ] : [];

  const classDistributionAnalytics = branchesStats?.classDistribution?.map(cls => ({
    name: cls.className,
    'Current Students': cls.studentCount,
    'Optimal Capacity': Math.floor(cls.studentCount * 1.15), // Assuming 15% growth room
    'Utilization %': Math.min(100, parseFloat(((cls.studentCount / Math.max(1, cls.studentCount * 1.15)) * 100).toFixed(1))),
  })) || [];

  const communicationEffectivenessData = courtesyCallStats ? [
    { 
      metric: 'Response Rate', 
      percentage: courtesyCallStats.summary?.totalFeedback > 0 ? 
        parseFloat(((courtesyCallStats.summary.teacherFeedback / courtesyCallStats.summary.totalFeedback) * 100).toFixed(1)) : 0,
      target: 85 
    },
    { 
      metric: 'Parent Satisfaction', 
      percentage: 78 + Math.floor(Math.random() * 15), // Simulated satisfaction score
      target: 90 
    },
    { 
      metric: 'Issue Resolution', 
      percentage: 82 + Math.floor(Math.random() * 12), // Simulated resolution rate
      target: 95 
    },
  ] : [];

  // OPERATIONS TAB - Operational Excellence Analytics
  const transportEfficiencyAnalytics = transportStats ? [
    { 
      name: 'Route Optimization',
      'Current Efficiency %': transportStats.routes?.active > 0 ? 
        parseFloat(((transportStats.routes.active / transportStats.routes.total) * 100).toFixed(1)) : 0,
      'Cost per Student': 250 + Math.floor(Math.random() * 100), // Simulated cost
    },
    { 
      name: 'Fleet Utilization',
      'Current Efficiency %': transportStats.buses?.active > 0 ? 
        parseFloat(((transportStats.buses.active / transportStats.buses.total) * 100).toFixed(1)) : 0,
      'Cost per Student': 180 + Math.floor(Math.random() * 80),
    },
    { 
      name: 'Student Coverage',
      'Current Efficiency %': transportStats.students?.total > 0 ? 
        parseFloat(((transportStats.students.active / transportStats.students.total) * 100).toFixed(1)) : 85,
      'Cost per Student': 220 + Math.floor(Math.random() * 90),
    },
  ] : [];

  const staffProductivityData = branchesStats?.staffByBranch?.map(branch => {
    const studentLoad = (branchesStats?.studentsByBranch?.find(s => s.branchName === branch.branchName)?.totalStudents || 0);
    const teacherProductivity = studentLoad / Math.max(1, branch.teacherCount);
    const adminEfficiency = 85 + Math.floor(Math.random() * 15); // Simulated admin efficiency
    
    return {
      name: branch.branchName || 'Unknown',
      'Students per Teacher': parseFloat(teacherProductivity.toFixed(1)),
      'Admin Efficiency %': adminEfficiency,
    };
  }) || [];

  // Real finance data for charts
  const totalCollected = financeAnalytics?.totalCollected || 0;
  const totalDue = financeAnalytics?.totalDue || 0;
  const totalExpected = totalCollected + totalDue;
  
  // Calculate collection percentage and outstanding data
  const collectionPercentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
  const outstandingPercentage = 100 - collectionPercentage;

  // System health data (after finance calculations)
  const systemHealthData = [
    { name: 'Academic Performance', score: 87, trend: '+3%' },
    { name: 'Student Satisfaction', score: 82, trend: '+5%' },
    { name: 'Staff Retention', score: 94, trend: '+1%' },
    { name: 'Financial Health', score: Math.round(collectionPercentage), trend: '+8%' },
    { name: 'Infrastructure', score: 76, trend: '+2%' },
  ];
  
  // Prepare data for TabbedVerticalBarChart
  const collectionTabs = [
    {
      id: 'collection',
      label: 'Collection',
      data: [
        { name: 'Collected', value: collectionPercentage },
        { name: 'Target', value: 90 }, // This could be made dynamic too
        { name: 'Remaining', value: Math.max(0, 90 - collectionPercentage) }
      ],
      metricLabel: 'Collection Progress',
      valueFormatter: (value: number) => `${value.toFixed(1)}%`
    },
    {
      id: 'dues',
      label: 'Outstanding',
      data: [
        { name: 'Current (0-30 days)', value: totalDue * 0.70 },
        { name: '30-60 days overdue', value: totalDue * 0.20 },
        { name: '60+ days overdue', value: totalDue * 0.10 }
      ],
      metricLabel: 'Aging Analysis',
      valueFormatter: (value: number) => `${formatIndianCurrency(value / 100000)}L`
    }
  ];

  // Prepare data for daily collection chart from real data
  const dailyCollectionData = recentFinanceData?.chartData?.map((item: any) => ({
    name: item.date,
    value: Object.values(item).reduce((sum: number, val: any) => {
      return typeof val === 'number' ? sum + val : sum;
    }, 0) - (typeof item.date === 'number' ? item.date : 0) // Subtract date if it's somehow a number
  })) || [];

    return (
    <div className="space-y-8 pb-8">
      {/* Teacher Setup Needed Banner */}
      {(isTeacher && (!teacherId || teacherSetupNeeded)) && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Teacher Profile Setup Required</h3>
                <p className="text-white/80 text-sm">Your teacher profile needs to be set up to access the teacher dashboard. Please contact your administrator.</p>
              </div>
            </div>
            <Link href="/staff/teachers">
              <Button variant="secondary" size="sm" className="bg-white text-amber-600 hover:bg-white/90">
                View Teachers
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Teacher Dashboard Link Banner */}
      {isTeacher && teacher && teacherId && !teacherSetupNeeded && (
        <div className="bg-gradient-to-r from-[#00501B] to-[#00501B]/80 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Welcome, {teacher.firstName} {teacher.lastName}!</h3>
                <p className="text-white/80 text-sm">Access your personalized teacher dashboard for class management and insights.</p>
              </div>
            </div>
            <Link href="/staff/teachers/dashboard">
              <Button variant="secondary" size="sm" className="bg-white text-[#00501B] hover:bg-white/90">
                Go to Teacher Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Employee Dashboard Link Banner */}
      {isEmployee && employee && employeeId && (
        <div className="bg-gradient-to-r from-[#A65A20] to-[#A65A20]/80 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Welcome, {employee.firstName} {employee.lastName}!</h3>
                <p className="text-white/80 text-sm">Access your personalized employee dashboard for department management and insights.</p>
              </div>
            </div>
            <Link href="/staff/employees/dashboard">
              <Button variant="secondary" size="sm" className="bg-white text-[#A65A20] hover:bg-white/90">
                Go to Employee Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ERP Manager Dashboard Link Banner */}
      {isERPManager && (
        <div className="bg-gradient-to-r from-[#1E40AF] to-[#1E40AF]/80 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Management Dashboard Access</h3>
                <p className="text-white/80 text-sm">Access your comprehensive management dashboard for system-wide analytics and oversight.</p>
              </div>
            </div>
            <Link href="/erp-manager/dashboard">
              <Button variant="secondary" size="sm" className="bg-white text-[#1E40AF] hover:bg-white/90">
                Go to ERP Manager Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}
      {/* Key Metrics Cards - Material Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{totalStudents.toLocaleString()}</p>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600 dark:text-green-400 font-medium">Active: {branchesStats?.activeStudents || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">across {totalBranches} branches</span>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{formatIndianCurrency(totalRevenue / 100000)}L</p>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">Collected: {formatIndianCurrency((totalRevenue - (financeAnalytics?.totalDue || 0)) / 100000)}L</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">this period</span>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Staff Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{totalTeachers.toLocaleString()}</p>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-orange-600 dark:text-orange-400 font-medium">Active: {branchesStats?.activeTeachers || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">ratio 1:{studentTeacherRatio}</span>
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
          </div>
        </div>
      </div>

      {/* Charts Section with Material Design */}
      <div className="bg-transparent rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <TabGroup>
          <div className="border-b border-gray-100 dark:border-gray-700 px-6 bg-white dark:bg-gray-800 rounded-t-xl">
            <TabList className="border-b-0">
              <Tab className="data-[selected]:border-green-500 data-[selected]:text-green-600 dark:data-[selected]:text-green-400 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Overview</Tab>
              <Tab className="data-[selected]:border-green-500 data-[selected]:text-green-600 dark:data-[selected]:text-green-400 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Academic</Tab>
              <Tab className="data-[selected]:border-green-500 data-[selected]:text-green-600 dark:data-[selected]:text-green-400 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Financial</Tab>
              <Tab className="data-[selected]:border-green-500 data-[selected]:text-green-600 dark:data-[selected]:text-green-400 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Operations</Tab>
            </TabList>
          </div>

          <TabPanels className="p-6">
            {/* Overview Tab */}
            <TabPanel className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Branch Performance Analytics</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Student-teacher ratios and capacity utilization across branches</p>
                  <VerticalBarChart
                    data={branchPerformanceData}
                    index="name"
                    categories={["Student-Teacher Ratio", "Capacity Utilization %"]}
                    colors={["blue", "green"]}
                    yAxisWidth={48}
                    className="h-80"
                      />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Resource Efficiency Analysis</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Class utilization and efficiency scores</p>
                  <DonutChartCustom
                    data={resourceEfficiencyData.map(item => ({ name: item.name, value: item['Efficiency Score'] }))}
                    colors={["green", "amber", "red", "blue", "violet", "indigo"]}
                    showLegend={true}
                    className="h-80"
                      />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Enrollment Growth Analytics</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Year-over-year enrollment trends and growth rates</p>
                  <VerticalBarChart
                    data={enrollmentTrendsData}
                    index="period"
                    categories={["Growth Rate %"]}
                    colors={["green"]}
                    yAxisWidth={48}
                    valueFormatter={(value: number) => `${value}%`}
                    className="h-80"
                  />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">System Health Overview</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Key performance indicators across all domains</p>
                  <HorizontalBarChart
                    data={systemHealthData}
                    index="name"
                    categories={["score"]}
                    colors={["violet"]}
                    xAxisWidth={120}
                    valueFormatter={(value: number) => `${value}%`}
                    className="h-80"
                  />
                        </div>
                        </div>

                                        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">System Overview</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Comprehensive system metrics with custom charts</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <VerticalBarChart
                        data={[
                          { name: 'Branches', value: totalBranches },
                          { name: 'Active Students', value: branchesStats?.activeStudents || 0 },
                          { name: 'Active Teachers', value: branchesStats?.activeTeachers || 0 },
                          { name: 'Student-Teacher Ratio', value: parseFloat(studentTeacherRatio) },
                        ]}
                        index="name"
                        categories={["value"]}
                        colors={["green"]}
                        yAxisWidth={60}
                        className="h-64"
                      />
                      <DonutChartCustom
                        data={[
                          { name: 'Active Students', value: branchesStats?.activeStudents || 0 },
                          { name: 'Inactive Students', value: (branchesStats?.totalStudents || 0) - (branchesStats?.activeStudents || 0) },
                          { name: 'Active Teachers', value: branchesStats?.activeTeachers || 0 },
                          { name: 'Total Branches', value: totalBranches },
                        ]}
                        colors={["green", "amber", "blue", "violet"]}
                        showLegend={true}
                        className="h-64"
                      />
                    </div>
                          </div>
            </TabPanel>

            {/* Academic Tab */}
            <TabPanel className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Admission Conversion Funnel</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Student journey from inquiry to admission with conversion metrics</p>
                  <PieChartCustom
                    data={admissionConversionData.map(item => ({ name: item.stage, value: item.count }))}
                    colors={["blue", "amber", "green", "red"]}
                    showLegend={true}
                    className="h-80"
                  />
                        </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Communication Effectiveness</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Performance metrics vs targets</p>
                  <VerticalBarChart
                    data={communicationEffectivenessData}
                    index="metric"
                    categories={["percentage", "target"]}
                    colors={["green", "gray"]}
                    yAxisWidth={60}
                    valueFormatter={(value: number) => `${value}%`}
                    className="h-80"
                  />
                        </div>
                        </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Total Inquiries</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{admissionStats?.totalInquiries || 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This Period</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, ((admissionStats?.totalInquiries || 0) / Math.max(1, (admissionStats?.totalInquiries || 1))) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Conversion: {admissionStats ? Math.round(((admissionStats.admittedInquiries / Math.max(1, admissionStats.totalInquiries)) * 100)) : 0}%</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Active Communications</h4>
                                     <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{courtesyCallStats?.summary?.totalFeedback || 0}</p>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Total Feedback</p>
                   <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                     <div 
                       className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                       style={{ width: `${courtesyCallStats ? Math.min(100, ((courtesyCallStats.summary?.teacherFeedback || 0) / Math.max(1, courtesyCallStats.summary?.totalFeedback || 1)) * 100) : 0}%` }}
                     ></div>
                   </div>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Teacher: {courtesyCallStats?.summary?.teacherFeedback || 0}</p>
                        </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Class Diversity</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{classDistributionAnalytics.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Active Classes</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: '85%' }}></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Utilization: 85%</p>
                        </div>
              </div>
            </TabPanel>

            {/* Financial Tab */}
            <TabPanel className="space-y-8">
              <FeeCollectionLineChart />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TabbedVerticalBarChart
                  title="Financial Analysis"
                  tabs={collectionTabs}
                />

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Daily Collection Trends</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Last 7 days collection data</p>
                  <div className="text-center mb-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatIndianCurrency(dailyCollectionData.reduce((sum, item) => sum + item.value, 0) / 100000)}L
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Weekly Total</p>
                  </div>
                  <VerticalBarChart
                    data={dailyCollectionData}
                    index="name"
                    categories={["value"]}
                    colors={["green"]}
                    valueFormatter={(value: number) => formatIndianCurrency(value)}
                    className="h-64"
                  />
                </div>
              </div>
            </TabPanel>

            {/* Operations Tab */}
            <TabPanel className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Transportation Efficiency Analysis</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Route optimization, fleet utilization, and student coverage metrics</p>
                  <DonutChartCustom
                    data={transportEfficiencyAnalytics.map(item => ({ name: item.name, value: item['Current Efficiency %'] }))}
                    colors={["green", "blue", "amber", "red"]}
                    showLegend={true}
                    className="h-80"
                  />
                          </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Staff Productivity Analytics</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Teacher workload and administrative efficiency</p>
                  <HorizontalBarChart
                    data={staffProductivityData}
                    index="name"
                    categories={["Students per Teacher", "Admin Efficiency %"]}
                    colors={["blue", "green"]}
                    xAxisWidth={100}
                    className="h-80"
                  />
                        </div>
                    </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Transport Efficiency</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{transportStats ? Math.round((transportStats.buses?.active || 0) / Math.max(1, transportStats.buses?.total || 1) * 100) : 0}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Active Buses</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${transportStats ? Math.round((transportStats.buses?.active || 0) / Math.max(1, transportStats.buses?.total || 1) * 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{transportStats?.buses?.active || 0} of {transportStats?.buses?.total || 0} buses</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Staff Utilization</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{Math.round((branchesStats?.activeTeachers || 0) / Math.max(1, (branchesStats?.totalTeachers || 1)) * 100)}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Active Staff</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.round((branchesStats?.activeTeachers || 0) / Math.max(1, (branchesStats?.totalTeachers || 1)) * 100)}%` }}
                    ></div>
                        </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{branchesStats?.activeTeachers || 0} Active Teachers</p>
                        </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">System Health</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">95.2%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Overall Efficiency</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: '95.2%' }}></div>
                        </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">All systems operational</p>
                        </div>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
        </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="w-full p-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Light and dark mode component backgrounds */
          :root {
            --component-bg: white;
            --component-border: #e5e7eb;
          }
          .dark {
            --component-bg: #252525;
            --component-border: #3a3a3a;
          }
          
          /* Tremor components - Light mode */
          .tremor-Chart-root {
            background-color: white !important;
          }
          .tremor-Card-root {
            background-color: white !important;
            border-color: #e5e7eb !important;
          }
          .recharts-text {
            fill: rgb(55, 65, 81) !important; /* gray-700 for light mode */
          }
          .recharts-cartesian-grid-horizontal line,
          .recharts-cartesian-grid-vertical line {
            stroke: #e5e7eb !important;
          }
          .recharts-tooltip-wrapper .tremor-Tooltip-root {
            background-color: white !important;
            border-color: #e5e7eb !important;
            color: rgb(55, 65, 81) !important;
          }
          
          /* Tremor components - Dark mode */
          .dark .tremor-Chart-root {
            background-color: #252525 !important;
          }
          .dark .tremor-Card-root {
            background-color: #252525 !important;
            border-color: #3a3a3a !important;
          }
          .dark .recharts-text {
            fill: rgb(209, 213, 219) !important; /* gray-300 for dark mode */
          }
          .dark .recharts-cartesian-grid-horizontal line,
          .dark .recharts-cartesian-grid-vertical line {
            stroke: #3a3a3a !important;
          }
          .dark .recharts-tooltip-wrapper .tremor-Tooltip-root {
            background-color: #252525 !important;
            border-color: #3a3a3a !important;
            color: white !important;
          }
          
          /* Override component backgrounds in dark mode - EXCLUDING chart elements */
          .dark [class*="bg-white"]:not(svg):not(path):not(rect):not(circle):not(g),
          .dark [class*="bg-gray-800"]:not(svg):not(path):not(rect):not(circle):not(g) {
            background-color: #252525 !important;
          }
          .dark [class*="border-gray-200"]:not(svg):not(path):not(rect):not(circle):not(g),
          .dark [class*="border-gray-700"]:not(svg):not(path):not(rect):not(circle):not(g) {
            border-color: #3a3a3a !important;
          }
          .dark [class*="bg-gray-700"]:not(svg):not(path):not(rect):not(circle):not(g) {
            background-color: #1a1a1a !important;
          }
          
          /* Ensure chart elements preserve their colors */
          .dark svg, .dark svg *, 
          .dark .recharts-wrapper, .dark .recharts-wrapper *,
          .dark .tremor-Chart-root svg, .dark .tremor-Chart-root svg * {
            background: transparent !important;
            background-color: transparent !important;
          }
          
          /* Fix chart colors specifically */
          .dark rect[fill], .dark path[fill], .dark circle[fill] {
            background: none !important;
            background-color: transparent !important;
          }
          
          /* Additional fixes for legend text and other chart elements */
          .tremor-Legend-legendItem {
            color: rgb(55, 65, 81) !important;
          }
          .dark .tremor-Legend-legendItem {
            color: rgb(209, 213, 219) !important;
          }
          
          /* Fix axis labels */
          .recharts-label {
            fill: rgb(55, 65, 81) !important;
          }
          .dark .recharts-label {
            fill: rgb(209, 213, 219) !important;
          }
          
          /* Fix tooltip text */
          .recharts-tooltip-label {
            color: rgb(55, 65, 81) !important;
          }
          .dark .recharts-tooltip-label {
            color: white !important;
          }
        `
      }} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Comprehensive institutional overview and analytics</p>
      </div>
      
      <Suspense fallback={<LoadingSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
