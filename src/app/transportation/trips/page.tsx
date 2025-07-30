"use client";

import React, { useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Navigation,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Clock,
  Route as RouteIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Car,
  Fuel,
  Users,
  MapPin,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Play,
  Pause,
  Flag,
  Calculator,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useToast } from "@/components/ui/use-toast";
import { formatIndianCurrency } from "@/lib/utils";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";

interface TripFormData {
  busId: string;
  routeId?: string;
  driverId?: string;
  conductorId?: string;
  tripDate: Date;
  startTime: Date;
  endTime?: Date;
  startKilometerReading: number;
  endKilometerReading?: number;
  numberOfStudents?: number;
  fuelConsumed?: number;
  tripType: "Regular" | "Emergency" | "Maintenance";
  notes?: string;
}

interface TripStartFormData {
  busId: string;
  routeId?: string;
  startKilometerReading: number;
  numberOfStudents?: number;
  notes?: string;
}

interface TripEndFormData {
  endKilometerReading: number;
  fuelConsumed?: number;
  notes?: string;
}

function TripStartForm({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: TripStartFormData) => void; 
}) {
  const { currentBranchId } = useBranchContext();
  const [formData, setFormData] = useState<TripStartFormData>({
    busId: "",
    startKilometerReading: 0,
  });

  const { data: buses } = api.transportation.getBuses.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const { data: routes } = api.transportation.getRoutes.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      busId: "",
      startKilometerReading: 0,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Start Trip
          </DialogTitle>
          <DialogDescription>
            Enter trip details and starting kilometer reading
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="busId">Bus *</Label>
            <Select 
              value={formData.busId} 
              onValueChange={(value) => setFormData({...formData, busId: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bus" />
              </SelectTrigger>
              <SelectContent>
                {buses?.map((bus) => (
                  <SelectItem key={bus.id} value={bus.id}>
                    {bus.busNumber} - {bus.registrationNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="routeId">Route (Optional)</Label>
            <Select 
              value={formData.routeId || ""} 
              onValueChange={(value) => setFormData({...formData, routeId: value || undefined})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent>
                {routes?.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startKm">Starting Kilometer Reading *</Label>
            <Input
              id="startKm"
              type="number"
              min="0"
              value={formData.startKilometerReading}
              onChange={(e) => setFormData({...formData, startKilometerReading: Number(e.target.value)})}
              placeholder="Enter current odometer reading"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="students">Number of Students</Label>
            <Input
              id="students"
              type="number"
              min="0"
              value={formData.numberOfStudents || ""}
              onChange={(e) => setFormData({...formData, numberOfStudents: Number(e.target.value) || undefined})}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({...formData, notes: e.target.value || undefined})}
              placeholder="Any special notes about this trip"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-2" />
              Start Trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TripEndForm({ 
  trip,
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  trip: any;
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (tripId: string, data: TripEndFormData) => void; 
}) {
  const [formData, setFormData] = useState<TripEndFormData>({
    endKilometerReading: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(trip.id, formData);
    setFormData({
      endKilometerReading: 0,
    });
  };

  const estimatedDistance = formData.endKilometerReading && trip.startKilometerReading 
    ? formData.endKilometerReading - trip.startKilometerReading 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-600" />
            End Trip
          </DialogTitle>
          <DialogDescription>
            Complete trip for {trip?.bus?.busNumber} on {trip?.route?.name || 'No route'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-4">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Starting KM:</span>
              <span className="font-medium">{trip?.startKilometerReading?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Time:</span>
              <span className="font-medium">
                {trip?.startTime ? new Date(trip.startTime).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
            {estimatedDistance > 0 && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Distance:</span>
                <span className="font-medium text-blue-600">{estimatedDistance} km</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endKm">Ending Kilometer Reading *</Label>
            <Input
              id="endKm"
              type="number"
              min={trip?.startKilometerReading || 0}
              value={formData.endKilometerReading}
              onChange={(e) => setFormData({...formData, endKilometerReading: Number(e.target.value)})}
              placeholder="Enter final odometer reading"
              required
            />
            {formData.endKilometerReading > 0 && formData.endKilometerReading <= (trip?.startKilometerReading || 0) && (
              <p className="text-sm text-red-600">End reading must be greater than start reading</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuel">Fuel Consumed (Liters)</Label>
            <Input
              id="fuel"
              type="number"
              min="0"
              step="0.1"
              value={formData.fuelConsumed || ""}
              onChange={(e) => setFormData({...formData, fuelConsumed: Number(e.target.value) || undefined})}
              placeholder="Optional - estimated fuel used"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Trip Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({...formData, notes: e.target.value || undefined})}
              placeholder="Any issues, delays, or observations during the trip"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700"
              disabled={formData.endKilometerReading <= (trip?.startKilometerReading || 0)}
            >
              <Flag className="h-4 w-4 mr-2" />
              End Trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TripAnalytics() {
  const { currentBranchId } = useBranchContext();

  const { data: trips, isLoading } = api.transportation.getTrips.useQuery({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dateTo: new Date(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const completedTrips = trips?.filter(trip => trip.isCompleted) || [];
  const activeTrips = trips?.filter(trip => !trip.isCompleted) || [];
  
  const totalDistance = completedTrips.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);
  const totalFuel = completedTrips.reduce((sum, trip) => sum + (trip.fuelConsumed || 0), 0);
  const avgFuelEfficiency = totalDistance > 0 && totalFuel > 0 ? totalDistance / totalFuel : 0;
  
  const uniqueBuses = new Set(trips?.map(trip => trip.busId) || []).size;
  
  // Enhanced analytics for route compliance and efficiency
  const tripsWithRoutes = completedTrips.filter(trip => trip.route && trip.totalDistance);
  const routeAnalytics = tripsWithRoutes.reduce((acc, trip) => {
    const routeId = trip.route!.id;
    const expectedDistance = trip.route!.totalDistance || 0;
    const actualDistance = trip.totalDistance || 0;
    const variance = expectedDistance > 0 ? ((actualDistance - expectedDistance) / expectedDistance) * 100 : 0;
    
    if (!acc[routeId]) {
      acc[routeId] = {
        routeName: trip.route!.name,
        expectedDistance,
        trips: [],
        totalVariance: 0,
        deviations: 0,
      };
    }
    
    acc[routeId].trips.push({
      actualDistance,
      variance,
      date: trip.tripDate,
      fuelEfficiency: trip.fuelConsumed ? actualDistance / trip.fuelConsumed : 0,
    });
    
    acc[routeId].totalVariance += Math.abs(variance);
    if (Math.abs(variance) > 10) { // More than 10% deviation
      acc[routeId].deviations++;
    }
    
    return acc;
  }, {} as Record<string, any>);
  
  const suspiciousTrips = Object.values(routeAnalytics).filter((route: any) => 
    route.trips.some((trip: any) => Math.abs(trip.variance) > 20)
  ).length;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Navigation className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{trips?.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {activeTrips.length} active, {completedTrips.length} completed
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Distance Covered</p>
                <p className="text-2xl font-bold">{totalDistance.toFixed(1)} km</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Fuel className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Fuel Efficiency</p>
                <p className="text-2xl font-bold">
                  {avgFuelEfficiency > 0 ? `${avgFuelEfficiency.toFixed(1)} km/L` : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">Average across fleet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Car className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Route Deviations</p>
                <p className="text-2xl font-bold">{suspiciousTrips}</p>
                <p className="text-xs text-muted-foreground">Trips with &gt; 20% variance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Route Compliance Analysis</CardTitle>
            <CardDescription>Distance variance from expected routes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(routeAnalytics).slice(0, 5).map((route: any, index) => {
                const avgVariance = route.trips.length > 0 
                  ? route.totalVariance / route.trips.length 
                  : 0;
                const avgEfficiency = route.trips.length > 0
                  ? route.trips.reduce((sum: number, trip: any) => sum + trip.fuelEfficiency, 0) / route.trips.length
                  : 0;
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{route.routeName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {route.trips.length} trips • {route.expectedDistance.toFixed(1)} km expected
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${avgVariance > 15 ? 'text-red-600' : avgVariance > 10 ? 'text-orange-600' : 'text-green-600'}`}>
                        {avgVariance > 0 ? '+' : ''}{avgVariance.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {avgEfficiency.toFixed(1)} km/L avg
                      </p>
                    </div>
                  </div>
                );
              })}
              {Object.keys(routeAnalytics).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>No route data available yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fuel Efficiency by Bus</CardTitle>
            <CardDescription>Individual bus performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(new Set(completedTrips.map(trip => trip.busId))).slice(0, 5).map(busId => {
                const busTrips = completedTrips.filter(trip => trip.busId === busId);
                const bus = busTrips[0]?.bus;
                const totalBusDistance = busTrips.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0);
                const totalBusFuel = busTrips.reduce((sum, trip) => sum + (trip.fuelConsumed || 0), 0);
                const efficiency = totalBusFuel > 0 ? totalBusDistance / totalBusFuel : 0;
                
                return (
                  <div key={busId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{bus?.busNumber}</h4>
                      <p className="text-xs text-muted-foreground">
                        {busTrips.length} trips • {totalBusDistance.toFixed(1)} km total
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${efficiency >= avgFuelEfficiency ? 'text-green-600' : 'text-orange-600'}`}>
                        {efficiency.toFixed(1)} km/L
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totalBusFuel.toFixed(1)} L consumed
                      </p>
                    </div>
                  </div>
                );
              })}
              {completedTrips.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>No efficiency data available yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for Suspicious Activity */}
      {suspiciousTrips > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Route Compliance Alert:</strong> {suspiciousTrips} route(s) have trips with significant distance deviations (&gt; 20%). 
            This may indicate unauthorized detours or route changes that require investigation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function TripManagerPage() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [isStartFormOpen, setIsStartFormOpen] = useState(false);
  const [isEndFormOpen, setIsEndFormOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  const { data: trips, isLoading, refetch } = api.transportation.getTrips.useQuery({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    dateTo: new Date(),
  });

  const createTripMutation = api.transportation.createTrip.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trip started successfully",
      });
      setIsStartFormOpen(false);
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

  const updateTripMutation = api.transportation.updateTrip.useMutation({
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "Trip completed successfully",
      });
      setIsEndFormOpen(false);
      setSelectedTrip(null);
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

  const handleStartTrip = (data: TripStartFormData) => {
    createTripMutation.mutate({
      ...data,
      tripDate: new Date(),
      startTime: new Date(),
      tripType: "Regular",
    });
  };

  const handleEndTrip = (tripId: string, data: TripEndFormData) => {
    updateTripMutation.mutate({
      id: tripId,
      data: {
        ...data,
        endTime: new Date(),
        isCompleted: true,
      },
    });
  };

  const activeTrips = trips?.filter(trip => !trip.isCompleted) || [];
  const recentTrips = trips?.filter(trip => trip.isCompleted)?.slice(0, 10) || [];

  if (!currentBranchId) {
    return (
      <PageWrapper title="Trip Manager" subtitle="Manage driver trips and kilometer readings">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch to access trip management features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Trip Manager"
      subtitle="Manage driver trips and kilometer readings"
      action={
        <Button onClick={() => setIsStartFormOpen(true)} className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Start New Trip
        </Button>
      }
    >
      <div className="space-y-6">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Active Trips ({activeTrips.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Trips
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {activeTrips.length > 0 ? (
              <div className="grid gap-4">
                {activeTrips.map((trip) => (
                  <Card key={trip.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                            <Play className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{trip.bus?.busNumber}</h3>
                            <p className="text-sm text-muted-foreground">
                              {trip.route?.name || 'No route assigned'} • Started at {new Date(trip.startTime).toLocaleTimeString()}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {trip.startKilometerReading.toLocaleString()} km
                              </span>
                              {trip.numberOfStudents && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {trip.numberOfStudents} students
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Activity className="h-3 w-3 mr-1" />
                            In Progress
                          </Badge>
                          <Button 
                            onClick={() => {
                              setSelectedTrip(trip);
                              setIsEndFormOpen(true);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            End Trip
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Navigation className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Active Trips
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Start a new trip to track kilometer readings and route compliance
                  </p>
                  <Button onClick={() => setIsStartFormOpen(true)}>
                    <Play className="h-4 w-4 mr-2" />
                    Start First Trip
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Completed Trips</CardTitle>
                <CardDescription>Last 10 completed trips with details</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-8 w-24 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : recentTrips.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bus</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Fuel Efficiency</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTrips.map((trip) => {
                        const duration = trip.endTime && trip.startTime 
                          ? Math.round((new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / (1000 * 60))
                          : null;
                        const efficiency = trip.totalDistance && trip.fuelConsumed 
                          ? (trip.totalDistance / trip.fuelConsumed).toFixed(1)
                          : null;

                        return (
                          <TableRow key={trip.id}>
                            <TableCell className="font-medium">{trip.bus?.busNumber}</TableCell>
                            <TableCell>{trip.route?.name || 'No route'}</TableCell>
                            <TableCell>{new Date(trip.tripDate).toLocaleDateString()}</TableCell>
                            <TableCell>{trip.totalDistance?.toFixed(1) || 'N/A'} km</TableCell>
                            <TableCell>{duration ? `${duration} min` : 'N/A'}</TableCell>
                            <TableCell>{efficiency ? `${efficiency} km/L` : 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No Recent Trips
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Completed trips will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <TripAnalytics />
          </TabsContent>
        </Tabs>
      </div>

      {/* Forms */}
      <TripStartForm
        isOpen={isStartFormOpen}
        onClose={() => setIsStartFormOpen(false)}
        onSubmit={handleStartTrip}
      />

      <TripEndForm
        trip={selectedTrip}
        isOpen={isEndFormOpen}
        onClose={() => {
          setIsEndFormOpen(false);
          setSelectedTrip(null);
        }}
        onSubmit={handleEndTrip}
      />
    </PageWrapper>
  );
} 