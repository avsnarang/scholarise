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
import { TimePicker } from "@/components/ui/time-picker";
import {
  Fuel,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Calculator,
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  Search,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatIndianCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import VerticalBarChart from "@/components/ui/vertical-bar-chart";

interface FuelLogFormData {
  busId: string;
  fuelDate: Date;
  fuelQuantity: number;
  pricePerLiter: number;
  totalAmount: number;
  fuelType: string;
  vendorName?: string;
  odometerReading?: number;
  notes?: string;
}

function FuelLogForm({ 
  fuelLog, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  fuelLog?: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: FuelLogFormData) => void; 
}) {
  const { currentBranchId } = useBranchContext();
  
  const [formData, setFormData] = useState<FuelLogFormData>({
    busId: fuelLog?.busId || "",
    fuelDate: fuelLog?.fuelDate ? new Date(fuelLog.fuelDate) : new Date(),
    fuelQuantity: fuelLog?.fuelQuantity || 0,
    pricePerLiter: fuelLog?.pricePerLiter || 0,
    totalAmount: fuelLog?.totalAmount || 0,
    fuelType: fuelLog?.fuelType || "Diesel",
    vendorName: fuelLog?.vendorName || "",
    odometerReading: fuelLog?.odometerReading || undefined,
    notes: fuelLog?.notes || "",
  });

  const { data: buses } = api.transportation.getBuses.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof FuelLogFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate total amount when quantity or price changes
      if (field === "fuelQuantity" || field === "pricePerLiter") {
        newData.totalAmount = newData.fuelQuantity * newData.pricePerLiter;
      }
      
      return newData;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{fuelLog ? "Edit Fuel Log" : "Add New Fuel Entry"}</DialogTitle>
          <DialogDescription>
            {fuelLog ? "Update fuel consumption record" : "Record new fuel consumption for a bus"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            {/* Bus Selection and Date */}
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
                <Label htmlFor="fuelDate" className="text-sm font-medium">Fuel Date *</Label>
                <DatePicker
                  value={formData.fuelDate}
                  onChange={(date) => handleInputChange("fuelDate", date)}
                  placeholder="Select fuel date"
                />
              </div>
            </div>

            {/* Fuel Details */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Fuel Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fuelQuantity" className="text-sm font-medium">Quantity (Liters) *</Label>
                  <Input
                    id="fuelQuantity"
                    type="number"
                    step="0.01"
                    value={formData.fuelQuantity}
                    onChange={(e) => handleInputChange("fuelQuantity", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="cursor-text"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerLiter" className="text-sm font-medium">Price per Liter *</Label>
                  <Input
                    id="pricePerLiter"
                    type="number"
                    step="0.01"
                    value={formData.pricePerLiter}
                    onChange={(e) => handleInputChange("pricePerLiter", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="cursor-text"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalAmount" className="text-sm font-medium">Total Amount</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={formData.totalAmount.toFixed(2)}
                    onChange={(e) => handleInputChange("totalAmount", parseFloat(e.target.value) || 0)}
                    placeholder="Auto-calculated"
                    className="cursor-text bg-muted/50"
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">Automatically calculated</p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Additional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fuelType" className="text-sm font-medium">Fuel Type</Label>
                  <Select value={formData.fuelType} onValueChange={(value) => handleInputChange("fuelType", value)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diesel" className="cursor-pointer">Diesel</SelectItem>
                      <SelectItem value="Petrol" className="cursor-pointer">Petrol</SelectItem>
                      <SelectItem value="CNG" className="cursor-pointer">CNG</SelectItem>
                      <SelectItem value="Electric" className="cursor-pointer">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorName" className="text-sm font-medium">Vendor/Station Name</Label>
                  <Input
                    id="vendorName"
                    value={formData.vendorName}
                    onChange={(e) => handleInputChange("vendorName", e.target.value)}
                    placeholder="Fuel station name"
                    className="cursor-text"
                  />
                </div>
              </div>
            </div>

            {/* Odometer and Notes */}
            <div className="space-y-6">
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
                <p className="text-xs text-muted-foreground">Optional: Current kilometers on the odometer</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any additional notes about this fuel entry"
                  rows={3}
                  className="cursor-text"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              {fuelLog ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FuelLogsPage() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBus, setFilterBus] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const { data: fuelLogs, isLoading, refetch } = api.transportation.getFuelLogs.useQuery(
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

  const createFuelLogMutation = api.transportation.createFuelLog.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fuel log created successfully",
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

  const updateFuelLogMutation = api.transportation.updateFuelLog.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fuel log updated successfully",
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

  const deleteFuelLogMutation = api.transportation.deleteFuelLog.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fuel log deleted successfully",
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
    if (confirm(`Are you sure you want to delete this fuel log entry?`)) {
      deleteFuelLogMutation.mutate({ id: log.id });
    }
  };

  const handleFormSubmit = (formData: FuelLogFormData) => {
    if (selectedLog) {
      updateFuelLogMutation.mutate({ id: selectedLog.id, data: formData });
    } else {
      createFuelLogMutation.mutate(formData);
    }
  };

  // Filter fuel logs
  const filteredLogs = fuelLogs?.filter((log) => {
    const matchesSearch = 
      log.bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesBus = filterBus === "all" || log.busId === filterBus;

    return matchesSearch && matchesBus;
  });

  // Calculate analytics
  const totalFuelCost = fuelLogs?.reduce((sum, log) => sum + log.totalAmount, 0) || 0;
  const totalFuelConsumed = fuelLogs?.reduce((sum, log) => sum + log.fuelQuantity, 0) || 0;
  const avgPricePerLiter = totalFuelConsumed > 0 ? totalFuelCost / totalFuelConsumed : 0;
  const avgCostPerDay = fuelLogs?.length ? totalFuelCost / 30 : 0;

  // Prepare chart data
  const chartData = fuelLogs?.reduce((acc: any[], log) => {
    const date = new Date(log.fuelDate).toLocaleDateString();
    const existing = acc.find(item => item.name === date);
    if (existing) {
      existing.value += log.totalAmount;
    } else {
      acc.push({ name: date, value: log.totalAmount, color: "#3b82f6" });
    }
    return acc;
  }, []).slice(-10) || [];

  if (!currentBranchId) {
    return (
      <PageWrapper title="Fuel Tracking" subtitle="Monitor fuel consumption and costs">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch to access fuel tracking features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Fuel Tracking"
      subtitle="Monitor fuel consumption and costs"
      action={
        <Button onClick={handleAddLog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Fuel Entry
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by bus number or vendor..."
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
        {fuelLogs && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Fuel className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Fuel Cost</p>
                    <p className="text-2xl font-bold">{formatIndianCurrency(totalFuelCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Fuel Consumed</p>
                    <p className="text-2xl font-bold">{totalFuelConsumed.toFixed(1)}L</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Price/Liter</p>
                    <p className="text-2xl font-bold">₹{avgPricePerLiter.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                    <p className="text-2xl font-bold">{formatIndianCurrency(avgCostPerDay)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fuel Cost Trend Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Fuel Cost Trend (Last 10 Entries)
              </CardTitle>
              <CardDescription>
                Daily fuel expenses over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart
                data={chartData}
                title="Fuel Expenses (₹)"

              />
            </CardContent>
          </Card>
        )}

        {/* Fuel Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fuel Consumption Logs</CardTitle>
            <CardDescription>
              Track fuel purchases and consumption for all buses
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
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price/Liter</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.fuelDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{log.bus.busNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.bus.fuelType}</Badge>
                      </TableCell>
                      <TableCell>{log.fuelQuantity}L</TableCell>
                      <TableCell>₹{log.pricePerLiter}</TableCell>
                      <TableCell className="font-medium">{formatIndianCurrency(log.totalAmount)}</TableCell>
                      <TableCell>{log.notes || "-"}</TableCell>
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
                              Edit Entry
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteLog(log)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Entry
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
                  <Fuel className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterBus !== "all" 
                      ? "No fuel logs match your search criteria." 
                      : "No fuel logs recorded yet."}
                  </p>
                  {!searchTerm && filterBus === "all" && (
                    <Button variant="outline" onClick={handleAddLog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Entry
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <FuelLogForm
        fuelLog={selectedLog}
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