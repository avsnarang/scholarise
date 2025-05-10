"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schema for the form values
const locationFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Location name is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(10, "Radius must be at least 10 meters").max(1000, "Radius must be at most 1000 meters"),
  isActive: z.boolean().default(true),
  branchId: z.string().min(1, "Branch ID is required"),
  locationTypeId: z.string().optional().transform(val => val === "none" ? null : val),
});

// Type derived from the schema
type LocationFormValues = z.infer<typeof locationFormSchema>;

interface AttendanceLocationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location?: Partial<LocationFormValues> | null;
  branchId: string;
}

export function AttendanceLocationFormModal({
  open,
  onClose,
  onSuccess,
  location,
  branchId,
}: AttendanceLocationFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const utils = api.useContext();

  const isEditing = !!location?.id;

  // Fetch location types
  const { data: locationTypes, isLoading: isLoadingTypes } = api.attendanceLocation.getLocationTypes.useQuery(
    { branchId: branchId || "" },
    { enabled: !!branchId }
  );

  // Create form with default values
  const form = useForm<LocationFormValues>({
    // @ts-ignore - Type mismatch between zod and react-hook-form
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      latitude: 0,
      longitude: 0,
      radius: 50,
      isActive: true,
      branchId: branchId,
      locationTypeId: "none",
    },
  });

  // Reset form when modal opens/closes or location changes
  useEffect(() => {
    if (open) {
      if (location) {
        form.reset({
          id: location.id,
          name: location.name || "",
          latitude: location.latitude || 0,
          longitude: location.longitude || 0,
          radius: location.radius || 50,
          isActive: location.isActive !== undefined ? location.isActive : true,
          branchId: location.branchId || branchId,
          locationTypeId: location.locationTypeId || "none",
        });
      } else {
        form.reset({
          name: "",
          latitude: 0,
          longitude: 0,
          radius: 50,
          isActive: true,
          branchId: branchId,
          locationTypeId: "none",
        });
      }
    }
  }, [open, location, form, branchId]);

  // Mutations for creating and updating locations
  const createLocation = api.attendanceLocation.create.useMutation({
    onSuccess: () => {
      void utils.attendanceLocation.getAll.invalidate();
      toast({
        title: "Location created",
        description: "The attendance location has been created successfully.",
        variant: "success",
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const updateLocation = api.attendanceLocation.update.useMutation({
    onSuccess: () => {
      void utils.attendanceLocation.getAll.invalidate();
      toast({
        title: "Location updated",
        description: "The attendance location has been updated successfully.",
        variant: "success",
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = (data: LocationFormValues) => {
    setIsSubmitting(true);

    // Prepare the data - convert null locationTypeId to undefined for type safety
    const submissionData = {
      ...data,
      locationTypeId: data.locationTypeId === null ? undefined : data.locationTypeId
    };

    if (isEditing && location?.id) {
      updateLocation.mutate({
        id: location.id,
        ...submissionData,
      });
    } else {
      createLocation.mutate(submissionData);
    }
  };

  // Use the current location if available (for edit mode)
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("latitude", position.coords.latitude);
          form.setValue("longitude", position.coords.longitude);
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast({
            title: "Location error",
            description: "Could not get your current location. Please enter coordinates manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser does not support geolocation. Please enter coordinates manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Attendance Location" : "Add Attendance Location"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Campus Entrance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationTypeId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Location Type</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={field.onChange}
                    disabled={isLoadingTypes}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {isLoadingTypes ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : locationTypes?.length ? (
                        locationTypes.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_types" disabled>No location types available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
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
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useCurrentLocation}
              >
                Use Current Location
              </Button>
            </div>

            <FormField
              control={form.control}
              name="radius"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Radius (meters)</FormLabel>
                  <FormControl>
                    <Input type="number" min={10} max={1000} {...field} />
                  </FormControl>
                  <FormDescription>
                    The radius in meters around this location where attendance can be marked (10-1000m).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm sm:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive locations will not be available for marking attendance.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 