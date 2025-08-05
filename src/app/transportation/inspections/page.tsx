"use client";

import React, { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Camera,
  Download,
  Filter,
  Search,
  Star,
  Shield,
  Wrench,
  Car,
  Zap,
  Home,
  ExternalLink,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useToast } from "@/components/ui/use-toast";

interface InspectionFormData {
  busId: string;
  inspectionType: "Regular" | "Pre-Trip" | "Post-Trip" | "Quarterly" | "Annual";
  inspectorName: string;
  inspectorEmployeeId?: string;
  odometerReading?: number;
  fuelLevel?: number;
  notes?: string;
  recommendations?: string;
  nextInspectionDue?: Date;
}

interface InspectionItemData {
  id: string;
  itemName: string;
  category: string;
  description?: string;
  isChecked: boolean;
  hasProblem: boolean;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  problemDescription?: string;
  recommendations?: string;
  isRequired: boolean;
}

const categoryIcons = {
  SAFETY: Shield,
  MECHANICAL: Wrench,
  ELECTRICAL: Zap,
  INTERIOR: Home,
  EXTERIOR: Car,
  DOCUMENTATION: BookOpen,
};

const categoryColors = {
  SAFETY: "bg-red-500/10 text-red-600 border-red-200",
  MECHANICAL: "bg-blue-500/10 text-blue-600 border-blue-200",
  ELECTRICAL: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  INTERIOR: "bg-green-500/10 text-green-600 border-green-200",
  EXTERIOR: "bg-purple-500/10 text-purple-600 border-purple-200",
  DOCUMENTATION: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const severityColors = {
  LOW: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

function InspectionForm({ 
  isOpen, 
  onClose, 
  onSubmit,
  inspection
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: InspectionFormData) => void;
  inspection?: any;
}) {
  const { currentBranchId } = useBranchContext();
  const [formData, setFormData] = useState<InspectionFormData>({
    busId: "",
    inspectionType: "Regular",
    inspectorName: "",
  });

  const { data: buses } = api.transportation.getBuses.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  useEffect(() => {
    if (inspection) {
      setFormData({
        busId: inspection.busId,
        inspectionType: inspection.inspectionType,
        inspectorName: inspection.inspectorName,
        inspectorEmployeeId: inspection.inspectorEmployeeId || undefined,
        odometerReading: inspection.odometerReading || undefined,
        fuelLevel: inspection.fuelLevel || undefined,
        notes: inspection.notes || undefined,
        recommendations: inspection.recommendations || undefined,
        nextInspectionDue: inspection.nextInspectionDue ? new Date(inspection.nextInspectionDue) : undefined,
      });
    } else {
      setFormData({
        busId: "",
        inspectionType: "Regular",
        inspectorName: "",
      });
    }
  }, [inspection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            {inspection ? "Edit Inspection" : "New Bus Inspection"}
          </DialogTitle>
          <DialogDescription>
            {inspection ? "Update inspection details" : "Create a new bus inspection with automated checklist items"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {bus.busNumber} - {bus.registrationNo || 'No registration'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspectionType">Inspection Type *</Label>
              <Select 
                value={formData.inspectionType} 
                onValueChange={(value: any) => setFormData({...formData, inspectionType: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular Inspection</SelectItem>
                  <SelectItem value="Pre-Trip">Pre-Trip Check</SelectItem>
                  <SelectItem value="Post-Trip">Post-Trip Check</SelectItem>
                  <SelectItem value="Quarterly">Quarterly Inspection</SelectItem>
                  <SelectItem value="Annual">Annual Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspectorName">Inspector Name *</Label>
              <Input
                id="inspectorName"
                value={formData.inspectorName}
                onChange={(e) => setFormData({...formData, inspectorName: e.target.value})}
                placeholder="Enter inspector name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspectorEmployeeId">Employee ID</Label>
              <Input
                id="inspectorEmployeeId"
                value={formData.inspectorEmployeeId || ""}
                onChange={(e) => setFormData({...formData, inspectorEmployeeId: e.target.value || undefined})}
                placeholder="Optional employee ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="odometerReading">Odometer Reading (km)</Label>
              <Input
                id="odometerReading"
                type="number"
                min="0"
                value={formData.odometerReading || ""}
                onChange={(e) => setFormData({...formData, odometerReading: Number(e.target.value) || undefined})}
                placeholder="Current km reading"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelLevel">Fuel Level (%)</Label>
              <Input
                id="fuelLevel"
                type="number"
                min="0"
                max="100"
                value={formData.fuelLevel || ""}
                onChange={(e) => setFormData({...formData, fuelLevel: Number(e.target.value) || undefined})}
                placeholder="Fuel level percentage"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextInspectionDue">Next Inspection Due</Label>
            <DatePicker
              value={formData.nextInspectionDue}
              onChange={(date) => setFormData({...formData, nextInspectionDue: date!})}
              placeholder="Select next inspection date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({...formData, notes: e.target.value || undefined})}
              placeholder="Any specific notes about this inspection"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations">Recommendations</Label>
            <Textarea
              id="recommendations"
              value={formData.recommendations || ""}
              onChange={(e) => setFormData({...formData, recommendations: e.target.value || undefined})}
              placeholder="Maintenance or action recommendations"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <ClipboardList className="h-4 w-4 mr-2" />
              {inspection ? "Update Inspection" : "Create Inspection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InspectionChecklistDialog({
  inspection,
  isOpen,
  onClose,
  onSave,
}: {
  inspection: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (inspectionId: string, items: InspectionItemData[]) => void;
}) {
  const [items, setItems] = useState<InspectionItemData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    if (inspection?.items) {
      setItems(inspection.items.map((item: any) => ({
        id: item.id,
        itemName: item.itemName,
        category: item.category,
        description: item.description,
        isChecked: item.isChecked,
        hasProblem: item.hasProblem,
        severity: item.severity,
        problemDescription: item.problemDescription,
        recommendations: item.recommendations,
        isRequired: item.isRequired,
      })));
    }
  }, [inspection]);

  const updateItem = (itemId: string, updates: Partial<InspectionItemData>) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  const filteredItems = items.filter((item: InspectionItemData) => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    const categoryArray = acc[category];
    if (categoryArray) {
      categoryArray.push(item);
    }
    return acc;
  }, {} as Record<string, InspectionItemData[]>);

  const handleSave = () => {
    onSave(inspection.id, items);
  };

  const totalItems = items.length;
  const checkedItems = items.filter(item => item.isChecked).length;
  const problemItems = items.filter(item => item.hasProblem).length;
  const criticalIssues = items.filter(item => item.hasProblem && item.severity === "CRITICAL").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            Inspection Checklist - {inspection?.bus?.busNumber}
          </DialogTitle>
          <DialogDescription>
            Complete the inspection checklist for {inspection?.inspectionType} inspection
          </DialogDescription>
        </DialogHeader>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-lg font-bold">{checkedItems}/{totalItems}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <Progress value={(checkedItems / totalItems) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Issues Found</p>
                  <p className="text-lg font-bold text-orange-600">{problemItems}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Issues</p>
                  <p className="text-lg font-bold text-red-600">{criticalIssues}</p>
                </div>
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-bold">
                    {checkedItems === totalItems ? "Complete" : "In Progress"}
                  </p>
                </div>
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search checklist items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="SAFETY">Safety</SelectItem>
              <SelectItem value="MECHANICAL">Mechanical</SelectItem>
              <SelectItem value="ELECTRICAL">Electrical</SelectItem>
              <SelectItem value="INTERIOR">Interior</SelectItem>
              <SelectItem value="EXTERIOR">Exterior</SelectItem>
              <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Checklist Items */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
            
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <IconComponent className="h-5 w-5" />
                    {category.replace('_', ' ')} ({categoryItems.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              checked={item.isChecked}
                              onCheckedChange={(checked) => 
                                updateItem(item.id, { isChecked: !!checked })
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium">{item.itemName}</h4>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.isRequired && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${categoryColors[item.category as keyof typeof categoryColors]}`}
                            >
                              {item.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Problem Section */}
                        <div className="border-t pt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              checked={item.hasProblem}
                              onCheckedChange={(checked) => 
                                updateItem(item.id, { 
                                  hasProblem: !!checked,
                                  ...(!!!checked && { 
                                    severity: undefined, 
                                    problemDescription: undefined, 
                                    recommendations: undefined 
                                  })
                                })
                              }
                            />
                            <Label className="text-sm font-medium text-orange-600">
                              Report Problem/Issue
                            </Label>
                          </div>

                          {item.hasProblem && (
                            <div className="space-y-3 ml-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Severity Level</Label>
                                  <Select 
                                    value={item.severity || ""} 
                                    onValueChange={(value: any) => 
                                      updateItem(item.id, { severity: value })
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select severity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="LOW">Low</SelectItem>
                                      <SelectItem value="MEDIUM">Medium</SelectItem>
                                      <SelectItem value="HIGH">High</SelectItem>
                                      <SelectItem value="CRITICAL">Critical</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {item.severity && (
                                  <div className="flex items-center">
                                    <Badge 
                                      variant="outline" 
                                      className={`${severityColors[item.severity]} text-xs`}
                                    >
                                      {item.severity} SEVERITY
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              <div>
                                <Label className="text-xs">Problem Description</Label>
                                <Textarea
                                  value={item.problemDescription || ""}
                                  onChange={(e) => 
                                    updateItem(item.id, { problemDescription: e.target.value })
                                  }
                                  placeholder="Describe the problem or issue found"
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Recommendations</Label>
                                <Textarea
                                  value={item.recommendations || ""}
                                  onChange={(e) => 
                                    updateItem(item.id, { recommendations: e.target.value })
                                  }
                                  placeholder="Recommended actions or repairs"
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InspectionAnalytics() {
  const { currentBranchId } = useBranchContext();

  const { data: analytics, isLoading } = api.transportation.getInspectionAnalytics.useQuery(
    {
      branchId: currentBranchId!,
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: new Date(),
    },
    { enabled: !!currentBranchId }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Inspections</p>
                <p className="text-2xl font-bold">{analytics?.totalInspections || 0}</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
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
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{analytics?.completedInspections || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics?.totalInspections ? 
                    Math.round((analytics.completedInspections / analytics.totalInspections) * 100) : 0}% completion rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">With Issues</p>
                <p className="text-2xl font-bold">{analytics?.inspectionsWithIssues || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Avg {analytics?.averageIssuesPerInspection?.toFixed(1) || 0} issues per inspection
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold">{analytics?.inspectionsWithCriticalIssues || 0}</p>
                <p className="text-xs text-muted-foreground">Require immediate attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inspection Status Distribution</CardTitle>
            <CardDescription>Current status of all inspections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.inspectionsByStatus && Object.entries(analytics.inspectionsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'COMPLETED' ? 'bg-green-500' :
                      status === 'IN_PROGRESS' ? 'bg-blue-500' :
                      status === 'FAILED' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium">{status.replace('_', ' ')}</span>
                  </div>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Ratings</CardTitle>
            <CardDescription>Overall inspection ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.inspectionsByRating && Object.entries(analytics.inspectionsByRating).map(([rating, count]) => (
                <div key={rating} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${
                      rating === 'Excellent' ? 'text-green-500 fill-green-500' :
                      rating === 'Good' ? 'text-blue-500 fill-blue-500' :
                      rating === 'Fair' ? 'text-yellow-500 fill-yellow-500' :
                      rating === 'Poor' ? 'text-orange-500 fill-orange-500' :
                      'text-red-500 fill-red-500'
                    }`} />
                    <span className="text-sm font-medium">{rating}</span>
                  </div>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BusInspectionsPageContent() {
  const { currentBranchId } = useBranchContext();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: inspections, isLoading, refetch } = api.transportation.getInspections.useQuery(
    {
      branchId: currentBranchId || undefined,
    },
    { enabled: !!currentBranchId }
  );

  const createInspectionMutation = api.transportation.createInspection.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inspection created successfully",
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

  const updateInspectionMutation = api.transportation.updateInspection.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inspection updated successfully",
      });
      setIsFormOpen(false);
      setSelectedInspection(null);
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

  const bulkUpdateItemsMutation = api.transportation.bulkUpdateInspectionItems.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Checklist updated successfully",
      });
      setIsChecklistOpen(false);
      setSelectedInspection(null);
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

  const handleCreateInspection = (data: InspectionFormData) => {
    createInspectionMutation.mutate({
      ...data,
      branchId: currentBranchId!,
    });
  };

  const handleUpdateInspection = (data: InspectionFormData) => {
    if (selectedInspection) {
      updateInspectionMutation.mutate({
        id: selectedInspection.id,
        data,
      });
    }
  };

  const handleSaveChecklist = (inspectionId: string, items: InspectionItemData[]) => {
    const updateData = items.map(item => ({
      id: item.id,
      data: {
        isChecked: item.isChecked,
        hasProblem: item.hasProblem,
        severity: item.severity,
        problemDescription: item.problemDescription,
        recommendations: item.recommendations,
      },
    }));

    bulkUpdateItemsMutation.mutate({
      inspectionId,
      items: updateData,
    });
  };

  const filteredInspections = inspections?.filter((inspection: any) => {
    const matchesSearch = inspection.bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.inspectorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || inspection.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  if (!currentBranchId) {
    return (
      <PageWrapper title="Bus Inspections" subtitle="Manage bus safety and maintenance inspections">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch to access inspection management features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Bus Inspections"
      subtitle="Manage bus safety and maintenance inspections"
      action={
        <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Inspection
        </Button>
      }
    >
      <div className="space-y-6">
        <Tabs defaultValue="inspections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Inspections
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by bus number or inspector..."
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
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Inspections List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Inspections</CardTitle>
                <CardDescription>
                  Manage bus inspections and safety checklists
                </CardDescription>
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
                ) : filteredInspections.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bus</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Inspector</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInspections.map((inspection: any) => {
                        const progress = inspection.items?.length > 0 
                          ? (inspection.items.filter((item: any) => item.isChecked).length / inspection.items.length) * 100
                          : 0;

                        return (
                          <TableRow key={inspection.id}>
                            <TableCell className="font-medium">{inspection.bus.busNumber}</TableCell>
                            <TableCell>{inspection.inspectionType}</TableCell>
                            <TableCell>{inspection.inspectorName}</TableCell>
                            <TableCell>{new Date(inspection.inspectionDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  inspection.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" :
                                  inspection.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  inspection.status === "FAILED" ? "bg-red-50 text-red-700 border-red-200" :
                                  "bg-gray-50 text-gray-700 border-gray-200"
                                }
                              >
                                {inspection.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {inspection.totalIssues > 0 && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                    {inspection.totalIssues} issues
                                  </Badge>
                                )}
                                {inspection.criticalIssues > 0 && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    {inspection.criticalIssues} critical
                                  </Badge>
                                )}
                                {inspection.totalIssues === 0 && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    No issues
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={progress} className="w-16" />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedInspection(inspection);
                                      setIsChecklistOpen(true);
                                    }}
                                  >
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    Open Checklist
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedInspection(inspection);
                                      setIsFormOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Report
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No inspections found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Create your first bus inspection to get started
                    </p>
                    <Button onClick={() => setIsFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Inspection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <InspectionAnalytics />
          </TabsContent>
        </Tabs>
      </div>

      {/* Forms and Dialogs */}
      <InspectionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedInspection(null);
        }}
        onSubmit={selectedInspection ? handleUpdateInspection : handleCreateInspection}
        inspection={selectedInspection}
      />

      <InspectionChecklistDialog
        inspection={selectedInspection}
        isOpen={isChecklistOpen}
        onClose={() => {
          setIsChecklistOpen(false);
          setSelectedInspection(null);
        }}
        onSave={handleSaveChecklist}
      />
    </PageWrapper>
  );
}

// Dynamically import to disable SSR completely
const DynamicBusInspectionsPageContent = dynamic(() => Promise.resolve(BusInspectionsPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading bus inspections...</div>
});

export default function BusInspectionsPage() {
  return <DynamicBusInspectionsPageContent />;
} 