"use client";

import React from 'react';
import Link from 'next/link';
import { PageWrapper } from "@/components/layout/page-wrapper"; // Assuming this path is correct
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter // Added CardFooter for consistency
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // For potential future use or consistency
import { Skeleton } from "@/components/ui/skeleton"; // For loading states
import { AreaChart, BarChart, DonutChart } from "@/components/ui/shadcn-charts"; // For charts
import { Badge } from "@/components/ui/badge"; // For trend indicators
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"; // For trend icons
import { Button } from "@/components/ui/button";
import {
  Printer,
  FileText
} from 'lucide-react';

import {
  ArrowRight,
  BarChart2,
  BarChart3,
  Calendar,
  DollarSign,
  Settings,
  Users,
  Briefcase, // Example new icon for Finance module header
  Activity, // For recent transactions icon
  Bell, // For due dates icon
  Target,
  AlertTriangle // Added AlertTriangle here
} from 'lucide-react';

// Placeholder data - replace with actual data fetching
const metrics = [
  { title: "Total Fees Collected", value: "₹1,250,000", icon: <DollarSign className="h-6 w-6 text-green-600" />, trend: "+5.2%", changeType: "increase" },
  { title: "Total Outstanding Fees", value: "₹350,000", icon: <DollarSign className="h-6 w-6 text-red-600" />, trend: "+1.8%", changeType: "increase" }, // Should this be decrease if outstanding increases?
  { title: "Collected (This Month)", value: "₹150,000", icon: <DollarSign className="h-6 w-6 text-blue-600" />, trend: "-2.1%", changeType: "decrease" },
  { title: "Upcoming Dues (Next 30d)", value: "₹75,000", icon: <Calendar className="h-6 w-6 text-amber-600" />, footerText: "View Details" },
];

const quickActions = [
  { title: "Manage Fee Heads", href: "/finance/fee-head", icon: <Settings /> },
  { title: "Manage Fee Terms", href: "/finance/fee-term", icon: <Calendar /> },
  { title: "Classwise Fees", href: "/finance/classwise-fee", icon: <Users /> },
  { title: "Fee Collection", href: "/finance/fee-collection", icon: <DollarSign /> },
  { title: "Record Payment", href: "/finance/fee-collection/create", icon: <FileText /> },
  { title: "Finance Reports", href: "/finance/reports", icon: <BarChart2 /> },
];

const recentTransactions = [
  { id: "TXN001", studentName: "Aarav Sharma", class: "10 A", amount: "₹5,000", date: "2024-07-20", status: "Paid" },
  { id: "TXN002", studentName: "Priya Singh", class: "12 B", amount: "₹7,500", date: "2024-07-19", status: "Paid" },
  { id: "TXN003", studentName: "Rohan Mehta", class: "9 C", amount: "₹4,200", date: "2024-07-19", status: "Overdue" },
  { id: "TXN004", studentName: "Sneha Patel", class: "11 A", amount: "₹6,800", date: "2024-07-18", status: "Paid" },
  { id: "TXN005", studentName: "Vikram Reddy", class: "8 A", amount: "₹3,500", date: "2024-07-21", status: "Pending" },
];

const upcomingDueDates = [
  { termName: "Term 2 Fees", dueDate: "2024-08-01", applicableTo: "Classes 6-10", amount: "₹5,500 per student" },
  { termName: "Annual Fund", dueDate: "2024-08-15", applicableTo: "All Classes", amount: "₹1,200 per student" },
  { termName: "Transport Fees (Aug)", dueDate: "2024-08-05", applicableTo: "Bus Users", amount: "Varies" },
];

const feeCollectionTrends = [
  { month: "Feb", collected: 120000, outstanding: 40000 },
  { month: "Mar", collected: 180000, outstanding: 35000 },
  { month: "Apr", collected: 150000, outstanding: 50000 },
  { month: "May", collected: 210000, outstanding: 25000 },
  { month: "Jun", collected: 170000, outstanding: 45000 },
  { month: "Jul", collected: 190000, outstanding: 30000 },
];

