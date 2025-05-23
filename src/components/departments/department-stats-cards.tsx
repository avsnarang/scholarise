"use client";

import { useState, useEffect } from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import {
  Building,
  Briefcase,
  Users,
  BarChart3,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DepartmentStatsCardsProps {
  branchId?: string;
}

export function DepartmentStatsCards({ branchId }: DepartmentStatsCardsProps) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const effectiveBranchId = branchId || getBranchFilterParam();
  const [retryCount, setRetryCount] = useState(0);

  // Log the branch we're querying
  console.log("DepartmentStatsCards - using branchId:", effectiveBranchId);

  // Fetch department statistics from API
  const { data: departmentStats, isLoading, error, refetch } = api.department.getStats.useQuery(
    effectiveBranchId ? { branchId: effectiveBranchId } : {},
    { 
      retry: 2,
      refetchOnWindowFocus: false,
      enabled: retryCount < 3 // Only enable if we haven't retried too many times
    }
  );

  // Log the results for debugging
  useEffect(() => {
    console.log("Department stats received:", departmentStats);
    if (error) {
      console.error("Error fetching department stats:", error);
    }
  }, [departmentStats, error]);

  // Handle manual retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  // If query hasn't returned data yet, use these defaults
  const totalDepartments = departmentStats?.totalDepartments ?? 0;
  const activeDepartments = departmentStats?.activeDepartments ?? 0;
  const academicDepartments = departmentStats?.academicDepartments ?? 0;
  const administrativeDepartments = departmentStats?.administrativeDepartments ?? 0;
  
  // Sample change percentages (replace with actual data when available)
  const totalDepartmentsChange = 2.5;
  const activeDepartmentsChange = 1.8;
  const academicDepartmentsChange = 3.2;
  const administrativeDepartmentsChange = 0.5;

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Error loading department statistics: {error.message}</span>
          {retryCount < 3 && (
            <Button variant="outline" size="sm" onClick={handleRetry} className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <CardDescription><Skeleton className="h-4 w-24" /></CardDescription>
              <CardTitle><Skeleton className="h-8 w-16" /></CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Departments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalDepartments}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalDepartmentsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {totalDepartmentsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalDepartmentsChange >= 0 ? "+" : ""}{totalDepartmentsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Building className="size-4 text-[#00501B]" /> 
            All Departments
          </div>
          <div className="text-muted-foreground">
            Academic and administrative
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Departments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeDepartments}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={activeDepartmentsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {activeDepartmentsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {activeDepartmentsChange >= 0 ? "+" : ""}{activeDepartmentsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Briefcase className="size-4 text-[#00501B]" /> 
            Currently Active
          </div>
          <div className="text-muted-foreground">
            {totalDepartments > 0
              ? `${Math.round((activeDepartments / totalDepartments) * 100)}% of total departments`
              : "No departments found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Academic Departments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {academicDepartments}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={academicDepartmentsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {academicDepartmentsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {academicDepartmentsChange >= 0 ? "+" : ""}{academicDepartmentsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Users className="size-4 text-[#00501B]" /> 
            Teaching Related
          </div>
          <div className="text-muted-foreground">
            {totalDepartments > 0
              ? `${Math.round((academicDepartments / totalDepartments) * 100)}% of total departments`
              : "No academic departments found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Admin Departments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {administrativeDepartments}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={administrativeDepartmentsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {administrativeDepartmentsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {administrativeDepartmentsChange >= 0 ? "+" : ""}{administrativeDepartmentsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <BarChart3 className="size-4 text-[#00501B]" /> 
            Non-Teaching Related
          </div>
          <div className="text-muted-foreground">
            {totalDepartments > 0
              ? `${Math.round((administrativeDepartments / totalDepartments) * 100)}% of total departments`
              : "No administrative departments found"}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 