import type { StudentStatus } from '@prisma/client';

/**
 * Student status utilities for managing the new status enum system
 */

export const STUDENT_STATUS = {
  ACTIVE: 'ACTIVE' as const,
  INACTIVE: 'INACTIVE' as const,
  EXPELLED: 'EXPELLED' as const,
  WITHDRAWN: 'WITHDRAWN' as const,
  REPEAT: 'REPEAT' as const,
  TRANSFERRED: 'TRANSFERRED' as const,
  GRADUATED: 'GRADUATED' as const,
  SUSPENDED: 'SUSPENDED' as const,
} as const;

export type StudentStatusType = keyof typeof STUDENT_STATUS;

/**
 * Status groups for easier filtering and management
 * 
 * IMPORTANT: 
 * - "Active students only" means ONLY students with status ACTIVE
 * - EXPELLED and WITHDRAWN are treated as INACTIVE for backward compatibility
 * - REPEAT and SUSPENDED students can still attend classes (enrolled)
 */
export const STATUS_GROUPS = {
  // Only ACTIVE status - when filtering for "active students only"
  ACTIVE_ONLY: [STUDENT_STATUS.ACTIVE],
  
  // Students who can attend classes (enrolled)
  ENROLLED_STATUSES: [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.REPEAT, STUDENT_STATUS.SUSPENDED],
  
  // All inactive statuses (backward compatibility for isActive: false)
  INACTIVE_STATUSES: [
    STUDENT_STATUS.INACTIVE,
    STUDENT_STATUS.EXPELLED,
    STUDENT_STATUS.WITHDRAWN,
    STUDENT_STATUS.TRANSFERRED,
    STUDENT_STATUS.GRADUATED,
    STUDENT_STATUS.SUSPENDED,
  ],
  
  // Students who have permanently left
  DEPARTED_STATUSES: [
    STUDENT_STATUS.EXPELLED,
    STUDENT_STATUS.WITHDRAWN,
    STUDENT_STATUS.TRANSFERRED,
    STUDENT_STATUS.GRADUATED,
  ],
  
  // Legacy groups for backward compatibility
  ACTIVE_STATUSES: [STUDENT_STATUS.ACTIVE], // Changed: Only ACTIVE now
} as const;

/**
 * Human-readable labels for status values
 */
export const STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  EXPELLED: 'Expelled',
  WITHDRAWN: 'Withdrawn',
  REPEAT: 'Repeating',
  TRANSFERRED: 'Transferred',
  GRADUATED: 'Graduated',
  SUSPENDED: 'Suspended',
};

/**
 * Status descriptions for better understanding
 */
export const STATUS_DESCRIPTIONS: Record<StudentStatus, string> = {
  ACTIVE: 'Student is currently enrolled and attending classes',
  INACTIVE: 'Student is temporarily not attending (e.g., medical leave, personal reasons)',
  EXPELLED: 'Student has been permanently removed due to disciplinary action',
  WITHDRAWN: 'Student has voluntarily left the institution',
  REPEAT: 'Student is repeating the current academic year',
  TRANSFERRED: 'Student has moved to another institution',
  GRADUATED: 'Student has successfully completed their education',
  SUSPENDED: 'Student is temporarily barred from attending classes',
};

/**
 * Status colors for UI display
 */
export const STATUS_COLORS: Record<StudentStatus, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  EXPELLED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  WITHDRAWN: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  REPEAT: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  TRANSFERRED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  GRADUATED: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
};

/**
 * Check if a status represents an active student (ACTIVE only)
 */
export function isActiveStatus(status: StudentStatus): boolean {
  return status === STUDENT_STATUS.ACTIVE;
}

/**
 * Check if a status represents an enrolled student (can attend classes)
 */
export function isEnrolledStatus(status: StudentStatus): boolean {
  return STATUS_GROUPS.ENROLLED_STATUSES.includes(status as any);
}

/**
 * Check if a status represents an inactive student
 */
export function isInactiveStatus(status: StudentStatus): boolean {
  return STATUS_GROUPS.INACTIVE_STATUSES.includes(status as any);
}

/**
 * Check if a student can attend classes (not departed)
 */
