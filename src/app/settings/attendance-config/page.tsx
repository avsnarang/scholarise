"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ChevronLeft,
  MapPin,
  Search,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { AttendanceWindowFormModal } from "@/components/settings/attendance-window-form-modal";
import { AttendanceTypeFormModal } from "@/components/settings/attendance-type-form-modal";
import { AttendanceLocationFormModal } from "@/components/settings/attendance-location-form-modal";

export default function AttendanceConfigPage() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();

  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocationType, setSelectedLocationType] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: string } | null>(null);
  
  // State for windows
  const [isWindowFormModalOpen, setIsWindowFormModalOpen] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<any>(null);
  
  // State for types
  const [isTypeFormModalOpen, setIsTypeFormModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);
  
  // State for locations
  const [isLocationFormModalOpen, setIsLocationFormModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  
  // Current tab state
  const [currentTab, setCurrentTab] = useState<"locations" | "devices" | "windows" | "types">("locations");

  // Fetch location types for filtering
  const { 
    data: locationTypes,
    isLoading: isLoadingTypes,
    refetch: refetchTypes
  } = api.attendanceLocation.getLocationTypes.useQuery(
    { branchId: currentBranchId || "" },
    { enabled: !!currentBranchId }
  );

  // Fetch attendance windows
  const {
    data: attendanceWindows,
    isLoading: isLoadingWindows,
    refetch: refetchWindows,
  } = api.attendanceWindow.getAll.useQuery(
    { 
      branchId: currentBranchId || "",
      includeInactive: true
    },
    { enabled: !!currentBranchId }
  );

  // Log windows data for debugging
  useEffect(() => {
    if (attendanceWindows) {
      console.log("Fetched attendance windows:", attendanceWindows);
    }
  }, [attendanceWindows]);

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
  const deleteLocationMutation = api.attendanceLocation.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Location deleted",
        description: "The attendance location has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchLocations();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attendance location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteWindowMutation = api.attendanceWindow.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Window deleted",
        description: "The attendance window has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchWindows();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attendance window. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTypesMutation = api.attendanceLocation.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Location type deleted",
        description: "The location type has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchTypes();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location type. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers for locations
  const handleAddLocation = () => {
    setSelectedLocation(null);
    setIsLocationFormModalOpen(true);
  };

  const handleEditLocation = (location: any) => {
    setSelectedLocation(location);
    setIsLocationFormModalOpen(true);
  };

  const handleDeleteLocation = (location: any) => {
    setItemToDelete({
      id: location.id,
      name: location.name,
      type: "location"
    });
    setIsDeleteDialogOpen(true);
  };

  // Handlers for windows
  const handleAddWindow = () => {
    setSelectedWindow(null);
    setIsWindowFormModalOpen(true);
  };

  const handleEditWindow = (window: any) => {
    console.log("Editing window with data:", JSON.stringify(window, null, 2));
    setSelectedWindow(window);
    setIsWindowFormModalOpen(true);
  };

  const handleDeleteWindow = (window: any) => {
    setItemToDelete({
      id: window.id,
      name: window.name,
      type: "window"
    });
    setIsDeleteDialogOpen(true);
  };

  // Handlers for types
  const handleAddType = () => {
    setSelectedType(null);
    setIsTypeFormModalOpen(true);
  };

  const handleEditType = (type: any) => {
    setSelectedType(type);
    setIsTypeFormModalOpen(true);
  };

  const handleDeleteType = (type: any) => {
    setItemToDelete({
      id: type.id,
      name: type.name,
      type: "type"
    });
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === "window") {
        deleteWindowMutation.mutate({ id: itemToDelete.id });
      } else if (itemToDelete.type === "type") {
        deleteTypesMutation.mutate({ id: itemToDelete.id });
      } else if (itemToDelete.type === "location") {
        deleteLocationMutation.mutate({ id: itemToDelete.id });
      }
    }
  };

  // Success handlers
  const handleLocationFormSuccess = () => {
    setIsLocationFormModalOpen(false);
    void refetchLocations();
  };

  const handleWindowFormSuccess = () => {
    console.log("Window form success callback triggered");
    setIsWindowFormModalOpen(false);
    void refetchWindows();
  };

  const handleTypeFormSuccess = () => {
    setIsTypeFormModalOpen(false);
    void refetchTypes();
  };

  // Filter data based on search query
  const filteredLocations = locations?.filter((location: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      location.name.toLowerCase().includes(searchLower) ||
      location.description?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const filteredDevices = devices?.filter((device: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      device.name.toLowerCase().includes(searchLower) ||
      device.deviceId.toLowerCase().includes(searchLower) ||
      device.location?.name.toLowerCase().includes(searchLower)
    );
  }) || [];

  const filteredWindows = attendanceWindows?.filter((window: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      window.name.toLowerCase().includes(searchLower) ||
      window.locationType?.name.toLowerCase().includes(searchLower)
    );
  }) || [];

  const filteredTypes = locationTypes?.filter((type: any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      type.name.toLowerCase().includes(searchLower) ||
      type.description?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Format time string function
  const formatTimeString = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours || "0", 10));
      date.setMinutes(parseInt(minutes || "0", 10));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (error) {
      return timeStr;
    }
  };

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
          <h1 className="text-2xl font-bold text-[#00501B]">Attendance Configuration</h1>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Configure attendance settings including locations, devices, windows, and types.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="windows">Windows</TabsTrigger>
            <TabsTrigger value="types">Types</TabsTrigger>
          </TabsList>

          {/* Search and refresh */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder={`Search ${currentTab}...`}
                  className="w-full pl-9 pr-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {currentTab === "windows" && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedLocationType}
                  onValueChange={setSelectedLocationType}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {locationTypes?.map((type: any) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (currentTab === "locations") void refetchLocations();
                else if (currentTab === "devices") void refetchDevices();
                else if (currentTab === "windows") void refetchWindows();
                else if (currentTab === "types") void refetchTypes();
              }}
              className="clickable"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            {currentTab !== "devices" && (
              <Button
                onClick={() => {
                  if (currentTab === "locations") handleAddLocation();
                  else if (currentTab === "windows") handleAddWindow();
                  else if (currentTab === "types") handleAddType();
                }}
                className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add {currentTab === "locations" ? "Location" : currentTab === "windows" ? "Window" : "Type"}
              </Button>
            )}
          </div>

          {/* Locations Tab */}
          <TabsContent value="locations" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Attendance Locations</CardTitle>
                <CardDescription>
                  Physical locations where attendance can be recorded
                </CardDescription>
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
                <CardDescription>
                  Devices registered for attendance tracking
                </CardDescription>
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

          {/* Attendance Windows Tab */}
          <TabsContent value="windows" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Attendance Windows</CardTitle>
                <CardDescription>
                  Define when students can check in and out at different locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingWindows ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Location Type</TableHead>
                          <TableHead>Time Window</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
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
                          <TableHead>Location Type</TableHead>
                          <TableHead>Time Window</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWindows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center">
                              {searchQuery || selectedLocationType !== "all" ? 
                                "No attendance windows found matching your search criteria." : 
                                "No attendance windows found. Click the 'Add Window' button to create your first window."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredWindows.map((window: any) => (
                            <TableRow key={window.id} 
                              ref={(el) => {
                                // Use this for debugging
                                if (el) console.log(`Window with ID ${window.id}:`, window);
                              }}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <Clock className="mr-2 h-4 w-4 text-gray-400" />
                                  {window.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                {window.locationType ? (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                    {window.locationType.name}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">Not set</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span className="font-medium">
                                    {window.startTime && window.endTime ? (
                                      `${formatTimeString(window.startTime)} - ${formatTimeString(window.endTime)}`
                                    ) : (
                                      <span className="text-gray-400">No time set</span>
                                    )}
                                  </span>
                                  
                                  {window.allowLateMarking && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Allows late marking for {window.lateMarkingGracePeriod} minutes</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <div className={`text-xs rounded-sm w-7 flex justify-center items-center ${window.isMon === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>M</div>
                                  <div className={`text-xs rounded-sm w-7 flex justify-center items-center ${window.isTue === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>Tu</div>
                                  <div className={`text-xs rounded-sm w-7 flex justify-center items-center ${window.isWed === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>W</div>
                                  <div className={`text-xs rounded-sm w-7 flex justify-center items-center ${window.isThu === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>Th</div>
                                  <div className={`text-xs rounded-sm w-7 flex justify-center items-center ${window.isFri === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>F</div>
                                  <div className={`text-xs rounded-sm w-7 flex justify-center items-center ${window.isSat === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>Sa</div>
                                  <div className={`text-xs rounded-sm w-7 flex justify-center items-center ${window.isSun === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>Su</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {window.isActive ? (
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
                                    <DropdownMenuItem 
                                      onClick={() => handleEditWindow(window)}
                                      className="clickable"
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteWindow(window)}
                                      className="text-red-600 focus:text-red-600 clickable"
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

          {/* Location Types Tab */}
          <TabsContent value="types" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Location Types</CardTitle>
                <CardDescription>
                  Categories for different locations where attendance is tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTypes ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Window Count</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
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
                          <TableHead>Description</TableHead>
                          <TableHead>Window Count</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTypes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">
                              {searchQuery ? "No location types found matching your search." : "No location types found. Click the 'Add Type' button to create your first type."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTypes.map((type: any) => (
                            <TableRow key={type.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                                  {type.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                {type.description || <span className="text-gray-400">No description</span>}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{type._count?.attendanceWindows || 0}</span>
                              </TableCell>
                              <TableCell>
                                {type.isActive ? (
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
                                    <DropdownMenuItem 
                                      onClick={() => handleEditType(type)}
                                      className="clickable"
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteType(type)}
                                      className="text-red-600 focus:text-red-600 clickable"
                                      disabled={type._count?.attendanceWindows && type._count.attendanceWindows > 0}
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
        </Tabs>
      </div>

      {/* Modals */}
      <AttendanceLocationFormModal
        open={isLocationFormModalOpen}
        location={selectedLocation}
        onClose={() => setIsLocationFormModalOpen(false)}
        onSuccess={handleLocationFormSuccess}
        branchId={currentBranchId || ""}
      />

      <AttendanceWindowFormModal
        open={isWindowFormModalOpen}
        initialData={selectedWindow}
        onClose={() => setIsWindowFormModalOpen(false)}
        onSuccess={handleWindowFormSuccess}
        branchId={currentBranchId || ""}
      />

      <AttendanceTypeFormModal
        open={isTypeFormModalOpen}
        initialData={selectedType}
        onClose={() => setIsTypeFormModalOpen(false)}
        onSuccess={handleTypeFormSuccess}
        branchId={currentBranchId || ""}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={`Delete ${
          itemToDelete?.type === "window" 
            ? "Attendance Window" 
            : itemToDelete?.type === "type" 
            ? "Location Type" 
            : "Attendance Location"
        }`}
        description={`Are you sure you want to delete the ${
          itemToDelete?.type === "window" 
            ? "attendance window" 
            : itemToDelete?.type === "type" 
            ? "location type" 
            : "attendance location"
        } "${itemToDelete?.name}"? This action cannot be undone.`}
        isDeleting={deleteLocationMutation.isPending}
      />
    </PageWrapper>
  );
} 