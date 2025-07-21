import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/hooks/useBranchContext';
import { useAcademicSessionContext } from '@/hooks/useAcademicSessionContext';
import { api } from '@/utils/api';

interface Term {
  id: string;
  name: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  order: number;
  isActive: boolean;
  isCurrentTerm: boolean;
  branchId: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  branch: {
    name: string;
    code: string;
  };
  session: {
    name: string;
    startDate: Date;
    endDate: Date;
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

  const { data: terms = [], isLoading, error } = api.examination.getTerms.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: effectiveSessionId || undefined,
    },
    {
      enabled: !!currentBranchId && !!effectiveSessionId,
    }
  );

  const createTermMutation = api.examination.createTerm.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getTerms'],
          {
            branchId: currentBranchId || undefined,
            sessionId: effectiveSessionId || undefined,
          }
        ]
      });
    },
  });

  const updateTermMutation = api.examination.updateTerm.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getTerms'],
          {
            branchId: currentBranchId || undefined,
            sessionId: effectiveSessionId || undefined,
          }
        ]
      });
    },
  });

  const deleteTermMutation = api.examination.deleteTerm.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [
          ['examination', 'getTerms'],
          {
            branchId: currentBranchId || undefined,
            sessionId: effectiveSessionId || undefined,
          }
        ]
      });
    },
  });

  const createTerm = async (data: CreateTermData) => {
    if (!currentBranchId || !effectiveSessionId) {
      throw new Error('Branch ID and Session ID are required');
    }

    return createTermMutation.mutateAsync({
      name: data.name,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      order: data.order || 0,
      isCurrentTerm: data.isCurrentTerm || false,
      branchId: currentBranchId,
      sessionId: effectiveSessionId,
    });
  };

  const updateTerm = async ({ id, data }: { id: string; data: UpdateTermData }) => {
    return updateTermMutation.mutateAsync({
      id,
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        order: data.order,
        isCurrentTerm: data.isCurrentTerm,
        isActive: data.isActive,
      },
    });
  };

  const deleteTerm = async (id: string) => {
    return deleteTermMutation.mutateAsync({ id });
  };

  return {
    terms,
    isLoading,
    error,
    createTerm,
    isCreating: createTermMutation.isPending,
    createError: createTermMutation.error,
    updateTerm,
    isUpdating: updateTermMutation.isPending,
    updateError: updateTermMutation.error,
    deleteTerm,
    isDeleting: deleteTermMutation.isPending,
    deleteError: deleteTermMutation.error,
  };
}

export type { Term, CreateTermData, UpdateTermData }; 