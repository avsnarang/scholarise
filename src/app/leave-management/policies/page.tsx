"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranchContext } from "@/hooks/useBranchContext";
import { api } from "@/utils/api";
import { LeavePoliciesList } from "@/components/leaves/leave-policies-list";
import { Loader2, Settings, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function LeavePoliciesPage() {
  const { isAdmin, isSuperAdmin } = useUserRole();
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

  const isLoading = isLoadingBranch || isLoadingPolicies;

  // Redirect non-admin users
  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-3xl font-bold text-[#00501B] mb-4">Access Denied</h1>
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access leave policies management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading leave policies...</span>
      </div>
    );
  }

  if (policiesError) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-3xl font-bold text-[#00501B] mb-4">Leave Policies</h1>
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

  return (
    <div className="container-fluid px-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Leave Policies Management</h1>
          <p className="mt-2 text-slate-500">
            Configure leave policies, manage applicable roles, and set leave entitlements for your organization
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-500">
            {policies?.length || 0} policies configured
          </div>
          <Button
            onClick={() => refetchPolicies()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-[#00501B]" />
            Manage Leave Policies
          </CardTitle>
          <CardDescription>
            Configure leave policies, manage applicable roles, and set leave entitlements 
            for your organization. Changes will affect all staff members and their leave balances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentBranchId ? (
            <LeavePoliciesList branchId={currentBranchId} />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No branch selected. Please select a branch to manage leave policies.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 