const feeDistributionData = [
  { name: "Tuition Fee", value: 60, color: "#00501B" },
  { name: "Transport Fee", value: 15, color: "#007B3A" },
  { name: "Annual Fund", value: 10, color: "#50C878" },
  { name: "Exam Fee", value: 8, color: "#A6D785" },
  { name: "Other", value: 7, color: "#D4EABF" },
];

const keyInsights = [
    { icon: <IconTrendingUp className="text-green-500" />, text: "Online fee payments increased by 15% this quarter." },
    { icon: <DollarSign className="text-blue-500" />, text: "Average transaction value is ₹4,500." },
    { icon: <AlertTriangle className="text-red-500" />, text: "Overdue fees constitute 8% of total receivables." }, // Using AlertTriangle from lucide
    { icon: <Users className="text-indigo-500" />, text: "92% of parents are using the online payment portal." }
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [selectedAcademicSessionId, setSelectedAcademicSessionId] = React.useState<string | undefined>(undefined);
  // Dummy data for academic sessions, replace with API call
  const academicSessions = [
    { id: "session1", name: "2023-2024", isActive: false },
    { id: "session2", name: "2024-2025", isActive: true },
  ];

  React.useEffect(() => {
    if (academicSessions && academicSessions.length > 0 && !selectedAcademicSessionId) {
      const activeSession = academicSessions.find(session => session.isActive);
      setSelectedAcademicSessionId(activeSession?.id || academicSessions[0]?.id);
    }
  }, [academicSessions, selectedAcademicSessionId]);

  // TODO: Fetch actual data for studentStats and other dynamic content
  const isLoadingStats = false; // Placeholder
  const financeSummary = { totalCollected: 1250000, totalOutstanding: 350000 }; // Placeholder

  return (
    <PageWrapper title="Finance Dashboard" subtitle="Manage all financial aspects of the institution.">
      {/* Header section with Academic Session Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-auto">
          <div className="bg-[#00501B]/5 dark:bg-gray-800/30 rounded-lg px-4 py-3 border border-[#00501B]/10 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#00501B] dark:text-green-400" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Financial Overview</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              {`Displaying key financial metrics and activities.`}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/50 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Academic Session:</span>
            <select
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-[#00501B] focus:border-[#00501B]"
              value={selectedAcademicSessionId}
              onChange={(e) => setSelectedAcademicSessionId(e.target.value)}
              disabled={!academicSessions || academicSessions.length === 0}
            >
              {academicSessions?.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} {session.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white/80 dark:bg-gray-800/50 rounded-lg border border-[#00501B]/10 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-[#00501B] dark:text-green-400" />
          <h3 className="font-semibold text-gray-700 dark:text-white">Key Financial Insights</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {keyInsights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 bg-white dark:bg-gray-700/50 rounded-md p-3 shadow-sm border border-gray-200 dark:border-gray-600">
              <div className="mt-0.5 text-[#00501B] dark:text-green-400">{React.cloneElement(insight.icon, {size: 20})}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.title} className="shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="uppercase tracking-wider text-xs whitespace-nowrap">{metric.title}</CardDescription>
                {metric.icon}
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                {isLoadingStats ? <Skeleton className="h-8 w-24" /> : metric.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              {metric.trend && (
                <Badge variant="outline"
                  className={`${metric.changeType === 'increase' ? 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-900/30' 
                                : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-700 dark:bg-red-900/30'} px-2 py-0.5 text-xs`}>
                  {metric.changeType === 'increase' ? (
                    <IconTrendingUp className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <IconTrendingDown className="h-3.5 w-3.5 mr-1" />
                  )}
                  {metric.trend}
                </Badge>
              )}
            </CardContent>
            {metric.footerText && (
              <CardFooter className="pt-0 border-t border-gray-100 dark:border-gray-700/50 px-4 py-2">
                 <Link href="#" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
                    {metric.footerText} <ArrowRight className="h-3 w-3 ml-1" />
                 </Link>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Actions - Styled like cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Link href={action.href} key={action.title} className="block bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 text-center group">
              <div className="flex justify-center mb-2">
                {React.cloneElement(action.icon, { className: 'h-7 w-7 text-[#00501B] dark:text-green-400 group-hover:scale-110 transition-transform' })}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#00501B] dark:group-hover:text-green-300">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tabs for Detailed Views (Charts, Tables) */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 md:max-w-md h-auto sm:h-12 bg-muted/30 dark:bg-gray-800/50 p-1 rounded-lg gap-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-green-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
            <BarChart3 className="w-4 h-4 mr-2" /> {/* Using BarChart3 from lucide for consistency */}
            Financial Summary
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-green-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
            <Activity className="w-4 h-4 mr-2" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="dues" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-green-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
            <Bell className="w-4 h-4 mr-2" />
            Upcoming Dues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3 shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Fee Collection vs. Outstanding</CardTitle>
                <CardDescription>Trend over the last 6 months (Sample Data)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <AreaChart
                    data={feeCollectionTrends}
                    index="month"
                    categories={["collected", "outstanding"]}
                    colors={["emerald", "rose"]}
                    valueFormatter={(value: number) => `₹${(value / 1000).toFixed(0)}k`}
                    showAnimation={true}
                    containerClassName="h-full w-full"
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2 shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Fee Distribution by Head</CardTitle>
                <CardDescription>Current academic session (Sample Data)</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center h-[300px]">
                 <DonutChart
                    data={feeDistributionData}
                    colors={feeDistributionData.map(item => item.color)}
                    valueFormatter={(value: number) => `${value}%`}
                    showAnimation={true}
                    containerClassName="max-h-[250px] w-auto"
                  />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex justify-between items-center">
                Recent Fee Transactions
                <Link href="/finance/fee-collection" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </CardTitle>
              <CardDescription>Last 50 transactions or transactions from the past 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">ID</th>
                      <th scope="col" className="px-4 py-3">Student Name</th>
                      <th scope="col" className="px-4 py-3">Class</th>
                      <th scope="col" className="px-4 py-3">Amount</th>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((txn) => (
                      <tr key={txn.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{txn.id}</td>
                        <td className="px-4 py-3">{txn.studentName}</td>
                        <td className="px-4 py-3">{txn.class}</td>
                        <td className="px-4 py-3">{txn.amount}</td>
                        <td className="px-4 py-3">{txn.date}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={txn.status === 'Paid' ? 'default' : 
                                     txn.status === 'Pending' ? 'outline' :
                                     txn.status === 'Overdue' ? 'destructive' :
                                     'default'}
                            className={txn.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
                          >
                            {txn.status.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2" title="Print Receipt">
                              <Printer className="h-3 w-3" />
                            </Button>
                            <Link href={`/finance/fee-collection/${txn.id}/edit`}>
                              <Button variant="ghost" size="sm" className="h-7 px-2" title="Edit Payment">
                                <FileText className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentTransactions.length === 0 && <p className="text-center py-8 text-gray-500 dark:text-gray-400">No recent transactions found.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dues">
          <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white flex justify-between items-center">
                Upcoming Fee Due Dates
                <Link href="/finance/fee-term" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
                  Manage Terms <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </CardTitle>
              <CardDescription>Overview of upcoming payment deadlines.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingDueDates.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1">
                      <h3 className="font-semibold text-md text-gray-800 dark:text-white">{item.termName}</h3>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">Due: {item.dueDate}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Applicable to: {item.applicableTo}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Amount: <span className="font-medium">{item.amount}</span></p>
                  </div>
                ))}
                {upcomingDueDates.length === 0 && <p className="text-center py-8 text-gray-500 dark:text-gray-400">No upcoming due dates scheduled.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </PageWrapper>
  );
}

// Make sure to import Calendar icon if it's used
// import { Calendar } from 'lucide-react'; 
// You might need to install a charting library like Recharts or Chart.js for actual charts. 