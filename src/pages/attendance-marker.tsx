import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { Check, Clock, Loader2, MapPin, X } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  type Location, 
  type AttendanceRecord,
  calculateDistance,
  formatDateTime,
  getCurrentPosition,
  loadActiveLocations,
  loadAttendanceRecords,
  saveAttendanceRecords,
  createAttendanceRecord
} from "@/utils/location-helpers";

// Form schema
const attendanceSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userName: z.string().min(1, "Name is required"),
  locationId: z.string().min(1, "Location is required"),
});

const AttendanceMarkerPage: NextPage = () => {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Form setup
  const form = useForm<z.infer<typeof attendanceSchema>>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      userId: "",
      userName: "",
      locationId: "",
    },
  });

  // Load locations and attendance records from local storage on mount
  useEffect(() => {
    setLocations(loadActiveLocations());
    setAttendanceRecords(loadAttendanceRecords());
  }, []);

  // Watch for location changes
  useEffect(() => {
    const locationId = form.watch("locationId");
    if (locationId) {
      const location = locations.find(loc => loc.id === locationId);
      setSelectedLocation(location || null);
    } else {
      setSelectedLocation(null);
    }
  }, [form.watch("locationId"), locations]);

  // Save attendance records to local storage whenever they change
  useEffect(() => {
    saveAttendanceRecords(attendanceRecords);
  }, [attendanceRecords]);

  // Function to get current location
  const getLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      const position = await getCurrentPosition();
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      toast.success("Location obtained successfully");
    } catch (error) {
      console.error("Error getting location:", error);
      toast.error(`Error getting location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle form submission
  const onSubmit = (values: z.infer<typeof attendanceSchema>) => {
    if (!currentLocation) {
      toast.error("Please get your current location first");
      return;
    }

    // Find selected location
    const location = locations.find(loc => loc.id === values.locationId);
    if (!location) {
      toast.error("Selected location not found");
      return;
    }

    // Calculate distance
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      location.latitude,
      location.longitude
    );

    // Check if within allowed radius
    const isWithinAllowedArea = distance <= location.radius;

    // Prepare attendance record
    const newRecord = createAttendanceRecord(
      values.userId,
      values.userName,
      location.id,
      location.name,
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      },
      isWithinAllowedArea,
      Math.round(distance)
    );

    // Store form values for confirmation
    setFormValues({
      ...values,
      record: newRecord,
    });

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  // Confirm attendance marking
  const confirmAttendance = () => {
    if (formValues && formValues.record) {
      // Add new record
      setAttendanceRecords([formValues.record, ...attendanceRecords]);
      
      // Show success message
      if (formValues.record.isWithinAllowedArea) {
        toast.success("Attendance marked successfully");
      } else {
        toast.warning("Attendance marked, but you are outside the allowed area");
      }
      
      // Reset form
      form.reset();
      setCurrentLocation(null);
      setShowConfirmation(false);
    }
  };

  return (
    <>
      <Head>
        <title>Mark Attendance - ScholaRise ERP</title>
      </Head>
      <div className="container py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Mark Attendance</h1>
          <p className="text-muted-foreground">
            Record your attendance with location verification
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Form</CardTitle>
              <CardDescription>
                Fill in your details and mark your attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form form={form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No locations configured
                              </SelectItem>
                            ) : (
                              locations.map(location => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getLocation}
                      disabled={isGettingLocation}
                      className="w-full"
                    >
                      {isGettingLocation ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Get Current Location
                        </>
                      )}
                    </Button>
                    
                    {currentLocation && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>
                          Your location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                        </p>
                        <p>Accuracy: ±{Math.round(currentLocation.accuracy)} meters</p>
                        
                        {selectedLocation && (
                          <div className="mt-2">
                            <p>
                              Distance from {selectedLocation.name}:{" "}
                              {calculateDistance(
                                currentLocation.latitude,
                                currentLocation.longitude,
                                selectedLocation.latitude,
                                selectedLocation.longitude
                              ).toFixed(0)}{" "}
                              meters
                            </p>
                            <p>
                              Status:{" "}
                              {calculateDistance(
                                currentLocation.latitude,
                                currentLocation.longitude,
                                selectedLocation.latitude,
                                selectedLocation.longitude
                              ) <= selectedLocation.radius ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Within allowed area
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  Outside allowed area
                                </Badge>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading || !currentLocation || locations.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Mark Attendance
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Records</CardTitle>
              <CardDescription>
                Your recent attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    No attendance records yet
                  </p>
                ) : (
                  attendanceRecords.slice(0, 5).map((record) => (
                    <div 
                      key={record.id} 
                      className={`p-4 rounded-md border ${
                        record.isWithinAllowedArea 
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" 
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{record.userName}</p>
                          <p className="text-sm text-muted-foreground">ID: {record.userId}</p>
                        </div>
                        {record.isWithinAllowedArea ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="mr-1 h-3 w-3" /> Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <X className="mr-1 h-3 w-3" /> Outside Area
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Location:</p>
                          <p>{record.locationName}</p>
                        </div>
                        <div>
                          <p className="font-medium">Distance:</p>
                          <p>{record.distance} meters</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-medium">Time:</p>
                          <p>{formatDateTime(record.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            {attendanceRecords.length > 0 && (
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  asChild
                >
                  <Link href="/attendance-records">
                    View All Records
                  </Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Attendance</AlertDialogTitle>
            <AlertDialogDescription>
              {formValues?.record?.isWithinAllowedArea ? (
                "You are within the allowed area. Do you want to mark your attendance?"
              ) : (
                "Warning: You are outside the allowed area. Your attendance will be marked as invalid. Do you still want to proceed?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAttendance}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AttendanceMarkerPage; 