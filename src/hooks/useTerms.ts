import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';

interface Term {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  order: number;
  isActive: boolean;
  isCurrentTerm: boolean;
  branchId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  branch: {
    name: string;
    code: string;
  };
  session: {
    name: string;
    startDate: string;
    endDate: string;
  };
}

interface CreateTermData {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  order?: number;
  isCurrentTerm?: boolean;
  sessionId: string;
}

interface UpdateTermData {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  order?: number;
  isCurrentTerm?: boolean;
  isActive?: boolean;
}

export function useTerms(sessionId?: string) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const queryClient = useQueryClient();

  // Use the provided sessionId or fall back to the current session from context
  const effectiveSessionId = sessionId || currentSessionId;

  const { data: terms = [], isLoading, error } = useQuery({
    queryKey: ['terms', currentBranchId, effectiveSessionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentBranchId) {
        params.append('branchId', currentBranchId);
      }
      if (effectiveSessionId) {
        params.append('sessionId', effectiveSessionId);
      }
      
      const response = await fetch(`/api/terms?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch terms');
      }
      return response.json() as Promise<Term[]>;
    },
    enabled: !!currentBranchId && !!effectiveSessionId,
  });

  const createTermMutation = useMutation({
    mutationFn: async (data: CreateTermData) => {
      console.log('Creating term with data:', data);
      
      const response = await fetch('/api/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          branchId: currentBranchId,
          sessionId: effectiveSessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        throw new Error(error.error || error.details || 'Failed to create term');
      }

      const result = await response.json();
      console.log('API Success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
  });

  const updateTermMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTermData }) => {
      console.log('Updating term with data:', data);
      
      const response = await fetch(`/api/terms?id=${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        throw new Error(error.error || error.details || 'Failed to update term');
      }

      const result = await response.json();
      console.log('Update Success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
  });

  const deleteTermMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting term:', id);
      
      const response = await fetch(`/api/terms?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Delete API Error:', error);
        throw new Error(error.error || error.details || 'Failed to delete term');
      }

      const result = await response.json();
      console.log('Delete Success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
  });

  return {
    terms,
    isLoading,
    error,
    createTerm: createTermMutation.mutate,
    isCreating: createTermMutation.isPending,
    createError: createTermMutation.error,
    updateTerm: updateTermMutation.mutate,
    isUpdating: updateTermMutation.isPending,
    updateError: updateTermMutation.error,
    deleteTerm: deleteTermMutation.mutate,
    isDeleting: deleteTermMutation.isPending,
    deleteError: deleteTermMutation.error,
  };
}

export type { Term, CreateTermData, UpdateTermData }; 