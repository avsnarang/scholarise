import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { Search, Download, Filter, Calendar, Check, X } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { 
  type AttendanceRecord,
  formatDateTime,
  loadAttendanceRecords,
  loadLocations
} from "@/utils/location-helpers";

// CSV export function
function exportToCSV(data: AttendanceRecord[], filename: string): void {
  // Define header row
  const header = [
    "ID",
    "User ID",
    "Name",
    "Location",
    "Timestamp",
    "Latitude",
    "Longitude",
    "Status",
    "Distance (meters)"
  ];

  // Format data
  const rows = data.map(record => [
    record.id,
    record.userId,
    record.userName,
    record.locationName,
    record.timestamp,
    record.latitude.toString(),
    record.longitude.toString(),
    record.isWithinAllowedArea ? "Valid" : "Outside Area",
    record.distance.toString()
  ]);

  // Combine header and rows
  const csvContent = [
    header.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const AttendanceRecordsPage: NextPage = () => {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Load attendance records from local storage on mount
  useEffect(() => {
    const records = loadAttendanceRecords();
    setAttendanceRecords(records);
    setFilteredRecords(records);

    // Create a mapping of location IDs to names
    const locationList = loadLocations();
    const locationMap: Record<string, string> = {};
    locationList.forEach(loc => {
      locationMap[loc.id] = loc.name;
    });
    setLocations(locationMap);
  }, []);

  // Apply filters when any filter changes
  useEffect(() => {
    let filtered = [...attendanceRecords];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        record => 
          record.userName.toLowerCase().includes(term) || 
          record.userId.toLowerCase().includes(term)
      );
    }

    // Apply location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter(record => record.locationId === locationFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      const isValid = statusFilter === "valid";
      filtered = filtered.filter(record => record.isWithinAllowedArea === isValid);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.timestamp);

        switch (dateFilter) {
          case "today":
            return recordDate >= today;
          case "yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return recordDate >= yesterday && recordDate < today;
          }
          case "thisWeek": {
            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            return recordDate >= thisWeekStart;
          }
          case "thisMonth": {
            const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return recordDate >= thisMonthStart;
          }
          default:
            return true;
        }
      });
    }

    setFilteredRecords(filtered);
  }, [searchTerm, locationFilter, statusFilter, dateFilter, attendanceRecords]);

  // Handle CSV export
  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    const filename = `attendance-records-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCSV(filteredRecords, filename);
    toast.success("Export successful");
  };

  return (
    <>
      <Head>
        <title>Attendance Records - ScholaRise ERP</title>
      </Head>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance Records</h1>
            <p className="text-muted-foreground">
              View and filter attendance records
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/attendance-marker">
                Mark Attendance
              </Link>
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter attendance records by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name or ID"
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Select
                  value={locationFilter}
                  onValueChange={setLocationFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {Object.entries(locations).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="invalid">Outside Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date Range</label>
                <Select
                  value={dateFilter}
                  onValueChange={setDateFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <p>No attendance records match your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Coordinates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.userName}</p>
                          <p className="text-sm text-muted-foreground">ID: {record.userId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{record.locationName}</TableCell>
                      <TableCell>{formatDateTime(record.timestamp)}</TableCell>
                      <TableCell>
                        {record.isWithinAllowedArea ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="mr-1 h-3 w-3" /> Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <X className="mr-1 h-3 w-3" /> Outside Area
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{record.distance} meters</TableCell>
                      <TableCell>
                        <span className="text-xs">
                          {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AttendanceRecordsPage; 