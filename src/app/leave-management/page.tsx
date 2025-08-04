"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { LeaveBalanceCard } from "@/components/leaves/leave-balance-card";
import { LeaveApplicationsList } from "@/components/leaves/leave-applications-list";
import { LeavePoliciesList } from "@/components/leaves/leave-policies-list";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  PieChart,
  BarChart2,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function LeaveDashboardPageContent() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin, teacherId, employeeId } = useUserRole();
  const { currentBranchId, isLoading: isLoadingBranch } = useBranchContext();

  // Fetch leave policies
  const { data: policies } = api.leave.getPolicies.useQuery(
    { branchId: currentBranchId || "" },
    { enabled: !!currentBranchId }
  );

  // Fetch leave balance for staff members
  const { data: leaveBalance } = api.leave.getLeaveBalance.useQuery(
    {
      teacherId,
      employeeId,
      year: selectedYear,
      branchId: currentBranchId || "",
    },
    { enabled: !!(teacherId || employeeId) && !!currentBranchId }
  );

  // Fetch analytics for admins
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics
  } = api.leave.getLeaveAnalytics.useQuery(
    {
      branchId: currentBranchId || "",
      year: selectedYear,
    },
    { 
      enabled: !!(isAdmin || isSuperAdmin) && !!currentBranchId,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch recent applications for staff
  const {
    data: applicationsData,
    isLoading: isLoadingApplications,
    error: applicationsError,
  } = api.leave.getApplications.useQuery(
    { 
      teacherId, 
      employeeId,
      limit: 5,
      offset: 0,
    },
    {
      enabled: !!(teacherId || employeeId),
      refetchOnWindowFocus: false,
    }
  );

  if (isLoadingBranch) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  const isStaffMember = isTeacher || isEmployee;
  const isAdminUser = isAdmin || isSuperAdmin;

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="container-fluid px-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Leave Dashboard</h1>
          <p className="mt-2 text-slate-500">
            {isStaffMember ? "Overview of your leave status and recent applications" : "Analytics and insights for leave management"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {isAdminUser && (
            <Button
              onClick={() => refetchAnalytics()}
              variant="outline"
              size="sm"
              disabled={isLoadingAnalytics}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Admin Dashboard */}
      {isAdminUser && (
        <>
          {isLoadingAnalytics ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2">Loading analytics...</span>
            </div>
          ) : analyticsError ? (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Error loading analytics: {analyticsError.message}
              </AlertDescription>
            </Alert>
          ) : analytics ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-500">Total Applications</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.summary.totalApplications}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-amber-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-500">Pending</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.summary.pendingApplications}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-500">Approved</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.summary.approvedApplications}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-[#00501B]" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-500">Approval Rate</p>
                        <p className="text-2xl font-bold text-slate-900">{analytics.summary.approvalRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Applications by Policy */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-[#00501B]" />
                      Applications by Leave Type
                    </CardTitle>
                    <CardDescription>
                      Distribution of leave applications by policy type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.applicationsByPolicy.length > 0 ? (
                      <VerticalBarChart
                        data={analytics.applicationsByPolicy.map(item => ({
                          name: item.policyName,
                          value: item.count,
                        }))}
                        index="name"
                        categories={["value"]}
                        colors={["green"]}
                        className="h-64"
                      />
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Leave Utilization */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart2 className="h-5 w-5 mr-2 text-[#00501B]" />
                      Leave Utilization Rate
                    </CardTitle>
                    <CardDescription>
                      How much of allocated leave has been utilized
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.leaveBalancesSummary.length > 0 ? (
                      <VerticalBarChart
                        data={analytics.leaveBalancesSummary.map(item => ({
                          name: item.policyName,
                          value: Math.round(item.utilizationRate),
                        }))}
                        index="name"
                        categories={["value"]}
                        colors={["blue"]}
                        valueFormatter={(value: number) => `${value}%`}
                        className="h-64"
                      />
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Leave Balance Summary */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-[#00501B]" />
                    Leave Balance Summary
                  </CardTitle>
                  <CardDescription>
                    Overview of leave balances across all policies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-medium text-slate-700">Policy</th>
                          <th className="text-right py-2 font-medium text-slate-700">Total Days</th>
                          <th className="text-right py-2 font-medium text-slate-700">Used Days</th>
                          <th className="text-right py-2 font-medium text-slate-700">Remaining</th>
                          <th className="text-right py-2 font-medium text-slate-700">Utilization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.leaveBalancesSummary.map((item) => (
                          <tr key={item.policyId} className="border-b border-slate-100">
                            <td className="py-2 text-slate-900">{item.policyName}</td>
                            <td className="py-2 text-right text-slate-700">{item.totalDays}</td>
                            <td className="py-2 text-right text-slate-700">{item.usedDays}</td>
                            <td className="py-2 text-right text-slate-700">{item.remainingDays}</td>
                            <td className="py-2 text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.utilizationRate > 80 
                                  ? 'bg-red-100 text-red-700' 
                                  : item.utilizationRate > 60
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {item.utilizationRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="pt-6 text-center">
                <BarChart2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No Analytics Data</h3>
                <p className="text-sm text-slate-500">
                  Analytics will be available once leave applications are submitted.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Staff Dashboard */}
      {isStaffMember && (
        <>
          {/* Leave Balance Cards */}
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-[#00501B]" />
              Your Leave Balance ({selectedYear})
            </h2>
            
            {leaveBalance && leaveBalance.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveBalance.map((balance) => (
                  <LeaveBalanceCard key={balance.id} balance={balance} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="pt-6 text-center">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">No Leave Balances</h3>
                  <p className="text-sm text-slate-500">
                    Your leave balances will appear here once policies are configured.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Applications */}
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-[#00501B]" />
              Recent Applications
            </h2>
            
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                {isLoadingApplications ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading applications...</span>
                  </div>
                ) : applicationsError ? (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      Error loading applications: {applicationsError.message}
                    </AlertDescription>
                  </Alert>
                ) : applicationsData?.applications && applicationsData.applications.length > 0 ? (
                  <LeaveApplicationsList
                    teacherId={teacherId}
                    employeeId={employeeId}
                    isAdmin={false}
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No Applications Yet</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      You haven't submitted any leave applications yet.
                    </p>
                    <Button asChild className="bg-[#00501B] hover:bg-[#004016]">
                      <a href="/leaves/application">Apply for Leave</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-[#00501B]/10 rounded-lg">
                <FileText className="h-6 w-6 text-[#00501B]" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-slate-900">
                  {isStaffMember ? "Apply for Leave" : "View All Applications"}
                </h3>
                <p className="text-sm text-slate-500">
                  {isStaffMember ? "Submit a new leave request" : "Manage and review applications"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdminUser && (
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-slate-900">Manage Policies</h3>
                  <p className="text-sm text-slate-500">Configure leave policies and rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-slate-900">
                  {isStaffMember ? "View Balance" : "Staff Balances"}
                </h3>
                <p className="text-sm text-slate-500">
                  {isStaffMember ? "Check your leave balance" : "Monitor staff leave balances"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicLeaveDashboardPageContent = dynamic(() => Promise.resolve(LeaveDashboardPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function LeaveDashboardPage() {
  return <DynamicLeaveDashboardPageContent />;
} 