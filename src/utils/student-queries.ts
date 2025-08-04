import type { Prisma, StudentStatus } from '@prisma/client';
import { getStatusWhereClause, STATUS_GROUPS, STUDENT_STATUS } from './student-status';

/**
 * Enhanced student query utilities that work with both isActive (legacy) and status (new)
 */

export interface StudentFilterOptions {
  branchId?: string;
  sessionId?: string;
  sectionId?: string;
  classId?: string;
  statusFilter?: string;
  searchTerm?: string;
  // Legacy support
  isActive?: boolean;
}

/**
 * Build a comprehensive where clause for student queries
 */
export function buildStudentWhereClause(options: StudentFilterOptions): Prisma.StudentWhereInput {
  const {
    branchId,
    sessionId,
    sectionId,
    classId,
    statusFilter,
    searchTerm,
    isActive
  } = options;

  const whereClause: Prisma.StudentWhereInput = {
    AND: [
      // Branch filter
      ...(branchId ? [{ branchId }] : []),
      
      // Session filter
      ...(sessionId ? [{
        academicRecords: {
          some: { sessionId }
        }
      }] : []),
      
      // Section filter
      ...(sectionId && sectionId !== 'all' ? [{ sectionId }] : []),
      
      // Class filter (via section relationship)
      ...(classId && classId !== 'all' ? [{
        section: { classId }
      }] : []),
      
      // Status filter (new system)
      ...((statusFilter && statusFilter !== '') ? [getStatusWhereClause(statusFilter)] : []),
      
      // Legacy isActive filter (for backward compatibility)
      ...(isActive !== undefined && !statusFilter ? [{
        // Map isActive to status: true = ACTIVE only, false = all non-ACTIVE
        ...(isActive ? { status: STUDENT_STATUS.ACTIVE } : { status: { not: STUDENT_STATUS.ACTIVE } })
      }] : []),
      
      // Search filter
      ...(searchTerm ? [{
        OR: [
          { admissionNumber: { contains: searchTerm, mode: 'insensitive' as const } },
          { firstName: { contains: searchTerm, mode: 'insensitive' as const } },
          { lastName: { contains: searchTerm, mode: 'insensitive' as const } },
          { email: { contains: searchTerm, mode: 'insensitive' as const } },
        ]
      }] : []),
    ]
  };

  return whereClause;
}

/**
 * Standard student include clause for common use cases
 */
export const standardStudentInclude: Prisma.StudentInclude = {
  section: {
    include: {
      class: true,
    },
  },
  parent: true,
  academicRecords: {
    include: {
      session: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1, // Most recent academic record
  },
};

/**
 * Minimal student include for performance-sensitive queries
 */
export const minimalStudentInclude: Prisma.StudentInclude = {
  section: {
    select: {
      name: true,
      class: {
        select: {
          name: true,
          displayOrder: true,
        },
      },
    },
  },
};

/**
 * Standard student order by clause
 */
export const standardStudentOrderBy: Prisma.StudentOrderByWithRelationInput[] = [
  { section: { class: { displayOrder: 'asc' } } },
  { section: { name: 'asc' } },
  { rollNumber: 'asc' },
  { firstName: 'asc' },
];

/**
 * Get student statistics by status
 */
export async function getStudentStatusStats(
  prisma: any,
  filters: Pick<StudentFilterOptions, 'branchId' | 'sessionId'>
): Promise<{
  total: number;
  byStatus: Record<StudentStatus, number>;
  activeCount: number;
  inactiveCount: number;
}> {
  const baseWhere = buildStudentWhereClause(filters);

  // Get counts by status
  const statusCounts = await prisma.student.groupBy({
    by: ['status'],
    where: baseWhere,
    _count: true,
  });

  // Build result object
  const byStatus = {} as Record<StudentStatus, number>;
  let total = 0;

  // Initialize all statuses to 0
  (['ACTIVE', 'INACTIVE', 'EXPELLED', 'WITHDRAWN', 'REPEAT', 'TRANSFERRED', 'GRADUATED', 'SUSPENDED'] as StudentStatus[])
    .forEach(status => {
      byStatus[status] = 0;
    });

  // Fill in actual counts
  statusCounts.forEach(({ status, _count }: { status: StudentStatus; _count: number }) => {
    byStatus[status] = _count;
    total += _count;
  });

  // Calculate active/inactive counts for backward compatibility
  const activeCount = STATUS_GROUPS.ACTIVE_STATUSES.reduce((sum, status) => sum + byStatus[status], 0);
  const inactiveCount = total - activeCount;

  return {
    total,
    byStatus,
    activeCount,
    inactiveCount,
  };
}

/**
 * Legacy function to maintain backward compatibility
 * @deprecated Use buildStudentWhereClause with statusFilter instead
 */
export function buildLegacyStudentWhereClause(
  isActive?: boolean,
  branchId?: string,
  sessionId?: string
): Prisma.StudentWhereInput {
  return buildStudentWhereClause({
    isActive,
    branchId,
    sessionId,
  });
}