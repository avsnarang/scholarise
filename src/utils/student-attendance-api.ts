import { api } from "@/utils/api";
import { AttendanceStatus } from "@prisma/client";

// Types
export interface StudentAttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  rollNumber?: string;
  admissionNumber: string;
  date: Date;
  status: AttendanceStatus;
  reason?: string | null;
  notes?: string | null;
}

export interface ClassAttendanceData {
  class: {
    id: string;
    name: string;
    section?: string;
  };
  date: Date;
  students: {
    student: {
      id: string;
      firstName: string;
      lastName: string;
      rollNumber?: string;
      admissionNumber: string;
    };
    attendance: {
      id?: string;
      status: AttendanceStatus;
      reason?: string | null;
      notes?: string | null;
    };
  }[];
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export interface AttendanceSummary {
  studentId: string;
  period: {
    startDate: Date;
    endDate: Date;
    totalDays: number;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    excused: number;
  };
  attendanceRate: number;
}

// Hook for getting student attendance records
export function useStudentAttendance(
  filters: {
    studentId?: string;
    classId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: AttendanceStatus;
  } = {}
) {
  const { data, isLoading, error, refetch } = api.attendance.getStudentAttendance.useQuery(
    filters,
    { 
      staleTime: 60 * 1000, // 1 minute
      enabled: !!(filters.studentId || filters.classId)
    }
  );

  const records: StudentAttendanceRecord[] = data?.map(record => ({
    id: record.id,
    studentId: record.student.id,
    studentName: `${record.student.firstName} ${record.student.lastName}`,
    rollNumber: record.student.rollNumber?.toString(),
    admissionNumber: record.student.admissionNumber,
    date: new Date(record.date),
    status: record.status,
    reason: record.reason,
    notes: record.notes,
  })) || [];

  return {
    records,
    isLoading,
    error,
    refetch,
  };
}

// Hook for getting class attendance by date
export function useClassAttendanceByDate(classId: string | undefined, date: Date = new Date()) {
  const { data, isLoading, error, refetch } = api.attendance.getClassAttendanceByDate.useQuery(
    { classId: classId!, date },
    { 
      staleTime: 60 * 1000, // 1 minute
      enabled: !!classId
    }
  );

  return {
    attendanceData: data as ClassAttendanceData | undefined,
    isLoading,
    error,
    refetch,
  };
}

// Hook for marking student attendance
export function useMarkStudentAttendance() {
  const utils = api.useUtils();
  const mutation = api.attendance.markStudentAttendance.useMutation({
    onSuccess: () => {
      // Invalidate the queries that depend on attendance data
      void utils.attendance.getStudentAttendance.invalidate();
      void utils.attendance.getClassAttendanceByDate.invalidate();
      void utils.attendance.getStudentAttendanceSummary.invalidate();
    },
  });

  return {
    markAttendance: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Hook for bulk marking student attendance
export function useBulkMarkStudentAttendance() {
  const utils = api.useUtils();
  const mutation = api.attendance.bulkMarkStudentAttendance.useMutation({
    onSuccess: () => {
      // Invalidate the queries that depend on attendance data
      void utils.attendance.getStudentAttendance.invalidate();
      void utils.attendance.getClassAttendanceByDate.invalidate();
      void utils.attendance.getStudentAttendanceSummary.invalidate();
    },
  });

  return {
    bulkMarkAttendance: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Hook for getting student attendance summary
export function useStudentAttendanceSummary(
  studentId?: string,
  startDate: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  endDate: Date = new Date()
) {
  const { data, isLoading, error } = api.attendance.getStudentAttendanceSummary.useQuery(
    {
      studentId: studentId || "",
      startDate,
      endDate,
    },
    { 
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!studentId
    }
  );

  return {
    summary: data as AttendanceSummary | undefined,
    isLoading,
    error,
  };
}

// Hook for deleting student attendance
export function useDeleteStudentAttendance() {
  const utils = api.useUtils();
  const mutation = api.attendance.deleteStudentAttendance.useMutation({
    onSuccess: () => {
      // Invalidate the queries that depend on attendance data
      void utils.attendance.getStudentAttendance.invalidate();
      void utils.attendance.getClassAttendanceByDate.invalidate();
      void utils.attendance.getStudentAttendanceSummary.invalidate();
    },
  });

  return {
    deleteAttendance: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Helper function to get the status badge color based on attendance status
export function getStatusColor(status: AttendanceStatus) {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return {
        bg: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-700 dark:text-green-400",
        border: "border-green-200 dark:border-green-800"
      };
    case AttendanceStatus.LEAVE:
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800"
      };
    case AttendanceStatus.ABSENT:
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-800"
      };
    case AttendanceStatus.HALF_DAY:
      return {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        text: "text-orange-700 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-800"
      };
    case AttendanceStatus.LATE:
      return {
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        text: "text-yellow-700 dark:text-yellow-400",
        border: "border-yellow-200 dark:border-yellow-800"
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-gray-800/50",
        text: "text-gray-700 dark:text-gray-400",
        border: "border-gray-200 dark:border-gray-700"
      };
  }
}

// Helper function to get the readable name of an attendance status
export function getStatusName(status: AttendanceStatus): string {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return "Present";
    case AttendanceStatus.LEAVE:
      return "Leave";
    case AttendanceStatus.ABSENT:
      return "Absent";
    case AttendanceStatus.HALF_DAY:
      return "Half Day";
    case AttendanceStatus.LATE:
      return "Late";
    default:
      return status;
  }
} 