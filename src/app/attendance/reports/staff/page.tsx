"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Calendar, Download, FileText, PieChart, Search, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addMonths, subMonths } from "date-fns";
import { useAttendanceRecords } from "@/utils/attendance-api";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import { useUserRole } from "@/hooks/useUserRole";
import { mapAttendanceFromApi } from "@/utils/attendance-api";
import { CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Define columns for the staff attendance table
const columns = [
  {
    accessorKey: "userName",
    header: "Name",
    cell: ({ row }: { row: any }) => (
      <div className="font-medium">{row.original.userName}</div>
    ),
  },
  {
    accessorKey: "timestamp",
    header: "Date & Time",
    cell: ({ row }: { row: any }) => (
      <div>
        {format(new Date(row.original.timestamp), "dd MMM yyyy, hh:mm a")}
      </div>
    ),
  },
  {
    accessorKey: "locationName",
    header: "Location",
  },
  {
    accessorKey: "isWithinAllowedArea",
    header: "Status",
    cell: ({ row }: { row: any }) => (
      <div 
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          row.original.isWithinAllowedArea 
            ? "bg-green-50 text-green-700" 
            : "bg-red-50 text-red-700"
        )}
      >
        {row.original.isWithinAllowedArea ? "Valid" : "Invalid"}
      </div>
    ),
  },
  {
    accessorKey: "distance",
    header: "Distance",
    cell: ({ row }: { row: any }) => <div>{row.original.distance} meters</div>,
  }
];

// Staff Attendance Report Component
export default function StaffAttendanceReportsPage() {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date;
    to?: Date;
  } | undefined>({
    from: new Date(new Date().setDate(1)), // First day of current month
    to: new Date(),
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("daily");
  
  // Fetch attendance records with filters
  const { records, isLoading: isLoadingRecords } = useAttendanceRecords({
    startDate: selectedDateRange?.from,
    endDate: selectedDateRange?.to,
  });

  // Filter records by search query
  const filteredRecords = React.useMemo(() => {
    if (!searchQuery.trim()) return records;
    
    const lowercasedQuery = searchQuery.toLowerCase();
    return records.filter(record => 
      record.userName.toLowerCase().includes(lowercasedQuery) ||
      record.locationName.toLowerCase().includes(lowercasedQuery)
    );
  }, [records, searchQuery]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (!records.length) return {
      totalRecords: 0,
      validAttendance: 0,
      invalidAttendance: 0,
      validRate: 0,
    };
    
    const validAttendance = records.filter(r => r.isWithinAllowedArea).length;
    
    return {
      totalRecords: records.length,
      validAttendance,
      invalidAttendance: records.length - validAttendance,
      validRate: Math.round((validAttendance / records.length) * 100),
    };
  }, [records]);

  // Handle export to CSV
  const handleExportCSV = () => {
    if (!filteredRecords.length) return;
    
    const headers = ["Staff Name", "Date & Time", "Location", "Status", "Distance (meters)"];
    const csvData = filteredRecords.map(record => [
      record.userName,
      format(new Date(record.timestamp), "yyyy-MM-dd HH:mm:ss"),
      record.locationName,
      record.isWithinAllowedArea ? "Valid" : "Invalid",
      record.distance.toString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `staff-attendance-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Only admins and super admins should access this page
  if (!isAdmin && !isSuperAdmin) {
    return (
      <PageWrapper>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
            <p className="mt-2 text-gray-600">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">
            Staff Attendance Reports
          </h1>
          <p className="mt-2 text-gray-500">
            View, analyze, and export staff attendance records
          </p>
        </div>

        {/* Filter and control section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Date range selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDateRange?.from ? (
                  selectedDateRange.to ? (
                    <>
                      {format(selectedDateRange.from, "PP")} -{" "}
                      {format(selectedDateRange.to, "PP")}
                    </>
                  ) : (
                    format(selectedDateRange.from, "PP")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col gap-4 p-4 w-auto">
              <div>
                <div className="mb-2 text-sm font-medium">Start Date</div>
                <CalendarComponent
                  mode="single"
                  selected={selectedDateRange?.from}
                  onSelect={(date) =>
                    setSelectedDateRange((prev) => ({
                      from: date || new Date(), // Default to today if undefined
                      to: prev?.to,
                    }))
                  }
                  initialFocus
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">End Date</div>
                <CalendarComponent
                  mode="single"
                  selected={selectedDateRange?.to}
                  onSelect={(date) =>
                    setSelectedDateRange((prev) => ({
                      from: prev?.from || new Date(), // Default to today if undefined
                      to: date,
                    }))
                  }
                  initialFocus
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalRecords}</div>
              <p className="text-xs text-gray-500">
                {selectedDateRange?.from
                  ? `From ${format(selectedDateRange.from, "PP")} to ${
                      selectedDateRange.to
                        ? format(selectedDateRange.to, "PP")
                        : format(new Date(), "PP")
                    }`
                  : "All time"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Valid Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summaryStats.validAttendance}
              </div>
              <p className="text-xs text-gray-500">
                {summaryStats.validRate}% of total records
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Invalid Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summaryStats.invalidAttendance}
              </div>
              <p className="text-xs text-gray-500">
                {summaryStats.totalRecords
                  ? 100 - summaryStats.validRate
                  : 0}% of total records
              </p>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center">
            <CardContent className="flex items-center justify-center py-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExportCSV}
                disabled={!filteredRecords.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* View modes - Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Records
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Summary View
            </TabsTrigger>
          </TabsList>

          {/* Daily records tab content */}
          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance Records</CardTitle>
                <CardDescription>
                  Detailed view of all staff attendance records
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRecords.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={filteredRecords}
                    searchKey="userName"
                    pageSize={10}
                  />
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
                    <FileText className="h-10 w-10 text-gray-400" />
                    <h3 className="text-lg font-medium">No records found</h3>
                    <p className="text-sm text-gray-500">
                      Try adjusting your filters or selecting a different date range
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary view tab content */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
                <CardDescription>
                  Summary statistics for staff attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRecords.length > 0 ? (
                  <div className="space-y-8">
                    {/* Placeholder for attendance stats visualization */}
                    <div className="flex h-[300px] items-center justify-center rounded-lg border bg-gray-50">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">
                          Attendance visualization will be shown here
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {/* Add summary cards here */}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
                    <Users className="h-10 w-10 text-gray-400" />
                    <h3 className="text-lg font-medium">No data to summarize</h3>
                    <p className="text-sm text-gray-500">
                      Try adjusting your filters or selecting a different date range
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
} 