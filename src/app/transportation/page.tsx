"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bus,
  Route,
  MapPin,
  Users,
  DollarSign,
  Fuel,
  Wrench,
  Settings,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Eye,
  Calendar,
  Clock,
  Activity,
  Target,
  Building,
  School,
  UserCheck,
  CreditCard,
  Navigation,
  Layers,
  Filter,
  ClipboardList,
} from "lucide-react";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { formatIndianCurrency } from "@/lib/utils";
import { VerticalBarChart } from "@/components/ui/vertical-bar-chart";

// Transportation module groups
const transportationModules = [
  {
    title: "Bus Management",
    description: "Manage school buses, drivers, conductors, and vehicle details",
    icon: <Bus className="h-6 w-6" />,
    href: "/transportation/buses",
    disabled: false,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Staff Management",
    description: "Manage drivers, conductors, and transportation staff details",
    icon: <Users className="h-6 w-6" />,
    href: "/transportation/staff",
    disabled: false,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    title: "Routes & Stops",
    description: "Create and manage transportation routes and stops with timing schedules",
    icon: <Route className="h-6 w-6" />,
    href: "/transportation/routes",
    disabled: false,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    title: "Student Assignments",
    description: "Assign students to routes and stops for transportation",
    icon: <UserCheck className="h-6 w-6" />,
    href: "/transportation/assignments",
    disabled: false,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    title: "Fee Management",
    description: "Configure route-wise and stop-wise transportation fees",
    icon: <DollarSign className="h-6 w-6" />,
    href: "/transportation/fees",
    disabled: false,
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  {
    title: "Trip Manager",
    description: "Track driver trips, kilometer readings, and route compliance",
    icon: <Navigation className="h-6 w-6" />,
    href: "/transportation/trips",
    disabled: false,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    title: "Fuel Tracking",
    description: "Track fuel consumption, costs, and efficiency metrics",
    icon: <Fuel className="h-6 w-6" />,
    href: "/transportation/fuel-logs",
    disabled: false,
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    title: "Maintenance Logs",
    description: "Track vehicle maintenance, repairs, and service schedules",
    icon: <Wrench className="h-6 w-6" />,
    href: "/transportation/maintenance",
    disabled: false,
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Bus Inspections",
    description: "Safety inspections, checklists, and compliance reports",
    icon: <ClipboardList className="h-6 w-6" />,
    href: "/transportation/inspections",
    disabled: false,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Configuration",
    description: "System-wide transportation settings and preferences",
    icon: <Settings className="h-6 w-6" />,
    href: "/transportation/configuration",
    disabled: false,
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  },
  {
    title: "Reports & Analytics",
    description: "Transportation usage reports and analytical insights",
    icon: <BarChart3 className="h-6 w-6" />,
    href: "/transportation/reports",
    disabled: false,
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
];

// Quick action buttons
const quickActions = [
  { title: "Start New Trip", href: "/transportation/trips", icon: <Navigation /> },
  { title: "New Inspection", href: "/transportation/inspections", icon: <ClipboardList /> },
  { title: "Add New Bus", href: "/transportation/buses/create", icon: <Plus /> },
  { title: "Manage Staff", href: "/transportation/staff", icon: <Users /> },
  { title: "Create Route", href: "/transportation/routes/create", icon: <Plus /> },
  { title: "Assign Students", href: "/transportation/assignments/bulk", icon: <UserCheck /> },
  { title: "Add Fuel Entry", href: "/transportation/fuel-logs/create", icon: <Fuel /> },
  { title: "Log Maintenance", href: "/transportation/maintenance/create", icon: <Wrench /> },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransportationDashboard() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  const { data: dashboardStats, isLoading, error } = api.transportation.getDashboardStats.useQuery(
    {
      branchId: currentBranchId!,
      sessionId: currentSessionId!,
    },
    {
      enabled: !!currentBranchId && !!currentSessionId,
    }
  );

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load transportation dashboard data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const stats = dashboardStats;

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.buses.total || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge variant={stats?.buses.active === stats?.buses.total ? "default" : "secondary"} className="text-xs">
                {stats?.buses.active || 0} Active
              </Badge>
              {(stats?.buses?.inactive ?? 0) > 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {stats?.buses?.inactive} Inactive
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.routes.active || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>{stats?.stops.total || 0} stops total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Using Transport</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.students.active || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3" />
              Active assignments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fuel Cost (This Month)</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatIndianCurrency(stats?.fuel.totalCost || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>
                {stats?.fuel.totalFuel.toFixed(1) || 0}L @ ₹{stats?.fuel.averagePrice.toFixed(2) || 0}/L
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Fuel Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Recent Fuel Entries
            </CardTitle>
            <CardDescription>Latest fuel log entries across all buses</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.fuel.recentLogs && stats.fuel.recentLogs.length > 0 ? (
              <div className="space-y-4">
                {stats.fuel.recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">{log.bus.busNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.fuelQuantity}L • {new Date(log.fuelDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatIndianCurrency(log.totalAmount)}</div>
                      <div className="text-sm text-muted-foreground">
                        ₹{log.pricePerLiter}/L
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/transportation/fuel-logs">View All Fuel Logs</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No fuel logs found</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/transportation/fuel-logs/create">Add First Entry</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Upcoming Maintenance
            </CardTitle>
            <CardDescription>Buses scheduled for maintenance in next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.maintenance.upcoming && stats.maintenance.upcoming.length > 0 ? (
              <div className="space-y-4">
                {stats.maintenance.upcoming.map((maintenance) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div>
                      <div className="font-medium">{maintenance.bus.busNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {maintenance.maintenanceType} • Due: {new Date(maintenance.nextServiceDue!).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Due Soon
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/transportation/maintenance">View All Maintenance</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming maintenance scheduled</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/transportation/maintenance/create">Schedule Maintenance</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TransportationPage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper
        title="Transportation"
        subtitle="Comprehensive school transportation management system"
      >
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access transportation features.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Transportation"
      subtitle="Comprehensive school transportation management system"
    >
      <div className="space-y-8">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common transportation management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col gap-2 p-4"
                  asChild
                >
                  <Link href={action.href}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {action.icon}
                    </div>
                    <span className="text-xs font-medium text-center">{action.title}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              All Modules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <TransportationDashboard />
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Transportation Modules</h2>
              <p className="text-sm text-gray-500 mb-6">
                Manage all aspects of school transportation from buses to student assignments
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {transportationModules.map((module, index) => (
                <Link
                  key={index}
                  href={module.disabled ? "#" : module.href}
                  className={`block ${
                    module.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <Card className="h-full transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${module.color}`}>
                          {module.icon}
                        </div>
                        {module.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {module.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
} 