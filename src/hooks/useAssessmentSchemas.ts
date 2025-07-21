import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';
import { api } from '@/utils/api';

interface CreateAssessmentSchemaData {
  name: string;
  term: string;
  classIds: string[];
  subjectId: string;
  totalMarks: number;
  passingCriteria?: number;
  description?: string;
  components: Array<{
    name: string;
    rawMaxScore: number;
    reducedScore: number;
    weightage?: number;
    formula?: string;
    description?: string;
    subCriteria?: Array<{
      name: string;
      maxScore: number;
      description?: string;
    }>;
  }>;
}

/**
 * Enhanced Assessment Schemas Hook with Comprehensive Cache Management
 * This hook provides silent refresh capabilities across the entire examination module
 */
export function useAssessmentSchemas() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const queryClient = useQueryClient();

  // Helper function to invalidate all examination-related queries
  const invalidateExaminationQueries = async () => {
    const invalidationPromises = [
      // Assessment schemas
      queryClient.invalidateQueries({ 
        queryKey: [['examination', 'getAssessmentSchemas']]
      }),
      // Assessment scores
      queryClient.invalidateQueries({ 
        queryKey: [['examination', 'getAssessmentScores']]
      }),
      // Grade scales (they depend on assessment data)
      queryClient.invalidateQueries({ 
        queryKey: [['examination', 'getGradeScales']]
      }),
      // Terms (assessment schemas reference terms)
      queryClient.invalidateQueries({ 
        queryKey: [['examination', 'getTerms']]
      }),
      // Classes (assessment schemas are linked to classes)
      queryClient.invalidateQueries({ 
        queryKey: [['class', 'getAll']]
      }),
      // Students (for score entry components)
      queryClient.invalidateQueries({ 
        queryKey: [['student']]
      }),
      // Any other related queries that might show assessment data
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && (
            queryKey.some(key => 
              typeof key === 'string' && (
                key.includes('assessment') || 
                key.includes('examination') || 
                key.includes('score') ||
                key.includes('grade')
              )
            )
          );
        }
      })
    ];

    await Promise.all(invalidationPromises);
  };

  const { data: schemas, isLoading, error } = api.examination.getAssessmentSchemas.useQuery(
    {
      branchId: currentBranchId || undefined,
    },
    {
      enabled: !!currentBranchId,
      staleTime: 30000, // 30 seconds - data stays fresh longer
      refetchOnWindowFocus: true, // Refresh when user comes back to tab
      refetchOnMount: true, // Always refresh on component mount
    }
  );

  const createSchemaMutation = api.examination.createAssessmentSchema.useMutation({
    onMutate: async (newSchema) => {
      // Optimistic update - immediately show the new schema in UI
      await queryClient.cancelQueries({ 
        queryKey: [['examination', 'getAssessmentSchemas']]
      });

      const previousSchemas = queryClient.getQueryData([
        ['examination', 'getAssessmentSchemas'],
        { branchId: currentBranchId || undefined }
      ]);

      // Optimistically add the new schema with temporary data
      const optimisticSchema = {
        id: `temp-${Date.now()}`,
        name: newSchema.name,
        term: newSchema.term,
        totalMarks: newSchema.totalMarks,
        isActive: true,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        branchId: currentBranchId,
        components: newSchema.components || [],
        _count: { studentAssessmentScores: 0 },
        // Add other required fields with defaults
        classId: newSchema.classIds[0] || '',
        subjectId: newSchema.subjectId,
        createdBy: 'current-user',
        appliedClasses: [],
      };

      queryClient.setQueryData(
        [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
        (old: any) => [...(old || []), optimisticSchema]
      );

      return { previousSchemas };
    },
    onError: (err, newSchema, context) => {
      // Revert optimistic update on error
      if (context?.previousSchemas) {
        queryClient.setQueryData(
          [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
          context.previousSchemas
        );
      }
    },
    onSuccess: () => {
      // Comprehensive cache invalidation
      invalidateExaminationQueries();
    },
  });

  const updateSchemaMutation = api.examination.updateAssessmentSchema.useMutation({
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        queryKey: [['examination', 'getAssessmentSchemas']]
      });

      const previousSchemas = queryClient.getQueryData([
        ['examination', 'getAssessmentSchemas'],
        { branchId: currentBranchId || undefined }
      ]);

      // Optimistically update the schema
      queryClient.setQueryData(
        [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
        (old: any) => 
          (old || []).map((schema: any) => 
            schema.id === id 
              ? { ...schema, ...data, updatedAt: new Date() }
              : schema
          )
      );

      return { previousSchemas };
    },
    onError: (err, variables, context) => {
      if (context?.previousSchemas) {
        queryClient.setQueryData(
          [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
          context.previousSchemas
        );
      }
    },
    onSuccess: () => {
      invalidateExaminationQueries();
    },
  });

  const updateSchemaStatusMutation = api.examination.updateAssessmentSchemaStatus.useMutation({
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ 
        queryKey: [['examination', 'getAssessmentSchemas']]
      });

      const previousSchemas = queryClient.getQueryData([
        ['examination', 'getAssessmentSchemas'],
        { branchId: currentBranchId || undefined }
      ]);

      // Optimistically update the status
      const statusUpdates = {
        'set-draft': { isPublished: false, isActive: true },
        'set-published': { isPublished: true, isActive: true },
        'freeze-marks': { isPublished: true, isActive: false },
      };

      queryClient.setQueryData(
        [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
        (old: any) => 
          (old || []).map((schema: any) => 
            schema.id === id 
              ? { ...schema, ...statusUpdates[action], updatedAt: new Date() }
              : schema
          )
      );

      return { previousSchemas };
    },
    onError: (err, variables, context) => {
      if (context?.previousSchemas) {
        queryClient.setQueryData(
          [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
          context.previousSchemas
        );
      }
    },
    onSuccess: () => {
      invalidateExaminationQueries();
    },
  });

  const deleteSchemaMutation = api.examination.deleteAssessmentSchema.useMutation({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ 
        queryKey: [['examination', 'getAssessmentSchemas']]
      });

      const previousSchemas = queryClient.getQueryData([
        ['examination', 'getAssessmentSchemas'],
        { branchId: currentBranchId || undefined }
      ]);

      // Optimistically remove the schema
      queryClient.setQueryData(
        [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
        (old: any) => (old || []).filter((schema: any) => schema.id !== id)
      );

      return { previousSchemas };
    },
    onError: (err, variables, context) => {
      if (context?.previousSchemas) {
        queryClient.setQueryData(
          [['examination', 'getAssessmentSchemas'], { branchId: currentBranchId || undefined }],
          context.previousSchemas
        );
      }
    },
    onSuccess: () => {
      invalidateExaminationQueries();
    },
  });

  const createSchema = async (data: CreateAssessmentSchemaData) => {
    if (!currentBranchId) {
      throw new Error('Branch ID is required');
    }

    return createSchemaMutation.mutateAsync({
      name: data.name,
      term: data.term,
      classIds: data.classIds,
      subjectId: data.subjectId,
      branchId: currentBranchId,
      totalMarks: data.totalMarks,
      passingCriteria: data.passingCriteria,
      description: data.description,
      components: data.components,
    });
  };

  const updateSchema = async ({ id, data }: { id: string; data: CreateAssessmentSchemaData }) => {
    return updateSchemaMutation.mutateAsync({
      id,
      data: {
        name: data.name,
        term: data.term,
        classIds: data.classIds,
        subjectId: data.subjectId,
        totalMarks: data.totalMarks,
        passingCriteria: data.passingCriteria,
        description: data.description,
        components: data.components,
      },
    });
  };

  const updateSchemaStatus = async ({ id, action }: { id: string; action: 'set-draft' | 'set-published' | 'freeze-marks' }) => {
    return updateSchemaStatusMutation.mutateAsync({ id, action });
  };

  const deleteSchema = async (id: string) => {
    return deleteSchemaMutation.mutateAsync({ id });
  };

  // Manual refresh function for components that need to trigger updates
  const refreshAllData = async () => {
    await invalidateExaminationQueries();
  };

  return {
    schemas: schemas || [],
    isLoading,
    error,
    createSchema,
    isCreating: createSchemaMutation.isPending,
    createError: createSchemaMutation.error,
    updateSchema,
    isUpdating: updateSchemaMutation.isPending,
    updateError: updateSchemaMutation.error,
    updateSchemaStatus,
    isUpdatingStatus: updateSchemaStatusMutation.isPending,
    updateStatusError: updateSchemaStatusMutation.error,
    deleteSchema,
    isDeleting: deleteSchemaMutation.isPending,
    deleteError: deleteSchemaMutation.error,
    // New utility functions
    refreshAllData,
    invalidateExaminationQueries,
  };
}

