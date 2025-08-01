/**
 * Fee Calculations and Business Logic Utilities
 * 
 * This module handles all fee-related calculations including:
 * - Late fee calculations
 * - Discount applications
 * - Installment calculations
 * - Fee due status determination
 * - Payment allocation logic
 */

// Types for fee calculations
export interface FeeStructure {
  id: string;
  feeHeadId: string;
  feeHeadName: string;
  feeTermId: string;
  feeTermName: string;
  baseAmount: number;
  dueDate: Date;
  lateFeeDays?: number;
  lateFeeAmount?: number;
  lateFeePercentage?: number;
  discountAmount?: number;
  discountPercentage?: number;
  discountReason?: string;
  installmentAllowed?: boolean;
  installmentCount?: number;
  installmentMinAmount?: number;
}

export interface StudentConcession {
  id: string;
  concessionTypeId: string;
  concessionTypeName: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  customValue?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED';
  validFrom: Date;
  validUntil?: Date;
  appliedFeeHeads: string[];
  appliedFeeTerms: string[];
  reason?: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMode: string;
  feeHeadId: string;
}

export interface CalculatedFee {
  feeHeadId: string;
  feeHeadName: string;
  feeTermId: string;
  feeTermName: string;
  baseAmount: number;
  discountAmount: number;
  concessionAmount: number;
  discountedAmount: number;
  lateFeeAmount: number;
  finalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: Date;
  overdueDays: number;
  status: 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';
  appliedConcessions?: StudentConcession[];
  installmentDetails?: {
    totalInstallments: number;
    paidInstallments: number;
    nextInstallmentAmount: number;
    nextInstallmentDue: Date;
  };
}

export interface FeeCalculationOptions {
  calculateLateFees?: boolean;
  applyDiscounts?: boolean;
  applyConcessions?: boolean;
  calculateInstallments?: boolean;
  asOfDate?: Date;
  gracePeriodDays?: number;
}

/**
 * Calculate late fees based on overdue days and fee structure
 */
