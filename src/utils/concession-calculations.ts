import { formatIndianCurrency } from '@/lib/utils';

export interface ConcessionType {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  appliedFeeHeads?: string[];
  appliedFeeTerms?: string[];
  feeTermAmounts?: Record<string, number>;
}

export interface StudentConcession {
  id: string;
  concessionType: ConcessionType;
  validFrom: Date;
  validUntil?: Date | null;
  status: string;
}

export interface FeeStructureItem {
  feeHeadId: string;
  feeHeadName: string;
  feeTermId: string;
  feeTermName: string;
  amount: number;
}

/**
 * Calculate the actual concession amount based on concession type and fee amount
 */
export function calculateConcessionAmount(
  concessionType: ConcessionType,
  baseFeeAmount: number,
  feeTermId?: string
): number {
  if (concessionType.type === 'PERCENTAGE') {
    return Math.round((baseFeeAmount * concessionType.value) / 100);
  } else {
    // For FIXED type, if feeTermId is provided, get the specific amount for that term
    if (feeTermId && concessionType.feeTermAmounts) {
      const feeTermAmounts = concessionType.feeTermAmounts as Record<string, number>;
      const termAmount = feeTermAmounts[feeTermId] || 0;
      return Math.min(termAmount, baseFeeAmount);
    }
    // Fallback to total value for backward compatibility
    return Math.min(concessionType.value, baseFeeAmount);
  }
}

/**
 * Calculate total concession amount for a student based on their fee structure
 */
export function calculateTotalConcessionAmount(
  concessionType: ConcessionType,
  feeStructures: FeeStructureItem[]
): {
  totalFeeAmount: number;
  totalConcessionAmount: number;
  effectiveAmount: number;
  appliedToFeeHeads: FeeStructureItem[];
} {
  // Filter fee structures based on applied fee heads and terms
  let applicableFeeStructures = feeStructures;
  
  if (concessionType.appliedFeeHeads && concessionType.appliedFeeHeads.length > 0) {
    applicableFeeStructures = applicableFeeStructures.filter(
      fs => concessionType.appliedFeeHeads!.includes(fs.feeHeadId)
    );
  }
  
  if (concessionType.appliedFeeTerms && concessionType.appliedFeeTerms.length > 0) {
    applicableFeeStructures = applicableFeeStructures.filter(
      fs => concessionType.appliedFeeTerms!.includes(fs.feeTermId)
    );
  }
  
  // Calculate total fee amount for applicable items
  const totalFeeAmount = applicableFeeStructures.reduce(
    (sum, fs) => sum + fs.amount, 
    0
  );
  
  // Calculate concession amount
  let totalConcessionAmount = 0;
  
  if (concessionType.type === 'PERCENTAGE') {
    totalConcessionAmount = Math.round((totalFeeAmount * concessionType.value) / 100);
  } else {
    // For FIXED type, sum up the amounts for applicable fee structures
    if (concessionType.feeTermAmounts) {
      const feeTermAmounts = concessionType.feeTermAmounts as Record<string, number>;
      
      applicableFeeStructures.forEach(fs => {
        const termAmount = feeTermAmounts[fs.feeTermId] || 0;
        totalConcessionAmount += Math.min(termAmount, fs.amount);
      });
    } else {
      // Fallback: distribute the total value proportionally
      totalConcessionAmount = Math.min(concessionType.value, totalFeeAmount);
    }
  }
  
  const effectiveAmount = totalFeeAmount - totalConcessionAmount;
  
  return {
    totalFeeAmount,
    totalConcessionAmount,
    effectiveAmount,
    appliedToFeeHeads: applicableFeeStructures
  };
}

/**
 * Format concession display value
 */
export function formatConcessionValue(
  type: 'PERCENTAGE' | 'FIXED',
  value: number
): string {
  if (type === 'PERCENTAGE') {
    return `${value}%`;
  } else {
    return formatIndianCurrency(value);
  }
}

/**
 * Get concession amount display text
 */
export function getConcessionAmountDisplay(
  concessionType: ConcessionType,
  estimatedTotalFees?: number
): {
  displayValue: string;
  estimatedSavings?: string;
  description: string;
} {
  const formattedValue = formatConcessionValue(concessionType.type, concessionType.value);
  
  if (concessionType.type === 'PERCENTAGE') {
    let description = `${concessionType.value}% discount on applicable fees`;
    let estimatedSavings;
    
    if (estimatedTotalFees && estimatedTotalFees > 0) {
      const savings = calculateConcessionAmount(concessionType, estimatedTotalFees);
      estimatedSavings = formatIndianCurrency(savings);
      description = `${concessionType.value}% discount (approx. ${estimatedSavings})`;
    }
    
    return {
      displayValue: formattedValue,
      estimatedSavings,
      description
    };
  } else {
    return {
      displayValue: formattedValue,
      description: `Fixed discount of ${formattedValue}`
    };
  }
}

/**
 * Check if a concession is currently active
 */
export function isConcessionActive(
  concession: StudentConcession,
  asOfDate: Date = new Date()
): boolean {
  if (concession.status !== 'APPROVED') return false;
  
  const validFrom = new Date(concession.validFrom);
  const validUntil = concession.validUntil ? new Date(concession.validUntil) : null;
  
  if (asOfDate < validFrom) return false;
  if (validUntil && asOfDate > validUntil) return false;
  
  return true;
}

/**
 * Get concession status display
 */
export function getConcessionStatusInfo(
  concession: StudentConcession
): {
  isActive: boolean;
  statusText: string;
  statusColor: 'default' | 'secondary' | 'destructive' | 'warning';
} {
  const now = new Date();
  const validFrom = new Date(concession.validFrom);
  const validUntil = concession.validUntil ? new Date(concession.validUntil) : null;
  
  if (concession.status === 'REJECTED') {
    return {
      isActive: false,
      statusText: 'Rejected',
      statusColor: 'destructive'
    };
  }
  
  if (concession.status === 'PENDING') {
    return {
      isActive: false,
      statusText: 'Pending Approval',
      statusColor: 'warning'
    };
  }
  
  if (concession.status === 'SUSPENDED') {
    return {
      isActive: false,
      statusText: 'Suspended',
      statusColor: 'secondary'
    };
  }
  
  if (concession.status === 'EXPIRED' || (validUntil && now > validUntil)) {
    return {
      isActive: false,
      statusText: 'Expired',
      statusColor: 'secondary'
    };
  }
  
  if (concession.status === 'APPROVED') {
    if (now < validFrom) {
      return {
        isActive: false,
        statusText: 'Upcoming',
        statusColor: 'secondary'
      };
    }
    
    return {
      isActive: true,
      statusText: 'Active',
      statusColor: 'default'
    };
  }
  
  return {
    isActive: false,
    statusText: 'Unknown',
    statusColor: 'secondary'
  };
}