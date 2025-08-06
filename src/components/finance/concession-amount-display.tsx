'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Info, IndianRupee, Percent } from 'lucide-react';
import { api } from '@/utils/api';
import { formatIndianCurrency } from '@/lib/utils';
import { 
  calculateConcessionAmount,
  formatConcessionValue,
  getConcessionAmountDisplay 
} from '@/utils/concession-calculations';

interface ConcessionAmountDisplayProps {
  studentId: string;
  concessionType: {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    appliedFeeHeads?: string[];
    appliedFeeTerms?: string[];
    feeTermAmounts?: Record<string, number>;
  };
  branchId?: string;
  sessionId?: string;
  compact?: boolean;
}

export function ConcessionAmountDisplay({ 
  studentId, 
  concessionType,
  branchId,
  sessionId,
  compact = false
}: ConcessionAmountDisplayProps) {
  // Fetch student's fee structure to calculate actual concession amount
  const { data: feeStructure, isLoading } = api.finance.getStudentFeeDetails.useQuery(
    { 
      studentId,
      branchId: branchId || '',
      sessionId: sessionId || ''
    },
    {
      enabled: !!studentId && !!branchId && !!sessionId && concessionType.type === 'PERCENTAGE',
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Calculate the actual concession amount
  const concessionInfo = useMemo(() => {
    if (concessionType.type === 'FIXED') {
      // For FIXED type, sum up the term-specific amounts
      if (concessionType.feeTermAmounts && typeof concessionType.feeTermAmounts === 'object') {
        const termAmounts = concessionType.feeTermAmounts as Record<string, number>;
        const totalFixedAmount = Object.values(termAmounts).reduce((sum, amount) => sum + amount, 0);
        
        return {
          displayValue: formatIndianCurrency(totalFixedAmount),
          actualAmount: totalFixedAmount,
          description: `Fixed amounts per term: ${formatIndianCurrency(totalFixedAmount)}`,
          isEstimated: false
        };
      } else {
        // Fallback to single value for backward compatibility
        return {
          displayValue: formatIndianCurrency(concessionType.value),
          actualAmount: concessionType.value,
          description: `Fixed discount of ${formatIndianCurrency(concessionType.value)}`,
          isEstimated: false
        };
      }
    }

    // For percentage type
    if (!feeStructure || isLoading) {
      return {
        displayValue: `${concessionType.value}%`,
        actualAmount: null,
        description: `${concessionType.value}% discount on applicable fees`,
        isEstimated: true
      };
    }

    // Calculate total applicable fees
    let totalApplicableFees = 0;
    let applicableFeeHeads: string[] = [];

    if (feeStructure && Array.isArray(feeStructure)) {
      feeStructure.forEach((fs: any) => {
        // Check if this fee head/term is applicable for the concession
        const feeHeadApplicable = !concessionType.appliedFeeHeads?.length || 
          concessionType.appliedFeeHeads.includes(fs.feeHeadId);
        const feeTermApplicable = !concessionType.appliedFeeTerms?.length || 
          concessionType.appliedFeeTerms.includes(fs.feeTermId);
        
        if (feeHeadApplicable && feeTermApplicable) {
          totalApplicableFees += fs.amount || 0;
          if (fs.feeHeadName && !applicableFeeHeads.includes(fs.feeHeadName)) {
            applicableFeeHeads.push(fs.feeHeadName);
          }
        }
      });
    }

    const actualAmount = calculateConcessionAmount(concessionType, totalApplicableFees);
    
    return {
      displayValue: `${concessionType.value}%`,
      actualAmount,
      totalApplicableFees,
      applicableFeeHeads,
      description: `${concessionType.value}% of ${formatIndianCurrency(totalApplicableFees)} = ${formatIndianCurrency(actualAmount)}`,
      isEstimated: false
    };
  }, [concessionType, feeStructure, isLoading]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {concessionType.type === 'PERCENTAGE' ? (
          <Badge variant="secondary" className="gap-1">
            <Percent className="h-3 w-3" />
            {concessionType.value}%
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <IndianRupee className="h-3 w-3" />
            {formatIndianCurrency(concessionType.value)}
          </Badge>
        )}
        {concessionInfo.actualAmount !== null && concessionType.type === 'PERCENTAGE' && (
          <span className="text-sm text-muted-foreground">
            ≈ {formatIndianCurrency(concessionInfo.actualAmount)}
          </span>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Concession Type Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={concessionType.type === 'PERCENTAGE' ? 'secondary' : 'outline'}
            className="gap-1"
          >
            {concessionType.type === 'PERCENTAGE' ? (
              <Percent className="h-3 w-3" />
            ) : (
              <IndianRupee className="h-3 w-3" />
            )}
            {concessionInfo.displayValue}
          </Badge>
          
          {/* Show loading state for percentage calculations */}
          {concessionType.type === 'PERCENTAGE' && isLoading && (
            <Skeleton className="h-4 w-20" />
          )}
          
          {/* Show calculated amount for percentage */}
          {concessionType.type === 'PERCENTAGE' && !isLoading && concessionInfo.actualAmount !== null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <span className="text-sm font-medium text-primary">
                    {formatIndianCurrency(concessionInfo.actualAmount)}
                  </span>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Concession Calculation</p>
                  <div className="text-sm space-y-1">
                    <p>Total Applicable Fees: {formatIndianCurrency(concessionInfo.totalApplicableFees || 0)}</p>
                    <p>Discount: {concessionType.value}%</p>
                    <p className="font-medium">Concession Amount: {formatIndianCurrency(concessionInfo.actualAmount)}</p>
                  </div>
                  {concessionInfo.applicableFeeHeads && concessionInfo.applicableFeeHeads.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p>Applied to: {concessionInfo.applicableFeeHeads.join(', ')}</p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Additional Info for non-compact view */}
        {!compact && concessionInfo.description && (
          <p className="text-xs text-muted-foreground">
            {concessionInfo.description}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}