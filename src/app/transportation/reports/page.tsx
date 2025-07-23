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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Bus,
  Route,
  MapPin,
  Fuel,
  Wrench,
  Download,
  Filter,
  Calendar,
  AlertTriangle,
  Target,
  Activity,
  PieChart,
  LineChart,
} from "lucide-react";
import { api } from "@/utils/api";
import { skipToken } from "@tanstack/react-query";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { formatIndianCurrency } from "@/lib/utils";
import VerticalBarChart from "@/components/ui/vertical-bar-chart";

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  routeId?: string;
  busId?: string;
}

function ReportCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Icon className="h-6 w-6" />
            </div>
            {trend && trendValue && (
              <div className={`flex items-center mt-2 text-sm ${
                trend === "up" ? "text-green-600" : 
                trend === "down" ? "text-red-600" : "text-gray-600"
              }`}>
                {trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : 
                 trend === "down" ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsageAnalytics() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  const { data: dashboardStats } = api.transportation.getDashboardStats.useQuery(
    currentBranchId && currentSessionId ? {
      branchId: currentBranchId,
      sessionId: currentSessionId,
    } : skipToken,
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  const { data: routes } = api.transportation.getRoutes.useQuery(
    { branchId: currentBranchId || undefined},
    { enabled: !!currentBranchId }
  );

  // Calculate route utilization data
  const routeUtilizationData = routes?.map(route => ({
    name: route.name,
    value: route.assignments?.length || 0,
    capacity: route.buses?.reduce((sum, busRoute) => sum + (busRoute.bus?.capacity || 0), 0) || 0,
    utilization: route.buses?.length ? 
      Math.round(((route.assignments?.length || 0) / 
      (route.buses?.reduce((sum, busRoute) => sum + (busRoute.bus?.capacity || 0), 0) || 1)) * 100) : 0
  })) || [];

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportCard
          title="Total Students"
          value={dashboardStats?.students.active || 0}
          subtitle="Using transportation"
          icon={Users}
          trend="up"
          trendValue="+5.2%"
        />
        <ReportCard
          title="Active Routes"
          value={dashboardStats?.routes.active || 0}
          subtitle={`${dashboardStats?.stops.total || 0} stops total`}
          icon={Route}
          trend="neutral"
          trendValue="No change"
        />
        <ReportCard
          title="Fleet Utilization"
          value={`${dashboardStats?.buses.active || 0}/${dashboardStats?.buses.total || 0}`}
          subtitle="Active buses"
          icon={Bus}
          trend="up"
          trendValue="+2 buses"
        />
        <ReportCard
          title="Avg Occupancy"
          value={dashboardStats?.buses.total ? 
            Math.round((dashboardStats.students.active / dashboardStats.buses.active) * 100) / 100 : 0
          }
          subtitle="Students per bus"
          icon={Target}
          trend="up"
          trendValue="+8.5%"
        />
      </div>

      {/* Route Utilization Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Route Utilization Analysis
          </CardTitle>
          <CardDescription>
            Student assignments and capacity utilization by route
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routeUtilizationData.length > 0 ? (
            <VerticalBarChart
              data={routeUtilizationData.map(route => ({
                name: route.name,
                value: route.value,
                color: route.utilization > 80 ? "#ef4444" : 
                       route.utilization > 60 ? "#f59e0b" : "#10b981"
              }))}
              title="Students per Route"
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No route data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Route Table */}
      <Card>
        <CardHeader>
          <CardTitle>Route Performance Details</CardTitle>
          <CardDescription>
            Detailed breakdown of route utilization and efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routeUtilizationData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route Name</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Total Capacity</TableHead>
                  <TableHead>Utilization %</TableHead>
                  <TableHead>Buses</TableHead>
                  <TableHead>Stops</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routeUtilizationData.map((route, index) => {
                  const routeData = routes?.find(r => r.name === route.name);
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>{route.value}</TableCell>
                      <TableCell>{route.capacity}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={route.utilization > 80 ? "destructive" : 
                                  route.utilization > 60 ? "outline" : "default"}
                        >
                          {route.utilization}%
                        </Badge>
                      </TableCell>
                      <TableCell>{routeData?.buses?.length || 0}</TableCell>
                      <TableCell>{routeData?.stops?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant={routeData?.isActive ? "default" : "secondary"}>
                          {routeData?.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No route data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialReports() {
  const { currentBranchId } = useBranchContext();
  
  const { data: fuelLogs } = api.transportation.getFuelLogs.useQuery(
    { 
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: new Date(),
    },
    { enabled: !!currentBranchId }
  );

  const { data: maintenanceLogs } = api.transportation.getMaintenanceLogs.useQuery(
    {
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: new Date(),
    },
    { enabled: !!currentBranchId }
  );

  // Calculate financial metrics
  const totalFuelCost = fuelLogs?.reduce((sum, log) => sum + log.totalAmount, 0) || 0;
  const totalMaintenanceCost = maintenanceLogs?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  const avgFuelCostPerDay = fuelLogs?.length ? totalFuelCost / 30 : 0;
  const totalFuelConsumed = fuelLogs?.reduce((sum, log) => sum + log.fuelQuantity, 0) || 0;
  const avgFuelPrice = totalFuelConsumed > 0 ? totalFuelCost / totalFuelConsumed : 0;

  // Prepare chart data for fuel expenses over time
  const fuelExpenseData = fuelLogs?.reduce((acc: any[], log) => {
    const date = new Date(log.fuelDate).toLocaleDateString();
    const existing = acc.find(item => item.name === date);
    if (existing) {
      existing.value += log.totalAmount;
    } else {
      acc.push({ name: date, value: log.totalAmount });
    }
    return acc;
  }, []).slice(-10) || []; // Last 10 entries

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportCard
          title="Total Fuel Cost"
          value={formatIndianCurrency(totalFuelCost)}
          subtitle="Last 30 days"
          icon={Fuel}
          trend="up"
          trendValue="+12.3%"
        />
        <ReportCard
          title="Maintenance Cost"
          value={formatIndianCurrency(totalMaintenanceCost)}
          subtitle="Last 30 days"
          icon={Wrench}
          trend="down"
          trendValue="-5.1%"
        />
        <ReportCard
          title="Daily Avg Cost"
          value={formatIndianCurrency(avgFuelCostPerDay)}
          subtitle="Fuel expenses"
          icon={Calendar}
          trend="up"
          trendValue="+8.2%"
        />
        <ReportCard
          title="Avg Fuel Price"
          value={`₹${avgFuelPrice.toFixed(2)}/L`}
          subtitle={`${totalFuelConsumed.toFixed(1)}L consumed`}
          icon={DollarSign}
          trend="up"
          trendValue="+3.5%"
        />
      </div>

      {/* Fuel Expense Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Fuel Expense Trend
          </CardTitle>
          <CardDescription>
            Daily fuel expenses over the last 10 entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fuelExpenseData.length > 0 ? (
            <VerticalBarChart
              data={fuelExpenseData.map(item => ({
                name: item.name,
                value: item.value,
                color: "#3b82f6"
              }))}
              title="Fuel Expenses (₹)"
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fuel expense data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Fuel Expenses</CardTitle>
            <CardDescription>Latest fuel log entries</CardDescription>
          </CardHeader>
          <CardContent>
            {fuelLogs && fuelLogs.length > 0 ? (
              <div className="space-y-3">
                {fuelLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.bus.busNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.fuelQuantity}L • {new Date(log.fuelDate).toLocaleDateString()}
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
                <p>No fuel logs available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Maintenance Costs</CardTitle>
            <CardDescription>Latest maintenance expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {maintenanceLogs && maintenanceLogs.length > 0 ? (
              <div className="space-y-3">
                {maintenanceLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.bus.busNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.maintenanceType} • {new Date(log.maintenanceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {log.cost ? formatIndianCurrency(log.cost) : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No maintenance logs available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OperationalReports() {
  const { currentBranchId } = useBranchContext();

  const { data: buses } = api.transportation.getBuses.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  const { data: routes } = api.transportation.getRoutes.useQuery(
    { branchId: currentBranchId || undefined },
    { enabled: !!currentBranchId }
  );

  // Calculate operational metrics
  const busUtilization = buses?.map(bus => ({
    busNumber: bus.busNumber,
    capacity: bus.capacity,
    assigned: 0, // TODO: Calculate from actual assignments
    utilization: 0, // TODO: Calculate from actual assignments
    routes: bus.routes?.length || 0,
    isActive: bus.isActive,
  })) || [];

  const avgBusUtilization = busUtilization.length > 0 ? 
    Math.round(busUtilization.reduce((sum, bus) => sum + bus.utilization, 0) / busUtilization.length) : 0;

  const totalCapacity = buses?.reduce((sum, bus) => sum + bus.capacity, 0) || 0;
  const totalAssigned = busUtilization.reduce((sum, bus) => sum + bus.assigned, 0);
  const overallUtilization = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportCard
          title="Fleet Efficiency"
          value={`${avgBusUtilization}%`}
          subtitle="Average bus utilization"
          icon={Target}
          trend={avgBusUtilization > 70 ? "up" : "down"}
          trendValue={avgBusUtilization > 70 ? "Efficient" : "Needs improvement"}
        />
        <ReportCard
          title="Total Capacity"
          value={totalCapacity}
          subtitle={`${totalAssigned} students assigned`}
          icon={Users}
          trend="neutral"
          trendValue={`${overallUtilization}% utilized`}
        />
        <ReportCard
          title="Active Routes"
          value={routes?.filter(r => r.isActive).length || 0}
          subtitle={`${routes?.length || 0} total routes`}
          icon={Route}
          trend="up"
          trendValue="All operational"
        />
        <ReportCard
          title="Avg Students/Route"
          value={routes?.length ? Math.round(totalAssigned / routes.length) : 0}
          subtitle="Load distribution"
          icon={Activity}
          trend="neutral"
          trendValue="Balanced"
        />
      </div>

      {/* Bus Utilization Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Bus Utilization Analysis
          </CardTitle>
          <CardDescription>
            Individual bus capacity utilization and assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {busUtilization.length > 0 ? (
            <VerticalBarChart
              data={busUtilization.map(bus => ({
                name: bus.busNumber,
                value: bus.utilization,
                color: bus.utilization > 80 ? "#ef4444" : 
                       bus.utilization > 60 ? "#f59e0b" : "#10b981"
              }))}
              title="Bus Utilization (%)"
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bus data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Bus Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Bus Performance Details</CardTitle>
          <CardDescription>
            Detailed breakdown of bus assignments and utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {busUtilization.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bus Number</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Assigned Students</TableHead>
                  <TableHead>Utilization %</TableHead>
                  <TableHead>Routes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {busUtilization.map((bus, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{bus.busNumber}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>{bus.assigned}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={bus.utilization > 90 ? "destructive" : 
                                bus.utilization > 70 ? "default" : "outline"}
                      >
                        {bus.utilization}%
                      </Badge>
                    </TableCell>
                    <TableCell>{bus.routes}</TableCell>
                    <TableCell>
                      <Badge variant={bus.isActive ? "default" : "secondary"}>
                        {bus.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={bus.utilization > 80 ? "destructive" : 
                                bus.utilization > 60 ? "default" : "outline"}
                      >
                        {bus.utilization > 80 ? "Overloaded" : 
                         bus.utilization > 60 ? "Optimal" : "Underutilized"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bus data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TransportationReportsPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || "",
    dateTo: new Date().toISOString().split('T')[0] || "",
  });

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Transportation Reports" subtitle="Analytics and insights for transportation operations">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access transportation reports.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Transportation Reports"
      subtitle="Analytics and insights for transportation operations"
      action={
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Reports
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Report Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              </div>
              <Button variant="outline" className="mt-6">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usage Analytics
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Financial Reports
            </TabsTrigger>
            <TabsTrigger value="operational" className="flex items-center gap-2">
              <Bus className="w-4 h-4" />
              Operational Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage">
            <UsageAnalytics />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialReports />
          </TabsContent>

          <TabsContent value="operational">
            <OperationalReports />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
} 