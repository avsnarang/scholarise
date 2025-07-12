import { api } from "@/utils/api";
import { useBranchContext } from "./useBranchContext";
import { useMemo } from "react";

export function useGradeScales(options?: { isActive?: boolean }) {
  const { currentBranchId } = useBranchContext();

  const { data: gradeScales = [], isLoading, error, refetch } = api.examination.getGradeScales.useQuery(
    { 
      branchId: currentBranchId || undefined, 
      isActive: options?.isActive 
    },
    { enabled: !!currentBranchId }
  );

  const defaultGradeScale = useMemo(() => {
    // First try to find an active default scale
    const activeDefault = gradeScales.find(scale => scale.isDefault && scale.isActive);
    if (activeDefault) return activeDefault;
    
    // If no active default, return the inactive default for display purposes
    // but warn that it's inactive
    return gradeScales.find(scale => scale.isDefault) || null;
  }, [gradeScales]);

  const activeGradeScales = useMemo(() => {
    return gradeScales.filter(scale => scale.isActive);
  }, [gradeScales]);

  const inactiveGradeScales = useMemo(() => {
    return gradeScales.filter(scale => !scale.isActive);
  }, [gradeScales]);

  return {
    gradeScales,
    activeGradeScales,
    inactiveGradeScales,
    defaultGradeScale,
    isLoading,
    error,
    refetch,
  };
}

export function useDefaultGradeScale() {
  const { defaultGradeScale, isLoading } = useGradeScales(); // Remove isActive filter
  
  // Return only if the default scale is active
  const activeDefaultScale = defaultGradeScale?.isActive ? defaultGradeScale : null;
  
  return { 
    defaultGradeScale: activeDefaultScale, 
    isLoading,
    hasInactiveDefault: defaultGradeScale && !defaultGradeScale.isActive
  };
} 