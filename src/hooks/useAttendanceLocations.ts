import { api } from "@/utils/api";
import type { AttendanceLocation } from "@prisma/client";

export function useAttendanceLocations(branchId: string) {
  const { data: locations = [], isLoading } = api.attendance.getLocations.useQuery(
    { branchId },
    {
      enabled: !!branchId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  return {
    locations: locations,
    isLoading,
  };
} 