import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/hooks/useBranchContext';

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

  const { data: schemas, isLoading, error } = useQuery({
    queryKey: ['assessment-schemas', currentBranchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentBranchId) {
        params.append('branchId', currentBranchId);
      }
      
      const response = await fetch(`/api/assessment-schemas?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assessment schemas');
      }
      return response.json();
    },
    enabled: !!currentBranchId,
  });

  const createSchemaMutation = useMutation({
    mutationFn: async (data: CreateAssessmentSchemaData) => {
      console.log('Sending data to API:', data);
      
      const response = await fetch('/api/assessment-schemas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          branchId: currentBranchId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        throw new Error(error.error || error.details || 'Failed to create assessment schema');
      }

      const result = await response.json();
      console.log('API Success:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch schemas
      queryClient.invalidateQueries({ queryKey: ['assessment-schemas'] });
    },
  });

  const updateSchemaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateAssessmentSchemaData }) => {
      console.log('Updating schema with data:', data);
      
      const response = await fetch(`/api/assessment-schemas?id=${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          branchId: currentBranchId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        throw new Error(error.error || error.details || 'Failed to update assessment schema');
      }

      const result = await response.json();
      console.log('Update Success:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch schemas
      queryClient.invalidateQueries({ queryKey: ['assessment-schemas'] });
    },
  });

  const deleteSchemaMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting schema:', id);
      
      const response = await fetch(`/api/assessment-schemas?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Delete API Error:', error);
        throw new Error(error.error || error.details || 'Failed to delete assessment schema');
      }

      const result = await response.json();
      console.log('Delete Success:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch schemas
      queryClient.invalidateQueries({ queryKey: ['assessment-schemas'] });
    },
  });

  return {
    schemas: schemas || [],
    isLoading,
    error,
    createSchema: createSchemaMutation.mutate,
    isCreating: createSchemaMutation.isPending,
    createError: createSchemaMutation.error,
    updateSchema: updateSchemaMutation.mutate,
    isUpdating: updateSchemaMutation.isPending,
    updateError: updateSchemaMutation.error,
    deleteSchema: deleteSchemaMutation.mutate,
    isDeleting: deleteSchemaMutation.isPending,
    deleteError: deleteSchemaMutation.error,
  };
}

export function useAssessmentScores(assessmentSchemaId?: string) {
  const queryClient = useQueryClient();

  const { data: scores, isLoading, error } = useQuery({
    queryKey: ['assessment-scores', assessmentSchemaId],
    queryFn: async () => {
      if (!assessmentSchemaId) return [];
      
      const params = new URLSearchParams();
      params.append('assessmentSchemaId', assessmentSchemaId);
      
      const response = await fetch(`/api/assessment-scores?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch assessment scores');
      }
      return response.json();
    },
    enabled: !!assessmentSchemaId,
  });

  const saveScoresMutation = useMutation({
    mutationFn: async (scoresData: any[]) => {
      const response = await fetch('/api/assessment-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scoresData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save assessment scores');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch scores
      queryClient.invalidateQueries({ queryKey: ['assessment-scores'] });
    },
  });

  return {
    scores: scores || [],
    isLoading,
    error,
    saveScores: saveScoresMutation.mutate,
    isSaving: saveScoresMutation.isPending,
    saveError: saveScoresMutation.error,
  };
} 