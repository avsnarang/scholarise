import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/hooks/useBranchContext';
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

export function useAssessmentSchemas() {
  const { currentBranchId } = useBranchContext();
  const queryClient = useQueryClient();

  const { data: schemas, isLoading, error } = api.examination.getAssessmentSchemas.useQuery(
    {
      branchId: currentBranchId || undefined,
    },
    {
      enabled: !!currentBranchId,
    }
  );

  const createSchemaMutation = api.examination.createAssessmentSchema.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getAssessmentSchemas'],
          {
            branchId: currentBranchId || undefined,
          }
        ]
      });
    },
  });

  const updateSchemaMutation = api.examination.updateAssessmentSchema.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getAssessmentSchemas'],
          {
            branchId: currentBranchId || undefined,
          }
        ]
      });
    },
  });

  const updateSchemaStatusMutation = api.examination.updateAssessmentSchemaStatus.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getAssessmentSchemas'],
          {
            branchId: currentBranchId || undefined,
          }
        ]
      });
    },
  });

  const deleteSchemaMutation = api.examination.deleteAssessmentSchema.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getAssessmentSchemas'],
          {
            branchId: currentBranchId || undefined,
          }
        ]
      });
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
  };
}

export function useAssessmentScores(assessmentSchemaId?: string) {
  const queryClient = useQueryClient();

  const { data: scores, isLoading, error } = api.examination.getAssessmentScores.useQuery(
    {
      assessmentSchemaId: assessmentSchemaId || "",
    },
    {
      enabled: !!assessmentSchemaId,
    }
  );

  const saveScoresMutation = api.examination.saveAssessmentScores.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getAssessmentScores'],
          {
            assessmentSchemaId: assessmentSchemaId || "",
          }
        ]
      });
    },
  });

  const deleteScoreMutation = api.examination.deleteAssessmentScore.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getAssessmentScores'],
          {
            assessmentSchemaId: assessmentSchemaId || "",
          }
        ]
      });
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