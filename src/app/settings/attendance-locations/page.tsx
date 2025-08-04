"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ChevronLeft,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash,
  MapPin,
  RefreshCw,
} from "lucide-react";

import { api } from "@/utils/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { AttendanceLocationFormModal } from "@/components/settings/attendance-location-form-modal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AttendanceLocationsPageContent() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();

  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<"locations" | "devices">("locations");

  // Fetch attendance locations
  const {
    data: locations,
    isLoading: isLoadingLocations,
    refetch: refetchLocations,
  } = api.attendanceLocation.getAll.useQuery(
    { 
      branchId: currentBranchId || "", 
      includeInactive: true 
    }, 
    { enabled: !!currentBranchId }
  );

  // Fetch attendance devices
  const {
    data: devices,
    isLoading: isLoadingDevices,
    refetch: refetchDevices,
  } = api.attendanceDevice.getAll.useQuery(
    { 
      branchId: currentBranchId || "", 
      includeInactive: true 
    }, 
    { enabled: !!currentBranchId }
  );

  // Mutations
  const deleteMutation = api.attendanceLocation.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Location deleted",
        description: "The attendance location has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchLocations();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attendance location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddLocation = () => {
    setSelectedLocation(null);
    setIsFormModalOpen(true);
  };

  const handleEditLocation = (location: any) => {
    setSelectedLocation(location);
    setIsFormModalOpen(true);
  };

  const handleDeleteLocation = (location: any) => {
    setSelectedLocation(location);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedLocation) {
      deleteMutation.mutate({ id: selectedLocation.id });
    }
  };

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    void refetchLocations();
  };

  // Filter locations based on search query
  const filteredLocations = locations?.filter((location: any) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      location.name.toLowerCase().includes(searchLower) ||
      location.description?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Filter devices based on search query
  const filteredDevices = devices?.filter((device: any) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      device.name.toLowerCase().includes(searchLower) ||
      device.deviceId.toLowerCase().includes(searchLower) ||
      device.location?.name.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/settings">
            <Button variant="ghost" className="flex items-center gap-1 p-0">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#00501B]">Attendance Locations</h1>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
            <p className="text-sm text-gray-500">
              Manage attendance locations for your school. Attendance locations are used to track where attendance is being marked.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddLocation}
              className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value as "locations" | "devices")}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          {/* Search and refresh */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder={currentTab === "locations" ? "Search locations..." : "Search devices..."}
                  className="w-full pl-9 pr-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => currentTab === "locations" ? void refetchLocations() : void refetchDevices()}
              className="clickable"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Locations Tab */}
          <TabsContent value="locations" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Attendance Locations</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLocations ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Devices</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 float-right" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Devices</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLocations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">
                              {searchQuery ? "No locations found matching your search." : "No attendance locations found. Click the 'Add Location' button to create your first location."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredLocations.map((location: any) => (
                            <TableRow key={location.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                                  {location.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                {location.description || <span className="text-gray-400">No description</span>}
                              </TableCell>
                              <TableCell>
                                {location.isActive ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{location._count?.devices || 0}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8 clickable">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      onClick={() => handleEditLocation(location)}
                                      className="clickable"
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteLocation(location)}
                                      className="text-red-600 focus:text-red-600 clickable"
                                      disabled={location._count?.devices && location._count.devices > 0}
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Attendance Devices</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDevices ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Device ID</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 float-right" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Device ID</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDevices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">
                              {searchQuery ? "No devices found matching your search." : "No attendance devices found. Devices will appear here when registered with the system."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDevices.map((device: any) => (
                            <TableRow key={device.id}>
                              <TableCell className="font-medium">
                                {device.name}
                              </TableCell>
                              <TableCell>
                                <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                                  {device.deviceId}
                                </code>
                              </TableCell>
                              <TableCell>
                                {device.location ? (
                                  <div className="flex items-center">
                                    <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                                    <span>{device.location.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Not assigned</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {device.isActive ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8 clickable">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="clickable">
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>

      {/* Modals */}
      <AttendanceLocationFormModal
        open={isFormModalOpen}
        location={selectedLocation}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
        branchId={currentBranchId || ""}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Attendance Location"
        description={`Are you sure you want to delete the attendance location "${selectedLocation?.name}"? This action cannot be undone.`}
        isDeleting={deleteMutation.isPending}
      />
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicAttendanceLocationsPageContent = dynamic(() => Promise.resolve(AttendanceLocationsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function AttendanceLocationsPage() {
  return <DynamicAttendanceLocationsPageContent />;
}