/**
 * Enhanced Assessment Scores Hook with Auto-Refresh
 */
export function useAssessmentScores(assessmentSchemaId?: string) {
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranchContext();

  const { data: scores, isLoading, error } = api.examination.getAssessmentScores.useQuery(
    {
      assessmentSchemaId: assessmentSchemaId || "",
    },
    {
      enabled: !!assessmentSchemaId,
      staleTime: 10000, // 10 seconds - scores should be more frequently updated
      refetchOnWindowFocus: true,
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    }
  );

  const saveScoresMutation = api.examination.saveAssessmentScores.useMutation({
    onSuccess: () => {
      // Invalidate all examination-related queries when scores are saved
      Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: [['examination', 'getAssessmentScores']]
        }),
        queryClient.invalidateQueries({ 
          queryKey: [['examination', 'getAssessmentSchemas']]
        }),
        // Also invalidate any results or analytics queries
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && queryKey.some(key => 
              typeof key === 'string' && (
                key.includes('result') || 
                key.includes('analytics') || 
                key.includes('report')
              )
            );
          }
        })
      ]);
    },
  });

  const deleteScoreMutation = api.examination.deleteAssessmentScore.useMutation({
    onSuccess: (data, variables) => {
      console.log('🔄 Invalidating cache after score deletion:', { success: data.success, verified: data.verified });
      
      // Comprehensive cache invalidation
      const invalidationPromises = [
        // Core examination queries
        queryClient.invalidateQueries({ 
          queryKey: [['examination', 'getAssessmentScores']]
        }),
        queryClient.invalidateQueries({ 
          queryKey: [['examination', 'getAssessmentSchemas']]
        }),
        
        // Specific schema scores
        queryClient.invalidateQueries({ 
          queryKey: [['examination', 'getAssessmentScores'], { assessmentSchemaId: variables.assessmentSchemaId }]
        }),
        
        // Student-specific queries
        queryClient.invalidateQueries({ 
          queryKey: [['student'], { id: variables.studentId }]
        }),
        
        // Dashboard and analysis queries that depend on scores
        queryClient.invalidateQueries({ 
          queryKey: [['dashboard']]
        }),
        
        // Force refetch instead of just invalidate for critical queries
        queryClient.refetchQueries({ 
          queryKey: [['examination', 'getAssessmentScores'], { assessmentSchemaId: variables.assessmentSchemaId }]
        }),
      ];

      // Execute all invalidations
      Promise.all(invalidationPromises).catch(error => {
        console.error('❌ Cache invalidation error:', error);
      });
    },
    onError: (error) => {
      console.error('❌ Delete score mutation error:', error);
    },
  });

  const saveScores = async (scoresData: any[]) => {
    return saveScoresMutation.mutateAsync(scoresData);
  };

  const deleteScore = async (studentId: string, componentId?: string) => {
    if (!assessmentSchemaId) {
      throw new Error('Assessment schema ID is required');
    }

    return deleteScoreMutation.mutateAsync({
      studentId,
      assessmentSchemaId,
      componentId,
    });
  };

  return {
    scores: scores || [],
    isLoading,
    error,
    saveScores,
    isSaving: saveScoresMutation.isPending,
    saveError: saveScoresMutation.error,
    deleteScore,
    isDeleting: deleteScoreMutation.isPending,
    deleteError: deleteScoreMutation.error,
  };
} 