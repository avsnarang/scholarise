"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { LeaveApplicationForm } from "@/components/leaves/leave-application-form";
import { LeaveApplicationsList } from "@/components/leaves/leave-applications-list";
import { LeaveBalanceCard } from "@/components/leaves/leave-balance-card";
import { Loader2, Plus, Calendar, ClipboardList, Settings, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

function LeaveApplicationsPageContent() {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin, teacherId, employeeId } = useUserRole();
  const { currentBranchId, isLoading: isLoadingBranch } = useBranchContext();

  // Fetch leave policies
  const { 
    data: policies, 
    isLoading: isLoadingPolicies, 
    error: policiesError,
    refetch: refetchPolicies 
  } = api.leave.getPolicies.useQuery(
    { branchId: currentBranchId || "" },
    { 
      enabled: !!currentBranchId,
      retry: 3,
      retryDelay: 1000
    }
  );

  // Fetch leave balance with auto-initialization
  const { 
    data: leaveBalance, 
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance 
  } = api.leave.getLeaveBalance.useQuery(
    {
      teacherId,
      employeeId,
      year: new Date().getFullYear(),
      branchId: currentBranchId || "",
    },
    { 
      enabled: !!(teacherId || employeeId) && !!currentBranchId,
      retry: 3,
      retryDelay: 1000
    }
  );

  // Initialize leave balances mutation
  const initializeBalances = api.leave.initializeLeaveBalances.useMutation({
    onSuccess: (result) => {
      void refetchBalance();
      if (result.initialized > 0) {
        // Show success message
        console.log(`Initialized ${result.initialized} leave balances`);
      }
    },
    onError: (error) => {
      console.error("Failed to initialize leave balances:", error);
    },
  });

  const isLoading = isLoadingBranch || isLoadingPolicies;
  const isStaffMember = isTeacher || isEmployee;
  const isAdminUser = isAdmin || isSuperAdmin;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading leave applications...</span>
      </div>
    );
  }

  if (policiesError) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-3xl font-bold text-[#00501B] mb-4">Leave Applications</h1>
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading leave policies: {policiesError.message}
            <Button 
              onClick={() => refetchPolicies()} 
              variant="outline" 
              size="sm" 
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if staff member has any policies available
  const availablePolicies = policies?.filter(policy => {
    const userRole = isTeacher ? "Teacher" : "Employee";
    return policy.applicableRoles.includes(userRole);
  }) || [];

  return (
    <div className="container-fluid px-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Leave Applications</h1>
          <p className="mt-2 text-slate-500">
            Apply for leave and manage your leave applications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Admin Link to Policies */}
          {isAdminUser && (
            <Link href="/leaves/policies">
              <Button variant="outline" className="text-[#00501B] border-[#00501B] hover:bg-[#00501B]/5">
                <Settings className="h-4 w-4 mr-2" />
                Manage Policies
              </Button>
            </Link>
          )}
          
          {/* Quick Apply Button for Staff */}
          {isStaffMember && availablePolicies.length > 0 && (
            <Button
              onClick={() => setShowApplicationForm(!showApplicationForm)}
              className="bg-[#00501B] hover:bg-[#004016]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Apply for Leave
            </Button>
          )}
        </div>
      </div>

      {/* Staff member warning if no policies available */}
      {isStaffMember && availablePolicies.length === 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            No leave policies are currently available for your role. Please contact your administrator.
          </AlertDescription>
        </Alert>
      )}

      {/* Leave Balance Cards - Staff Only */}
      {isStaffMember && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-[#00501B]" />
              Your Leave Balance
            </h2>
            {balanceError && (
              <Button
                onClick={() => refetchBalance()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
          
          {isLoadingBalance ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2">Loading leave balances...</span>
            </div>
          ) : balanceError ? (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Error loading leave balances: {balanceError.message}
              </AlertDescription>
            </Alert>
          ) : leaveBalance && leaveBalance.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveBalance.map((balance) => (
                <LeaveBalanceCard key={balance.id} balance={balance} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="pt-6 text-center">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No Leave Balances Found</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Your leave balances will be automatically initialized when policies are available.
                </p>
                {availablePolicies.length > 0 && (
                  <Button
                    onClick={() => {
                      if (currentBranchId) {
                        // Initialize balances for each available policy
                        availablePolicies.forEach(policy => {
                          initializeBalances.mutate({
                            policyId: policy.id,
                            branchId: currentBranchId,
                          });
                        });
                      }
                    }}
                    variant="outline"
                    disabled={initializeBalances.isPending}
                  >
                    {initializeBalances.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Initialize Leave Balances
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Leave Application Form - Staff Only */}
      {isStaffMember && availablePolicies.length > 0 && (showApplicationForm || (!leaveBalance || leaveBalance.length === 0)) && (
        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-[#00501B]" />
            Apply for Leave
          </h2>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>New Leave Application</CardTitle>
              <CardDescription>
                Fill out the form below to submit a new leave application. 
                Make sure to provide all required details for faster processing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveApplicationForm
                policies={availablePolicies}
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
          <ClipboardList className="h-5 w-5 mr-2 text-[#00501B]" />
          {isAdminUser ? "All Leave Applications" : "Your Leave Applications"}
        </h2>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <LeaveApplicationsList
              teacherId={teacherId}
              employeeId={employeeId}
              isAdmin={isAdminUser}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicLeaveApplicationsPageContent = dynamic(() => Promise.resolve(LeaveApplicationsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function LeaveApplicationsPage() {
  return <DynamicLeaveApplicationsPageContent />;
} 