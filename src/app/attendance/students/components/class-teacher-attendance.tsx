"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, subDays, isToday, isYesterday } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar as CalendarIcon,
  ClipboardCheck,
  UserX,
  UserCheck,
  Clock,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Utils and hooks
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";
import { AttendanceStatus } from "@prisma/client";
import {
  useClassAttendanceByDate,
  useBulkMarkStudentAttendance,
} from "@/utils/student-attendance-api";

// Shared components
import AttendanceMarkingInterface from "./shared/attendance-marking-interface";
import AttendanceSummaryCards from "./shared/attendance-summary-cards";
import QuickDateSelector from "./shared/quick-date-selector";

interface ClassTeacherAttendanceProps {
  teacherId: string;
}

export default function ClassTeacherAttendance({ teacherId }: ClassTeacherAttendanceProps) {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { can, isSuperAdmin } = usePermissions();

  // Permission checks
  const canMarkAttendance = can(Permission.MARK_ATTENDANCE) || can(Permission.MARK_SELF_ATTENDANCE);
  const canMarkAnyDate = can(Permission.MARK_ATTENDANCE_ANY_DATE);
  const canOverrideMarkedAttendance = isSuperAdmin || can(Permission.OVERRIDE_MARKED_ATTENDANCE);



  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [reasonData, setReasonData] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Get teacher data with assigned sections
  const { data: teacherData, isLoading: isLoadingTeacher } = api.teacher.getById.useQuery(
    { id: teacherId },
    { enabled: !!teacherId }
  );

  // Get available sections for this teacher
  const availableSections = useMemo(() => {
    if (!teacherData?.sections) return [];
    return teacherData.sections.map(section => ({
      id: section.id,
      name: section.name,
      className: section.class?.name || "Unknown Class",
      displayName: `${section.class?.name || "Unknown Class"} - ${section.name}`,
    }));
  }, [teacherData]);

  // Auto-select first section if available and none selected
  useEffect(() => {
    if (availableSections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(availableSections[0]!.id);
    }
  }, [availableSections, selectedSectionId]);

  // Get class ID from selected section
  const selectedClass = useMemo(() => {
    const section = availableSections.find(s => s.id === selectedSectionId);
    return teacherData?.sections.find(s => s.id === selectedSectionId)?.class;
  }, [selectedSectionId, availableSections, teacherData]);

  // Get attendance data for selected section and date
  const {
    attendanceData: classAttendance,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance
  } = useClassAttendanceByDate(selectedSectionId, selectedDate);

  // Bulk mark attendance mutation
  const {
    bulkMarkAttendance,
    isLoading: isMarkingAttendance,
  } = useBulkMarkStudentAttendance();

  // Check if attendance is already marked (and user can't override)
  const isAttendanceAlreadyMarked = useMemo(() => {
    if (!classAttendance) return false;
    if (canOverrideMarkedAttendance) return false; // Allow override for superadmins and users with MARK_ATTENDANCE permission
    return classAttendance.students.some(student => 
      student.attendance?.id && typeof student.attendance.id === 'string'
    );
  }, [classAttendance, canOverrideMarkedAttendance]);

  // Initialize attendance data when loaded
  useEffect(() => {
    if (classAttendance) {
      const initialAttendanceData: Record<string, AttendanceStatus> = {};
      const initialReasonData: Record<string, string> = {};

      classAttendance.students.forEach(student => {
        initialAttendanceData[student.student.id] = student.attendance.status;
        initialReasonData[student.student.id] = student.attendance.reason || '';
      });

      setAttendanceData(initialAttendanceData);
      setReasonData(initialReasonData);
      setIsSaved(isAttendanceAlreadyMarked);
    } else {
      setAttendanceData({});
      setReasonData({});
      setIsSaved(false);
    }
  }, [classAttendance, isAttendanceAlreadyMarked]);

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Check if user has permission to mark attendance for non-current dates
      const today = new Date();
      const isCurrentDate = date.toDateString() === today.toDateString();
      
      if (!isCurrentDate && !canMarkAnyDate) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to mark attendance for previous dates. Please contact your administrator.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedDate(date);
      setAttendanceData({});
      setReasonData({});
      setIsSaved(false);
    }
  };

  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setAttendanceData({});
    setReasonData({});
    setIsSaved(false);
  };

  // Handle save attendance
  const handleSaveAttendance = () => {
    if (!selectedSectionId) return;
    
    // Check permission again before saving
    const today = new Date();
    const isCurrentDate = selectedDate.toDateString() === today.toDateString();
    
    if (!isCurrentDate && !canMarkAnyDate) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to mark attendance for previous dates.",
        variant: "destructive",
      });
      return;
    }

    const attendanceRecords = Object.entries(attendanceData).map(([studentId, status]) => ({
      studentId,
      status,
      reason: reasonData[studentId] || undefined,
    }));

    bulkMarkAttendance({
      classId: selectedSectionId,
      date: selectedDate,
      attendance: attendanceRecords,
      markedById: teacherId || undefined,
    }, {
      onSuccess: () => {
        toast({
          title: "Attendance Saved",
          description: "Attendance has been successfully recorded.",
          variant: "success",
        });
        setIsSaved(true);
        void refetchAttendance();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to save attendance. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  // Show loading state
  if (isLoadingTeacher) {
    return (
      <div className="space-y-2 p-2">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Class Teacher Attendance
            </h2>
            <p className="text-muted-foreground">
              Mark attendance for your assigned class
            </p>
          </div>
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <div className="h-6 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Show no sections assigned state
  if (!availableSections.length) {
    return (
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Class Teacher Attendance
            </h2>
            <p className="text-muted-foreground">
              You haven't been assigned as a class teacher to any sections yet.
            </p>
        </div>
        
        <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-12 text-center">
          <ClipboardCheck className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h3 className="text-xl font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
            No Class Assignments
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You haven't been assigned as a class teacher to any sections yet.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Please contact your administrator to assign you to specific class sections for attendance management.
          </p>
        </div>
      </div>
    );
  }

  const currentSection = availableSections.find(s => s.id === selectedSectionId);

  return (
    <div className="space-y-2 p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Class Teacher Attendance</h2>
          <p className="text-muted-foreground">
            {currentSection 
              ? `Mark attendance for ${currentSection.displayName}` 
              : `Mark attendance for your assigned class${availableSections.length > 1 ? 'es' : ''}`
            }
          </p>
        </div>
      </div>

      {/* Section Selection */}
      {availableSections.length > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
          <span className="text-sm font-medium text-muted-foreground">Class Section:</span>
          <Select value={selectedSectionId} onValueChange={handleSectionChange}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              {availableSections.map(section => (
                <SelectItem key={section.id} value={section.id}>
                  {section.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-6">
        {/* Date Selection */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(subDays(selectedDate, 1))}
              disabled={!canMarkAnyDate}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
                              <DatePicker
                    value={selectedDate}
                    onChange={handleDateChange}
                    disabled={!canMarkAttendance}
                  />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(new Date())}
              disabled={isToday(selectedDate)}
              className="whitespace-nowrap"
            >
              Today
            </Button>
          </div>
          
          <QuickDateSelector
            onChange={handleDateChange}
            canSelectPreviousDates={canMarkAnyDate}
          />
        </div>

        {/* No Data State */}
        {!classAttendance && !isLoadingAttendance && selectedSectionId && (
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No attendance data available for this date.</p>
          </div>
        )}

        {/* Loading State */}
        {!classAttendance && isLoadingAttendance && (
          <div className="border rounded-lg p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading attendance data...</p>
          </div>
        )}

        {selectedSectionId ? (
          <>
            {/* Date permission info */}
            {!canMarkAnyDate && (
              <Alert className="mb-6 border-blue-500">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle>Date Restriction</AlertTitle>
                <AlertDescription>
                  You can only mark attendance for today's date. 
                  Contact your administrator if you need to mark attendance for previous dates.
                </AlertDescription>
              </Alert>
            )}

            {/* Already marked warning */}
            {isAttendanceAlreadyMarked && (
              <Alert className="mb-6 border-yellow-500">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle>Attendance Already Marked</AlertTitle>
                <AlertDescription>
                  Attendance has already been marked for this class on {format(selectedDate, "MMMM d, yyyy")}.
                  You can view the records but cannot modify them.
                </AlertDescription>
              </Alert>
            )}



            {/* Marker info for users with override permissions */}
            {canOverrideMarkedAttendance && classAttendance?.students && (
              (() => {
                const markedStudent = classAttendance.students.find(s => (s.attendance as any)?.markedBy);
                const attendance = markedStudent?.attendance as any;
                if (attendance?.markedBy) {
                  const markerName = `${attendance.markedBy.firstName || ''} ${attendance.markedBy.lastName || ''}`.trim();
                  const markedTime = attendance.createdAt ? format(new Date(attendance.createdAt), "PPP 'at' p") : '';
                  return (
                    <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertTitle>Attendance History</AlertTitle>
                      <AlertDescription>
                        Attendance was marked by <strong>{markerName}</strong> {markedTime && `on ${markedTime}`}.
                        You can modify these records as needed.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()
            )}

            {/* Summary Cards */}
            <AttendanceSummaryCards 
              attendanceData={attendanceData}
              students={classAttendance?.students || []}
            />

            {/* Attendance Interface */}
            <AttendanceMarkingInterface
              students={classAttendance?.students || []}
              attendanceData={attendanceData}
              reasonData={reasonData}
              onAttendanceChange={setAttendanceData}
              onReasonChange={setReasonData}
              onUnsavedChange={() => setIsSaved(false)}
              isLoading={isLoadingAttendance}
              canModify={canMarkAttendance && !isAttendanceAlreadyMarked}
            />
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Info className="mx-auto h-12 w-12 text-[#00501B] dark:text-[#7aad8c] mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Class Section</h3>
            <p className="text-sm">Choose a section from the dropdown above to view and mark attendance.</p>
          </div>
        )}

        {/* Footer Actions */}
        {selectedSectionId && classAttendance?.students && classAttendance.students.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-6 mt-6">
            <div className="text-sm text-muted-foreground">
              <CalendarIcon className="inline h-4 w-4 mr-2" />
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
              {currentSection && (
                <span className="ml-2">• {currentSection.displayName}</span>
              )}
            </div>
            
            <Button
              onClick={handleSaveAttendance}
              disabled={isMarkingAttendance || isAttendanceAlreadyMarked || !canMarkAttendance}
              className="bg-[#00501B] hover:bg-[#004517] text-white dark:bg-[#7aad8c] dark:hover:bg-[#6b9c7d] w-full sm:w-auto"
            >
              {isMarkingAttendance ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isAttendanceAlreadyMarked ? (
                <span className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> 
                  Already Saved
                </span>
              ) : isSaved ? (
                <span className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> 
                  Saved
                </span>
              ) : (
                "Save Attendance"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}