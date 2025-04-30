import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

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
  checkInLocation,
  convertToMilesOrKm,
  getCurrentPosition,
  getDistance,
  type AttendanceLocation,
} from "@/utils/location-helpers";
import { useUserRole } from "@/hooks/useUserRole";
import { api } from "@/utils/api";
import { useAttendanceLocations, useRecordAttendance } from "@/utils/attendance-api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { type NextPageWithLayout } from "../_app";

const MarkAttendancePage: NextPageWithLayout = () => {
  const { currentBranchId } = useBranchContext();
  const { data: session } = useSession();
  const { isTeacher, isEmployee, userId, teacherId, employeeId } = useUserRole();
  
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  
  // Load locations using the custom hook
  const { 
    locations, 
    isLoading: isLoadingLocations 
  } = useAttendanceLocations(currentBranchId);
  
  // Record attendance mutation
  const { mutate: recordAttendance, isLoading: isRecordingAttendance } = useRecordAttendance();
  
  // Effect to auto-select a location if there's only one
  useEffect(() => {
    if (locations.length === 1) {
      setSelectedLocationId(locations[0]?.id || "");
    }
  }, [locations]);
  
  // Check if today's attendance is already marked
  const { data: todayAttendance, isLoading: isCheckingAttendance } = api.attendance.getAttendanceByDate.useQuery(
    {
      teacherId: teacherId || undefined,
      employeeId: employeeId || undefined,
      date: new Date(),
    },
    {
      enabled: !!userId && (!!teacherId || !!employeeId),
      onSuccess: (data) => {
        if (data) {
          setAttendanceMarked(true);
        }
      },
    }
  );

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
    setDistance(null);
    setErrorMessage(null);
    setProgress(0);
  };

  const checkLocation = async () => {
    if (!selectedLocationId) {
      toast.error("Please select a location first");
      return;
    }

    setIsCheckingLocation(true);
    setErrorMessage(null);
    setProgress(20);

    try {
      // Get current position
      setProgress(40);
      const position = await getCurrentPosition();
      const currentCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCurrentPosition(currentCoords);
      setProgress(70);

      // Find selected location
      const selectedLocation = locations.find(
        (loc) => loc.id === selectedLocationId
      );

      if (!selectedLocation) {
        throw new Error("Selected location not found");
      }

      // Calculate distance
      const locationCoords = {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      };
      const distanceInMeters = getDistance(currentCoords, locationCoords);
      setDistance(distanceInMeters);
      setProgress(100);

      // Check if within radius
      const isWithinRadius = distanceInMeters <= selectedLocation.radius;
      if (!isWithinRadius) {
        setErrorMessage(
          `You are outside the allowed radius (${selectedLocation.radius}m) for this location.`
        );
      }
    } catch (error) {
      console.error("Error checking location:", error);
      setErrorMessage(
        `Error checking location: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const markAttendance = () => {
    if (!selectedLocationId || !currentPosition || !distance) {
      toast.error("Please check your location first");
      return;
    }

    const selectedLocation = locations.find(
      (loc) => loc.id === selectedLocationId
    );

    if (!selectedLocation) {
      toast.error("Selected location not found");
      return;
    }

    const isWithinRadius = distance <= selectedLocation.radius;
    if (!isWithinRadius) {
      toast.error("You are outside the allowed radius for this location");
      return;
    }

    // Record attendance to the database
    recordAttendance(
      {
        locationId: selectedLocationId,
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        distance: distance,
        teacherId: teacherId || undefined,
        employeeId: employeeId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Attendance marked successfully");
          setAttendanceMarked(true);
        },
        onError: (error) => {
          toast.error(`Failed to mark attendance: ${error.message}`);
        },
      }
    );
  };

  // Show skeleton if loading locations
  if (isLoadingLocations || isCheckingAttendance) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
            <h1 className="text-2xl font-bold">Mark Attendance</h1>
          </div>
          
          <div className="max-w-md mx-auto">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-full mb-8" />
            <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
              <CardHeader>
                <Skeleton className="h-8 w-2/3 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!isTeacher && !isEmployee) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
            <h1 className="text-2xl font-bold">Mark Attendance</h1>
          </div>
          
          <div className="max-w-md mx-auto">
            <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to mark attendance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  This feature is only available for teachers and employees.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (attendanceMarked) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
            <h1 className="text-2xl font-bold">Mark Attendance</h1>
          </div>
          
          <div className="max-w-md mx-auto">
            <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  Attendance Already Marked
                </CardTitle>
                <CardDescription>
                  Your attendance for today has been recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="h-12 w-12 text-green-500" />
                  </div>
                  <h3 className="text-xl font-medium mb-1">
                    Attendance Successful
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </p>
                  {todayAttendance && (
                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                      <div className="text-center p-2 border rounded border-[#00501B]/10 dark:border-[#7aad8c]/20">
                        <p className="text-xs text-muted-foreground mb-1">Time</p>
                        <p className="font-medium">
                          {format(new Date(todayAttendance.timestamp), "hh:mm a")}
                        </p>
                      </div>
                      <div className="text-center p-2 border rounded border-[#00501B]/10 dark:border-[#7aad8c]/20">
                        <p className="text-xs text-muted-foreground mb-1">Location</p>
                        <p className="font-medium">{todayAttendance.location.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (locations.length === 0) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
            <h1 className="text-2xl font-bold">Mark Attendance</h1>
          </div>
          
          <div className="max-w-md mx-auto">
            <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
              <CardHeader>
                <CardTitle>No Locations Available</CardTitle>
                <CardDescription>
                  No attendance locations have been configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Please contact your administrator to set up attendance locations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center">
          <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
        </div>
        
        <div className="max-w-md mx-auto">
          <p className="text-muted-foreground mb-6">
            Record your attendance by verifying your location
          </p>

          <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-[#00501B]/5 to-transparent dark:from-[#7aad8c]/10 dark:to-transparent">
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" />
                Verify Location
              </CardTitle>
              <CardDescription>
                Check your position relative to the selected location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Location</label>
                <Select
                  value={selectedLocationId}
                  onValueChange={handleSelectLocation}
                >
                  <SelectTrigger className="border-[#00501B]/20 dark:border-[#7aad8c]/20">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {progress > 0 && (
                <Progress value={progress} className="h-2 mb-2 bg-[#00501B]/10 dark:bg-[#7aad8c]/10" />
              )}

              <div className="flex justify-center">
                <Button
                  onClick={checkLocation}
                  className="w-full bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
                  disabled={!selectedLocationId || isCheckingLocation}
                >
                  {isCheckingLocation
                    ? "Checking Location..."
                    : "Check My Location"}
                </Button>
              </div>

              {errorMessage && (
                <div className="bg-destructive/15 p-3 rounded-md flex items-start">
                  <ShieldAlert className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              {distance !== null && (
                <div
                  className={`p-3 rounded-md flex items-start ${
                    errorMessage
                      ? "bg-destructive/15"
                      : "bg-[#00501B]/15 dark:bg-[#7aad8c]/15"
                  }`}
                >
                  {errorMessage ? (
                    <ShieldAlert className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-[#00501B] dark:text-[#7aad8c] mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        errorMessage ? "text-destructive" : "text-[#00501B] dark:text-[#7aad8c]"
                      }`}
                    >
                      {errorMessage
                        ? "Location verification failed"
                        : "Location verified successfully"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You are{" "}
                      <span className="font-medium">
                        {convertToMilesOrKm(distance)}
                      </span>{" "}
                      from the selected location.
                    </p>
                  </div>
                </div>
              )}

              {distance !== null && !errorMessage && (
                <Button
                  onClick={markAttendance}
                  className="w-full bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
                  disabled={isRecordingAttendance}
                >
                  {isRecordingAttendance ? (
                    "Recording Attendance..."
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Mark Attendance
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

MarkAttendancePage.getLayout = (page) => {
  return <AppLayout title="Mark Attendance" description="Record your daily attendance">{page}</AppLayout>
}

export default MarkAttendancePage; 