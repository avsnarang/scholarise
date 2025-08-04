import type { Prisma } from '@prisma/client';
import { STUDENT_STATUS, getLegacyActiveWhereClause } from './student-status';

/**
 * Migration helper utilities to ease transition from isActive to status system
 * 
 * This file helps existing code gradually migrate to the new status system
 * while maintaining backward compatibility
 */

/**
 * Enhanced where clause builder that handles both old and new filtering
 * 
 * @param whereInput - Standard Prisma where input that might contain isActive
 * @returns Updated where clause using status instead of isActive
 */
export function migrateStudentWhereClause(whereInput: Prisma.StudentWhereInput): Prisma.StudentWhereInput {
  const { isActive, ...rest } = whereInput;
  
  // If isActive is specified, convert it to status filtering
  if (isActive !== undefined) {
    // Extract the boolean value from BoolFilter if needed
    const isActiveValue = typeof isActive === 'boolean' ? isActive : true;
    const statusClause = getLegacyActiveWhereClause(isActiveValue);
    return {
      ...rest,
      ...statusClause,
    };
  }
  
  return whereInput;
}

/**
 * Convert old-style student filters to new status-aware filters
 */
export function modernizeStudentQuery(query: {
  where?: Prisma.StudentWhereInput;
  include?: Prisma.StudentInclude;
  orderBy?: Prisma.StudentOrderByWithRelationInput | Prisma.StudentOrderByWithRelationInput[];
}) {
  return {
    ...query,
    where: query.where ? migrateStudentWhereClause(query.where) : undefined,
  };
}

/**
 * Get default filters for common student queries
 */
export const COMMON_STUDENT_FILTERS = {
  // Only active students (ACTIVE status only)
  ACTIVE_ONLY: { status: STUDENT_STATUS.ACTIVE },
  
  // Students who can attend classes (ACTIVE, REPEAT, SUSPENDED)
  ENROLLED: { status: { in: [STUDENT_STATUS.ACTIVE, STUDENT_STATUS.REPEAT, STUDENT_STATUS.SUSPENDED] } },
  
  // All students except permanently departed ones
  NOT_DEPARTED: { 
    status: { 
      notIn: [STUDENT_STATUS.EXPELLED, STUDENT_STATUS.WITHDRAWN, STUDENT_STATUS.TRANSFERRED, STUDENT_STATUS.GRADUATED] 
    } 
  },
  
  // Legacy: equivalent to old isActive: true
  LEGACY_ACTIVE: { status: STUDENT_STATUS.ACTIVE },
  
  // Legacy: equivalent to old isActive: false  
  LEGACY_INACTIVE: { status: { not: STUDENT_STATUS.ACTIVE } },
} as const;

/**
 * Warning messages for developers updating their code
 */
export const MIGRATION_WARNINGS = {
  IS_ACTIVE_DEPRECATED: `
⚠️  MIGRATION NOTICE ⚠️
The 'isActive' field is deprecated. Please use 'status' field instead:

OLD: where: { isActive: true }
NEW: where: { status: 'ACTIVE' }

For enrolled students: where: { status: { in: ['ACTIVE', 'REPEAT', 'SUSPENDED'] } }
`,

  STATUS_LOGIC_CHANGE: `
📋 STATUS LOGIC UPDATE 📋
- "Active students only" now means ONLY students with status 'ACTIVE'
- EXPELLED and WITHDRAWN are treated as INACTIVE
- Use 'ENROLLED' filter for students who can attend classes
`,
} as const;

/**
 * Helper to log migration warnings in development
 */
export function logMigrationWarning(warningKey: keyof typeof MIGRATION_WARNINGS) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(MIGRATION_WARNINGS[warningKey]);
  }
}