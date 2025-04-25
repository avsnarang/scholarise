import { useBranchContext } from "./useBranchContext";
import { useCallback } from "react";

/**
 * A hook that provides the current branch ID for filtering data across the application.
 * This hook ensures that all data fetching operations use the selected branch as a filter.
 */
export function useGlobalBranchFilter() {
  const { currentBranchId, currentBranch, isLoading } = useBranchContext();

  /**
   * Returns the current branch ID for use in API queries
   */
  const getBranchFilterParam = useCallback(() => {
    return currentBranchId || undefined;
  }, [currentBranchId]);

  /**
   * Adds the branch filter to any query input object
   * @param input The original input object
   * @returns A new input object with the branch filter added
   */
  const withBranchFilter = useCallback(
    <T extends Record<string, unknown>>(input?: T) => {
      if (!currentBranchId) {
        return input;
      }

      return {
        ...input,
        branchId: currentBranchId,
      } as unknown as T;
    },
    [currentBranchId]
  );

  /**
   * Checks if a data item belongs to the current branch
   * @param item The data item to check
   * @returns True if the item belongs to the current branch
   */
  const belongsToCurrentBranch = useCallback(
    (item: { branchId?: string | null }) => {
      if (!currentBranchId) return true;
      if (!item.branchId) return false;
      return item.branchId === currentBranchId;
    },
    [currentBranchId]
  );

  /**
   * Filters an array of items to only include those from the current branch
   * @param items The array of items to filter
   * @returns A new array containing only items from the current branch
   */
  const filterByCurrentBranch = useCallback(
    <T extends { branchId?: string | null }>(items: T[]) => {
      if (!currentBranchId) return items;
      return items.filter((item) => item.branchId === currentBranchId);
    },
    [currentBranchId]
  );

  return {
    branchId: currentBranchId,
    branch: currentBranch,
    isLoading,
    getBranchFilterParam,
    withBranchFilter,
    belongsToCurrentBranch,
    filterByCurrentBranch,
  };
}
