/**
 * Utility functions for branch filtering
 */

/**
 * Adds branch ID to query parameters for API calls
 * @param branchId The current branch ID
 * @param params The original query parameters
 * @returns The query parameters with branch ID added
 */
export function withBranchId<T extends Record<string, unknown>>(
  branchId: string | null | undefined,
  params?: T
): T & { branchId?: string } {
  if (!branchId) {
    return params as T & { branchId?: string };
  }

  return {
    ...params,
    branchId,
  } as T & { branchId?: string };
}

/**
 * Creates a where clause for Prisma queries that includes branch filtering
 * @param branchId The current branch ID
 * @param whereClause The original where clause
 * @param modelName Optional model name to exclude certain models from branch filtering
 * @returns The where clause with branch filtering added
 */
export function withBranchFilter<T extends Record<string, unknown>>(
  branchId: string | null | undefined,
  whereClause?: T,
  modelName?: string
): T & { branchId?: string } {
  // Don't add branchId for AcademicSession model
  if (!branchId || modelName === 'AcademicSession') {
    return whereClause as T & { branchId?: string };
  }

  return {
    ...whereClause,
    branchId,
  } as T & { branchId?: string };
}

/**
 * Filters an array of items to only include those from a specific branch
 * @param items The array of items to filter
 * @param branchId The branch ID to filter by
 * @returns A new array containing only items from the specified branch
 */
export function filterByBranch<T extends { branchId?: string | null }>(
  items: T[],
  branchId: string | null | undefined
): T[] {
  if (!branchId) return items;
  return items.filter((item) => item.branchId === branchId);
}

/**
 * Checks if an item belongs to a specific branch
 * @param item The item to check
 * @param branchId The branch ID to check against
 * @returns True if the item belongs to the specified branch
 */
export function belongsToBranch<T extends { branchId?: string | null }>(
  item: T,
  branchId: string | null | undefined
): boolean {
  if (!branchId) return true;
  if (!item.branchId) return false;
  return item.branchId === branchId;
}