export function calculateLateFee(
  baseAmount: number,
  dueDate: Date,
  asOfDate: Date = new Date(),
  lateFeeConfig?: {
    gracePeriodDays?: number;
    flatRate?: number;
    percentageRate?: number;
    maxLateFee?: number;
    compoundDaily?: boolean;
  }
): number {
  const overdueDays = Math.max(0, Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  if (overdueDays <= (lateFeeConfig?.gracePeriodDays || 0)) {
    return 0;
  }
  
  const actualOverdueDays = overdueDays - (lateFeeConfig?.gracePeriodDays || 0);
  let lateFee = 0;
  
  if (lateFeeConfig?.flatRate) {
    // Flat rate per day
    lateFee = actualOverdueDays * lateFeeConfig.flatRate;
  } else if (lateFeeConfig?.percentageRate) {
    // Percentage of base amount
    if (lateFeeConfig.compoundDaily) {
      // Compound daily interest
      lateFee = baseAmount * Math.pow(1 + (lateFeeConfig.percentageRate / 100), actualOverdueDays) - baseAmount;
    } else {
      // Simple percentage calculation
      lateFee = baseAmount * (lateFeeConfig.percentageRate / 100) * (actualOverdueDays / 30); // Monthly percentage
    }
  }
  
  // Apply maximum late fee cap if specified
  if (lateFeeConfig?.maxLateFee && lateFee > lateFeeConfig.maxLateFee) {
    lateFee = lateFeeConfig.maxLateFee;
  }
  
  return Math.round(lateFee * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate discount amount based on discount configuration
 */
export function calculateDiscount(
  baseAmount: number,
  discountConfig?: {
    type: 'percentage' | 'fixed';
    value: number;
    maxDiscount?: number;
    minFeeAfterDiscount?: number;
    conditions?: {
      earlyPaymentDays?: number;
      multipleChildren?: boolean;
      scholarshipType?: string;
    };
  }
): number {
  if (!discountConfig) return 0;
  
  let discountAmount = 0;
  
  if (discountConfig.type === 'percentage') {
    discountAmount = baseAmount * (discountConfig.value / 100);
  } else {
    discountAmount = discountConfig.value;
  }
  
  // Apply maximum discount cap
  if (discountConfig.maxDiscount && discountAmount > discountConfig.maxDiscount) {
    discountAmount = discountConfig.maxDiscount;
  }
  
  // Ensure minimum fee after discount
  if (discountConfig.minFeeAfterDiscount) {
    const feeAfterDiscount = baseAmount - discountAmount;
    if (feeAfterDiscount < discountConfig.minFeeAfterDiscount) {
      discountAmount = baseAmount - discountConfig.minFeeAfterDiscount;
    }
  }
  
  // Ensure discount doesn't exceed base amount
  discountAmount = Math.min(discountAmount, baseAmount);
  
  return Math.round(discountAmount * 100) / 100;
}

/**
 * Calculate concession amount based on student concessions
 */
export function calculateConcessions(
  baseAmount: number,
  feeHeadId: string,
  feeTermId: string,
  studentConcessions: StudentConcession[],
  asOfDate: Date = new Date()
): { concessionAmount: number; appliedConcessions: StudentConcession[] } {
  let totalConcessionAmount = 0;
  const appliedConcessions: StudentConcession[] = [];
  
  // Filter active and applicable concessions
  const applicableConcessions = studentConcessions.filter(concession => {
    // Check if concession is approved and within validity period
    if (concession.status !== 'APPROVED') return false;
    if (asOfDate < concession.validFrom) return false;
    if (concession.validUntil && asOfDate > concession.validUntil) return false;
    
    // Check if concession applies to this fee head (empty array means all fee heads)
    if (concession.appliedFeeHeads.length > 0 && !concession.appliedFeeHeads.includes(feeHeadId)) {
      return false;
    }
    
    // Check if concession applies to this fee term (empty array means all fee terms)
    if (concession.appliedFeeTerms.length > 0 && !concession.appliedFeeTerms.includes(feeTermId)) {
      return false;
    }
    
    return true;
  });
  
  // Calculate concession amounts
  applicableConcessions.forEach(concession => {
    const concessionValue = concession.customValue ?? concession.value;
    let concessionAmount = 0;
    
    if (concession.type === 'PERCENTAGE') {
      concessionAmount = baseAmount * (concessionValue / 100);
    } else {
      concessionAmount = concessionValue;
    }
    
    totalConcessionAmount += concessionAmount;
    appliedConcessions.push(concession);
  });
  
  // Ensure total concession doesn't exceed base amount
  totalConcessionAmount = Math.min(totalConcessionAmount, baseAmount);
  
  return {
    concessionAmount: Math.round(totalConcessionAmount * 100) / 100,
    appliedConcessions,
  };
}

/**
 * Calculate concession amount based on student concessions
 */
export function calculateConcessionAmount(
  baseAmount: number,
  feeHeadId: string,
  feeTermId: string,
  studentConcessions: StudentConcession[],
  asOfDate: Date = new Date()
): { amount: number; appliedConcessions: StudentConcession[] } {
  if (!studentConcessions || studentConcessions.length === 0) {
    return { amount: 0, appliedConcessions: [] };
  }
  
  const applicableConcessions = studentConcessions.filter(concession => {
    // Only consider approved concessions
    if (concession.status !== 'APPROVED') return false;
    
    // Check validity period
    const validFrom = new Date(concession.validFrom);
    const validUntil = concession.validUntil ? new Date(concession.validUntil) : null;
    
    if (asOfDate < validFrom) return false;
    if (validUntil && asOfDate > validUntil) return false;
    
    // Check if applies to specific fee heads (empty array means applies to all)
    if (concession.appliedFeeHeads.length > 0 && !concession.appliedFeeHeads.includes(feeHeadId)) {
      return false;
    }
    
    // Check if applies to specific fee terms (empty array means applies to all)
    if (concession.appliedFeeTerms.length > 0 && !concession.appliedFeeTerms.includes(feeTermId)) {
      return false;
    }
    
    return true;
  });
  
  if (applicableConcessions.length === 0) {
    return { amount: 0, appliedConcessions: [] };
  }
  
  // Calculate total concession amount
  let totalConcessionAmount = 0;
  
  applicableConcessions.forEach(concession => {
    const value = concession.customValue ?? concession.value;
    let concessionAmount = 0;
    
    if (concession.type === 'PERCENTAGE') {
      concessionAmount = baseAmount * (value / 100);
    } else {
      concessionAmount = value;
    }
    
    totalConcessionAmount += concessionAmount;
  });
  
  // Ensure total concession doesn't exceed base amount
  totalConcessionAmount = Math.min(totalConcessionAmount, baseAmount);
  
  return {
    amount: Math.round(totalConcessionAmount * 100) / 100,
    appliedConcessions: applicableConcessions,
  };
}

/**
 * Determine fee status based on amounts and dates
 */
export function determineFeeStatus(
  finalAmount: number,
  paidAmount: number,
  dueDate: Date,
  asOfDate: Date = new Date()
): 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue' {
  const outstanding = finalAmount - paidAmount;
  
  if (outstanding <= 0.01) { // Account for floating point precision
    return 'Paid';
  }
  
  if (paidAmount > 0) {
    return 'Partially Paid';
  }
  
  if (dueDate < asOfDate) {
    return 'Overdue';
  }
  
  return 'Pending';
}

/**
 * Calculate installment details for a fee
 */
export function calculateInstallments(
  totalAmount: number,
  installmentCount: number,
  paidAmount: number,
  startDate: Date,
  intervalDays = 30
): {
  installmentAmount: number;
  remainingInstallments: number;
  nextInstallmentDue: Date;
  installmentSchedule: Array<{
    installmentNumber: number;
    amount: number;
    dueDate: Date;
    status: 'Paid' | 'Pending' | 'Overdue';
  }>;
} {
  const installmentAmount = Math.round((totalAmount / installmentCount) * 100) / 100;
  const lastInstallmentAmount = totalAmount - (installmentAmount * (installmentCount - 1));
  
  let remainingAmount = paidAmount;
  let nextInstallmentDue = new Date(startDate);
  let remainingInstallments = installmentCount;
  
  const installmentSchedule = [];
  
  for (let i = 1; i <= installmentCount; i++) {
    const installmentDueDate = new Date(startDate);
    installmentDueDate.setDate(installmentDueDate.getDate() + (i - 1) * intervalDays);
    
    const thisInstallmentAmount = i === installmentCount ? lastInstallmentAmount : installmentAmount;
    
    let status: 'Paid' | 'Pending' | 'Overdue';
    if (remainingAmount >= thisInstallmentAmount) {
      status = 'Paid';
      remainingAmount -= thisInstallmentAmount;
      remainingInstallments--;
    } else if (remainingAmount > 0) {
      status = 'Pending'; // Partially paid installment
      remainingAmount = 0;
    } else {
      status = installmentDueDate < new Date() ? 'Overdue' : 'Pending';
      if (status === 'Pending' && i === Math.min(...installmentSchedule.map((_, idx) => remainingInstallments + idx + 1))) {
        nextInstallmentDue = installmentDueDate;
      }
    }
    
    installmentSchedule.push({
      installmentNumber: i,
      amount: thisInstallmentAmount,
      dueDate: installmentDueDate,
      status,
    });
  }
  
  return {
    installmentAmount,
    remainingInstallments,
    nextInstallmentDue,
    installmentSchedule,
  };
}

/**
 * Main fee calculation function that applies all business logic
 */
export function calculateStudentFees(
  feeStructures: FeeStructure[],
  paymentRecords: PaymentRecord[],
  options: FeeCalculationOptions = {},
  studentConcessions: StudentConcession[] = []
): CalculatedFee[] {
  const {
    calculateLateFees = true,
    applyDiscounts = true,
    applyConcessions = true,
    calculateInstallments: shouldCalculateInstallments = false,
    asOfDate = new Date(),
    gracePeriodDays = 0,
  } = options;
  
  return feeStructures.map((feeStructure) => {
    // Calculate base amounts
    const baseAmount = feeStructure.baseAmount;
    let discountAmount = 0;
    let concessionAmount = 0;
    let lateFeeAmount = 0;
    let appliedConcessions: StudentConcession[] = [];
    
    // Apply discounts if enabled
    if (applyDiscounts) {
      if (feeStructure.discountAmount) {
        discountAmount = feeStructure.discountAmount;
      } else if (feeStructure.discountPercentage) {
        discountAmount = calculateDiscount(baseAmount, {
          type: 'percentage',
          value: feeStructure.discountPercentage,
        });
      }
    }
    
    // Apply concessions if enabled
    if (applyConcessions && studentConcessions.length > 0) {
      const concessionResult = calculateConcessions(
        baseAmount,
        feeStructure.feeHeadId,
        feeStructure.feeTermId,
        studentConcessions,
        asOfDate
      );
      concessionAmount = concessionResult.concessionAmount;
      appliedConcessions = concessionResult.appliedConcessions;
    }
    
    // Calculate final discounted amount (base - discounts - concessions)
    const discountedAmount = Math.max(0, baseAmount - discountAmount - concessionAmount);
    
    // Calculate late fees if enabled and overdue
    if (calculateLateFees && asOfDate > feeStructure.dueDate) {
      const lateFeeConfig = {
        gracePeriodDays,
        flatRate: feeStructure.lateFeeDays ? feeStructure.lateFeeAmount : undefined,
        percentageRate: feeStructure.lateFeePercentage,
      };
      
      lateFeeAmount = calculateLateFee(
        discountedAmount,
        feeStructure.dueDate,
        asOfDate,
        lateFeeConfig
      );
    }
    
    const finalAmount = discountedAmount + lateFeeAmount;
    
    // Calculate paid amount for this specific fee head and term
    const paidAmount = paymentRecords
      .filter(payment => payment.feeHeadId === feeStructure.feeHeadId)
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const outstandingAmount = Math.max(0, finalAmount - paidAmount);
    
    // Determine status
    const status = determineFeeStatus(finalAmount, paidAmount, feeStructure.dueDate, asOfDate);
    
    // Calculate overdue days
    const overdueDays = Math.max(0, Math.floor((asOfDate.getTime() - feeStructure.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate installment details if requested
    let installmentDetails;
    if (shouldCalculateInstallments && feeStructure.installmentAllowed && feeStructure.installmentCount) {
      const installmentData = calculateInstallments(
        finalAmount,
        feeStructure.installmentCount,
        paidAmount,
        feeStructure.dueDate
      );
      
      installmentDetails = {
        totalInstallments: feeStructure.installmentCount,
        paidInstallments: feeStructure.installmentCount - installmentData.remainingInstallments,
        nextInstallmentAmount: installmentData.installmentAmount,
        nextInstallmentDue: installmentData.nextInstallmentDue,
      };
    }
    
    return {
      feeHeadId: feeStructure.feeHeadId,
      feeHeadName: feeStructure.feeHeadName,
      feeTermId: feeStructure.feeTermId,
      feeTermName: feeStructure.feeTermName,
      baseAmount,
      discountAmount,
      concessionAmount,
      discountedAmount,
      lateFeeAmount,
      finalAmount,
      paidAmount,
      outstandingAmount,
      dueDate: feeStructure.dueDate,
      overdueDays,
      status,
      appliedConcessions,
      installmentDetails,
    };
  });
}

/**
 * Allocate a payment across multiple fee heads based on priority
 */
export function allocatePayment(
  paymentAmount: number,
  outstandingFees: CalculatedFee[],
  allocationStrategy: 'oldest_first' | 'highest_amount_first' | 'equal_distribution' = 'oldest_first'
): Array<{
  feeHeadId: string;
  allocatedAmount: number;
  remainingOutstanding: number;
}> {
  let remainingPayment = paymentAmount;
  const allocations: Array<{
    feeHeadId: string;
    allocatedAmount: number;
    remainingOutstanding: number;
  }> = [];
  
  // Sort fees based on allocation strategy
  const sortedFees = [...outstandingFees];
  switch (allocationStrategy) {
    case 'oldest_first':
      sortedFees.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      break;
    case 'highest_amount_first':
      sortedFees.sort((a, b) => b.outstandingAmount - a.outstandingAmount);
      break;
    case 'equal_distribution':
      // Will be handled differently below
      break;
  }
  
  if (allocationStrategy === 'equal_distribution') {
    // Distribute payment equally across all outstanding fees
    const totalOutstanding = outstandingFees.reduce((sum, fee) => sum + fee.outstandingAmount, 0);
    
    outstandingFees.forEach(fee => {
      if (remainingPayment > 0 && fee.outstandingAmount > 0) {
        const proportionalAmount = (fee.outstandingAmount / totalOutstanding) * paymentAmount;
        const allocatedAmount = Math.min(proportionalAmount, fee.outstandingAmount, remainingPayment);
        
        allocations.push({
          feeHeadId: fee.feeHeadId,
          allocatedAmount,
          remainingOutstanding: fee.outstandingAmount - allocatedAmount,
        });
        
        remainingPayment -= allocatedAmount;
      }
    });
  } else {
    // Allocate payment sequentially based on sorted order
    sortedFees.forEach(fee => {
      if (remainingPayment > 0 && fee.outstandingAmount > 0) {
        const allocatedAmount = Math.min(fee.outstandingAmount, remainingPayment);
        
        allocations.push({
          feeHeadId: fee.feeHeadId,
          allocatedAmount,
          remainingOutstanding: fee.outstandingAmount - allocatedAmount,
        });
        
        remainingPayment -= allocatedAmount;
      }
    });
  }
  
  return allocations;
}

/**
 * Generate fee reminder notices based on outstanding fees
 */
export function generateFeeReminders(
  outstandingFees: CalculatedFee[],
  reminderConfig?: {
    firstReminderDays?: number;
    secondReminderDays?: number;
    finalReminderDays?: number;
  }
): Array<{
  feeHeadId: string;
  reminderType: 'first' | 'second' | 'final' | 'overdue';
  daysOverdue: number;
  messageTemplate: string;
}> {
  const {
    firstReminderDays = 7,
    secondReminderDays = 15,
    finalReminderDays = 30,
  } = reminderConfig || {};
  
  const reminders: Array<{
    feeHeadId: string;
    reminderType: 'first' | 'second' | 'final' | 'overdue';
    daysOverdue: number;
    messageTemplate: string;
  }> = [];
  
  outstandingFees.forEach(fee => {
    if (fee.outstandingAmount > 0) {
      let reminderType: 'first' | 'second' | 'final' | 'overdue';
      let messageTemplate: string;
      
      if (fee.overdueDays >= finalReminderDays) {
        reminderType = 'final';
        messageTemplate = `FINAL NOTICE: Your fee payment of ₹${fee.outstandingAmount} for ${fee.feeHeadName} is ${fee.overdueDays} days overdue. Please pay immediately to avoid further action.`;
      } else if (fee.overdueDays >= secondReminderDays) {
        reminderType = 'second';
        messageTemplate = `SECOND REMINDER: Your fee payment of ₹${fee.outstandingAmount} for ${fee.feeHeadName} is ${fee.overdueDays} days overdue. Please pay at the earliest.`;
      } else if (fee.overdueDays >= firstReminderDays) {
        reminderType = 'first';
        messageTemplate = `REMINDER: Your fee payment of ₹${fee.outstandingAmount} for ${fee.feeHeadName} is ${fee.overdueDays} days overdue. Please pay to avoid late fees.`;
      } else if (fee.status === 'Overdue') {
        reminderType = 'overdue';
        messageTemplate = `Your fee payment of ₹${fee.outstandingAmount} for ${fee.feeHeadName} is now overdue. Please pay to avoid late fees.`;
      } else {
        return; // No reminder needed
      }
      
      reminders.push({
        feeHeadId: fee.feeHeadId,
        reminderType,
        daysOverdue: fee.overdueDays,
        messageTemplate,
      });
    }
  });
  
  return reminders;
}

/**
 * Calculate monthly fee collection targets and projections
 */
export function calculateCollectionTargets(
  totalExpectedCollection: number,
  collectedSoFar: number,
  daysInMonth: number,
  daysPassed: number
): {
  targetDaily: number;
  targetRemaining: number;
  projectedTotal: number;
  collectionRate: number;
  onTrack: boolean;
} {
  const targetDaily = totalExpectedCollection / daysInMonth;
  const expectedByNow = targetDaily * daysPassed;
  const remaining = totalExpectedCollection - collectedSoFar;
  const daysRemaining = daysInMonth - daysPassed;
  
  const collectionRate = expectedByNow > 0 ? (collectedSoFar / expectedByNow) : 0;
  const projectedTotal = daysRemaining > 0 ? 
    collectedSoFar + (collectedSoFar / daysPassed) * daysRemaining : 
    collectedSoFar;
  
  const onTrack = collectionRate >= 0.9; // Consider on track if at least 90% of expected
  
  return {
    targetDaily,
    targetRemaining: Math.max(0, remaining),
    projectedTotal,
    collectionRate,
    onTrack,
  };
} 