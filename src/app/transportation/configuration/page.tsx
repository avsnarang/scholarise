"use client";

import React, { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  DollarSign,
  Calculator,
  Fuel,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Bus,
  Clock,
  Navigation,
  Save,
  RotateCcw,
  Info,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

interface ConfigurationData {
  feeCalculationMethod: "ROUTE_WISE" | "STOP_WISE" | "DISTANCE_BASED" | "FLAT_RATE";
  allowStopWiseFees: boolean;
  allowRouteWiseFees: boolean;
  defaultFuelType: string;
  autoCalculateDistances: boolean;
  requireDriverDetails: boolean;
  requireConductorDetails: boolean;
  enableFuelTracking: boolean;
  enableMaintenanceTracking: boolean;
  maxCapacityPerBus: number;
  fuelAlertThreshold: number;
  maintenanceAlertDays: number;
}

export default function TransportationConfigurationPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<ConfigurationData>({
    feeCalculationMethod: "ROUTE_WISE",
    allowStopWiseFees: true,
    allowRouteWiseFees: true,
    defaultFuelType: "Diesel",
    autoCalculateDistances: true,
    requireDriverDetails: true,
    requireConductorDetails: false,
    enableFuelTracking: true,
    enableMaintenanceTracking: true,
    maxCapacityPerBus: 50,
    fuelAlertThreshold: 10.0,
    maintenanceAlertDays: 30,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<ConfigurationData | null>(null);

  const { data: currentConfig, isLoading } = api.transportation.getConfiguration.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const updateConfigMutation = api.transportation.updateConfiguration.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });
      setHasChanges(false);
      setOriginalConfig(config);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load configuration when data is available
  useEffect(() => {
    if (currentConfig) {
      const configData: ConfigurationData = {
        feeCalculationMethod: currentConfig.feeCalculationMethod || "ROUTE_WISE",
        allowStopWiseFees: currentConfig.allowStopWiseFees ?? true,
        allowRouteWiseFees: currentConfig.allowRouteWiseFees ?? true,
        defaultFuelType: currentConfig.defaultFuelType || "Diesel",
        autoCalculateDistances: currentConfig.autoCalculateDistances ?? true,
        requireDriverDetails: currentConfig.requireDriverDetails ?? true,
        requireConductorDetails: currentConfig.requireConductorDetails ?? false,
        enableFuelTracking: currentConfig.enableFuelTracking ?? true,
        enableMaintenanceTracking: currentConfig.enableMaintenanceTracking ?? true,
        maxCapacityPerBus: currentConfig.maxCapacityPerBus || 50,
        fuelAlertThreshold: currentConfig.fuelAlertThreshold || 10.0,
        maintenanceAlertDays: currentConfig.maintenanceAlertDays || 30,
      };
      setConfig(configData);
      setOriginalConfig(configData);
    }
  }, [currentConfig]);

  // Check for changes
  useEffect(() => {
    if (originalConfig) {
      const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
      setHasChanges(changed);
    }
  }, [config, originalConfig]);

  const handleConfigChange = (field: keyof ConfigurationData, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateConfigMutation.mutate({
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
      ...config,
    });
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig);
    }
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Transportation Configuration" subtitle="Configure system-wide transportation settings">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access configuration settings.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Transportation Configuration"
      subtitle="Configure system-wide transportation settings"
      action={
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateConfigMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Banner */}
        {hasChanges && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Click "Save Configuration" to apply your changes.
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Tabs */}
        <Tabs defaultValue="fees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Fee Settings
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <Bus className="w-4 h-4" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          {/* Fee Settings */}
          <TabsContent value="fees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Fee Calculation Settings
                </CardTitle>
                <CardDescription>
                  Configure how transportation fees are calculated and assigned
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="feeCalculationMethod">Default Fee Calculation Method</Label>
                  <Select 
                    value={config.feeCalculationMethod} 
                    onValueChange={(value) => handleConfigChange("feeCalculationMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROUTE_WISE">Route-wise (Same fee for entire route)</SelectItem>
                      <SelectItem value="STOP_WISE">Stop-wise (Different fee per stop)</SelectItem>
                      <SelectItem value="DISTANCE_BASED">Distance-based (Fee per kilometer)</SelectItem>
                      <SelectItem value="FLAT_RATE">Flat Rate (Same fee for all students)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is the default method used when creating new fee structures
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Allow Route-wise Fees</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable creating route-wise fee structures
                      </p>
                    </div>
                    <Switch
                      checked={config.allowRouteWiseFees}
                      onCheckedChange={(checked) => handleConfigChange("allowRouteWiseFees", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Allow Stop-wise Fees</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable creating stop-wise fee structures
                      </p>
                    </div>
                    <Switch
                      checked={config.allowStopWiseFees}
                      onCheckedChange={(checked) => handleConfigChange("allowStopWiseFees", checked)}
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    These settings control which fee types are available when creating new fee structures. 
                    Existing fee structures will not be affected.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Settings */}
          <TabsContent value="operations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Bus Operations Settings
                </CardTitle>
                <CardDescription>
                  Configure bus capacity, fuel types, and operational requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="maxCapacityPerBus">Maximum Capacity Per Bus</Label>
                    <Input
                      id="maxCapacityPerBus"
                      type="number"
                      min="1"
                      max="100"
                      value={config.maxCapacityPerBus}
                      onChange={(e) => handleConfigChange("maxCapacityPerBus", parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Default maximum number of students per bus
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="defaultFuelType">Default Fuel Type</Label>
                    <Select 
                      value={config.defaultFuelType} 
                      onValueChange={(value) => handleConfigChange("defaultFuelType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="CNG">CNG</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Default fuel type when adding new buses
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Auto-calculate Distances</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically calculate distances when GPS coordinates are available
                      </p>
                    </div>
                    <Switch
                      checked={config.autoCalculateDistances}
                      onCheckedChange={(checked) => handleConfigChange("autoCalculateDistances", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Require Driver Details</Label>
                      <p className="text-sm text-muted-foreground">
                        Make driver information mandatory when adding buses
                      </p>
                    </div>
                    <Switch
                      checked={config.requireDriverDetails}
                      onCheckedChange={(checked) => handleConfigChange("requireDriverDetails", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Require Conductor Details</Label>
                      <p className="text-sm text-muted-foreground">
                        Make conductor information mandatory when adding buses
                      </p>
                    </div>
                    <Switch
                      checked={config.requireConductorDetails}
                      onCheckedChange={(checked) => handleConfigChange("requireConductorDetails", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Settings */}
          <TabsContent value="tracking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Tracking & Monitoring
                </CardTitle>
                <CardDescription>
                  Enable or disable fuel tracking and maintenance monitoring features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Enable Fuel Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Track fuel consumption, costs, and efficiency metrics
                      </p>
                    </div>
                    <Switch
                      checked={config.enableFuelTracking}
                      onCheckedChange={(checked) => handleConfigChange("enableFuelTracking", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label>Enable Maintenance Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Track vehicle maintenance, repairs, and service schedules
                      </p>
                    </div>
                    <Switch
                      checked={config.enableMaintenanceTracking}
                      onCheckedChange={(checked) => handleConfigChange("enableMaintenanceTracking", checked)}
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Disabling tracking features will hide related menus and prevent new entries, 
                    but existing data will be preserved.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Settings */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert Thresholds
                </CardTitle>
                <CardDescription>
                  Configure when to show alerts for fuel levels and maintenance schedules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="fuelAlertThreshold">Fuel Alert Threshold (Liters)</Label>
                    <Input
                      id="fuelAlertThreshold"
                      type="number"
                      step="0.1"
                      min="0"
                      value={config.fuelAlertThreshold}
                      onChange={(e) => handleConfigChange("fuelAlertThreshold", parseFloat(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Show low fuel alerts when fuel level drops below this amount
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="maintenanceAlertDays">Maintenance Alert Days</Label>
                    <Input
                      id="maintenanceAlertDays"
                      type="number"
                      min="1"
                      max="365"
                      value={config.maintenanceAlertDays}
                      onChange={(e) => handleConfigChange("maintenanceAlertDays", parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Show maintenance reminders this many days before due date
                    </p>
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    These thresholds are used to display alerts in the dashboard and send notifications 
                    to help you stay on top of fuel and maintenance requirements.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Current Configuration Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Configuration Summary
            </CardTitle>
            <CardDescription>
              Current transportation module configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <Label className="text-sm font-medium text-muted-foreground">Fee Method</Label>
                <p className="font-medium">{config.feeCalculationMethod.replace('_', ' ')}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Label className="text-sm font-medium text-muted-foreground">Max Capacity</Label>
                <p className="font-medium">{config.maxCapacityPerBus} students</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Label className="text-sm font-medium text-muted-foreground">Default Fuel</Label>
                <p className="font-medium">{config.defaultFuelType}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Label className="text-sm font-medium text-muted-foreground">Tracking Enabled</Label>
                <div className="flex gap-2">
                  {config.enableFuelTracking && <Badge variant="outline">Fuel</Badge>}
                  {config.enableMaintenanceTracking && <Badge variant="outline">Maintenance</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
} 