export function canAttendClasses(status: StudentStatus): boolean {
  return STATUS_GROUPS.ENROLLED_STATUSES.includes(status as any);
}

/**
 * Check if a status represents a student who has departed
 */
export function isDepartedStatus(status: StudentStatus): boolean {
  return STATUS_GROUPS.DEPARTED_STATUSES.includes(status as any);
}

/**
 * Convert legacy isActive boolean to status enum
 * @deprecated Use status field directly instead
 */
export function isActiveToStatus(isActive: boolean): StudentStatus {
  return isActive ? STUDENT_STATUS.ACTIVE : STUDENT_STATUS.INACTIVE;
}

/**
 * Convert status enum to legacy isActive boolean for backward compatibility
 * IMPORTANT: Only ACTIVE status is considered "active" (true)
 * All other statuses (INACTIVE, EXPELLED, WITHDRAWN, etc.) are "inactive" (false)
 * @deprecated Use status field directly instead
 */
export function statusToIsActive(status: StudentStatus): boolean {
  return status === STUDENT_STATUS.ACTIVE;
}

/**
 * Get where clause for backward compatibility with isActive filtering
 * This maps the old isActive boolean logic to new status system
 */
export function getLegacyActiveWhereClause(isActive: boolean) {
  if (isActive) {
    // When filtering for "active" students, only show ACTIVE status
    return { status: STUDENT_STATUS.ACTIVE };
  } else {
    // When filtering for "inactive" students, show all non-ACTIVE statuses
    return { status: { not: STUDENT_STATUS.ACTIVE } };
  }
}

/**
 * Get status filter options for dropdowns
 */
export function getStatusFilterOptions() {
  return [
    { value: '', label: 'All Students' },
    { value: 'active_enrolled', label: 'Active & Enrolled', statuses: STATUS_GROUPS.ENROLLED_STATUSES },
    { value: 'active_only', label: 'Active Only', statuses: [STUDENT_STATUS.ACTIVE] },
    { value: 'inactive_all', label: 'All Inactive', statuses: STATUS_GROUPS.INACTIVE_STATUSES },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
      value: value.toLowerCase(),
      label,
      statuses: [value as StudentStatus],
    })),
  ];
}

/**
 * Get Prisma where clause for status filtering
 */
export function getStatusWhereClause(statusFilter?: string) {
  if (!statusFilter) return {};

  switch (statusFilter) {
    case 'active_only':
      return { status: STUDENT_STATUS.ACTIVE }; // Only ACTIVE status
    case 'active_enrolled':
    case 'enrolled':
      return { status: { in: [...STATUS_GROUPS.ENROLLED_STATUSES] } }; // Can attend classes
    case 'inactive_all':
      return { status: { in: [...STATUS_GROUPS.INACTIVE_STATUSES] } };
    default:
      // Check if it's a specific status
      const status = statusFilter.toUpperCase() as StudentStatus;
      if (Object.values(STUDENT_STATUS).includes(status)) {
        return { status };
      }
      return {};
  }
}

/**
 * Validate status transition
 */
export function isValidStatusTransition(currentStatus: StudentStatus, newStatus: StudentStatus): boolean {
  // Define allowed transitions
  const allowedTransitions: Record<StudentStatus, StudentStatus[]> = {
    ACTIVE: [STUDENT_STATUS.INACTIVE, STUDENT_STATUS.SUSPENDED, STUDENT_STATUS.REPEAT, STUDENT_STATUS.EXPELLED, STUDENT_STATUS.WITHDRAWN, STUDENT_STATUS.TRANSFERRED, STUDENT_STATUS.GRADUATED],
    INACTIVE: [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.WITHDRAWN, STUDENT_STATUS.TRANSFERRED],
    SUSPENDED: [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.EXPELLED, STUDENT_STATUS.WITHDRAWN],
    REPEAT: [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.INACTIVE, STUDENT_STATUS.WITHDRAWN],
    EXPELLED: [], // Terminal status - no transitions allowed
    WITHDRAWN: [], // Terminal status - no transitions allowed  
    TRANSFERRED: [], // Terminal status - no transitions allowed
    GRADUATED: [], // Terminal status - no transitions allowed
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}