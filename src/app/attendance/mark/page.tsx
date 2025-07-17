"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Info,
  HelpCircle,
  LifeBuoy,
  Users,
  LogIn,
  LogOut,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  convertToMilesOrKm,
  getCurrentPosition,
  getDistance,
  type Location,
} from "@/utils/location-helpers";
import { api } from "@/utils/api";
import { useAttendanceLocations, useRecordAttendance } from "@/utils/attendance-api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { PageWrapper } from "@/components/layout/page-wrapper";
import type { AttendanceLocation } from "@prisma/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";

// Define valid attendance types
const VALID_ATTENDANCE_TYPES = ["IN", "OUT", "BRANCH_TRANSFER_OUT", "BRANCH_TRANSFER_IN"] as const;
type AttendanceType = typeof VALID_ATTENDANCE_TYPES[number];

// Type guard for attendance types
function isAttendanceType(value: string): value is AttendanceType {
  return VALID_ATTENDANCE_TYPES.includes(value as AttendanceType);
}

// Define the attendance record type
type AttendanceRecord = {
  id: string;
  timestamp: Date;
  type: AttendanceType;
  latitude: number;
  longitude: number;
  distance: number;
  isWithinAllowedArea: boolean;
  notes: string | null;
  locationId: string;
  teacherId: string | null;
  employeeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  windowId: string | null;
  location: {
    name: string;
    id: string;
    latitude: number;
    longitude: number;
    radius: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    branchId: string;
    locationTypeId: string | null;
  };
};

// Define a type that combines Location and AttendanceLocation
type CombinedLocation = Location & Partial<AttendanceLocation>;

