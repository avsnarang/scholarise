"use client";

import React, { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Bus,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Search,
  Filter,
  Fuel,
  Wrench,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Route,
  Users,
  Activity,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatIndianCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface BusFormData {
  busNumber: string;
  registrationNo?: string;
  capacity: number;
  purchaseDate?: Date;
  model?: string;
  fuelType: "Diesel" | "Petrol" | "CNG" | "Electric";
  
  // Insurance Details
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  pollutionCert?: string;
  pollutionExpiry?: Date;
  fitnessExpiry?: Date;
  
  // Financial Details
  loanAmount?: number;
  loanEmi?: number;
  loanStartDate?: Date;
  loanFulfillmentDate?: Date;
  loanProvider?: string;
  
  // Tax Details
  lastTaxSubmissionDate?: Date;
  nextTaxDueDate?: Date;
  taxType?: string;
  taxAmount?: number;
  taxSubmissionFrequency?: "Monthly" | "Quarterly" | "Yearly";
  
  // Permit Details
  permitType?: string;
  permitNumber?: string;
  permitIssueDate?: Date;
  permitExpiryDate?: Date;
  permitIssuedBy?: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function BusForm({ 
  bus, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  bus?: any; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: BusFormData) => void; 
}) {
  const [formData, setFormData] = useState<BusFormData>({
    busNumber: bus?.busNumber || "",
    registrationNo: bus?.registrationNo || "",
    capacity: bus?.capacity || 50,
    purchaseDate: bus?.purchaseDate ? new Date(bus.purchaseDate) : undefined,
    model: bus?.model || "",
    fuelType: bus?.fuelType || "Diesel",
    
    // Insurance Details
    insuranceNumber: bus?.insuranceNumber || "",
    insuranceExpiry: bus?.insuranceExpiry ? new Date(bus.insuranceExpiry) : undefined,
    pollutionCert: bus?.pollutionCert || "",
    pollutionExpiry: bus?.pollutionExpiry ? new Date(bus.pollutionExpiry) : undefined,
    fitnessExpiry: bus?.fitnessExpiry ? new Date(bus.fitnessExpiry) : undefined,
    
    // Financial Details
    loanAmount: bus?.loanAmount || undefined,
    loanEmi: bus?.loanEmi || undefined,
    loanStartDate: bus?.loanStartDate ? new Date(bus.loanStartDate) : undefined,
    loanFulfillmentDate: bus?.loanFulfillmentDate ? new Date(bus.loanFulfillmentDate) : undefined,
    loanProvider: bus?.loanProvider || "",
    
    // Tax Details
    lastTaxSubmissionDate: bus?.lastTaxSubmissionDate ? new Date(bus.lastTaxSubmissionDate) : undefined,
    nextTaxDueDate: bus?.nextTaxDueDate ? new Date(bus.nextTaxDueDate) : undefined,
    taxType: bus?.taxType || "",
    taxAmount: bus?.taxAmount || undefined,
    taxSubmissionFrequency: bus?.taxSubmissionFrequency || undefined,
    
    // Permit Details
    permitType: bus?.permitType || "",
    permitNumber: bus?.permitNumber || "",
    permitIssueDate: bus?.permitIssueDate ? new Date(bus.permitIssueDate) : undefined,
    permitExpiryDate: bus?.permitExpiryDate ? new Date(bus.permitExpiryDate) : undefined,
    permitIssuedBy: bus?.permitIssuedBy || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof BusFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">{bus ? "Edit Bus" : "Add New Bus"}</DialogTitle>
          <DialogDescription>
            {bus ? "Update bus information and details" : "Add a new bus to the transportation fleet"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" className="cursor-pointer">Basic</TabsTrigger>
              <TabsTrigger value="documents" className="cursor-pointer">Documents</TabsTrigger>
              <TabsTrigger value="financial" className="cursor-pointer">Financial</TabsTrigger>
              <TabsTrigger value="tax" className="cursor-pointer">Tax</TabsTrigger>
              <TabsTrigger value="permits" className="cursor-pointer">Permits</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="busNumber" className="text-sm font-medium">Bus Number *</Label>
                  <Input
                    id="busNumber"
                    value={formData.busNumber}
                    onChange={(e) => handleInputChange("busNumber", e.target.value)}
                    placeholder="e.g., BUS001"
                    className="cursor-text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNo" className="text-sm font-medium">Registration Number</Label>
                  <Input
                    id="registrationNo"
                    value={formData.registrationNo}
                    onChange={(e) => handleInputChange("registrationNo", e.target.value)}
                    placeholder="e.g., TN01AB1234"
                    className="cursor-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-sm font-medium">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleInputChange("capacity", parseInt(e.target.value) || 0)}
                    min="1"
                    placeholder="e.g., 50"
                    className="cursor-text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuelType" className="text-sm font-medium">Fuel Type</Label>
                  <Select value={formData.fuelType} onValueChange={(value) => handleInputChange("fuelType", value)}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diesel" className="cursor-pointer">Diesel</SelectItem>
                      <SelectItem value="Petrol" className="cursor-pointer">Petrol</SelectItem>
                      <SelectItem value="CNG" className="cursor-pointer">CNG</SelectItem>
                      <SelectItem value="Electric" className="cursor-pointer">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-sm font-medium">Bus Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    placeholder="e.g., Tata Starbus"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate" className="text-sm font-medium">Purchase Date</Label>
                  <DatePicker
                    value={formData.purchaseDate}
                    onChange={(date) => handleInputChange("purchaseDate", date)}
                    placeholder="Select purchase date"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Insurance Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="insuranceNumber" className="text-sm font-medium">Insurance Number</Label>
                      <Input
                        id="insuranceNumber"
                        value={formData.insuranceNumber}
                        onChange={(e) => handleInputChange("insuranceNumber", e.target.value)}
                        placeholder="Insurance policy number"
                        className="cursor-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insuranceExpiry" className="text-sm font-medium">Insurance Expiry</Label>
                      <DatePicker
                        value={formData.insuranceExpiry}
                        onChange={(date) => handleInputChange("insuranceExpiry", date)}
                        placeholder="Select expiry date"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Certificates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="pollutionCert" className="text-sm font-medium">Pollution Certificate</Label>
                      <Input
                        id="pollutionCert"
                        value={formData.pollutionCert}
                        onChange={(e) => handleInputChange("pollutionCert", e.target.value)}
                        placeholder="Certificate number"
                        className="cursor-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pollutionExpiry" className="text-sm font-medium">Pollution Expiry</Label>
                      <DatePicker
                        value={formData.pollutionExpiry}
                        onChange={(date) => handleInputChange("pollutionExpiry", date)}
                        placeholder="Select expiry date"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="fitnessExpiry" className="text-sm font-medium">Fitness Certificate Expiry</Label>
                      <DatePicker
                        value={formData.fitnessExpiry}
                        onChange={(date) => handleInputChange("fitnessExpiry", date)}
                        placeholder="Select expiry date"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6 mt-6">
              <div>
                <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Loan Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="loanAmount" className="text-sm font-medium">Loan Amount</Label>
                    <Input
                      id="loanAmount"
                      type="number"
                      value={formData.loanAmount || ""}
                      onChange={(e) => handleInputChange("loanAmount", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      className="cursor-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loanEmi" className="text-sm font-medium">Monthly EMI</Label>
                    <Input
                      id="loanEmi"
                      type="number"
                      value={formData.loanEmi || ""}
                      onChange={(e) => handleInputChange("loanEmi", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      className="cursor-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanStartDate" className="text-sm font-medium">Loan Start Date</Label>
                    <DatePicker
                      value={formData.loanStartDate}
                      onChange={(date) => handleInputChange("loanStartDate", date)}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loanFulfillmentDate" className="text-sm font-medium">Loan Fulfillment Date</Label>
                    <DatePicker
                      value={formData.loanFulfillmentDate}
                      onChange={(date) => handleInputChange("loanFulfillmentDate", date)}
                      placeholder="Select fulfillment date"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanProvider" className="text-sm font-medium">Loan Provider</Label>
                    <Input
                      id="loanProvider"
                      value={formData.loanProvider}
                      onChange={(e) => handleInputChange("loanProvider", e.target.value)}
                      placeholder="Bank or financial institution"
                      className="cursor-text"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tax" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="taxType" className="text-sm font-medium">Tax Type</Label>
                  <Input
                    id="taxType"
                    value={formData.taxType}
                    onChange={(e) => handleInputChange("taxType", e.target.value)}
                    placeholder="e.g., Road Tax"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxAmount" className="text-sm font-medium">Tax Amount</Label>
                  <Input
                    id="taxAmount"
                    type="number"
                    value={formData.taxAmount || ""}
                    onChange={(e) => handleInputChange("taxAmount", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.00"
                    className="cursor-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lastTaxSubmissionDate" className="text-sm font-medium">Last Tax Submission</Label>
                  <DatePicker
                    value={formData.lastTaxSubmissionDate}
                    onChange={(date) => handleInputChange("lastTaxSubmissionDate", date)}
                    placeholder="Select submission date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextTaxDueDate" className="text-sm font-medium">Next Tax Due Date</Label>
                  <DatePicker
                    value={formData.nextTaxDueDate}
                    onChange={(date) => handleInputChange("nextTaxDueDate", date)}
                    placeholder="Select due date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxSubmissionFrequency" className="text-sm font-medium">Submission Frequency</Label>
                <Select value={formData.taxSubmissionFrequency} onValueChange={(value) => handleInputChange("taxSubmissionFrequency", value)}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly" className="cursor-pointer">Monthly</SelectItem>
                    <SelectItem value="Quarterly" className="cursor-pointer">Quarterly</SelectItem>
                    <SelectItem value="Yearly" className="cursor-pointer">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="permits" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="permitType" className="text-sm font-medium">Permit Type</Label>
                  <Input
                    id="permitType"
                    value={formData.permitType}
                    onChange={(e) => handleInputChange("permitType", e.target.value)}
                    placeholder="e.g., Contract Carriage"
                    className="cursor-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permitNumber" className="text-sm font-medium">Permit Number</Label>
                  <Input
                    id="permitNumber"
                    value={formData.permitNumber}
                    onChange={(e) => handleInputChange("permitNumber", e.target.value)}
                    placeholder="Permit number"
                    className="cursor-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="permitIssueDate" className="text-sm font-medium">Issue Date</Label>
                  <DatePicker
                    value={formData.permitIssueDate}
                    onChange={(date) => handleInputChange("permitIssueDate", date)}
                    placeholder="Select issue date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permitExpiryDate" className="text-sm font-medium">Expiry Date</Label>
                  <DatePicker
                    value={formData.permitExpiryDate}
                    onChange={(date) => handleInputChange("permitExpiryDate", date)}
                    placeholder="Select expiry date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="permitIssuedBy" className="text-sm font-medium">Issued By</Label>
                <Input
                  id="permitIssuedBy"
                  value={formData.permitIssuedBy}
                  onChange={(e) => handleInputChange("permitIssuedBy", e.target.value)}
                  placeholder="Issuing authority"
                  className="cursor-text"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">
              {bus ? "Update Bus" : "Add Bus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BusDetailsDialog({ 
  bus, 
  isOpen, 
  onClose 
}: { 
  bus: any; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!bus) return null;

  const getDaysUntilExpiry = (date: string | Date | null) => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (days: number | null) => {
    if (days === null) return { color: "gray", text: "Not set" };
    if (days < 0) return { color: "red", text: "Expired" };
    if (days <= 30) return { color: "yellow", text: "Expiring soon" };
    return { color: "green", text: "Valid" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            {bus.busNumber} - Bus Details
          </DialogTitle>
          <DialogDescription>
            Complete information and status for {bus.busNumber}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Bus Number</Label>
                  <p className="text-sm font-medium">{bus.busNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Registration Number</Label>
                  <p className="text-sm">{bus.registrationNo || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Capacity</Label>
                  <p className="text-sm">{bus.capacity} passengers</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fuel Type</Label>
                  <Badge variant="outline">{bus.fuelType}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                  <p className="text-sm">{bus.model || "Not specified"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={bus.isActive ? "default" : "secondary"}>
                    {bus.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Staff Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staff Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Driver
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm">{bus.driverName || "Not assigned"}</p>
                      {bus.driverPhone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {bus.driverPhone}
                        </p>
                      )}
                      {bus.driverLicense && (
                        <p className="text-sm text-muted-foreground">License: {bus.driverLicense}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Conductor
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm">{bus.conductorName || "Not assigned"}</p>
                      {bus.conductorPhone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {bus.conductorPhone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Insurance", number: bus.insuranceNumber, expiry: bus.insuranceExpiry },
                  { label: "Pollution Certificate", number: bus.pollutionCert, expiry: bus.pollutionExpiry },
                  { label: "Fitness Certificate", number: "-", expiry: bus.fitnessExpiry },
                ].map((doc, index) => {
                  const daysUntilExpiry = getDaysUntilExpiry(doc.expiry);
                  const status = getExpiryStatus(daysUntilExpiry);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{doc.label}</p>
                        {doc.number && doc.number !== "-" && (
                          <p className="text-sm text-muted-foreground">{doc.number}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={status.color === "green" ? "default" : 
                                  status.color === "yellow" ? "outline" : "destructive"}
                        >
                          {status.text}
                        </Badge>
                        {doc.expiry && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(doc.expiry).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Assigned Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bus.routes && bus.routes.length > 0 ? (
                  <div className="space-y-3">
                    {bus.routes.map((busRoute: any) => (
                      <div key={busRoute.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{busRoute.route.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {busRoute.route.stops?.length || 0} stops
                          </p>
                        </div>
                        <Badge variant={busRoute.isActive ? "default" : "secondary"}>
                          {busRoute.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No routes assigned to this bus</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fuel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Recent Fuel Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bus.fuelLogs && bus.fuelLogs.length > 0 ? (
                  <div className="space-y-3">
                    {bus.fuelLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{log.fuelQuantity}L</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.fuelDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatIndianCurrency(log.totalAmount)}</p>
                          <p className="text-sm text-muted-foreground">₹{log.pricePerLiter}/L</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fuel logs recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bus.maintenanceLogs && bus.maintenanceLogs.length > 0 ? (
                  <div className="space-y-3">
                    {bus.maintenanceLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{log.maintenanceType}</p>
                          <p className="text-sm text-muted-foreground">{log.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.maintenanceDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {log.cost && (
                            <p className="font-medium">{formatIndianCurrency(log.cost)}</p>
                          )}
                          {log.nextServiceDue && (
                            <p className="text-sm text-muted-foreground">
                              Next: {new Date(log.nextServiceDue).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No maintenance records found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function BusManagementPage() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: buses, isLoading, refetch } = api.transportation.getBuses.useQuery(
    {
      branchId: currentBranchId || undefined,
      includeInactive: true,
    },
    {
      enabled: !!currentBranchId,
    }
  );

  const createBusMutation = api.transportation.createBus.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bus added successfully",
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

  const updateBusMutation = api.transportation.updateBus.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bus updated successfully",
      });
      setIsFormOpen(false);
      setSelectedBus(null);
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

  const deleteBusMutation = api.transportation.deleteBus.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bus deleted successfully",
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

  const handleAddBus = () => {
    setSelectedBus(null);
    setIsFormOpen(true);
  };

  const handleEditBus = (bus: any) => {
    setSelectedBus(bus);
    setIsFormOpen(true);
  };

  const handleViewBus = (bus: any) => {
    setSelectedBus(bus);
    setIsDetailsOpen(true);
  };

  const handleDeleteBus = (bus: any) => {
    if (confirm(`Are you sure you want to delete bus ${bus.busNumber}?`)) {
      deleteBusMutation.mutate({ id: bus.id });
    }
  };

  const handleFormSubmit = (formData: BusFormData) => {
    const data = {
      ...formData,
      branchId: currentBranchId!,
    };

    if (selectedBus) {
      updateBusMutation.mutate({ id: selectedBus.id, data });
    } else {
      createBusMutation.mutate(data);
    }
  };

  // Filter buses based on search term and status
  const filteredBuses = buses?.filter((bus) => {
    const matchesSearch = bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         // bus.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bus.registrationNo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && bus.isActive) ||
                         (filterStatus === "inactive" && !bus.isActive);

    return matchesSearch && matchesStatus;
  });

  if (!currentBranchId) {
    return (
      <PageWrapper title="Bus Management" subtitle="Manage your transportation fleet">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch to access bus management features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Bus Management"
      subtitle="Manage your transportation fleet"
      action={
        <Button onClick={handleAddBus} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Bus
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buses by number or registration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Cards */}
        {buses && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Buses</p>
                    <p className="text-2xl font-bold">{buses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Buses</p>
                    <p className="text-2xl font-bold">{buses.filter(b => b.isActive).length}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Total Capacity</p>
                    <p className="text-2xl font-bold">
                      {buses.reduce((sum, bus) => sum + bus.capacity, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Routes Assigned</p>
                    <p className="text-2xl font-bold">
                      {buses.reduce((sum, bus) => sum + (bus.routes?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bus List */}
        <Card>
          <CardHeader>
            <CardTitle>Bus Fleet</CardTitle>
            <CardDescription>
              Manage your school transportation buses and their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton />
            ) : filteredBuses && filteredBuses.length > 0 ? (
              <div className="space-y-4">
                {filteredBuses.map((bus) => (
                  <div key={bus.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{bus.busNumber}</h3>
                          <Badge variant={bus.isActive ? "default" : "secondary"}>
                            {bus.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Capacity: {bus.capacity}</span>
                          {bus.registrationNo && <span>Reg: {bus.registrationNo}</span>}
                          <span>{bus.fuelType}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewBus(bus)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewBus(bus)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditBus(bus)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Bus
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteBus(bus)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Bus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Bus className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterStatus !== "all" 
                      ? "No buses match your search criteria." 
                      : "No buses added yet."}
                  </p>
                  {!searchTerm && filterStatus === "all" && (
                    <Button variant="outline" onClick={handleAddBus}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Bus
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forms and Dialogs */}
      <BusForm
        bus={selectedBus}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedBus(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <BusDetailsDialog
        bus={selectedBus}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedBus(null);
        }}
      />
    </PageWrapper>
  );
} 