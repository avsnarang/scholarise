import { useAcademicSessionContext } from "./useAcademicSessionContext";
import { useCallback } from "react";

/**
 * A hook that provides the current academic session ID for filtering data across the application.
 * This hook ensures that all data fetching operations use the selected session as a filter.
 */
export function useGlobalSessionFilter() {
  const { currentSessionId, isLoading } = useAcademicSessionContext();

  /**
   * Returns the current session ID for use in API queries
   */
  const getSessionFilterParam = useCallback(() => {
    return currentSessionId || undefined;
  }, [currentSessionId]);

  /**
   * Adds the session filter to any query input object
   * @param input The original input object
   * @returns A new input object with the session filter added
   */
  const withSessionFilter = useCallback(
    <T extends Record<string, unknown>>(input?: T) => {
      if (!currentSessionId) {
        return input;
      }

      return {
        ...input,
        sessionId: currentSessionId,
      } as unknown as T;
    },
    [currentSessionId]
  );

  /**
   * Checks if a data item belongs to the current session
   * @param item The data item to check
   * @returns True if the item belongs to the current session
   */
  const belongsToCurrentSession = useCallback(
    (item: { sessionId?: string | null }) => {
      if (!currentSessionId) return true;
      if (!item.sessionId) return false;
      return item.sessionId === currentSessionId;
    },
    [currentSessionId]
  );

  /**
   * Filters an array of items to only include those from the current session
   * @param items The array of items to filter
   * @returns A new array containing only items from the current session
   */
  const filterByCurrentSession = useCallback(
    <T extends { sessionId?: string | null }>(items: T[]) => {
      if (!currentSessionId) return items;
      return items.filter((item) => item.sessionId === currentSessionId);
    },
    [currentSessionId]
  );

  return {
    sessionId: currentSessionId,
    isLoading,
    getSessionFilterParam,
    withSessionFilter,
    belongsToCurrentSession,
    filterByCurrentSession,
  };
}