export default function MarkAttendancePage() {
  const router = useRouter();
  const { currentBranchId } = useBranchContext();
  const { user, session } = useAuth();
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin, userId, teacherId, employeeId } = useUserRole();
  const { can } = usePermissions();
  const utils = api.useUtils();

  // Check for granular permissions
  const canMarkSelfAttendance = isSuperAdmin || can(Permission.MARK_SELF_ATTENDANCE);
  const canMarkAllStaffAttendance = isSuperAdmin || can(Permission.MARK_ALL_STAFF_ATTENDANCE);
  const canMarkAttendance = isSuperAdmin || can(Permission.MARK_ATTENDANCE);

  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [attendanceType, setAttendanceType] = useState<AttendanceType>("IN");

  // Load locations using the custom hook
  const {
    locations,
    isLoading: isLoadingLocations
  } = useAttendanceLocations(currentBranchId || "");

  // Record attendance mutation
  const { recordAttendance, isLoading: isRecordingAttendance } = useRecordAttendance();

  // Fetch all active teachers for superadmin or users with MARK_ALL_STAFF_ATTENDANCE permission
  const { data: teachers, isLoading: isLoadingTeachers } = api.teacher.getAll.useQuery(
    { 
      branchId: currentBranchId || undefined,
      isActive: true 
    },
    { 
      enabled: isSuperAdmin || canMarkAllStaffAttendance,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  // Determine which teacherId to use for attendance check and recording
  const effectiveTeacherId = React.useMemo(() => {
    // If user can only mark self attendance, always use their own teacherId
    if (canMarkSelfAttendance && !canMarkAllStaffAttendance && !canMarkAttendance) {
      return teacherId;
    }
    // For superadmin/users with mark all staff permission:
    // 1. If they selected a teacher, use that teacherId
    // 2. If no teacher selected but they have their own teacherId, use their own
    // 3. Otherwise return undefined (will show teacher selection requirement)
    if (isSuperAdmin || canMarkAllStaffAttendance) {
      if (selectedTeacherId) {
        return selectedTeacherId;
      } else if (teacherId) {
        // Allow superadmin to mark their own attendance if they have a teacher profile
        return teacherId;
      }
      return undefined; // This will require teacher selection
    }
    // Default fallback
    return teacherId;
  }, [isSuperAdmin, canMarkSelfAttendance, canMarkAllStaffAttendance, canMarkAttendance, selectedTeacherId, teacherId]);

  // Create a stable date value for today (midnight)
  const today = React.useMemo(() => {
    const date = new Date();
    // Get just the date part in YYYY-MM-DD format and create a new date at midnight UTC
    const dateString = date.toISOString().split('T')[0];
    return new Date(`${dateString}T00:00:00.000Z`);
  }, []); // Empty deps array means this will only be calculated once

  // Function to manually fetch attendance data
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false);
  
  const trpc = api.useUtils();

  const fetchAttendanceData = React.useCallback(async () => {
    if (!userId || !(effectiveTeacherId || employeeId)) {
      return null;
    }

    setIsCheckingAttendance(true);
    try {
      // Use the tRPC client directly
      const data = await trpc.client.attendance.getAttendanceByDate.query({
        teacherId: effectiveTeacherId || undefined,
        employeeId: employeeId || undefined,
        date: today,
      });
      setTodayAttendance(data as unknown as AttendanceRecord);
      return data;
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      return null;
    } finally {
      setIsCheckingAttendance(false);
    }
  }, [trpc.client.attendance.getAttendanceByDate, effectiveTeacherId, employeeId, today, userId]);

  // Update attendance type handling
  const handleAttendanceTypeChange = (value: string) => {
    if (isAttendanceType(value)) {
      setAttendanceType(value);
    }
  };

  // Fetch attendance data on initial mount and when effectiveTeacherId changes
  React.useEffect(() => {
    // Only fetch if we have valid identification
    if (userId && (effectiveTeacherId || employeeId)) {
      fetchAttendanceData();
    } else {
      // Clear attendance data if no valid identification
      setTodayAttendance(null);
    }
  }, [fetchAttendanceData, effectiveTeacherId, employeeId, userId]);

  // Determine available attendance types based on last record
  const availableTypes = React.useMemo(() => {
    // If superadmin/user with mark all staff permission hasn't selected a teacher yet, show message
    if ((isSuperAdmin || canMarkAllStaffAttendance) && !effectiveTeacherId && !employeeId) {
      return [] as AttendanceType[]; // Empty array means show teacher selection requirement
    }

    if (!todayAttendance) {
      return ["IN"] as AttendanceType[];
    }

    const lastRecord = todayAttendance;
    if (!lastRecord?.type) {
      return ["IN"] as AttendanceType[];
    }

    switch (lastRecord.type) {
      case "IN":
        return ["OUT", "BRANCH_TRANSFER_OUT"] as AttendanceType[];
      case "OUT":
        return ["IN"] as AttendanceType[];
      case "BRANCH_TRANSFER_OUT":
        return ["BRANCH_TRANSFER_IN"] as AttendanceType[];
      case "BRANCH_TRANSFER_IN":
        return ["OUT", "BRANCH_TRANSFER_OUT"] as AttendanceType[];
      default:
        return ["IN"] as AttendanceType[];
    }
  }, [todayAttendance, isSuperAdmin, canMarkAllStaffAttendance, effectiveTeacherId, employeeId]);

  // Update attendance type when available types change
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(attendanceType)) {
      setAttendanceType(availableTypes[0]!);
    }
  }, [availableTypes, attendanceType]);

  // Effect to verify user identity data
  useEffect(() => {
    console.log("Checking user identity:", { teacherId, employeeId, userId });
    
    if (!userId) {
      setIdentityError("User ID not found. Please try logging out and back in.");
    } else if (!teacherId && !employeeId && !isSuperAdmin && !canMarkAllStaffAttendance) {
      setIdentityError("Your account is not associated with a teacher or employee profile. Please contact administrator.");
    } else if (!teacherId && !employeeId && (canMarkSelfAttendance && !canMarkAllStaffAttendance)) {
      setIdentityError("You only have permission to mark your own attendance, but you don't have a teacher or employee profile.");
    } else {
      setIdentityError(null);
    }
  }, [teacherId, employeeId, userId, isSuperAdmin, canMarkSelfAttendance, canMarkAllStaffAttendance]);

  // Effect to auto-select a location if there's only one
  useEffect(() => {
    if (locations.length === 1) {
      setSelectedLocationId(locations[0]?.id || "");
    }
  }, [locations]);

  // Simplify the attendance state management
  React.useEffect(() => {
    if (selectedTeacherId) {
      setDistance(null);
      setErrorMessage(null);
      setProgress(0);
    }
  }, [selectedTeacherId]);

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
    setDistance(null);
    setErrorMessage(null);
    setProgress(0);
  };

  const handleSelectTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setDistance(null);
    setErrorMessage(null);
    setProgress(0);
  };

  const checkLocation = async () => {
    try {
      setIsCheckingLocation(true);
      setProgress(25);

      // Get current location
      const position = await getCurrentPosition();
      setCurrentPosition(position);
      setProgress(50);

      // Get selected location
      const location = locations.find((loc: Location) => loc.id === selectedLocationId);

      if (!location) {
        throw new Error("Selected location not found");
      }

      setProgress(75);

      // Calculate distance
      const calculatedDistance = getDistance(
        { lat: position.lat, lng: position.lng },
        { lat: location.latitude, lng: location.longitude }
      );

      setDistance(calculatedDistance);
      
      // Fetch attendance data when checking location
      await fetchAttendanceData();
      
      setProgress(100);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to get location");
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const markAttendance = () => {
    if (!selectedLocationId || !currentPosition || !distance) {
      toast.error("Please check your location first");
      return;
    }

    // Check if we have a valid teacher/employee ID to mark attendance for
    if (!effectiveTeacherId && !employeeId) {
      toast.error((isSuperAdmin || canMarkAllStaffAttendance) 
        ? "Please select a teacher to mark attendance for" 
        : "Unable to identify user for attendance marking");
      return;
    }

    // Check if attendance types are available
    if (availableTypes.length === 0) {
      toast.error("No attendance options are currently available");
      return;
    }

    const selectedLocation = locations.find((loc: Location) => loc.id === selectedLocationId);

    if (!selectedLocation) {
      toast.error("Selected location not found");
      return;
    }

    // Prepare the attendance record data
    const attendanceData = {
      locationId: selectedLocationId,
      latitude: currentPosition.lat,
      longitude: currentPosition.lng,
      distance,
      type: attendanceType,
      isWithinAllowedArea: distance <= selectedLocation.radius,
      ...(effectiveTeacherId ? { teacherId: effectiveTeacherId } : {}),
      ...(employeeId && !effectiveTeacherId ? { employeeId } : {}),
    };

    // Record attendance
    recordAttendance(attendanceData, {
      onSuccess: async () => {
        const teacherName = effectiveTeacherId && selectedTeacherId 
          ? teachers?.items?.find((t: any) => t.id === selectedTeacherId)?.firstName 
          : "Your";
        toast.success(`${attendanceType} attendance marked successfully${teacherName !== "Your" ? ` for ${teacherName}` : ""}`);
        // Explicitly fetch data again
        await fetchAttendanceData();
      },
      onError: (error) => {
        toast.error(`Failed to mark attendance: ${error.message}`);
      },
    });
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mark Attendance</h1>
            <p className="mt-1 text-sm text-gray-500">
              Use your device's GPS to mark your attendance at your location.
            </p>
          </div>
          
          <div className="mt-2 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center"
              onClick={async () => {
                await fetchAttendanceData();
              }}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Identity Error */}
        {identityError && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-red-600">
                <ShieldAlert className="mr-2 h-4 w-4" />
                Identity Verification Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700">{identityError}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="gap-2" onClick={() => router.push("/profile")}>
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>Go to Profile</span>
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Main Attendance Form */}
        {!identityError && (
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
              <CardDescription>
                {todayAttendance 
                  ? `Mark your next attendance action. Last recorded: ${todayAttendance.type} at ${format(new Date(todayAttendance.timestamp), "h:mm a")}`
                  : "Mark your attendance for today by checking in at your designated location."
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Attendance Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Attendance Type</label>
                {availableTypes.length > 0 ? (
                  <Select value={attendanceType} onValueChange={handleAttendanceTypeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select attendance type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center">
                            {type === "IN" && <LogIn className="mr-2 h-3.5 w-3.5 text-green-500" />}
                            {type === "OUT" && <LogOut className="mr-2 h-3.5 w-3.5 text-red-500" />}
                            {type === "BRANCH_TRANSFER_OUT" && <ArrowRight className="mr-2 h-3.5 w-3.5 text-orange-500" />}
                            {type === "BRANCH_TRANSFER_IN" && <ArrowLeft className="mr-2 h-3.5 w-3.5 text-blue-500" />}
                            <span>{type.replace(/_/g, " ")}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Info className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-blue-700">
                      {(isSuperAdmin || canMarkAllStaffAttendance) && !effectiveTeacherId && !employeeId
                        ? "Please select a teacher below to view their available attendance options."
                        : "No attendance options available at this time."}
                    </span>
                  </div>
                )}
              </div>

              {/* Teacher Selection for SuperAdmin */}
              {(isSuperAdmin || canMarkAllStaffAttendance) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Teacher
                    {!effectiveTeacherId && !employeeId && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {isLoadingTeachers ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedTeacherId} onValueChange={handleSelectTeacher}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a teacher..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers?.items?.map((teacher: any) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            <div className="flex items-center">
                              <Users className="mr-2 h-3.5 w-3.5 text-gray-500" />
                              <span>{`${teacher.firstName} ${teacher.lastName}`}</span>
                              {teacher.employeeCode && (
                                <span className="ml-2 text-xs text-gray-500">({teacher.employeeCode})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!effectiveTeacherId && !employeeId && (
                    <p className="text-xs text-gray-600">
                      Required: You must select a teacher to mark attendance for them.
                    </p>
                  )}
                </div>
              )}

              {/* Location Selection */}
              {isLoadingLocations ? (
                <div className="space-y-2">
                  <div className="h-5 w-32 rounded bg-gray-200" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Select Location</label>
                  <Select value={selectedLocationId} onValueChange={handleSelectLocation}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc: Location) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-3.5 w-3.5 text-gray-500" />
                            <span>{loc.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Location Check Results */}
              {selectedLocationId && (
                <div className="mt-4 rounded-lg border border-gray-200 p-4">
                  {isCheckingLocation ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div
                          className="h-16 w-16 animate-pulse rounded-full bg-blue-100"
                          style={{
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <MapPin className="h-8 w-8 text-blue-500" />
                        </div>
                      </div>
                      <Progress value={progress} className="mx-auto h-2 w-full" />
                      <p className="text-center text-sm text-gray-500">
                        Checking your location...
                      </p>
                    </div>
                  ) : errorMessage ? (
                    <div className="space-y-4 text-center">
                      <div className="flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                          <Info className="h-8 w-8 text-red-500" />
                        </div>
                      </div>
                      <p className="text-sm text-red-500">{errorMessage}</p>
                    </div>
                  ) : distance !== null ? (
                    <div className="space-y-4 text-center">
                      <div className="flex justify-center">
                        <div
                          className={`flex h-16 w-16 items-center justify-center rounded-full ${
                            distance <=
                            (locations.find(
                              (loc: Location) => loc.id === selectedLocationId
                            )?.radius || 0)
                              ? "bg-green-100"
                              : "bg-yellow-100"
                          }`}
                        >
                          {distance <=
                          (locations.find(
                            (loc: Location) => loc.id === selectedLocationId
                          )?.radius || 0) ? (
                            <Check className="h-8 w-8 text-green-500" />
                          ) : (
                            <Info className="h-8 w-8 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">
                          {distance <=
                          (locations.find(
                            (loc: Location) => loc.id === selectedLocationId
                          )?.radius || 0)
                            ? "You are within the allowed area"
                            : "You are outside the allowed area"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Distance: {convertToMilesOrKm(distance)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <HelpCircle className="mb-2 h-6 w-6" />
                        <p>Click "Check Location" to verify your position</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Today's Attendance Records */}
              {todayAttendance && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Today's Attendance Records</h3>
                  <div className="rounded-md border">
                    <div className="divide-y">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            todayAttendance.type === "IN" && "bg-green-100",
                            todayAttendance.type === "OUT" && "bg-red-100",
                            todayAttendance.type === "BRANCH_TRANSFER_OUT" && "bg-orange-100",
                            todayAttendance.type === "BRANCH_TRANSFER_IN" && "bg-blue-100"
                          )}>
                            {todayAttendance.type === "IN" && <LogIn className="h-4 w-4 text-green-600" />}
                            {todayAttendance.type === "OUT" && <LogOut className="h-4 w-4 text-red-600" />}
                            {todayAttendance.type === "BRANCH_TRANSFER_OUT" && <ArrowRight className="h-4 w-4 text-orange-600" />}
                            {todayAttendance.type === "BRANCH_TRANSFER_IN" && <ArrowLeft className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{todayAttendance.type.replace(/_/g, " ")}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(todayAttendance.timestamp), "h:mm a")} at {todayAttendance.location.name}
                            </p>
                          </div>
                        </div>
                        <Badge variant={todayAttendance.isWithinAllowedArea ? "default" : "destructive"}>
                          {todayAttendance.isWithinAllowedArea ? "Within Area" : "Outside Area"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between space-x-4">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={checkLocation}
                disabled={!selectedLocationId || isCheckingLocation || (!effectiveTeacherId && !employeeId) || availableTypes.length === 0}
              >
                {isCheckingLocation ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Check Location</span>
                  </>
                )}
              </Button>
              <Button
                className="flex-1 gap-2 bg-[#00501B] hover:bg-[#00501B]/90"
                onClick={markAttendance}
                disabled={
                  !selectedLocationId ||
                  (!effectiveTeacherId && !employeeId) ||
                  availableTypes.length === 0 ||
                  distance === null ||
                  distance > (locations.find((loc: Location) => loc.id === selectedLocationId)?.radius || 0) ||
                  isRecordingAttendance
                }
              >
                {isRecordingAttendance ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5" />
                    <span>Mark Attendance</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Help Card */}
        {!identityError && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium">
                <Info className="mr-2 h-4 w-4" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              <ol className="list-inside list-decimal space-y-1">
                <li>Select your location from the dropdown menu.</li>
                <li>Click "Check Location" to verify your position.</li>
                <li>If you are within the allowed area, click "Mark Attendance".</li>
                <li>
                  If you are outside the allowed area, try moving closer to the
                  designated location and check again.
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
