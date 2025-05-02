import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { toast } from "sonner";
import { ChevronRight, MapPin, Plus, Save, Trash } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  getCurrentPosition,
} from "@/utils/location-helpers";
import { useAttendanceLocations, useAttendanceLocationMutations } from "@/utils/attendance-api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { AppLayout } from "@/components/layout/app-layout";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { type NextPageWithLayout } from "../_app";

// Form schema
const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().int().min(10, "Radius must be at least 10 meters").max(1000, "Radius must be at most 1000 meters"),
  isActive: z.boolean().default(true),
  branchId: z.string(),
});

const LocationConfigPage: NextPageWithLayout = () => {
  const { currentBranchId } = useBranchContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);

  // Load locations from API
  const {
    locations,
    isLoading: isLoadingLocations,
    refetch: refetchLocations
  } = useAttendanceLocations(currentBranchId || undefined, true);

  // Location mutations
  const {
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus,
    isCreating,
    isUpdating,
    isDeleting,
    isTogglingStatus,
    createError,
    updateError,
    deleteError,
  } = useAttendanceLocationMutations();

  // Form setup
  const form = useForm({
    resolver: zodResolver(locationSchema) as any,
    defaultValues: {
      name: "",
      latitude: 0,
      longitude: 0,
      radius: 50,
      isActive: true,
      branchId: currentBranchId || "",
    },
  });

  // Update branchId when it changes
  useEffect(() => {
    if (currentBranchId) {
      form.setValue("branchId", currentBranchId);
    }
  }, [currentBranchId, form]);

  // Show errors from API
  useEffect(() => {
    if (createError) {
      toast.error(`Error creating location: ${createError.message}`);
    }
    if (updateError) {
      toast.error(`Error updating location: ${updateError.message}`);
    }
    if (deleteError) {
      toast.error(`Error deleting location: ${deleteError.message}`);
    }
  }, [createError, updateError, deleteError]);

  // Function to get current location
  const getCurrentLocationCoords = async () => {
    setIsGettingCurrentLocation(true);

    try {
      const position = await getCurrentPosition();
      form.setValue("latitude", position.coords.latitude);
      form.setValue("longitude", position.coords.longitude);
      toast.success("Current location obtained successfully");
    } catch (error) {
      console.error("Error getting location:", error);
      toast.error(`Error getting location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGettingCurrentLocation(false);
    }
  };

  // Handle form submission
  const onSubmit = (values: any) => {
    if (currentLocation) {
      // Edit existing location
      updateLocation(
        {
          id: currentLocation.id,
          ...values,
        },
        {
          onSuccess: () => {
            toast.success("Location updated successfully");
            setIsEditDialogOpen(false);
            setCurrentLocation(null);
            form.reset();
            void refetchLocations();
          },
        }
      );
    } else {
      // Add new location
      createLocation(
        values,
        {
          onSuccess: () => {
            toast.success("New location added successfully");
            setIsAddDialogOpen(false);
            form.reset();
            void refetchLocations();
          },
        }
      );
    }
  };

  // Open edit dialog
  const handleEdit = (location: Location) => {
    setCurrentLocation(location);
    form.reset({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius,
      isActive: location.isActive,
      branchId: currentBranchId || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle location deletion
  const handleDelete = (id: string) => {
    setDeleteLocationId(id);
  };

  const confirmDelete = () => {
    if (deleteLocationId) {
      deleteLocation(
        { id: deleteLocationId },
        {
          onSuccess: () => {
            toast.success("Location deleted successfully");
            setDeleteLocationId(null);
            void refetchLocations();
          },
        }
      );
    }
  };

  // Toggle location active status
  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleLocationStatus(
      { id, isActive: !isActive },
      {
        onSuccess: () => {
          toast.success(`Location ${isActive ? 'disabled' : 'enabled'} successfully`);
          void refetchLocations();
        },
      }
    );
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
            <div>
              <h1 className="text-2xl font-bold">Location Configuration</h1>
              <p className="text-muted-foreground mt-1">
                Manage attendance locations and their allowed radius
              </p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
                disabled={!currentBranchId}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
                <DialogDescription>
                  Configure a new location for attendance tracking
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Campus" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 28.6139"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 77.2090"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-center mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocationCoords}
                      disabled={isGettingCurrentLocation}
                      className="border-[#00501B]/20 dark:border-[#7aad8c]/20 text-[#00501B] dark:text-[#7aad8c]"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {isGettingCurrentLocation ? "Getting Location..." : "Use Current Location"}
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="radius"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowed Radius (meters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
                    >
                      {isCreating ? "Saving..." : "Save Location"}
                    </Button>
                  </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Location</DialogTitle>
                <DialogDescription>
                  Update location details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Campus" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 28.6139"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 77.2090"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-center mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocationCoords}
                      disabled={isGettingCurrentLocation}
                      className="border-[#00501B]/20 dark:border-[#7aad8c]/20 text-[#00501B] dark:text-[#7aad8c]"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {isGettingCurrentLocation ? "Getting Location..." : "Use Current Location"}
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="radius"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowed Radius (meters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
                    >
                      {isUpdating ? "Updating..." : "Update Location"}
                    </Button>
                  </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#00501B]/5 to-transparent dark:from-[#7aad8c]/10 dark:to-transparent">
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" />
              Configured Locations
            </CardTitle>
            <CardDescription>
              These locations will be used to verify attendance proximity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLocations ? (
              <div className="py-6 text-center text-muted-foreground">
                <p>Loading locations...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <p>No locations configured yet. Add a location to get started.</p>
              </div>
            ) : (
              <div className="rounded-md border border-[#00501B]/10 dark:border-[#7aad8c]/20">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00501B]/5 dark:bg-[#7aad8c]/10">
                      <TableHead>Name</TableHead>
                      <TableHead>Coordinates</TableHead>
                      <TableHead>Radius</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location: any) => (
                      <TableRow key={location.id} className="hover:bg-[#00501B]/5 dark:hover:bg-[#7aad8c]/5">
                        <TableCell className="font-medium">{location.name}</TableCell>
                        <TableCell>
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </TableCell>
                        <TableCell>{location.radius} meters</TableCell>
                        <TableCell>
                          {location.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(location.id, location.isActive)}
                              disabled={isTogglingStatus}
                              className="border-[#00501B]/20 dark:border-[#7aad8c]/20 text-[#00501B] dark:text-[#7aad8c] hover:bg-[#00501B]/10 dark:hover:bg-[#7aad8c]/10"
                            >
                              {location.isActive ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(location)}
                              className="border-[#00501B]/20 dark:border-[#7aad8c]/20 text-[#00501B] dark:text-[#7aad8c] hover:bg-[#00501B]/10 dark:hover:bg-[#7aad8c]/10"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(location.id)}
                              disabled={isDeleting}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteLocationId} onOpenChange={(open) => !open && setDeleteLocationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this location. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
};

LocationConfigPage.getLayout = (page) => {
  return <AppLayout title="Location Configuration" description="Manage attendance locations for staff and students">{page}</AppLayout>
}

export default LocationConfigPage;