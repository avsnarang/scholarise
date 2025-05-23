"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { LeaveApplicationForm } from "@/components/leaves/leave-application-form";
import { LeaveApplicationsList } from "@/components/leaves/leave-applications-list";
import { LeavePoliciesList } from "@/components/leaves/leave-policies-list";
import { LeaveBalanceCard } from "@/components/leaves/leave-balance-card";
import type { LeaveBalance } from "@/components/leaves/leave-balance-card";
import { Loader2 } from "lucide-react";

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState("applications");
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin, teacherId, employeeId } = useUserRole();
  const { currentBranchId, isLoading: isLoadingBranch } = useBranchContext();

  // Fetch leave policies
  const { data: policies, isLoading: isLoadingPolicies, error: policiesError } = api.leave.getPolicies.useQuery(
    { branchId: currentBranchId || "" },
    { 
      enabled: !!currentBranchId,
      retry: 3,
      retryDelay: 1000
    }
  );

  // Fetch leave balance
  const { data: leaveBalance, isLoading: isLoadingBalance } = api.leave.getLeaveBalance.useQuery(
    {
      teacherId,
      employeeId,
      year: new Date().getFullYear(),
    },
    { 
      enabled: !!(teacherId || employeeId),
      retry: 3,
      retryDelay: 1000
    }
  );

  const isLoading = isLoadingBranch || isLoadingPolicies;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading leave management...</span>
      </div>
    );
  }

  if (policiesError) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-3xl font-bold text-[#00501B] mb-4">Leave Management</h1>
        <div className="py-8 text-center">
          <p className="text-destructive">Error loading leave policies</p>
          <p className="text-muted-foreground mt-2">
            Please try refreshing the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-6 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Leave Management</h1>
          <p className="mt-2 text-slate-500">
            Manage leave applications and policies for your institution
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="applications" className="data-[state=active]:bg-white data-[state=active]:text-[#00501B] data-[state=active]:shadow">Leave Applications</TabsTrigger>
          {(isAdmin || isSuperAdmin) && (
            <TabsTrigger value="policies" className="data-[state=active]:bg-white data-[state=active]:text-[#00501B] data-[state=active]:shadow">Leave Policies</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="applications" className="space-y-8">
          {/* Leave Balance Card - Only show for teachers and employees, not for admins */}
          {(isTeacher || isEmployee) && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00501B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Leave Balance
              </h2>
              {isLoadingBalance ? (
                <div className="flex justify-center items-center py-8 bg-white rounded-lg border border-slate-200">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00501B]" />
                  <span className="ml-2 text-slate-600">Loading leave balances...</span>
                </div>
              ) : leaveBalance && leaveBalance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaveBalance.map((balance: LeaveBalance) => (
                    <LeaveBalanceCard key={balance.id} balance={balance} />
                  ))}
                </div>
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="py-10 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-500 font-medium">No leave balances found</p>
                    <p className="text-slate-400 text-sm mt-1">Please contact your administrator to set up leave policies.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Leave Application Form */}
          {(isTeacher || isEmployee) && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00501B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Apply for Leave
              </h2>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                  <LeaveApplicationForm
                    policies={policies || []}
                    teacherId={teacherId}
                    employeeId={employeeId}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Leave Applications List */}
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00501B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Leave Applications
            </h2>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                <LeaveApplicationsList
                  teacherId={teacherId}
                  employeeId={employeeId}
                  isAdmin={isAdmin || isSuperAdmin}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {(isAdmin || isSuperAdmin) && (
          <TabsContent value="policies">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00501B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Leave Policies
              </h2>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                  <LeavePoliciesList branchId={currentBranchId || ""} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 