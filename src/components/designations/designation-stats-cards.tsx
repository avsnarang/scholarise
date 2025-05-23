"use client";

import { useState, useEffect } from "react";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import {
  Tag,
  BadgeCheck,
  Layers,
  BarChart2,
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

interface DesignationStatsCardsProps {
  branchId?: string;
}

export function DesignationStatsCards({ branchId }: DesignationStatsCardsProps) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const effectiveBranchId = branchId || getBranchFilterParam();
  const [retryCount, setRetryCount] = useState(0);

  // Log the branch we're querying
  console.log("DesignationStatsCards - using branchId:", effectiveBranchId);

  // Fetch designation statistics from API
  const { data: designationStats, isLoading, error, refetch } = api.designation.getStats.useQuery(
    effectiveBranchId ? { branchId: effectiveBranchId } : {},
    { 
      retry: 2,
      refetchOnWindowFocus: false,
      enabled: retryCount < 3 // Only enable if we haven't retried too many times
    }
  );

  // Log the results for debugging
  useEffect(() => {
    console.log("Designation stats received:", designationStats);
    if (error) {
      console.error("Error fetching designation stats:", error);
    }
  }, [designationStats, error]);

  // Handle manual retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  // If query hasn't returned data yet, use these defaults
  const totalDesignations = designationStats?.totalDesignations ?? 0;
  const activeDesignations = designationStats?.activeDesignations ?? 0;
  const teachingDesignations = designationStats?.teachingDesignations ?? 0;
  const adminDesignations = designationStats?.adminDesignations ?? 0;
  
  // Sample change percentages (replace with actual data when available)
  const totalDesignationsChange = 3.1;
  const activeDesignationsChange = 2.7;
  const teachingDesignationsChange = 1.5;
  const adminDesignationsChange = 4.2;

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Error loading designation statistics: {error.message}</span>
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
          <CardDescription>Total Designations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalDesignations}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalDesignationsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {totalDesignationsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalDesignationsChange >= 0 ? "+" : ""}{totalDesignationsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Tag className="size-4 text-[#00501B]" /> 
            All Role Types
          </div>
          <div className="text-muted-foreground">
            Teaching and administrative roles
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Designations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeDesignations}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={activeDesignationsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {activeDesignationsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {activeDesignationsChange >= 0 ? "+" : ""}{activeDesignationsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <BadgeCheck className="size-4 text-[#00501B]" /> 
            Currently Active
          </div>
          <div className="text-muted-foreground">
            {totalDesignations > 0
              ? `${Math.round((activeDesignations / totalDesignations) * 100)}% of total designations`
              : "No designations found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Teaching Roles</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {teachingDesignations}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={teachingDesignationsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {teachingDesignationsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {teachingDesignationsChange >= 0 ? "+" : ""}{teachingDesignationsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Layers className="size-4 text-[#00501B]" /> 
            Faculty Positions
          </div>
          <div className="text-muted-foreground">
            {totalDesignations > 0
              ? `${Math.round((teachingDesignations / totalDesignations) * 100)}% of total designations`
              : "No teaching designations found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Admin Roles</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {adminDesignations}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={adminDesignationsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {adminDesignationsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {adminDesignationsChange >= 0 ? "+" : ""}{adminDesignationsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <BarChart2 className="size-4 text-[#00501B]" /> 
            Administrative Positions
          </div>
          <div className="text-muted-foreground">
            {totalDesignations > 0
              ? `${Math.round((adminDesignations / totalDesignations) * 100)}% of total designations`
              : "No administrative designations found"}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 