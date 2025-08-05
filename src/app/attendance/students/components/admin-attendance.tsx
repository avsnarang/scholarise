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
  GraduationCap,
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

/**
 * Admin Attendance Component
 * 
 * This component is designed for administrators, super admins, and staff with attendance permissions.
 * It provides dropdowns to select any class and section in the system.
 * 
 * Key Features:
 * - Class and section selection dropdowns
 * - Date-based permission controls (MARK_ATTENDANCE_ANY_DATE)
 * - Full attendance management interface
 * - Bulk save functionality
 */
export default function AdminAttendance() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { can, isSuperAdmin, user } = usePermissions();

  // Permission checks
  const canMarkAttendance = can(Permission.MARK_ATTENDANCE);
  const canMarkAnyDate = can(Permission.MARK_ATTENDANCE_ANY_DATE);
  const canOverrideMarkedAttendance = isSuperAdmin || can(Permission.OVERRIDE_MARKED_ATTENDANCE);



  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [reasonData, setReasonData] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Fetch all classes with sections
  const { data: classes, isLoading: isLoadingClasses } = api.class.getAll.useQuery({
    branchId: currentBranchId || undefined,
    sessionId: currentSessionId || undefined,
    includeSections: true,
  }, {
    enabled: !!currentBranchId && !!currentSessionId,
  });

  // Get sections for selected class
  const availableSections = useMemo(() => {
    if (!selectedClassId || !classes) return [];
    const selectedClass = classes.find(c => c.id === selectedClassId);
    return selectedClass?.sections?.map(section => ({
      id: section.id,
      name: section.name,
      displayName: section.name,
    })) || [];
  }, [selectedClassId, classes]);

  // Auto-select first section when class changes
  useEffect(() => {
    if (availableSections.length > 0 && selectedSectionId && !availableSections.find(s => s.id === selectedSectionId)) {
      setSelectedSectionId(availableSections[0]?.id || "");
    }
  }, [availableSections, selectedSectionId]);

  // Clear section when class changes
  useEffect(() => {
    setSelectedSectionId("");
    setAttendanceData({});
    setReasonData({});
    setIsSaved(false);
  }, [selectedClassId]);

  // Get class ID from selected section
  const selectedClass = useMemo(() => {
    return classes?.find(c => c.id === selectedClassId);
  }, [selectedClassId, classes]);

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

  // Handle class change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
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
      markedById: user?.id || undefined,
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

  // Get current class and section names for display
  const currentClass = classes?.find(c => c.id === selectedClassId);
  const currentSection = availableSections.find(s => s.id === selectedSectionId);

  // Show loading state
  if (isLoadingClasses) {
    return (
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Attendance Management
          </h2>
        </div>
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <div className="h-6 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Attendance Management</h2>
          <p className="text-muted-foreground">
            {currentClass && currentSection 
              ? `Managing attendance for ${currentClass.name} - ${currentSection.name}`
              : "Select a class and section to manage attendance"
            }
          </p>
        </div>
      </div>

      {/* Class and Section Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Class</label>
          <Select value={selectedClassId} onValueChange={handleClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Section</label>
          <Select 
            value={selectedSectionId} 
            onValueChange={handleSectionChange}
            disabled={!selectedClassId || availableSections.length === 0}
          >
            <SelectTrigger>
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
      </div>

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
            <GraduationCap className="mx-auto h-12 w-12 text-[#00501B] dark:text-[#7aad8c] mb-4" />
            <h3 className="text-lg font-medium mb-2">Select Class and Section</h3>
            <p className="text-sm max-w-md mx-auto">
              Choose a class and section from the dropdowns above to view and mark attendance for students.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        {selectedSectionId && classAttendance?.students && classAttendance.students.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t pt-6 mt-6">
            <div className="text-sm text-muted-foreground">
              <CalendarIcon className="inline h-4 w-4 mr-2" />
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
              {currentClass && currentSection && (
                <span className="ml-2">• {currentClass.name} - {currentSection.name}</span>
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