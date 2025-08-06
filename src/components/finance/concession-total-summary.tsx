'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, TrendingUp, TrendingDown, Users, Percent } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import { api } from '@/utils/api';

interface ConcessionTotalSummaryProps {
  branchId?: string;
  sessionId?: string;
  className?: string;
}

export function ConcessionTotalSummary({ 
  branchId, 
  sessionId,
  className 
}: ConcessionTotalSummaryProps) {
  // Fetch concession summary data
  const { data: concessions, isLoading: concessionsLoading } = api.finance.getStudentConcessions.useQuery({
    branchId,
    sessionId,
    status: 'APPROVED'
  });

  // Optional: Fetch fee collection summary for comparison
  const { data: collectionSummary, isLoading: summaryLoading } = api.finance.getCollectionSummaryReport.useQuery({
    branchId: branchId!,
    sessionId: sessionId!
  }, {
    enabled: !!branchId && !!sessionId
  });

  const summaryStats = useMemo(() => {
    if (!concessions) {
      return {
        totalStudentsWithConcessions: 0,
        totalPercentageConcessions: 0,
        totalFixedConcessions: 0,
        estimatedTotalConcessionAmount: 0,
        averageConcessionPercentage: 0,
        totalFixedAmount: 0,
        concessionTypes: {
          percentage: 0,
          fixed: 0
        }
      };
    }

    // Get unique students with concessions
    const uniqueStudents = new Set(concessions.map(c => c.studentId));
    const totalStudentsWithConcessions = uniqueStudents.size;

    // Separate percentage and fixed concessions
    const percentageConcessions = concessions.filter(c => c.concessionType?.type === 'PERCENTAGE');
    const fixedConcessions = concessions.filter(c => c.concessionType?.type === 'FIXED');

    // Calculate totals
    let totalPercentageConcessions = 0;
    let totalFixedConcessions = 0;
    let totalPercentageSum = 0;

    percentageConcessions.forEach(c => {
      if (c.concessionType?.value) {
        totalPercentageSum += c.concessionType.value;
        totalPercentageConcessions++;
      }
    });

    fixedConcessions.forEach(c => {
      if (c.concessionType?.feeTermAmounts) {
        // For FIXED type, sum up the term-specific amounts
        const termAmounts = c.concessionType.feeTermAmounts as Record<string, number>;
        const termTotal = Object.values(termAmounts).reduce((sum, amount) => sum + amount, 0);
        totalFixedConcessions += termTotal;
      } else if (c.concessionType?.value) {
        // Fallback to old value for backward compatibility
        totalFixedConcessions += c.concessionType.value;
      }
    });

    const averageConcessionPercentage = totalPercentageConcessions > 0 
      ? totalPercentageSum / totalPercentageConcessions 
      : 0;

    // Estimate total concession amount
    // For a more accurate calculation, you would need to fetch individual student fee structures
    const estimatedTotalConcessionAmount = totalFixedConcessions;

    return {
      totalStudentsWithConcessions,
      totalPercentageConcessions: percentageConcessions.length,
      totalFixedConcessions: fixedConcessions.length,
      estimatedTotalConcessionAmount,
      averageConcessionPercentage,
      totalFixedAmount: totalFixedConcessions,
      concessionTypes: {
        percentage: percentageConcessions.length,
        fixed: fixedConcessions.length
      }
    };
  }, [concessions]);

  const isLoading = concessionsLoading || summaryLoading;

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {/* Total Students with Concessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Students with Concessions
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">
              {summaryStats.totalStudentsWithConcessions}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Active concessions
          </p>
        </CardContent>
      </Card>

      {/* Percentage Concessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Percentage Concessions
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div>
              <div className="text-2xl font-bold">
                {summaryStats.totalPercentageConcessions}
              </div>
              {summaryStats.averageConcessionPercentage > 0 && (
                <p className="text-sm text-muted-foreground">
                  Avg: {summaryStats.averageConcessionPercentage.toFixed(1)}%
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fixed Amount Concessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Fixed Concessions
          </CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div>
              <div className="text-2xl font-bold">
                {summaryStats.totalFixedConcessions}
              </div>
              <p className="text-sm text-muted-foreground">
                Total: {formatIndianCurrency(summaryStats.totalFixedAmount)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Concession Impact */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Fixed Amount
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div>
              <div className="text-2xl font-bold">
                {formatIndianCurrency(summaryStats.totalFixedAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                From fixed concessions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}