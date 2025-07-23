"use client";

import React, { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wrench,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  TrendingUp,
  Activity,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatIndianCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import VerticalBarChart from "@/components/ui/vertical-bar-chart";

interface MaintenanceLogFormData {
  busId: string;
  maintenanceDate: Date;
  maintenanceType: "Regular" | "Repair" | "Emergency";
  description: string;
  cost?: number;
  vendorName?: string;
  nextServiceDue?: Date;
  odometerReading?: number;
  isCompleted: boolean;
  notes?: string;
}

function MaintenanceLogForm({ 
  maintenanceLog, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  maintenanceLog?: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: MaintenanceLogFormData) => void; 
}) {
  const { currentBranchId } = useBranchContext();
  
  const [formData, setFormData] = useState<MaintenanceLogFormData>({
    busId: maintenanceLog?.busId || "",
    maintenanceDate: maintenanceLog?.maintenanceDate ? new Date(maintenanceLog.maintenanceDate) : new Date(),
    maintenanceType: maintenanceLog?.maintenanceType || "Regular Service",
    description: maintenanceLog?.description || "",
    cost: maintenanceLog?.cost || undefined,
    vendorName: maintenanceLog?.vendorName || "",
    nextServiceDue: maintenanceLog?.nextServiceDue ? new Date(maintenanceLog.nextServiceDue) : undefined,
    odometerReading: maintenanceLog?.odometerReading || undefined,
    isCompleted: maintenanceLog?.isCompleted ?? true,
    notes: maintenanceLog?.notes || "",
  });

  const { data: buses } = api.transportation.getBuses.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const maintenanceTypes = [
    "Regular Service",
    "Oil Change",
    "Brake Service",
    "Tire Replacement",
    "Engine Repair",
    "Transmission Service",
    "Battery Replacement",
    "AC Service",
    "Body Work",
    "Electrical Repair",
    "Emergency Repair",
    "Annual Inspection",
    "Other",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof MaintenanceLogFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{maintenanceLog ? "Edit Maintenance Log" : "Add New Maintenance Entry"}</DialogTitle>
          <DialogDescription>
            {maintenanceLog ? "Update maintenance record" : "Record new maintenance or repair for a bus"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="busId" className="text-sm font-medium">Select Bus *</Label>
                  <Select value={formData.busId} onValueChange={(value) => handleInputChange("busId", value)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Choose a bus" />
                    </SelectTrigger>
                    <SelectContent>
                      {buses?.map((bus) => (
                        <SelectItem key={bus.id} value={bus.id} className="cursor-pointer">
                          {bus.busNumber} ({bus.model || "No model"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceDate" className="text-sm font-medium">Maintenance Date *</Label>
                  <DatePicker
                    value={formData.maintenanceDate}
                    onChange={(date) => handleInputChange("maintenanceDate", date)}
                    placeholder="Select maintenance date"
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Service Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maintenanceType" className="text-sm font-medium">Maintenance Type *</Label>
                  <Select value={formData.maintenanceType} onValueChange={(value) => handleInputChange("maintenanceType", value)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {maintenanceTypes.map((type) => (
                        <SelectItem key={type} value={type} className="cursor-pointer">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-sm font-medium">Cost (₹)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost || ""}
                    onChange={(e) => handleInputChange("cost", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.00"
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Total cost for the maintenance work</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Detailed description of maintenance work performed"
                  rows={3}
                  className="cursor-text"
                  required
                />
              </div>
            </div>

            {/* Service Provider & Technical Details */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Service Provider & Technical Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="vendorName" className="text-sm font-medium">Vendor/Service Provider</Label>
                  <Input
                    id="vendorName"
                    value={formData.vendorName}
                    onChange={(e) => handleInputChange("vendorName", e.target.value)}
                    placeholder="Name of service provider"
                    className="cursor-text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="odometerReading" className="text-sm font-medium">Odometer Reading (km)</Label>
                  <Input
                    id="odometerReading"
                    type="number"
                    value={formData.odometerReading || ""}
                    onChange={(e) => handleInputChange("odometerReading", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Current odometer reading"
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">Kilometers at time of maintenance</p>
                </div>
              </div>
            </div>

            {/* Scheduling & Status */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Scheduling & Status</h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nextServiceDue" className="text-sm font-medium">Next Maintenance Due</Label>
                  <DatePicker
                    value={formData.nextServiceDue}
                    onChange={(date) => handleInputChange("nextServiceDue", date)}
                    placeholder="Select next service date"
                  />
                  <p className="text-xs text-muted-foreground">When the next maintenance is scheduled</p>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="isCompleted"
                    checked={formData.isCompleted}
                    onCheckedChange={(checked) => handleInputChange("isCompleted", checked)}
                    className="cursor-pointer"
                  />
                  <Label htmlFor="isCompleted" className="text-sm font-medium cursor-pointer">
                    Maintenance completed
                  </Label>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any additional notes, observations, or recommendations"
                rows={3}
                className="cursor-text"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              {maintenanceLog ? "Update Record" : "Add Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceLogsPage() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBus, setFilterBus] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const { data: maintenanceLogs, isLoading, refetch } = api.transportation.getMaintenanceLogs.useQuery(
    {
      dateFrom: dateFilter.from ? new Date(dateFilter.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: dateFilter.to ? new Date(dateFilter.to) : new Date(),
    },
    { enabled: !!currentBranchId }
  );

  const { data: buses } = api.transportation.getBuses.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const createMaintenanceLogMutation = api.transportation.createMaintenanceLog.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance log created successfully",
      });
      setIsFormOpen(false);
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

  const updateMaintenanceLogMutation = api.transportation.updateMaintenanceLog.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance log updated successfully",
      });
      setIsFormOpen(false);
      setSelectedLog(null);
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

  const deleteMaintenanceLogMutation = api.transportation.deleteMaintenanceLog.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Maintenance log deleted successfully",
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

  const handleAddLog = () => {
    setSelectedLog(null);
    setIsFormOpen(true);
  };

  const handleEditLog = (log: any) => {
    setSelectedLog(log);
    setIsFormOpen(true);
  };

  const handleDeleteLog = (log: any) => {
    if (confirm(`Are you sure you want to delete this maintenance record?`)) {
      deleteMaintenanceLogMutation.mutate({ id: log.id });
    }
  };

  const handleFormSubmit = (formData: MaintenanceLogFormData) => {
    if (selectedLog) {
      updateMaintenanceLogMutation.mutate({ id: selectedLog.id, data: formData });
    } else {
      createMaintenanceLogMutation.mutate(formData);
    }
  };

  // Filter maintenance logs
  const filteredLogs = maintenanceLogs?.filter((log) => {
    const matchesSearch = 
      log.bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.maintenanceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.serviceProvider && log.serviceProvider.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesBus = filterBus === "all" || log.busId === filterBus;
    const matchesStatus = filterStatus === "all" || 
      filterStatus === "all" || 
      (filterStatus === "completed" && log.cost !== null && log.cost > 0) ||
      (filterStatus === "pending" && (log.cost === null || log.cost === 0));

    return matchesSearch && matchesBus && matchesStatus;
  });

  // Calculate analytics
  const totalMaintenanceCost = maintenanceLogs?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;
  const completedLogs = maintenanceLogs?.filter(log => log.cost !== null && log.cost > 0).length || 0;
  const pendingLogs = maintenanceLogs?.filter(log => log.cost === null || log.cost === 0).length || 0;
  const avgCostPerMaintenance = maintenanceLogs?.length ? totalMaintenanceCost / maintenanceLogs.length : 0;

  // Upcoming maintenance alerts
  const upcomingMaintenance = maintenanceLogs?.filter(log => {
    if (!log.nextServiceDue) return false;
    const nextDate = new Date(log.nextServiceDue);
    const today = new Date();
    const daysDiff = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30 && daysDiff >= 0;
  }) || [];

  // Prepare chart data for maintenance costs by type
  const costByTypeData = maintenanceLogs?.reduce((acc: any[], log) => {
    if (!log.cost) return acc;
    const existing = acc.find(item => item.name === log.maintenanceType);
    if (existing) {
      existing.value += log.cost;
    } else {
      acc.push({ name: log.maintenanceType, value: log.cost, color: "#3b82f6" });
    }
    return acc;
  }, []) || [];

  if (!currentBranchId) {
    return (
      <PageWrapper title="Maintenance Tracking" subtitle="Track vehicle maintenance and repairs">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch to access maintenance tracking features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Maintenance Tracking"
      subtitle="Track vehicle maintenance and repairs"
      action={
        <Button onClick={handleAddLog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Maintenance Record
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Upcoming Maintenance Alerts */}
        {upcomingMaintenance.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{upcomingMaintenance.length} buses</strong> have maintenance due within the next 30 days.
              Check the maintenance schedule to avoid service disruptions.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by bus, type, or vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterBus} onValueChange={setFilterBus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by bus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buses</SelectItem>
                  {buses?.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.busNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                  className="w-40"
                />
                <Input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                  className="w-40"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Cards */}
        {maintenanceLogs && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">{formatIndianCurrency(totalMaintenanceCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedLogs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{pendingLogs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Cost</p>
                    <p className="text-2xl font-bold">{formatIndianCurrency(avgCostPerMaintenance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cost by Maintenance Type Chart */}
        {costByTypeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Maintenance Costs by Type
              </CardTitle>
              <CardDescription>
                Breakdown of maintenance expenses by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart
                data={costByTypeData.slice(0, 10)} // Top 10 types
                title="Maintenance Costs (₹)"

              />
            </CardContent>
          </Card>
        )}

        {/* Maintenance Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Records</CardTitle>
            <CardDescription>
              Track all maintenance and repair activities for your fleet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
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
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bus</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.maintenanceDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{log.bus.busNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.maintenanceType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                      <TableCell>
                        {log.cost ? formatIndianCurrency(log.cost) : "-"}
                      </TableCell>
                      <TableCell>{log.serviceProvider || "-"}</TableCell>
                                              <TableCell>
                          <Badge variant={(log.cost !== null && log.cost > 0) ? "default" : "outline"}>
                            {(log.cost !== null && log.cost > 0) ? "Completed" : "Pending"}
                          </Badge>
                        </TableCell>
                      <TableCell>
                        {log.nextServiceDue ? (
                          <span className={
                            new Date(log.nextServiceDue) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? "text-red-600 font-medium"
                              : new Date(log.nextServiceDue) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? "text-orange-600"
                              : ""
                          }>
                            {new Date(log.nextServiceDue).toLocaleDateString()}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditLog(log)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Record
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteLog(log)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Wrench className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterBus !== "all" || filterStatus !== "all" 
                      ? "No maintenance records match your search criteria." 
                      : "No maintenance records added yet."}
                  </p>
                  {!searchTerm && filterBus === "all" && filterStatus === "all" && (
                    <Button variant="outline" onClick={handleAddLog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Record
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <MaintenanceLogForm
        maintenanceLog={selectedLog}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedLog(null);
        }}
        onSubmit={handleFormSubmit}
      />
    </PageWrapper>
  );
} 