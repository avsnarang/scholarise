import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';

/**
 * Global Examination Module Refresh System
 * 
 * This hook provides a centralized way to refresh all examination-related data
 * across the entire module without hard page refreshes. It ensures that when
 * any examination data changes, all related components are updated silently.
 */
export function useExaminationRefresh() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  /**
   * Comprehensive examination data refresh
   * Invalidates all examination-related queries across the module
   */
  const refreshAllExaminationData = useCallback(async () => {
    const refreshPromises = [
      // Core examination data
      queryClient.invalidateQueries({ 
        queryKey: [['examination']]
      }),
      
      // Assessment schemas and scores
      queryClient.invalidateQueries({ 
        queryKey: [['assessment']]
      }),
      
      // Grade scales and grading data
      queryClient.invalidateQueries({ 
        queryKey: [['grade']]
      }),
      
      // Terms and sessions
      queryClient.invalidateQueries({ 
        queryKey: [['term']]
      }),
      
      // Classes and students (related to assessments)
      queryClient.invalidateQueries({ 
        queryKey: [['class']]
      }),
      
      queryClient.invalidateQueries({ 
        queryKey: [['student']]
      }),
      
      // Subject and teacher data (used in assessments)
      queryClient.invalidateQueries({ 
        queryKey: [['subject']]
      }),
      
      queryClient.invalidateQueries({ 
        queryKey: [['teacher']]
      }),
      
      // Any queries containing examination-related keywords
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey;
          if (!Array.isArray(queryKey)) return false;
          
          return queryKey.some(key => {
            if (typeof key === 'string') {
              return (
                key.includes('assessment') ||
                key.includes('examination') ||
                key.includes('exam') ||
                key.includes('score') ||
                key.includes('grade') ||
                key.includes('result') ||
                key.includes('analytics') ||
                key.includes('report')
              );
            }
            
            if (typeof key === 'object' && key !== null) {
              const objString = JSON.stringify(key).toLowerCase();
              return (
                objString.includes('assessment') ||
                objString.includes('examination') ||
                objString.includes('score') ||
                objString.includes('grade')
              );
            }
            
            return false;
          });
        }
      })
    ];

    await Promise.all(refreshPromises);
    
    // Force a small delay to ensure all queries are invalidated
    await new Promise(resolve => setTimeout(resolve, 100));
  }, [queryClient]);

  /**
   * Refresh specific types of examination data
   */
  const refreshAssessmentSchemas = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: [['examination', 'getAssessmentSchemas']]
    });
  }, [queryClient]);

  const refreshAssessmentScores = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: [['examination', 'getAssessmentScores']]
    });
  }, [queryClient]);

  const refreshGradeScales = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: [['examination', 'getGradeScales']]
    });
  }, [queryClient]);

  const refreshStatistics = useCallback(async () => {
    // Refresh all statistical queries
    await queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && queryKey.some(key => 
          typeof key === 'string' && (
            key.includes('stat') ||
            key.includes('count') ||
            key.includes('metric') ||
            key.includes('dashboard')
          )
        );
      }
    });
  }, [queryClient]);

  /**
   * Auto-refresh on branch or session change
   */
  useEffect(() => {
    if (currentBranchId || currentSessionId) {
      refreshAllExaminationData();
    }
  }, [currentBranchId, currentSessionId, refreshAllExaminationData]);

  /**
   * Listen for storage events to sync across tabs
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'examination-data-updated') {
        refreshAllExaminationData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshAllExaminationData]);

  /**
   * Broadcast data change to other tabs
   */
  const broadcastDataChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('examination-data-updated', Date.now().toString());
      // Remove the item after a short delay to allow it to be set again
      setTimeout(() => {
        localStorage.removeItem('examination-data-updated');
      }, 100);
    }
  }, []);

  /**
   * Complete refresh cycle - invalidate queries and broadcast to other tabs
   */
  const triggerGlobalRefresh = useCallback(async () => {
    await refreshAllExaminationData();
    broadcastDataChange();
  }, [refreshAllExaminationData, broadcastDataChange]);

  /**
   * Refresh with optimistic UI updates
   * This function can be called when we know data has changed
   */
  const refreshWithOptimisticUpdate = useCallback(async (
    updateType: 'create' | 'update' | 'delete' | 'status-change',
    data?: any
  ) => {
    // Immediately refresh all data
    await refreshAllExaminationData();
    
    // Broadcast to other tabs
    broadcastDataChange();
    
    // Additional specific refreshes based on update type
    switch (updateType) {
      case 'create':
      case 'update':
      case 'delete':
        await refreshAssessmentSchemas();
        await refreshStatistics();
        break;
      case 'status-change':
        await refreshAssessmentSchemas();
        await refreshStatistics();
        break;
    }
  }, [
    refreshAllExaminationData, 
    broadcastDataChange, 
    refreshAssessmentSchemas, 
    refreshStatistics
  ]);

  return {
    // Main refresh functions
    refreshAllExaminationData,
    triggerGlobalRefresh,
    refreshWithOptimisticUpdate,
    
    // Specific refresh functions
    refreshAssessmentSchemas,
    refreshAssessmentScores,
    refreshGradeScales,
    refreshStatistics,
    
    // Utility functions
    broadcastDataChange,
    
    // Context data for conditional refreshing
    currentBranchId,
    currentSessionId,
  };
}

/**
 * Hook for components that need to auto-refresh examination data
 * This can be used in dashboard components, stats cards, etc.
 */
export function useExaminationAutoRefresh(options?: {
  interval?: number;
  onFocus?: boolean;
  enabled?: boolean;
}) {
  const { refreshAllExaminationData } = useExaminationRefresh();
  
  const {
    interval = 60000, // 1 minute default
    onFocus = true,
    enabled = true
  } = options || {};

  // Auto-refresh on interval
  useEffect(() => {
    if (!enabled) return;
    
    const intervalId = setInterval(refreshAllExaminationData, interval);
    return () => clearInterval(intervalId);
  }, [refreshAllExaminationData, interval, enabled]);

  // Refresh on window focus
  useEffect(() => {
    if (!enabled || !onFocus) return;
    
    const handleFocus = () => refreshAllExaminationData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshAllExaminationData, onFocus, enabled]);

  return { refreshAllExaminationData };
} 