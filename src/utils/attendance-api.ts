import { api } from "@/utils/api";
import { type AttendanceLocation, type AttendanceRecord } from "./location-helpers";

// Convert Prisma models to our frontend types
export function mapLocationFromApi(apiLocation: any): AttendanceLocation {
  return {
    id: apiLocation.id,
    name: apiLocation.name,
    latitude: apiLocation.latitude,
    longitude: apiLocation.longitude,
    radius: apiLocation.radius,
    isActive: apiLocation.isActive,
  };
}

export function mapAttendanceFromApi(apiAttendance: any): AttendanceRecord {
  return {
    id: apiAttendance.id,
    userId: apiAttendance.teacherId
      ? apiAttendance.teacher.id
      : apiAttendance.employee.id,
    userName: apiAttendance.teacherId
      ? `${apiAttendance.teacher.firstName} ${apiAttendance.teacher.lastName}`
      : `${apiAttendance.employee.firstName} ${apiAttendance.employee.lastName}`,
    locationId: apiAttendance.locationId,
    locationName: apiAttendance.location.name,
    timestamp: apiAttendance.timestamp.toISOString(),
    latitude: apiAttendance.latitude,
    longitude: apiAttendance.longitude,
    isWithinAllowedArea: apiAttendance.isWithinAllowedArea,
    distance: apiAttendance.distance,
  };
}

// Hook for loading attendance locations
export function useAttendanceLocations(branchId?: string, includeInactive: boolean = false) {
  const { data, isLoading, error, refetch } = api.attendance.getLocations.useQuery(
    { branchId, includeInactive },
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );

  return {
    locations: data?.map(mapLocationFromApi) || [],
    isLoading,
    error,
    refetch,
  };
}

// Hook for loading attendance records
export function useAttendanceRecords(
  filters: {
    startDate?: Date;
    endDate?: Date;
    locationId?: string;
    teacherId?: string;
    employeeId?: string;
    branchId?: string;
  } = {}
) {
  const { data, isLoading, error, refetch } = api.attendance.getAttendanceRecords.useQuery(
    filters,
    { staleTime: 60 * 1000 } // 1 minute
  );

  return {
    records: data?.map(mapAttendanceFromApi) || [],
    isLoading,
    error,
    refetch,
  };
}

// Hook for recording attendance
export function useRecordAttendance() {
  const utils = api.useUtils();
  const mutation = api.attendance.recordAttendance.useMutation({
    onSuccess: () => {
      // Invalidate queries that depend on this data
      void utils.attendance.getAttendanceRecords.invalidate();
      // Also invalidate the getAttendanceByDate query to refresh the UI
      void utils.attendance.getAttendanceByDate.invalidate();
      // Invalidate attendance summary
      void utils.attendance.getStaffAttendanceSummary.invalidate();
    },
  });

  return {
    recordAttendance: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Hook for managing attendance locations
export function useAttendanceLocationMutations() {
  const utils = api.useUtils();

  const createMutation = api.attendance.createLocation.useMutation({
    onMutate: (data) => {
      console.log("Creating location with data:", data);
    },
    onSuccess: (data) => {
      console.log("Location created successfully:", data);
      void utils.attendance.getLocations.invalidate();
    },
    onError: (error) => {
      console.error("Error creating location:", error);
    }
  });

  const updateMutation = api.attendance.updateLocation.useMutation({
    onMutate: (data) => {
      console.log("Updating location with data:", data);
    },
    onSuccess: (data) => {
      console.log("Location updated successfully:", data);
      void utils.attendance.getLocations.invalidate();
    },
    onError: (error) => {
      console.error("Error updating location:", error);
    }
  });

  const deleteMutation = api.attendance.deleteLocation.useMutation({
    onSuccess: () => {
      void utils.attendance.getLocations.invalidate();
    },
  });

  const toggleStatusMutation = api.attendance.toggleLocationStatus.useMutation({
    onSuccess: () => {
      void utils.attendance.getLocations.invalidate();
    },
  });

  return {
    createLocation: createMutation.mutate,
    updateLocation: updateMutation.mutate,
    deleteLocation: deleteMutation.mutate,
    toggleLocationStatus: toggleStatusMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTogglingStatus: toggleStatusMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    toggleStatusError: toggleStatusMutation.error,
  };
}

// Hook for getting staff attendance summary
export function useStaffAttendanceSummary(
  teacherId?: string,
  employeeId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const { data, isLoading, error } = api.attendance.getStaffAttendanceSummary.useQuery(
    {
      teacherId,
      employeeId,
      startDate: startDate || firstDayOfMonth,
      endDate: endDate || today,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!(teacherId || employeeId)
    }
  );

  return {
    summary: data,
    isLoading,
    error,
  };
}