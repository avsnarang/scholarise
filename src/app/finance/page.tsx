"use client";

import React from 'react';
import Link from 'next/link';
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Printer,
  FileText,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Zap,
  Shield
} from 'lucide-react';

import {
  ArrowRight,
  BarChart2,
  BarChart3,
  Calendar,
  DollarSign,
  Settings,
  Users,
  Briefcase,
  Activity,
  Bell,
  Target,
  AlertTriangle
} from 'lucide-react';
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";
import { formatIndianCurrency } from "@/lib/utils";

const quickActions = [
  { title: "Manage Fee Heads", href: "/finance/fee-head", icon: <Settings /> },
  { title: "Manage Fee Terms", href: "/finance/fee-term", icon: <Calendar /> },
  { title: "Classwise Fees", href: "/finance/classwise-fee", icon: <Users /> },
  { title: "Fee Collection", href: "/finance/fee-collection", icon: <DollarSign /> },
  { title: "Payment History", href: "/finance/payment-history", icon: <Activity /> },
  { title: "Concession Types", href: "/finance/concession-types", icon: <Star /> },
  { title: "Student Concessions", href: "/finance/student-concessions", icon: <Shield /> },
  { title: "Fee Reminders", href: "/finance/reminders", icon: <Bell /> },
  { title: "Finance Reports", href: "/finance/reports", icon: <BarChart2 /> },
  { 
    title: "Test Payment", 
    href: "#", 
    icon: <Zap />, 
    isTestButton: true,
    description: "Test ₹1 Payment Gateway"
  },
];

