"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Route,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  MapPin,
  Clock,
  Navigation,
  AlertTriangle,
  Bus,
  Users,
  Calculator,
  ArrowRight,
  Copy,
  Download,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useToast } from "@/components/ui/use-toast";

interface RouteFormData {
  name: string;
  description: string;
  startLocation: string;
  endLocation: string;
  totalDistance?: number;
  estimatedTime?: number;
}

interface StopFormData {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  sequence: number;
  pickupTime: string;
  dropTime: string;
}

function RouteForm({ 
  route, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  route?: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: RouteFormData) => void; 
}) {
  const [formData, setFormData] = useState<RouteFormData>({
    name: route?.name || "",
    description: route?.description || "",
    startLocation: route?.startLocation || "",
    endLocation: route?.endLocation || "",
    totalDistance: route?.totalDistance || undefined,
    estimatedTime: route?.estimatedTime || undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof RouteFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{route ? "Edit Route" : "Add New Route"}</DialogTitle>
          <DialogDescription>
            {route ? "Update route information" : "Create a new transportation route"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Basic Information</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Route Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Route A - Main Campus"
                    className="cursor-text"
                    required
                  />
                  <p className="text-xs text-muted-foreground">A descriptive name for this route</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Brief description of the route and areas covered"
                    rows={3}
                    className="cursor-text"
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Location Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startLocation" className="text-sm font-medium">Start Location</Label>
                  <Input
                    id="startLocation"
                    value={formData.startLocation}
                    onChange={(e) => handleInputChange("startLocation", e.target.value)}
                    placeholder="Starting point address"
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Where the route begins</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endLocation" className="text-sm font-medium">End Location</Label>
                  <Input
                    id="endLocation"
                    value={formData.endLocation}
                    onChange={(e) => handleInputChange("endLocation", e.target.value)}
                    placeholder="Ending point address"
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Where the route ends</p>
                </div>
              </div>
            </div>

            {/* Route Details */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Route Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="totalDistance" className="text-sm font-medium">Total Distance (km)</Label>
                  <Input
                    id="totalDistance"
                    type="number"
                    step="0.1"
                    value={formData.totalDistance || ""}
                    onChange={(e) => handleInputChange("totalDistance", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.0"
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Total distance of the complete route</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedTime" className="text-sm font-medium">Estimated Time (minutes)</Label>
                  <Input
                    id="estimatedTime"
                    type="number"
                    value={formData.estimatedTime || ""}
                    onChange={(e) => handleInputChange("estimatedTime", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Estimated travel time for the complete route</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              {route ? "Update Route" : "Create Route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StopForm({ 
  stop, 
  routeId,
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  stop?: any; 
  routeId: string;
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: StopFormData) => void; 
}) {
  const [formData, setFormData] = useState<StopFormData>({
    name: stop?.name || "",
    address: stop?.address || "",
    latitude: stop?.latitude || undefined,
    longitude: stop?.longitude || undefined,
    distance: stop?.distance || undefined,
    sequence: stop?.sequence || 1,
    pickupTime: stop?.pickupTime || "",
    dropTime: stop?.dropTime || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof StopFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{stop ? "Edit Stop" : "Add New Stop"}</DialogTitle>
          <DialogDescription>
            {stop ? "Update stop information" : "Add a new stop to this route"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="cursor-pointer">Basic Info</TabsTrigger>
              <TabsTrigger value="location" className="cursor-pointer">Location</TabsTrigger>
              <TabsTrigger value="timing" className="cursor-pointer">Timing</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stopName" className="text-sm font-medium">Stop Name *</Label>
                  <Input
                    id="stopName"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Central Market Stop"
                    className="cursor-text"
                    required
                  />
                  <p className="text-xs text-muted-foreground">A clear, identifiable name for this stop</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Full address of the stop location"
                    rows={3}
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Complete address to help locate the stop</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sequence" className="text-sm font-medium">Sequence *</Label>
                    <Input
                      id="sequence"
                      type="number"
                      value={formData.sequence}
                      onChange={(e) => handleInputChange("sequence", parseInt(e.target.value) || 1)}
                      min="1"
                      className="cursor-text"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Order of this stop in the route (1, 2, 3...)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="distance" className="text-sm font-medium">Distance from School (km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="0.1"
                      value={formData.distance || ""}
                      onChange={(e) => handleInputChange("distance", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.0"
                      className="cursor-text"
                    />
                    <p className="text-xs text-muted-foreground">Distance from the school in kilometers</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">GPS Coordinates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="latitude" className="text-sm font-medium">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude || ""}
                        onChange={(e) => handleInputChange("latitude", e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="e.g., 13.0827"
                        className="cursor-text"
                      />
                      <p className="text-xs text-muted-foreground">North-South position</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude" className="text-sm font-medium">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude || ""}
                        onChange={(e) => handleInputChange("longitude", e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="e.g., 80.2707"
                        className="cursor-text"
                      />
                      <p className="text-xs text-muted-foreground">East-West position</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Navigation className="h-4 w-4" />
                  <AlertDescription>
                    GPS coordinates help with route optimization and location tracking. You can get these from Google Maps by right-clicking on the location.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="timing" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Stop Timings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="pickupTime" className="text-sm font-medium">Pickup Time</Label>
                      <TimePicker
                        value={formData.pickupTime}
                        onChange={(time) => handleInputChange("pickupTime", time)}
                        placeholder="Select pickup time"
                      />
                      <p className="text-xs text-muted-foreground">Time when the bus arrives for pickup</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dropTime" className="text-sm font-medium">Drop Time</Label>
                      <TimePicker
                        value={formData.dropTime}
                        onChange={(time) => handleInputChange("dropTime", time)}
                        placeholder="Select drop time"
                      />
                      <p className="text-xs text-muted-foreground">Time when students are dropped off</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Set pickup and drop times to help students and parents plan their schedules. These times should account for traffic conditions.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              {stop ? "Update Stop" : "Add Stop"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RouteDetailsDialog({ 
  route, 
  isOpen, 
  onClose,
  onEditRoute,
  onAddStop,
  onEditStop,
  onDeleteStop,
}: { 
  route: any; 
  isOpen: boolean; 
  onClose: () => void;
  onEditRoute: (route: any) => void;
  onAddStop: (routeId: string) => void;
  onEditStop: (stop: any) => void;
  onDeleteStop: (stop: any) => void;
}) {
  if (!route) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            {route.name}
          </DialogTitle>
          <DialogDescription>
            Complete route information and stop management
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stops">Stops ({route.stops?.length || 0})</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Route Information</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEditRoute(route)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Route
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm">{route.description || "No description"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Start Location</Label>
                      <p className="text-sm">{route.startLocation || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">End Location</Label>
                      <p className="text-sm">{route.endLocation || "Not set"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Distance</Label>
                      <p className="text-sm">{route.totalDistance ? `${route.totalDistance} km` : "Not calculated"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Estimated Time</Label>
                      <p className="text-sm">{route.estimatedTime ? `${route.estimatedTime} minutes` : "Not calculated"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Route Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Stops</Label>
                      <p className="text-2xl font-bold">{route.stops?.length || 0}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Assigned Students</Label>
                      <p className="text-2xl font-bold">{route.assignments?.length || 0}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Assigned Buses</Label>
                      <p className="text-2xl font-bold">{route.buses?.length || 0}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={route.isActive ? "default" : "secondary"}>
                        {route.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stops" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Route Stops</h3>
              <Button onClick={() => onAddStop(route.id)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Stop
              </Button>
            </div>

            {route.stops && route.stops.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Stop Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Pickup Time</TableHead>
                      <TableHead>Drop Time</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {route.stops.map((stop: any) => (
                      <TableRow key={stop.id}>
                        <TableCell>
                          <Badge variant="outline">{stop.sequence}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{stop.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{stop.address || "No address"}</TableCell>
                        <TableCell>{stop.distance ? `${stop.distance} km` : "-"}</TableCell>
                        <TableCell>{stop.pickupTime || "-"}</TableCell>
                        <TableCell>{stop.dropTime || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {stop.assignments?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditStop(stop)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Stop
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDeleteStop(stop)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Stop
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No stops configured
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Add stops to this route to start organizing transportation
                </p>
                <Button onClick={() => onAddStop(route.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Stop
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Student Assignments
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Manage student assignments for this route
              </p>
              <Button variant="outline">
                View Assignments
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RouteManagementPageContent() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [isRouteFormOpen, setIsRouteFormOpen] = useState(false);
  const [isStopFormOpen, setIsStopFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [selectedRouteForStop, setSelectedRouteForStop] = useState<string>("");

  const { data: routes, isLoading, refetch } = api.transportation.getRoutes.useQuery(
    {
      branchId: currentBranchId || undefined,
      includeInactive: true,
    },
    {
      enabled: !!currentBranchId,
    }
  );

  const createRouteMutation = api.transportation.createRoute.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Route created successfully",
      });
      setIsRouteFormOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRouteMutation = api.transportation.updateRoute.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Route updated successfully",
      });
      setIsRouteFormOpen(false);
      setSelectedRoute(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRouteMutation = api.transportation.deleteRoute.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Route deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createStopMutation = api.transportation.createStop.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stop added successfully",
      });
      setIsStopFormOpen(false);
      setSelectedStop(null);
      setSelectedRouteForStop("");
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStopMutation = api.transportation.updateStop.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stop updated successfully",
      });
      setIsStopFormOpen(false);
      setSelectedStop(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStopMutation = api.transportation.deleteStop.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stop deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddRoute = () => {
    setSelectedRoute(null);
    setIsRouteFormOpen(true);
  };

  const handleEditRoute = (route: any) => {
    setSelectedRoute(route);
    setIsRouteFormOpen(true);
  };

  const handleViewRoute = (route: any) => {
    setSelectedRoute(route);
    setIsDetailsOpen(true);
  };

  const handleDeleteRoute = (route: any) => {
    if (confirm(`Are you sure you want to delete route "${route.name}"?`)) {
      deleteRouteMutation.mutate({ id: route.id });
    }
  };

  const handleAddStop = (routeId: string) => {
    setSelectedStop(null);
    setSelectedRouteForStop(routeId);
    setIsStopFormOpen(true);
  };

  const handleEditStop = (stop: any) => {
    setSelectedStop(stop);
    setSelectedRouteForStop(stop.routeId);
    setIsStopFormOpen(true);
  };

  const handleDeleteStop = (stop: any) => {
    if (confirm(`Are you sure you want to delete stop "${stop.name}"?`)) {
      deleteStopMutation.mutate({ id: stop.id });
    }
  };

  const handleRouteFormSubmit = (formData: RouteFormData) => {
    const data = {
      ...formData,
      branchId: currentBranchId!,
    };

    if (selectedRoute) {
      updateRouteMutation.mutate({ id: selectedRoute.id, data });
    } else {
      createRouteMutation.mutate(data);
    }
  };

  const handleStopFormSubmit = (formData: StopFormData) => {
    const data = {
      ...formData,
      routeId: selectedRouteForStop,
    };

    if (selectedStop) {
      updateStopMutation.mutate({ id: selectedStop.id, data });
    } else {
      createStopMutation.mutate(data);
    }
  };

  if (!currentBranchId) {
    return (
      <PageWrapper title="Route Management" subtitle="Manage transportation routes and stops">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch to access route management features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Route Management"
      subtitle="Manage transportation routes and stops"
      action={
        <Button onClick={handleAddRoute} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Route
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        {routes && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Routes</p>
                    <p className="text-2xl font-bold">{routes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Stops</p>
                    <p className="text-2xl font-bold">
                      {routes.reduce((sum, route) => sum + (route.stops?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Assigned Students</p>
                    <p className="text-2xl font-bold">
                      {routes.reduce((sum, route) => sum + (route.assignments?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Routes</p>
                    <p className="text-2xl font-bold">
                      {routes.filter(route => route.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Routes List */}
        <Card>
          <CardHeader>
            <CardTitle>Transportation Routes</CardTitle>
            <CardDescription>
              Manage routes with stops, timings, and assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                    <div className="h-12 w-12 bg-gray-200 rounded"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : routes && routes.length > 0 ? (
              <div className="space-y-4">
                {routes.map((route) => (
                  <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Route className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">{route.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {route.stops?.length || 0} stops
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {route.assignments?.length || 0} students
                          </span>
                          {route.totalDistance && (
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {route.totalDistance} km
                            </span>
                          )}
                          <Badge variant={route.isActive ? "default" : "secondary"}>
                            {route.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewRoute(route)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewRoute(route)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditRoute(route)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Route
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddStop(route.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Stop
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRoute(route)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Route
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Route className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No routes found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first transportation route to get started
                </p>
                <Button onClick={handleAddRoute}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Route
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forms and Dialogs */}
      <RouteForm
        route={selectedRoute}
        isOpen={isRouteFormOpen}
        onClose={() => {
          setIsRouteFormOpen(false);
          setSelectedRoute(null);
        }}
        onSubmit={handleRouteFormSubmit}
      />

      <StopForm
        stop={selectedStop}
        routeId={selectedRouteForStop}
        isOpen={isStopFormOpen}
        onClose={() => {
          setIsStopFormOpen(false);
          setSelectedStop(null);
          setSelectedRouteForStop("");
        }}
        onSubmit={handleStopFormSubmit}
      />

      <RouteDetailsDialog
        route={selectedRoute}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedRoute(null);
        }}
        onEditRoute={handleEditRoute}
        onAddStop={handleAddStop}
        onEditStop={handleEditStop}
        onDeleteStop={handleDeleteStop}
      />
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicRouteManagementPageContent = dynamic(() => Promise.resolve(RouteManagementPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function RouteManagementPage() {
  return <DynamicRouteManagementPageContent />;
} 