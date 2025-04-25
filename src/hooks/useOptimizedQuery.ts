import { useCallback } from 'react';
import { queryCache } from '@/utils/query-cache';
import { api } from '@/utils/api';

/**
 * Hook for optimized data fetching with caching
 * This reduces redundant API calls and improves performance
 */
export function useOptimizedQuery() {
  /**
   * Fetch data with caching
   * @param queryFn Function that returns a query
   * @param key Cache key
   * @param ttl Cache TTL in milliseconds (default: 30 seconds)
   * @returns Promise with the data
   */
  const fetchWithCache = useCallback(
    async <T>(
      queryFn: () => Promise<T>,
      key: string,
      ttl = 30 * 1000
    ): Promise<T> => {
      return queryCache.getOrSet(key, queryFn, ttl);
    },
    []
  );

  /**
   * Invalidate cache for a specific key or prefix
   * @param keyOrPrefix Cache key or prefix to invalidate
   */
  const invalidateCache = useCallback(
    (keyOrPrefix: string) => {
      if (keyOrPrefix.endsWith('*')) {
        // If key ends with *, treat as prefix
        queryCache.clearByPrefix(keyOrPrefix.slice(0, -1));
      } else {
        queryCache.delete(keyOrPrefix);
      }
    },
    []
  );

  /**
   * Clear all cache
   */
  const clearCache = useCallback(() => {
    queryCache.clear();
  }, []);

  return {
    fetchWithCache,
    invalidateCache,
    clearCache,
  };
}

/**
 * Create optimized versions of common queries
 */
export const optimizedQueries = {
  branch: {
    getAll: async () => {
      const key = 'branch.getAll';
      return queryCache.getOrSet(key, async () => {
        // Server-side data fetching is not directly supported by tRPC client
        // Use fetch or other server-compatible approach
        return []; // Placeholder - implement with proper server-side fetch
      }, 60 * 1000); // 1 minute cache
    },
    
    getById: async (id: string) => {
      const key = `branch.getById:${id}`;
      return queryCache.getOrSet(key, async () => {
        // Server-side data fetching is not directly supported by tRPC client
        // Use fetch or other server-compatible approach
        return null; // Placeholder - implement with proper server-side fetch
      }, 60 * 1000); // 1 minute cache
    }
  },
  
  student: {
    getStats: async (branchId?: string) => {
      const key = `student.getStats:${branchId || 'all'}`;
      return queryCache.getOrSet(key, async () => {
        // Server-side data fetching is not directly supported by tRPC client
        // Use fetch or other server-compatible approach
        return {
          totalStudents: 0,
          activeStudents: 0,
          inactiveStudents: 0,
          classCounts: {}
        }; // Placeholder - implement with proper server-side fetch
      }, 30 * 1000); // 30 seconds cache
    }
  },
  
  teacher: {
    getStats: async (branchId?: string) => {
      const key = `teacher.getStats:${branchId || 'all'}`;
      return queryCache.getOrSet(key, async () => {
        // Server-side data fetching is not directly supported by tRPC client
        // Use fetch or other server-compatible approach
        return {
          totalTeachers: 0,
          activeTeachers: 0,
          inactiveTeachers: 0,
          teachersWithClasses: 0,
          teachersWithoutClasses: 0
        }; // Placeholder - implement with proper server-side fetch
      }, 30 * 1000); // 30 seconds cache
    }
  }
};