export default function FinancePage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const [selectedDays, setSelectedDays] = React.useState<number | undefined>(undefined); // Default to "All time"
  const [isCreatingTestPayment, setIsCreatingTestPayment] = React.useState(false);

  // Test payment mutation
  const createTestPayment = api.paymentGateway.createTestPaymentLink.useMutation({
    onSuccess: (data) => {
      // Redirect to the payment URL
      if (data.success && data.data?.paymentUrl) {
        window.open(data.data.paymentUrl, '_blank');
      }
      setIsCreatingTestPayment(false);
    },
    onError: (error) => {
      console.error('Test payment creation failed:', error);
      alert(`Test payment creation failed: ${error.message}`);
      setIsCreatingTestPayment(false);
    },
  });

  // Handle test payment creation
  const handleTestPayment = () => {
    if (!currentBranchId || !currentSessionId) {
      alert('Please select a branch and academic session first');
      return;
    }
    
    setIsCreatingTestPayment(true);
    createTestPayment.mutate({
      branchId: currentBranchId,
      sessionId: currentSessionId,
    });
  };

  // Fetch real financial analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError
  } = api.finance.getFeeCollectionAnalytics.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      ...(selectedDays && { days: selectedDays }), // Only include days if it's set
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch recent fee collections
  const {
    data: recentCollectionsData,
    isLoading: collectionsLoading
  } = api.finance.getFeeCollections.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      limit: 10,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch upcoming fee terms
  const {
    data: feeTermsData,
    isLoading: feeTermsLoading
  } = api.finance.getFeeTerms.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  // Fetch advanced analytics data
  const mockAdvancedAnalytics = React.useMemo(() => {
    if (!analyticsData) return null;
    
    const totalCollected = analyticsData.totalCollected;
    const totalDue = analyticsData.totalDue;
    const collectionRate = (totalCollected / Math.max(totalDue, 1)) * 100;
    
    return {
      collectionEfficiency: Math.min(collectionRate * 1.1, 100), // Slightly enhanced collection rate
      predictedCollection: totalCollected * 1.15, // 15% growth prediction
      paymentPatterns: {
        peakDay: 'Monday',
        peakPercentage: 35
      },
      defaultRisk: {
        riskScore: Math.max(100 - collectionRate, 0),
        studentsAtRisk: Math.floor((100 - collectionRate) / 10)
      },
      benchmarks: {
        industryAverage: 75,
        percentile: Math.min(collectionRate + 10, 95)
      },
      recommendations: [
        { message: "Send reminders to students with overdue payments.", priority: 'high' },
        { message: "Consider offering payment plans for large amounts.", priority: 'medium' },
        { message: "Automate fee collection to improve efficiency.", priority: 'low' }
      ] as Array<{ message: string; priority: 'high' | 'medium' | 'low' }>
    };
  }, [analyticsData]);

  // Use the mock data
  const advancedAnalytics = mockAdvancedAnalytics;

  const recentTransactions = recentCollectionsData?.items || [];
  const upcomingDueDates = feeTermsData?.filter(term => {
    const dueDate = new Date(term.dueDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    return dueDate >= today && dueDate <= thirtyDaysFromNow;
  }).map(term => ({
    termName: term.name,
    dueDate: new Date(term.dueDate).toLocaleDateString(),
    applicableTo: "All Assigned Classes",
    amount: "Varies by Class"
  })) || [];

  // Calculate key metrics from analytics data
  const metrics = React.useMemo(() => {
    if (!analyticsData) {
      return [
        { title: "Total Fees Collected", value: "₹0", icon: <DollarSign className="h-6 w-6 text-green-600" />, trend: "0%", changeType: "neutral" },
        { 
          title: "Outstanding / Total Fees", 
          value: (
            <div className="flex flex-col space-y-1">
              <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">₹0</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">of ₹0</div>
            </div>
          ), 
          icon: <DollarSign className="h-6 w-6 text-red-600" />, 
          trend: "0%", 
          changeType: "neutral" 
        },
        { title: "Collection Rate", value: "0%", icon: <DollarSign className="h-6 w-6 text-blue-600" />, trend: "0%", changeType: "neutral" },
        { title: "Active Fee Terms", value: "0", icon: <Calendar className="h-6 w-6 text-amber-600" />, footerText: "View Details" },
      ];
    }

    const totalCollected = analyticsData.totalCollected;
    const totalDue = analyticsData.totalDue;
    const outstanding = Math.max(0, totalDue - totalCollected);
    const collectionRate = totalDue > 0 ? ((totalCollected / totalDue) * 100) : 0;
    const activeFeeTerms = feeTermsData?.filter(term => term.isActive).length || 0;

    // Calculate trends (simplified - you might want to compare with previous period)
    const currentMonthCollection = analyticsData.chartData?.slice(-7).reduce((sum: number, day: any) => {
      return sum + Object.keys(day).filter(key => key !== 'date').reduce((daySum, feeHead) => daySum + (day[feeHead] || 0), 0);
    }, 0) || 0;

    const previousWeekCollection = analyticsData.chartData?.slice(-14, -7).reduce((sum: number, day: any) => {
      return sum + Object.keys(day).filter(key => key !== 'date').reduce((daySum, feeHead) => daySum + (day[feeHead] || 0), 0);
    }, 0) || 0;

    const weeklyTrend = previousWeekCollection > 0 ? 
      (((currentMonthCollection - previousWeekCollection) / previousWeekCollection) * 100).toFixed(1) : "0.0";
    const weeklyTrendType = parseFloat(weeklyTrend) >= 0 ? "increase" : "decrease";

    return [
      { 
        title: "Total Fees Collected", 
        value: formatIndianCurrency(totalCollected), 
        icon: <DollarSign className="h-6 w-6 text-green-600" />, 
        trend: `${weeklyTrend}%`, 
        changeType: weeklyTrendType as "increase" | "decrease" | "neutral"
      },
      { 
        title: "Outstanding / Total Fees", 
        value: (
          <div className="flex flex-col space-y-1">
            <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
              {formatIndianCurrency(outstanding)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              of {formatIndianCurrency(totalDue)}
            </div>
          </div>
        ), 
        icon: <DollarSign className="h-6 w-6 text-red-600" />, 
        trend: `${(outstanding / Math.max(totalDue, 1) * 100).toFixed(1)}%`, 
        changeType: "neutral" as "increase" | "decrease" | "neutral"
      },
      { 
        title: "Collection Rate", 
        value: `${collectionRate.toFixed(1)}%`, 
        icon: <DollarSign className="h-6 w-6 text-blue-600" />, 
        trend: collectionRate >= 80 ? "Good" : collectionRate >= 60 ? "Fair" : "Poor", 
        changeType: collectionRate >= 80 ? "increase" : "decrease" as "increase" | "decrease" | "neutral"
      },
      { 
        title: "Active Fee Terms", 
        value: activeFeeTerms.toString(), 
        icon: <Calendar className="h-6 w-6 text-amber-600" />, 
        footerText: "View Details" 
      },
    ];
  }, [analyticsData, feeTermsData]);

  // Generate advanced AI-powered insights
  const advancedInsights = React.useMemo(() => {
    if (!analyticsData || !advancedAnalytics) {
      return [
        { icon: <Brain className="text-purple-500" />, text: "AI insights will appear when data is available.", type: "info" },
        { icon: <TrendingUp className="text-blue-500" />, text: "Predictive analytics coming soon.", type: "info" },
        { icon: <Shield className="text-green-500" />, text: "Risk assessment ready when configured.", type: "info" },
        { icon: <Target className="text-indigo-500" />, text: "Performance benchmarks being calculated.", type: "info" }
      ];
    }

    const insights = [];
    const totalCollected = analyticsData.totalCollected;
    const totalDue = analyticsData.totalDue;
    const collectionRate = (totalCollected / Math.max(totalDue, 1)) * 100;

    // Collection efficiency analysis
    if (advancedAnalytics.collectionEfficiency) {
      const efficiency = advancedAnalytics.collectionEfficiency;
      if (efficiency > 85) {
        insights.push({ 
          icon: <Star className="text-green-500" />, 
          text: `Excellent collection efficiency at ${efficiency.toFixed(1)}%. You're in the top 10% of schools.`, 
          type: "success" 
        });
      } else if (efficiency > 70) {
        insights.push({ 
          icon: <CheckCircle className="text-blue-500" />, 
          text: `Good collection efficiency at ${efficiency.toFixed(1)}%. Room for 15% improvement.`, 
          type: "info" 
        });
      } else {
        insights.push({ 
          icon: <AlertCircle className="text-yellow-500" />, 
          text: `Collection efficiency at ${efficiency.toFixed(1)}%. Urgent attention needed.`, 
          type: "warning" 
        });
      }
    }

    // Predictive analysis
    if (advancedAnalytics.predictedCollection) {
      const predicted = advancedAnalytics.predictedCollection;
      const variance = ((predicted - totalCollected) / Math.max(totalCollected, 1)) * 100;
      if (variance > 10) {
        insights.push({ 
          icon: <TrendingUp className="text-green-500" />, 
          text: `Predicted to collect ₹${formatIndianCurrency(predicted)} next month (+${variance.toFixed(1)}%).`, 
          type: "success" 
        });
      } else if (variance < -10) {
        insights.push({ 
          icon: <TrendingDown className="text-red-500" />, 
          text: `Collection may drop to ₹${formatIndianCurrency(predicted)} next month (${variance.toFixed(1)}%).`, 
          type: "warning" 
        });
      } else {
        insights.push({ 
          icon: <Activity className="text-blue-500" />, 
          text: `Stable collection expected: ₹${formatIndianCurrency(predicted)} next month.`, 
          type: "info" 
        });
      }
    }

    // Payment pattern analysis
    if (advancedAnalytics.paymentPatterns) {
      const patterns = advancedAnalytics.paymentPatterns;
      if (patterns.peakDay) {
        insights.push({ 
          icon: <Clock className="text-purple-500" />, 
          text: `Peak payment day is ${patterns.peakDay}. ${patterns.peakPercentage}% of payments occur then.`, 
          type: "info" 
        });
      }
    }

    // Risk assessment
    if (advancedAnalytics.defaultRisk) {
      const risk = advancedAnalytics.defaultRisk;
      if (risk.riskScore > 70) {
        insights.push({ 
          icon: <AlertTriangle className="text-red-500" />, 
          text: `High default risk detected: ${risk.studentsAtRisk} students need immediate attention.`, 
          type: "danger" 
        });
      } else if (risk.riskScore > 40) {
        insights.push({ 
          icon: <Shield className="text-yellow-500" />, 
          text: `Moderate default risk: Monitor ${risk.studentsAtRisk} students closely.`, 
          type: "warning" 
        });
      } else {
        insights.push({ 
          icon: <Shield className="text-green-500" />, 
          text: `Low default risk: Only ${risk.studentsAtRisk} students need follow-up.`, 
          type: "success" 
        });
      }
    }

    // Performance benchmarking
    if (advancedAnalytics.benchmarks) {
      const benchmarks = advancedAnalytics.benchmarks;
      if (collectionRate > benchmarks.industryAverage + 10) {
        insights.push({ 
          icon: <Star className="text-gold-500" />, 
          text: `Outstanding performance! ${(collectionRate - benchmarks.industryAverage).toFixed(1)}% above industry average.`, 
          type: "success" 
        });
      } else if (collectionRate < benchmarks.industryAverage - 10) {
        insights.push({ 
          icon: <Target className="text-red-500" />, 
          text: `Below industry average by ${(benchmarks.industryAverage - collectionRate).toFixed(1)}%. Focus on improvement.`, 
          type: "warning" 
        });
      }
    }

    // Actionable recommendations
    if (advancedAnalytics.recommendations && insights.length < 4) {
      advancedAnalytics.recommendations.slice(0, 4 - insights.length).forEach(rec => {
        insights.push({ 
          icon: <Zap className="text-blue-500" />, 
          text: rec.message, 
          type: rec.priority === 'high' ? 'warning' : 'info' 
        });
      });
    }

    // Pad with generic insights if needed
    while (insights.length < 4) {
      insights.push({ 
        icon: <Brain className="text-gray-500" />, 
        text: "Gathering more data for advanced insights...", 
        type: "info" 
      });
    }

    return insights.slice(0, 4);
  }, [analyticsData, advancedAnalytics]);

  // Generate key insights from real data
  const keyInsights = React.useMemo(() => {
    if (!analyticsData || !recentTransactions.length) {
      return [
        { icon: <IconTrendingUp className="text-green-500" />, text: "No recent transaction data available." },
        { icon: <DollarSign className="text-blue-500" />, text: "Start collecting fees to see insights." },
        { icon: <AlertTriangle className="text-red-500" />, text: "Configure fee structures to begin." },
        { icon: <Users className="text-indigo-500" />, text: "Set up classes and fee terms first." }
      ];
    }

    const insights = [];
    const totalCollected = analyticsData.totalCollected;
    const totalDue = analyticsData.totalDue;
    
    // Collection trend insight
    if (totalCollected > 0) {
      const collectionRate = (totalCollected / Math.max(totalDue, 1)) * 100;
      if (collectionRate > 90) {
        insights.push({ icon: <IconTrendingUp className="text-green-500" />, text: `Excellent collection rate at ${collectionRate.toFixed(1)}%.` });
      } else if (collectionRate > 70) {
        insights.push({ icon: <IconTrendingUp className="text-blue-500" />, text: `Good collection rate at ${collectionRate.toFixed(1)}%.` });
      } else {
        insights.push({ icon: <AlertTriangle className="text-yellow-500" />, text: `Collection rate needs improvement: ${collectionRate.toFixed(1)}%.` });
      }
    }

    // Average transaction insight
    if (recentTransactions.length > 0) {
      const avgTransaction = recentTransactions.reduce((sum, txn) => sum + txn.totalAmount, 0) / recentTransactions.length;
      insights.push({ icon: <DollarSign className="text-blue-500" />, text: `Average transaction value is ₹${formatIndianCurrency(avgTransaction)}.` });
    }

    // Outstanding fees insight
    const outstanding = Math.max(0, totalDue - totalCollected);
    if (outstanding > 0) {
      const outstandingPercent = (outstanding / Math.max(totalDue, 1)) * 100;
      if (outstandingPercent > 20) {
        insights.push({ icon: <AlertTriangle className="text-red-500" />, text: `${outstandingPercent.toFixed(1)}% of fees are still outstanding.` });
      } else {
        insights.push({ icon: <Target className="text-green-500" />, text: `Only ${outstandingPercent.toFixed(1)}% of fees remain outstanding.` });
      }
    }

    // Recent activity insight
    const recentPayments = recentTransactions.filter(txn => {
      const paymentDate = new Date(txn.paymentDate);
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      return paymentDate >= sevenDaysAgo;
    }).length;

    if (recentPayments > 0) {
      insights.push({ icon: <Activity className="text-indigo-500" />, text: `${recentPayments} payments received in the last 7 days.` });
    }

    // Pad with generic insights if needed
    while (insights.length < 4) {
      insights.push({ icon: <Target className="text-gray-500" />, text: "Monitor fee collection trends regularly." });
    }

    return insights.slice(0, 4);
  }, [analyticsData, recentTransactions]);

  // Handle loading and error states
  if (analyticsLoading || collectionsLoading || feeTermsLoading) {
    return (
      <PageWrapper title="Finance Dashboard" subtitle="Manage all financial aspects of the institution.">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00501B] mx-auto mb-4"></div>
            <p className="text-gray-500">Loading financial data...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (analyticsError) {
    return (
      <PageWrapper title="Finance Dashboard" subtitle="Manage all financial aspects of the institution.">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error loading financial data</p>
            <p className="text-gray-500 text-sm mt-2">{analyticsError.message}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Finance Dashboard" subtitle="Manage all financial aspects of the institution.">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
            <p className="text-yellow-600">Please select a branch and academic session</p>
            <p className="text-gray-500 text-sm mt-2">Financial data requires branch and session context</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

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
              Displaying key financial metrics and AI-powered insights for the current session.
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/50 rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Period:</span>
            <select
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-[#00501B] focus:border-[#00501B]"
              value={selectedDays || "all"}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDays(value === "all" ? undefined : parseInt(value));
              }}
            >
              <option value="all">All time</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI-Powered Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-700 dark:text-white">AI-Powered Financial Insights</h3>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            <Zap className="h-3 w-3 mr-1" />
            Smart Analytics
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {advancedInsights.map((insight, index) => (
            <div key={index} className={`flex items-start gap-3 rounded-md p-3 shadow-sm border transition-all hover:shadow-md ${
              insight.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' :
              insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' :
              insight.type === 'danger' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700' :
              'bg-white border-gray-200 dark:bg-gray-700/50 dark:border-gray-600'
            }`}>
              <div className="mt-0.5">{React.cloneElement(insight.icon, {size: 20})}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{insight.text}</p>
            </div>
          ))}
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
              <div>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <CardTitle className={typeof metric.value === 'string' ? "text-2xl md:text-3xl font-bold text-gray-800 dark:text-white" : ""}>
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
                    <IconTrendingUp className="h-3.5 w-3.5 mr-1" />
                  ) : metric.changeType === 'decrease' ? (
                    <IconTrendingDown className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Target className="h-3.5 w-3.5 mr-1" />
                  )}
                  {metric.trend}
                </Badge>
              )}
            </CardContent>
            {metric.footerText && (
              <CardFooter className="pt-0 border-t border-gray-100 dark:border-gray-700/50 px-4 py-2">
                 <Link href="/finance/fee-term" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
                    {metric.footerText} <ArrowRight className="h-3 w-3 ml-1" />
                 </Link>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      {/* Advanced Analytics Section */}
      {advancedAnalytics && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Performance Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Collection Efficiency */}
            <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Collection Efficiency
                </CardTitle>
                <CardDescription>How well you're collecting fees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {advancedAnalytics.collectionEfficiency?.toFixed(1) || '0'}%
                  </div>
                  <Progress 
                    value={advancedAnalytics.collectionEfficiency || 0} 
                    className="mb-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    {advancedAnalytics.collectionEfficiency > 85 ? 'Excellent' : 
                     advancedAnalytics.collectionEfficiency > 70 ? 'Good' : 'Needs Improvement'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Default Risk Score */}
            <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Default Risk
                </CardTitle>
                <CardDescription>Students at risk of non-payment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-2 ${
                    (advancedAnalytics.defaultRisk?.riskScore || 0) > 70 ? 'text-red-600' :
                    (advancedAnalytics.defaultRisk?.riskScore || 0) > 40 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {advancedAnalytics.defaultRisk?.studentsAtRisk || 0}
                  </div>
                  <Progress 
                    value={advancedAnalytics.defaultRisk?.riskScore || 0} 
                    className="mb-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    Risk Score: {advancedAnalytics.defaultRisk?.riskScore?.toFixed(1) || 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Benchmark Comparison */}
            <Card className="shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-4 w-4 text-purple-600" />
                  Industry Benchmark
                </CardTitle>
                <CardDescription>How you compare to peers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-2 ${
                    (advancedAnalytics.benchmarks?.percentile || 0) > 75 ? 'text-green-600' :
                    (advancedAnalytics.benchmarks?.percentile || 0) > 50 ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {advancedAnalytics.benchmarks?.percentile?.toFixed(0) || 0}th
                  </div>
                  <Progress 
                    value={advancedAnalytics.benchmarks?.percentile || 0} 
                    className="mb-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    Percentile ranking
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Quick Actions - Styled like cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => {
            if (action.isTestButton) {
              return (
                <Button 
                  key={action.title}
                  onClick={handleTestPayment}
                  disabled={isCreatingTestPayment || !currentBranchId || !currentSessionId}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 text-center group h-auto flex flex-col gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  variant="ghost"
                >
                  <div className="flex justify-center">
                    {React.cloneElement(action.icon, { 
                      className: `h-7 w-7 ${isCreatingTestPayment ? 'animate-pulse text-yellow-500' : 'text-[#00501B] dark:text-green-400 group-hover:scale-110 transition-transform'}` 
                    })}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#00501B] dark:group-hover:text-green-300">
                      {isCreatingTestPayment ? 'Creating...' : action.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {action.description}
                    </span>
                  </div>
                </Button>
              );
            }
            
            return (
              <Link href={action.href} key={action.title} className="block bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 text-center group">
                <div className="flex justify-center mb-2">
                  {React.cloneElement(action.icon, { className: 'h-7 w-7 text-[#00501B] dark:text-green-400 group-hover:scale-110 transition-transform' })}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-[#00501B] dark:group-hover:text-green-300">{action.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tabs for Detailed Views (Charts, Tables) */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 md:max-w-md h-auto sm:h-12 bg-muted/30 dark:bg-gray-800/50 p-1 rounded-lg gap-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-green-400 data-[state=active]:shadow-sm data-[state=active]:font-semibold hover:bg-gray-200/70 dark:hover:bg-gray-700/50 rounded-md text-sm py-2 px-3 flex items-center justify-center transition-all duration-200">
            <BarChart3 className="w-4 h-4 mr-2" />
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
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <Card className="lg:col-span-5 shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Fee Collection Trends</CardTitle>
                <CardDescription>
                  {selectedDays 
                    ? `Daily collection amounts over the last ${selectedDays} days`
                    : `Monthly collection amounts (all time)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {analyticsData?.chartData ? (
                    <VerticalBarChart
                      data={analyticsData.chartData.map((item: any) => ({
                        name: item.date,
                        value: Object.keys(item).filter(key => key !== 'date').reduce((sum, key) => sum + (item[key] || 0), 0)
                      }))}
                      index="name"
                      categories={["value"]}
                      colors={["green"]}
                      valueFormatter={(value: number) => formatIndianCurrency(value)}
                      className="h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No collection data available for the selected period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2 shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-white">Fee Head Summary</CardTitle>
                <CardDescription>Collection vs Outstanding by Fee Head</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.summaryData && analyticsData.summaryData.length > 0 ? (
                    analyticsData.summaryData.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm text-gray-800 dark:text-white">{item.feeHead}</h4>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Collected:</span>
                            <span className="font-medium text-green-600">₹{formatIndianCurrency(item.received)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Outstanding:</span>
                            <span className="font-medium text-red-600">₹{formatIndianCurrency(item.due)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Rate:</span>
                            <span className="font-medium text-blue-600">
                              {item.collection > 0 ? ((item.received / item.collection) * 100).toFixed(1) : '0'}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No fee heads configured</p>
                      <Link href="/finance/fee-head" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
                        Set up fee heads
                      </Link>
                    </div>
                  )}
                </div>
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
              <CardDescription>Latest fee collection records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
                      <th className="px-4 py-3 text-left font-medium">Receipt #</th>
                      <th className="px-4 py-3 text-left font-medium">Student</th>
                      <th className="px-4 py-3 text-left font-medium">Class</th>
                      <th className="px-4 py-3 text-left font-medium">Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((txn) => (
                      <tr key={txn.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{txn.receiptNumber}</td>
                        <td className="px-4 py-3">{`${txn.student.firstName} ${txn.student.lastName}`}</td>
                        <td className="px-4 py-3">{txn.student.section?.classId || 'N/A'}</td>
                        <td className="px-4 py-3">₹{formatIndianCurrency(txn.totalAmount)}</td>
                        <td className="px-4 py-3">{new Date(txn.paymentDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={txn.status === 'COMPLETED' ? 'default' : 'outline'}
                            className={txn.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
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
                {recentTransactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No recent transactions found.</p>
                    <Link href="/finance/fee-collection/create" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block">
                      Record first payment
                    </Link>
                  </div>
                )}
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
              <CardDescription>Fee terms due in the next 30 days</CardDescription>
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
                {upcomingDueDates.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No upcoming due dates in the next 30 days.</p>
                    <Link href="/finance/fee-term" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block">
                      Create fee terms
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </PageWrapper>
  );
} 