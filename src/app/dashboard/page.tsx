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
import { TrendingUp, TrendingDown, Users, GraduationCap, Building2, DollarSign, Bus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import VerticalBarChart from "@/components/ui/vertical-bar-chart";
import TabbedVerticalBarChart from "@/components/ui/tabbed-vertical-bar-chart";
import { FeeCollectionLineChart } from "@/components/ui/fee-collection-line-chart";
import { formatIndianCurrency } from "@/lib/utils";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useUserRole } from "@/hooks/useUserRole";
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
  const { isTeacher, teacherData } = useUserRole();

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

  // Calculate aggregated stats
  const totalStudents = branchesStats?.totalStudents || 0;
  const totalTeachers = branchesStats?.totalTeachers || 0;
  const totalBranches = branchesStats?.branchCount || 0;
  const studentTeacherRatio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : "0";
  const totalRevenue = financeAnalytics?.totalCollected || 2450000; // Use real data or fallback
  const avgAttendance = 92.3; // Simulated data

  // Chart data
  const branchStudentsData = branchesStats?.branches?.map(branch => ({
    name: branch.name || 'Unknown',
    Students: Math.floor(totalStudents / totalBranches) + Math.floor(Math.random() * 50),
    Teachers: Math.floor(totalTeachers / totalBranches) + Math.floor(Math.random() * 5),
  })) || [];

  const attendanceData = branchesStats?.branches?.map(branch => ({
    name: branch.name || 'Unknown',
    'Attendance Rate': avgAttendance + Math.floor(Math.random() * 10) - 5,
  })) || [];

  const revenueData = branchesStats?.branches?.map(branch => ({
    name: branch.name || 'Unknown',
    Revenue: Math.floor(totalRevenue / totalBranches) + Math.floor(Math.random() * 50000),
  })) || [];

  const classDistribution = [
    { name: 'Primary (1-5)', value: Math.floor(totalStudents * 0.4) },
    { name: 'Middle (6-8)', value: Math.floor(totalStudents * 0.3) },
    { name: 'Secondary (9-10)', value: Math.floor(totalStudents * 0.2) },
    { name: 'Senior (11-12)', value: Math.floor(totalStudents * 0.1) },
  ];

  const gradeDistribution = [
    { name: 'A+', value: Math.floor(totalStudents * 0.15) },
    { name: 'A', value: Math.floor(totalStudents * 0.25) },
    { name: 'B+', value: Math.floor(totalStudents * 0.30) },
    { name: 'B', value: Math.floor(totalStudents * 0.20) },
    { name: 'C+', value: Math.floor(totalStudents * 0.10) },
  ];

  const monthlyTrends = [
    { month: 'Jan', Students: totalStudents * 0.85, Revenue: totalRevenue * 0.80, Attendance: 92 },
    { month: 'Feb', Students: totalStudents * 0.88, Revenue: totalRevenue * 0.85, Attendance: 94 },
    { month: 'Mar', Students: totalStudents * 0.92, Revenue: totalRevenue * 0.90, Attendance: 91 },
    { month: 'Apr', Students: totalStudents * 0.95, Revenue: totalRevenue * 0.95, Attendance: 93 },
    { month: 'May', Students: totalStudents * 0.98, Revenue: totalRevenue * 0.98, Attendance: 89 },
    { month: 'Jun', Students: totalStudents, Revenue: totalRevenue, Attendance: avgAttendance },
  ];

  const departmentData = [
    { name: 'Science', Students: Math.floor(totalStudents * 0.35), Teachers: Math.floor(totalTeachers * 0.30) },
    { name: 'Mathematics', Students: Math.floor(totalStudents * 0.25), Teachers: Math.floor(totalTeachers * 0.25) },
    { name: 'English', Students: Math.floor(totalStudents * 0.20), Teachers: Math.floor(totalTeachers * 0.20) },
    { name: 'Social Studies', Students: Math.floor(totalStudents * 0.15), Teachers: Math.floor(totalTeachers * 0.15) },
    { name: 'Arts', Students: Math.floor(totalStudents * 0.05), Teachers: Math.floor(totalTeachers * 0.10) },
  ];

  const feeCollectionData = branchesStats?.branches?.map(branch => ({
    name: branch.name || 'Unknown',
    'Collected': Math.floor(totalRevenue / totalBranches) * 0.85,
    'Pending': Math.floor(totalRevenue / totalBranches) * 0.15,
    })) || [];
    
  const transportData = [
    { name: 'Bus Route 1', Students: Math.floor(totalStudents * 0.15) },
    { name: 'Bus Route 2', Students: Math.floor(totalStudents * 0.12) },
    { name: 'Bus Route 3', Students: Math.floor(totalStudents * 0.10) },
    { name: 'Bus Route 4', Students: Math.floor(totalStudents * 0.08) },
    { name: 'Private Transport', Students: Math.floor(totalStudents * 0.55) },
  ];

  const examPerformance = [
    { subject: 'Mathematics', 'Pass Rate': 88, 'Average Score': 82 },
    { subject: 'Science', 'Pass Rate': 92, 'Average Score': 85 },
    { subject: 'English', 'Pass Rate': 95, 'Average Score': 87 },
    { subject: 'Social Studies', 'Pass Rate': 90, 'Average Score': 83 },
    { subject: 'Computer Science', 'Pass Rate': 85, 'Average Score': 80 },
  ];

  // Real finance data for charts
  const totalCollected = financeAnalytics?.totalCollected || 0;
  const totalDue = financeAnalytics?.totalDue || 0;
  const totalExpected = totalCollected + totalDue;
  
  // Calculate collection percentage and outstanding data
  const collectionPercentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
  const outstandingPercentage = 100 - collectionPercentage;
  
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
  })) || [
    // Fallback data if no real data available
    { name: 'Monday', value: Math.floor(totalRevenue * 0.15) },
    { name: 'Tuesday', value: Math.floor(totalRevenue * 0.12) },
    { name: 'Wednesday', value: Math.floor(totalRevenue * 0.18) },
    { name: 'Thursday', value: Math.floor(totalRevenue * 0.14) },
    { name: 'Friday', value: Math.floor(totalRevenue * 0.16) },
    { name: 'Saturday', value: Math.floor(totalRevenue * 0.08) },
    { name: 'Sunday', value: Math.floor(totalRevenue * 0.03) },
  ];


    return (
    <div className="space-y-8 pb-8">
      {/* Teacher Dashboard Link Banner */}
      {isTeacher && teacherData && (
        <div className="bg-gradient-to-r from-[#00501B] to-[#00501B]/80 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Welcome, {teacherData.firstName} {teacherData.lastName}!</h3>
                <p className="text-white/80 text-sm">Access your personalized teacher dashboard for class management and insights.</p>
              </div>
            </div>
            <Link href="/teachers/dashboard">
              <Button variant="secondary" size="sm" className="bg-white text-[#00501B] hover:bg-white/90">
                Go to Teacher Dashboard
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
                <span className="text-green-600 dark:text-green-400 font-medium">+12%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">from last month</span>
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
                <span className="text-blue-600 dark:text-blue-400 font-medium">+8%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">from last month</span>
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Overall Attendance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{avgAttendance.toFixed(1)}%</p>
              <div className="flex items-center text-sm">
                <TrendingDown className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-orange-600 dark:text-orange-400 font-medium">-2%</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">from last month</span>
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Students & Teachers by Branch</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Distribution across all branches</p>
                  <BarChart
                    data={branchStudentsData}
                    index="name"
                    categories={["Students", "Teachers"]}
                    colors={["emerald", "blue"]}
                    yAxisWidth={48}
                    showAnimation={true}
                    className="h-80"
                      />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Class Distribution</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Student enrollment by grade level</p>
                  <DonutChart
                    data={classDistribution}
                    category="value"
                    index="name"
                    colors={["emerald", "blue", "amber", "red"]}
                    showAnimation={true}
                    className="h-80"
                      />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Monthly Trends</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Student enrollment and attendance patterns</p>
                  <LineChart
                    data={monthlyTrends}
                    index="month"
                    categories={["Students", "Attendance"]}
                    colors={["emerald", "amber"]}
                    yAxisWidth={48}
                    showAnimation={true}
                    className="h-80"
                  />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Department Distribution</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Students and teachers by department</p>
                  <BarChart
                    data={departmentData}
                    index="name"
                    categories={["Students", "Teachers"]}
                    colors={["emerald", "blue"]}
                    layout="vertical"
                    showAnimation={true}
                    className="h-80"
                  />
                        </div>
                        </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Branch Performance Overview</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Comprehensive performance metrics across all branches</p>
                <AreaChart
                  data={branchStudentsData.map(branch => ({
                    ...branch,
                    'Performance Score': Math.floor(Math.random() * 20) + 80
                  }))}
                  index="name"
                  categories={["Students", "Performance Score"]}
                  colors={["emerald", "amber"]}
                  yAxisWidth={48}
                  showAnimation={true}
                  className="h-80"
                />
                        </div>
            </TabPanel>

            {/* Academic Tab */}
            <TabPanel className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Grade Distribution</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Student performance by grade</p>
                  <DonutChart
                    data={gradeDistribution}
                    category="value"
                    index="name"
                    colors={["emerald", "blue", "amber", "yellow", "red"]}
                    showAnimation={true}
                    className="h-80"
                  />
                        </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Subject Performance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Pass rates and average scores by subject</p>
                  <BarChart
                    data={examPerformance}
                    index="subject"
                    categories={["Pass Rate", "Average Score"]}
                    colors={["emerald", "blue"]}
                    yAxisWidth={48}
                    showAnimation={true}
                    className="h-80"
                  />
                        </div>
                        </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Academic Progress Tracking</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Monthly academic performance trends</p>
                <LineChart
                  data={monthlyTrends.map(item => ({
                    ...item,
                    'Pass Rate': Math.floor(Math.random() * 10) + 85,
                    'Average Grade': Math.floor(Math.random() * 15) + 75
                  }))}
                  index="month"
                  categories={["Pass Rate", "Average Grade"]}
                  colors={["emerald", "blue"]}
                  yAxisWidth={48}
                  showAnimation={true}
                  className="h-80"
                        />
                      </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {examPerformance.slice(0, 3).map((subject, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{subject.subject}</h4>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{subject['Pass Rate']}%</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Pass Rate</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${subject['Pass Rate']}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Score: {subject['Average Score']}</p>
                  </div>
                ))}
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

                <VerticalBarChart
                  data={dailyCollectionData}
                  title="Daily Collection"
                  metricLabel="Weekly Total"
                  valueFormatter={(value) => `${formatIndianCurrency(value / 100000)}L`}
                />
              </div>
            </TabPanel>

            {/* Operations Tab */}
            <TabPanel className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Attendance by Branch</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Current attendance rates</p>
                  <BarChart
                    data={attendanceData}
                    index="name"
                    categories={["Attendance Rate"]}
                    colors={["amber"]}
                    yAxisWidth={48}
                    valueFormatter={(value) => `${value.toFixed(1)}%`}
                    showAnimation={true}
                    className="h-80"
                  />
                          </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Transport Utilization</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Student transportation breakdown</p>
                  <DonutChart
                    data={transportData}
                    category="Students"
                    index="name"
                    colors={["emerald", "blue", "amber", "yellow", "gray"]}
                    showAnimation={true}
                    className="h-80"
                  />
                        </div>
                    </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Daily Attendance Trends</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Student and staff attendance patterns over the week</p>
                <LineChart
                  data={[
                    { day: 'Mon', Attendance: 94.2, 'Staff Attendance': 98.5 },
                    { day: 'Tue', Attendance: 92.8, 'Staff Attendance': 97.8 },
                    { day: 'Wed', Attendance: 91.5, 'Staff Attendance': 99.2 },
                    { day: 'Thu', Attendance: 93.7, 'Staff Attendance': 98.1 },
                    { day: 'Fri', Attendance: 89.3, 'Staff Attendance': 96.7 },
                    { day: 'Sat', Attendance: 88.1, 'Staff Attendance': 95.4 },
                  ]}
                  index="day"
                  categories={["Attendance", "Staff Attendance"]}
                  colors={["amber", "blue"]}
                  yAxisWidth={48}
                  valueFormatter={(value) => `${value.toFixed(1)}%`}
                  showAnimation={true}
                  className="h-80"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Transport Efficiency</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">92.5%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Route Utilization</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: '92.5%' }}></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">5 Active Routes</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Staff Attendance</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">97.8%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This Month</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: '97.8%' }}></div>
                        </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{totalTeachers} Total Staff</p>
                        </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Facility Utilization</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">78.3%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Classrooms & Labs</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: '78.3%' }}></div>
                        </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Peak Hours: 10-12 AM</p>
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
