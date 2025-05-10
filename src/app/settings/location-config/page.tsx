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
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
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

export default function LocationConfigPage() {
  const { toast } = useToast();
  const { currentBranchId } = useBranchContext();

  // State for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocationType, setSelectedLocationType] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: string } | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isTypeFormModalOpen, setIsTypeFormModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);

  // Fetch location types for filtering
  const { 
    data: locationTypes,
    isLoading: isLoadingTypes
  // @ts-ignore - API routes not fully typed
  } = api.attendanceLocation.getLocationTypes.useQuery(
    { branchId: currentBranchId || "", includeInactive: true },
    { enabled: !!currentBranchId }
  );

  // Fetch attendance windows
  const {
    data: apiAttendanceWindows,
    isLoading: isLoadingWindows,
    refetch: refetchWindows,
  // @ts-ignore - API routes not fully typed
  } = api.attendanceWindow.getAll.useQuery(
    { 
      branchId: currentBranchId || "",
      includeInactive: true
    },
    { enabled: !!currentBranchId }
  );

  // Store windows in a ref to avoid stale data issues
  const [attendanceWindows, setAttendanceWindows] = useState<any[]>([]);

  // Ensure we're using the attendance window data
  useEffect(() => {
    if (apiAttendanceWindows) {
      // Only accept objects that have the proper window structure
      const validWindows = Array.isArray(apiAttendanceWindows) 
        ? apiAttendanceWindows.filter(window => 
            window && 
            typeof window === 'object' && 
            window.startTime && 
            window.endTime && 
            typeof window.isMon === 'boolean'
          )
        : [];
      
      // Log warning if invalid data was filtered out
      if (validWindows.length !== (apiAttendanceWindows?.length || 0)) {
        console.warn(`Filtered out ${(apiAttendanceWindows?.length || 0) - validWindows.length} invalid window records`);
      }
      
      setAttendanceWindows(validWindows);
    }
  }, [apiAttendanceWindows]);

  // Mutations for windows
  // @ts-ignore - API routes not fully typed
  const deleteWindowMutation = api.attendanceWindow.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Attendance window deleted",
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

  // Mutations for types
  // @ts-ignore - API routes not fully typed
  const deleteTypeMutation = api.attendanceLocation.deleteLocationType.useMutation({
    onSuccess: () => {
      toast({
        title: "Location type deleted",
        description: "The location type has been deleted successfully.",
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
      void refetchWindows();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location type. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handlers for windows
  const handleAddWindow = () => {
    setSelectedItem(null);
    setIsFormModalOpen(true);
  };

  const handleEditWindow = (window: any) => {
    setSelectedItem(window);
    setIsFormModalOpen(true);
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

  const confirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === "window") {
        deleteWindowMutation.mutate({ id: itemToDelete.id });
      } else if (itemToDelete.type === "type") {
        deleteTypeMutation.mutate({ id: itemToDelete.id });
      }
    }
  };

  const handleWindowFormSuccess = () => {
    setIsFormModalOpen(false);
    void refetchWindows();
  };

  const handleTypeFormSuccess = () => {
    setIsTypeFormModalOpen(false);
    void refetchWindows();
  };

  // Filter windows based on search query and location type
  const filteredWindows = Array.isArray(attendanceWindows) 
    ? attendanceWindows.filter((window: any) => {
        // If data doesn't have required window properties, skip it
        if (!window || 
            typeof window !== 'object' ||
            !window.startTime ||
            !window.endTime ||
            typeof window.isMon !== 'boolean') {
          return false;
        }
        
        // Filter by location type if selected
        if (selectedLocationType !== "all" && window.locationTypeId !== selectedLocationType) {
          return false;
        }
        
        if (!searchQuery) return true;

        const searchLower = searchQuery.toLowerCase();
        return (
          window.name?.toLowerCase().includes(searchLower) ||
          window.locationType?.name?.toLowerCase().includes(searchLower)
        );
      }) 
    : [];

  // Filter types based on search query
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
      // Parse "HH:MM:SS" format
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
              Configure location-specific attendance settings including attendance windows and location types.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="windows" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="windows">Attendance Windows</TabsTrigger>
            <TabsTrigger value="types">Location Types</TabsTrigger>
          </TabsList>

          {/* Attendance Windows Tab */}
          <TabsContent value="windows" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Attendance windows define the time periods when attendance can be marked at different location types.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddWindow}
                  className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Window
                </Button>
              </div>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search windows..."
                    className="w-full pl-9 pr-4"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

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

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void refetchWindows()}
                  className="clickable"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Windows table */}
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
                          filteredWindows.map((window: any) => {
                            // Skip rendering rows with missing critical window data
                            if (!window.id || 
                                !window.name || 
                                !window.startTime || 
                                !window.endTime || 
                                typeof window.isMon !== 'boolean') {
                              return null;
                            }
                            
                            return (
                              <TableRow key={window.id}>
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
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                                      const dayProperty = `is${day}` as keyof typeof window;
                                      const isEnabled = window[dayProperty] as boolean;
                                      
                                      return (
                                        <div 
                                          key={day} 
                                          className={`text-xs rounded-sm w-7 flex justify-center items-center ${
                                            isEnabled 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-gray-100 text-gray-400'
                                          }`}
                                        >
                                          {day.slice(0, 1)}
                                        </div>
                                      );
                                    })}
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
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Types Tab */}
          <TabsContent value="types" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
                <p className="text-sm text-gray-500">
                  Location types define categories of locations where attendance is tracked. Each type can have specific attendance windows.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddType}
                  className="bg-[#00501B] hover:bg-[#00501B]/90 text-white clickable"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Type
                </Button>
              </div>
            </div>

            {/* Search and refresh */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search location types..."
                    className="w-full pl-9 pr-4"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => void refetchWindows()}
                className="clickable"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Types table */}
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
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
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
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
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
                                <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                                  {type.code}
                                </code>
                              </TableCell>
                              <TableCell>
                                {type.description || <span className="text-gray-400">No description</span>}
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
                                      disabled={type._count?.locations > 0 || type._count?.attendanceWindows > 0}
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
      <AttendanceWindowFormModal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleWindowFormSuccess}
        branchId={currentBranchId || ""}
        initialData={selectedItem}
      />

      <AttendanceTypeFormModal
        open={isTypeFormModalOpen}
        onClose={() => setIsTypeFormModalOpen(false)}
        onSuccess={handleTypeFormSuccess}
        initialData={selectedType}
        branchId={currentBranchId || ""}
      />

      <DeleteConfirmationDialog
        // @ts-ignore - Component prop naming mismatch
        open={isDeleteDialogOpen}
        title={`Delete ${itemToDelete?.type === "window" ? "Attendance Window" : "Location Type"}`}
        description={`Are you sure you want to delete the ${itemToDelete?.type === "window" ? "attendance window" : "location type"} "${itemToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        // @ts-ignore - Component prop naming mismatch
        onCancel={() => setIsDeleteDialogOpen(false)}
        // @ts-ignore - Component prop naming mismatch
        loading={deleteWindowMutation.isPending || deleteTypeMutation.isPending}
      />
    </PageWrapper>
  );
}
