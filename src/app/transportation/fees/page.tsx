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
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Route,
  MapPin,
  Calculator,
  AlertTriangle,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { formatIndianCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface FeeStructureFormData {
  name: string;
  description: string;
  feeType: "ROUTE_WISE" | "STOP_WISE" | "DISTANCE_BASED" | "FLAT_RATE";
  amount: number;
  routeId?: string;
  stopId?: string;
  applicableFrom?: Date;
  applicableUntil?: Date;
}

function FeeStructureForm({ 
  feeStructure, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  feeStructure?: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: FeeStructureFormData) => void; 
}) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [formData, setFormData] = useState<FeeStructureFormData>({
    name: feeStructure?.name || "",
    description: feeStructure?.description || "",
    feeType: feeStructure?.feeType || "ROUTE_WISE",
    amount: feeStructure?.amount || 0,
    routeId: feeStructure?.routeId || "",
    stopId: feeStructure?.stopId || "",
    applicableFrom: feeStructure?.applicableFrom ? new Date(feeStructure.applicableFrom) : new Date(),
    applicableUntil: feeStructure?.applicableUntil ? new Date(feeStructure.applicableUntil) : undefined,
  });

  // Fetch routes and stops for dropdowns
  const { data: routes } = api.transportation.getRoutes.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const { data: stops } = api.transportation.getStops.useQuery(
    { routeId: formData.routeId },
    { enabled: !!formData.routeId && formData.feeType === "STOP_WISE" }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof FeeStructureFormData, value: any) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: value,
      // Clear route/stop selection when fee type changes
      ...(field === "feeType" && { routeId: "", stopId: "" })
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{feeStructure ? "Edit Fee Structure" : "Create New Fee Structure"}</DialogTitle>
          <DialogDescription>
            {feeStructure ? "Update fee structure details" : "Create a new transportation fee structure"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="cursor-pointer">Basic Info</TabsTrigger>
              <TabsTrigger value="assignment" className="cursor-pointer">Assignment</TabsTrigger>
              <TabsTrigger value="validity" className="cursor-pointer">Validity</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Basic Information</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Fee Structure Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="e.g., Route A Monthly Fee"
                        className="cursor-text"
                        required
                      />
                      <p className="text-xs text-muted-foreground">A descriptive name for this fee structure</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Brief description of the fee structure and its purpose"
                        rows={3}
                        className="cursor-text"
                      />
                      <p className="text-xs text-muted-foreground">Optional: Provide additional details about this fee structure</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Fee Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="feeType" className="text-sm font-medium">Fee Type *</Label>
                      <Select value={formData.feeType} onValueChange={(value) => handleInputChange("feeType", value)}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Select fee type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ROUTE_WISE" className="cursor-pointer">Route-wise</SelectItem>
                          <SelectItem value="STOP_WISE" className="cursor-pointer">Stop-wise</SelectItem>
                          <SelectItem value="DISTANCE_BASED" className="cursor-pointer">Distance-based</SelectItem>
                          <SelectItem value="FLAT_RATE" className="cursor-pointer">Flat Rate</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">How the fee is calculated and applied</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-sm font-medium">Amount (₹) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="cursor-text"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.feeType === "DISTANCE_BASED" ? "Rate per kilometer" : "Fixed amount"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assignment" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Fee Assignment</h4>
                  
                  {formData.feeType === "ROUTE_WISE" && (
                    <div className="space-y-2">
                      <Label htmlFor="routeId" className="text-sm font-medium">Select Route *</Label>
                      <Select value={formData.routeId} onValueChange={(value) => handleInputChange("routeId", value)}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Choose a route" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes?.map((route) => (
                            <SelectItem key={route.id} value={route.id} className="cursor-pointer">
                              {route.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">This fee will apply to all students using this route</p>
                    </div>
                  )}

                  {formData.feeType === "STOP_WISE" && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="routeId" className="text-sm font-medium">Select Route *</Label>
                        <Select value={formData.routeId} onValueChange={(value) => handleInputChange("routeId", value)}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Choose a route first" />
                          </SelectTrigger>
                          <SelectContent>
                            {routes?.map((route) => (
                              <SelectItem key={route.id} value={route.id} className="cursor-pointer">
                                {route.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Select the route containing the stop</p>
                      </div>
                      
                      {formData.routeId && (
                        <div className="space-y-2">
                          <Label htmlFor="stopId" className="text-sm font-medium">Select Stop *</Label>
                          <Select value={formData.stopId} onValueChange={(value) => handleInputChange("stopId", value)}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder="Choose a stop" />
                            </SelectTrigger>
                            <SelectContent>
                              {stops?.map((stop) => (
                                <SelectItem key={stop.id} value={stop.id} className="cursor-pointer">
                                  {stop.name} (Sequence: {stop.sequence})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">This fee will apply to students using this specific stop</p>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.feeType === "DISTANCE_BASED" && (
                    <Alert>
                      <Calculator className="h-4 w-4" />
                      <AlertDescription>
                        Distance-based fees are calculated automatically based on the distance from school to the student's stop.
                        The amount you specify will be the rate per kilometer.
                      </AlertDescription>
                    </Alert>
                  )}

                  {formData.feeType === "FLAT_RATE" && (
                    <Alert>
                      <DollarSign className="h-4 w-4" />
                      <AlertDescription>
                        Flat rate fees apply the same amount to all students using transportation, regardless of route or stop.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="validity" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Validity Period</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="applicableFrom" className="text-sm font-medium">Applicable From</Label>
                      <DatePicker
                        value={formData.applicableFrom}
                        onChange={(date) => handleInputChange("applicableFrom", date)}
                        placeholder="Select start date"
                      />
                      <p className="text-xs text-muted-foreground">When this fee structure becomes active</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicableUntil" className="text-sm font-medium">Applicable Until</Label>
                      <DatePicker
                        value={formData.applicableUntil}
                        onChange={(date) => handleInputChange("applicableUntil", date)}
                        placeholder="Select end date (optional)"
                      />
                      <p className="text-xs text-muted-foreground">Leave empty for unlimited validity</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Set validity dates to control when this fee structure is active. This helps with seasonal pricing or limited-time fee structures.
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
              {feeStructure ? "Update Fee Structure" : "Create Fee Structure"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeeStructureDetailsDialog({ 
  feeStructure, 
  isOpen, 
  onClose 
}: { 
  feeStructure: any; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!feeStructure) return null;

  const getValidityStatus = () => {
    const now = new Date();
    const from = new Date(feeStructure.applicableFrom);
    const until = feeStructure.applicableUntil ? new Date(feeStructure.applicableUntil) : null;

    if (now < from) return { color: "yellow", text: "Not Started" };
    if (until && now > until) return { color: "red", text: "Expired" };
    return { color: "green", text: "Active" };
  };

  const validity = getValidityStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {feeStructure.name}
          </DialogTitle>
          <DialogDescription>
            Fee structure details and assignment information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fee Structure Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Fee Type</Label>
                <p className="text-sm font-medium">
                  <Badge variant="outline">{feeStructure.feeType.replace('_', ' ')}</Badge>
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                <p className="text-lg font-bold text-green-600">
                  {formatIndianCurrency(feeStructure.amount)}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Badge variant={validity.color === "green" ? "default" : 
                                validity.color === "yellow" ? "outline" : "destructive"}>
                  {validity.text}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Assigned Students</Label>
                <p className="text-sm">{feeStructure.assignments?.length || 0} students</p>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feeStructure.route && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Assigned Route</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Route className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{feeStructure.route.name}</span>
                  </div>
                </div>
              )}

              {feeStructure.stop && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Assigned Stop</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{feeStructure.stop.name}</span>
                    <Badge variant="outline">Seq: {feeStructure.stop.sequence}</Badge>
                  </div>
                </div>
              )}

              {feeStructure.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{feeStructure.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validity Period */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Validity Period</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Valid From</Label>
                <p className="text-sm">{new Date(feeStructure.applicableFrom).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Valid Until</Label>
                <p className="text-sm">
                  {feeStructure.applicableUntil 
                    ? new Date(feeStructure.applicableUntil).toLocaleDateString()
                    : "No expiry"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransportationFeePageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState<any>(null);
  const [filterFeeType, setFilterFeeType] = useState<string>("all");

  const { data: feeStructures, isLoading, refetch } = api.transportation.getFeeStructures.useQuery(
    {
      branchId: currentBranchId || undefined,
      sessionId: currentSessionId || undefined,
      includeInactive: true,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const createFeeStructureMutation = api.transportation.createFeeStructure.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee structure created successfully",
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

  const updateFeeStructureMutation = api.transportation.updateFeeStructure.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee structure updated successfully",
      });
      setIsFormOpen(false);
      setSelectedFeeStructure(null);
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

  const deleteFeeStructureMutation = api.transportation.deleteFeeStructure.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fee structure deleted successfully",
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

  const handleAddFeeStructure = () => {
    setSelectedFeeStructure(null);
    setIsFormOpen(true);
  };

  const handleEditFeeStructure = (feeStructure: any) => {
    setSelectedFeeStructure(feeStructure);
    setIsFormOpen(true);
  };

  const handleViewFeeStructure = (feeStructure: any) => {
    setSelectedFeeStructure(feeStructure);
    setIsDetailsOpen(true);
  };

  const handleDeleteFeeStructure = (feeStructure: any) => {
    if (confirm(`Are you sure you want to delete fee structure "${feeStructure.name}"?`)) {
      deleteFeeStructureMutation.mutate({ id: feeStructure.id });
    }
  };

  const handleFormSubmit = (formData: FeeStructureFormData) => {
    const data = {
      ...formData,
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    };

    if (selectedFeeStructure) {
      updateFeeStructureMutation.mutate({ id: selectedFeeStructure.id, data });
    } else {
      createFeeStructureMutation.mutate(data);
    }
  };

  // Filter fee structures
  const filteredFeeStructures = feeStructures?.filter((fee) => {
    if (filterFeeType === "all") return true;
    return fee.feeType === filterFeeType;
  });

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Transportation Fees" subtitle="Manage transportation fee structures">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access fee management features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Transportation Fees"
      subtitle="Manage transportation fee structures"
      action={
        <Button onClick={handleAddFeeStructure} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Fee Structure
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Filter by Fee Type:</Label>
              <Select value={filterFeeType} onValueChange={setFilterFeeType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ROUTE_WISE">Route-wise</SelectItem>
                  <SelectItem value="STOP_WISE">Stop-wise</SelectItem>
                  <SelectItem value="DISTANCE_BASED">Distance-based</SelectItem>
                  <SelectItem value="FLAT_RATE">Flat Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {feeStructures && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Fee Structures</p>
                    <p className="text-2xl font-bold">{feeStructures.length}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Active Fees</p>
                    <p className="text-2xl font-bold">
                      {feeStructures.filter(f => f.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Assigned Students</p>
                    <p className="text-2xl font-bold">
                      {feeStructures.reduce((sum, fee) => sum + (fee.assignments?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Average Fee</p>
                    <p className="text-2xl font-bold">
                      {feeStructures.length > 0 
                        ? formatIndianCurrency(feeStructures.reduce((sum, fee) => sum + fee.amount, 0) / feeStructures.length)
                        : "₹0"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fee Structures Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Structures</CardTitle>
            <CardDescription>
              Manage transportation fee structures for routes and stops
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
            ) : filteredFeeStructures && filteredFeeStructures.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Structure</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeeStructures.map((fee) => {
                      const now = new Date();
                      const from = new Date(fee.applicableFrom);
                      const until = fee.applicableUntil ? new Date(fee.applicableUntil) : null;
                      
                      let status = "Active";
                      let statusVariant = "default";
                      if (now < from) {
                        status = "Not Started";
                        statusVariant = "outline";
                      } else if (until && now > until) {
                        status = "Expired";
                        statusVariant = "destructive";
                      }

                      return (
                        <TableRow key={fee.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              {fee.description && (
                                <p className="text-sm text-muted-foreground">{fee.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {fee.feeType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {fee.route && (
                              <div className="flex items-center gap-1">
                                <Route className="h-3 w-3" />
                                <span className="text-sm">{fee.route.name}</span>
                              </div>
                            )}
                            {fee.stop && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="text-sm">{fee.stop.name}</span>
                              </div>
                            )}
                            {fee.feeType === "FLAT_RATE" && (
                              <span className="text-sm text-muted-foreground">All students</span>
                            )}
                            {fee.feeType === "DISTANCE_BASED" && (
                              <span className="text-sm text-muted-foreground">Per km</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatIndianCurrency(fee.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {fee.assignments?.length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant as any}>
                              {status}
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
                                <DropdownMenuItem onClick={() => handleViewFeeStructure(fee)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditFeeStructure(fee)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Fee Structure
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteFeeStructure(fee)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Fee Structure
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No fee structures found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {filterFeeType !== "all" 
                    ? "No fee structures match your current filter" 
                    : "Create your first transportation fee structure to get started"}
                </p>
                <Button onClick={handleAddFeeStructure}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Fee Structure
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forms and Dialogs */}
      <FeeStructureForm
        feeStructure={selectedFeeStructure}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedFeeStructure(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <FeeStructureDetailsDialog
        feeStructure={selectedFeeStructure}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedFeeStructure(null);
        }}
      />
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicTransportationFeePageContent = dynamic(() => Promise.resolve(TransportationFeePageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function TransportationFeePage() {
  return <DynamicTransportationFeePageContent />;
} 