import { api } from '@/utils/api';

interface ConsistencyCheckResult {
  isConsistent: boolean;
  issues: string[];
  orphanedScores: number;
  fixedIssues: number;
}

export class DataConsistencyChecker {
  /**
   * Check data consistency for a specific assessment schema
   */
  static async checkAssessmentSchemaConsistency(
    assessmentSchemaId: string
  ): Promise<ConsistencyCheckResult> {
    const issues: string[] = [];
    const orphanedScores = 0;
    const fixedIssues = 0;

    try {
      console.log('🔍 Starting data consistency check for schema:', assessmentSchemaId);

      // This would need to be implemented as a TRPC procedure
      // For now, we'll return a placeholder result
      
      return {
        isConsistent: true,
        issues,
        orphanedScores,
        fixedIssues
      };

    } catch (error) {
      console.error('❌ Data consistency check failed:', error);
      issues.push(`Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isConsistent: false,
        issues,
        orphanedScores,
        fixedIssues
      };
    }
  }

  /**
   * Force refresh all assessment-related caches
   */
  static async forceRefreshAssessmentCaches(queryClient: any, assessmentSchemaId?: string) {
    console.log('🔄 Force refreshing all assessment caches...');

    const refreshPromises = [
      // Core examination queries
      queryClient.invalidateQueries({ 
        queryKey: [['examination']]
      }),
      
      // Assessment scores
      queryClient.invalidateQueries({ 
        queryKey: [['examination', 'getAssessmentScores']]
      }),
      
      // Assessment schemas
      queryClient.invalidateQueries({ 
        queryKey: [['examination', 'getAssessmentSchemas']]
      }),
      
      // Dashboard queries
      queryClient.invalidateQueries({ 
        queryKey: [['dashboard']]
      }),
      
      // Student queries
      queryClient.invalidateQueries({ 
        queryKey: [['student']]
      }),
    ];

    // If specific schema, also refresh its specific queries
    if (assessmentSchemaId) {
      refreshPromises.push(
        queryClient.refetchQueries({ 
          queryKey: [['examination', 'getAssessmentScores'], { assessmentSchemaId }]
        })
      );
    }

    try {
      await Promise.all(refreshPromises);
      console.log('✅ All assessment caches refreshed successfully');
    } catch (error) {
      console.error('❌ Cache refresh failed:', error);
      throw error;
    }
  }

  /**
   * Validate that deletion was successful
   */
  static async validateDeletion(
    studentId: string,
    assessmentSchemaId: string,
    componentId?: string
  ): Promise<boolean> {
    try {
      // This would need to be implemented as a verification TRPC call
      // For now, we'll return true as a placeholder
      console.log('🔍 Validating deletion for:', { studentId, assessmentSchemaId, componentId });
      
      // In a real implementation, this would query the database to ensure
      // no scores remain for the specified student/schema/component combination
      
      return true;
    } catch (error) {
      console.error('❌ Deletion validation failed:', error);
      return false;
    }
  }
}

// Hook for using data consistency checker
export function useDataConsistencyChecker() {
  const checkConsistency = async (assessmentSchemaId: string) => {
    return DataConsistencyChecker.checkAssessmentSchemaConsistency(assessmentSchemaId);
  };

  const validateDeletion = async (
    studentId: string,
    assessmentSchemaId: string,
    componentId?: string
  ) => {
    return DataConsistencyChecker.validateDeletion(studentId, assessmentSchemaId, componentId);
  };

  return {
    checkConsistency,
    validateDeletion
  };
} 