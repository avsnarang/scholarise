"use client";

import React, { useState, useMemo } from "react";
import { AttendanceStatus } from "@prisma/client";
import { 
  Search, 
  Check, 
  X, 
  Clock, 
  Hash,
  UserCheck,
  UserX,
  ListFilter,
  FileDown
} from "lucide-react";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  getStatusColor, 
  getStatusName 
} from "@/utils/student-attendance-api";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  admissionNumber: string;
}

interface StudentAttendanceRecord {
  student: Student;
  attendance: {
    status: AttendanceStatus;
    reason?: string | null;
  };
}

interface AttendanceMarkingInterfaceProps {
  students: StudentAttendanceRecord[];
  attendanceData: Record<string, AttendanceStatus>;
  reasonData: Record<string, string>;
  onAttendanceChange: (data: Record<string, AttendanceStatus>) => void;
  onReasonChange: (data: Record<string, string>) => void;
  onUnsavedChange: () => void;
  isLoading: boolean;
  canModify: boolean;
}

export default function AttendanceMarkingInterface({
  students,
  attendanceData,
  reasonData,
  onAttendanceChange,
  onReasonChange,
  onUnsavedChange,
  isLoading,
  canModify
}: AttendanceMarkingInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);

  // Handle individual status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!canModify) return;
    
    onAttendanceChange({
      ...attendanceData,
      [studentId]: status
    });
    onUnsavedChange();
  };

  // Handle reason change
  const handleReasonChange = (studentId: string, reason: string) => {
    if (!canModify) return;
    
    onReasonChange({
      ...reasonData,
      [studentId]: reason
    });
    onUnsavedChange();
  };

  // Quick action handlers
  const handleMarkPresent = (studentId: string) => {
    handleStatusChange(studentId, AttendanceStatus.PRESENT);
  };

  const handleMarkAbsent = (studentId: string) => {
    handleStatusChange(studentId, AttendanceStatus.ABSENT);
  };

  const handleMarkOnLeave = (studentId: string) => {
    handleStatusChange(studentId, AttendanceStatus.LEAVE);
  };

  // Bulk actions
  const handleBulkStatusChange = (status: AttendanceStatus) => {
    if (!canModify) return;

    const newAttendanceData = { ...attendanceData };
    students.forEach(({ student }) => {
      newAttendanceData[student.id] = status;
    });
    
    onAttendanceChange(newAttendanceData);
    onUnsavedChange();
  };

  // Export functionality
  const handleExportData = () => {
    const csvContent = [
      ["Roll No", "Student Name", "Status", "Reason"],
      ...filteredStudents.map(({ student }) => [
        student.rollNumber || "",
        `${student.firstName} ${student.lastName}`,
        getStatusName(attendanceData[student.id] || AttendanceStatus.PRESENT),
        reasonData[student.id] || ""
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const downloadFileName = `attendance_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", downloadFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and search students
  const filteredStudents = useMemo(() => {
    return students.filter(({ student }) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const rollNumber = student.rollNumber?.toLowerCase() || "";
      const searchMatch = searchQuery 
        ? fullName.includes(searchQuery.toLowerCase()) || rollNumber.includes(searchQuery.toLowerCase())
        : true;
      
      const statusMatch = showAbsentOnly 
        ? attendanceData[student.id] === AttendanceStatus.ABSENT
        : true;
      
      return searchMatch && statusMatch;
    }).sort((a, b) => {
      // Sort by roll number numerically if possible, otherwise alphabetically
      const rollA = a.student.rollNumber || "";
      const rollB = b.student.rollNumber || "";
      
      const numA = parseInt(rollA, 10);
      const numB = parseInt(rollB, 10);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      return rollA.localeCompare(rollB);
    });
  }, [students, searchQuery, showAbsentOnly, attendanceData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <UserX className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
        <h3 className="text-lg font-medium">No Students Found</h3>
        <p>There are no students in this class/section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search students by name or roll number..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between sm:justify-start space-x-2 bg-muted/50 rounded-lg px-3 py-2">
          <Label htmlFor="absent-only" className="text-sm font-medium">
            Show Absent Only
          </Label>
          <Switch
            id="absent-only"
            checked={showAbsentOnly}
            onCheckedChange={setShowAbsentOnly}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusChange(AttendanceStatus.PRESENT)}
              className="flex-1 sm:flex-auto flex items-center justify-center"
              disabled={!canModify}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">All Present</span>
              <span className="xs:hidden">Present</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStatusChange(AttendanceStatus.ABSENT)}
              className="flex-1 sm:flex-auto flex items-center justify-center"
              disabled={!canModify}
            >
              <UserX className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">All Absent</span>
              <span className="xs:hidden">Absent</span>
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={!canModify}>
                <ListFilter className="h-4 w-4 mr-2" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleBulkStatusChange(AttendanceStatus.LEAVE)}>
          Mark All On Leave
        </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportData}>
                <FileDown className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Students Table - Desktop */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]"><Hash className="h-4 w-4" /></TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[250px]">Reason</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map(({ student }, index) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.rollNumber || index + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{student.firstName} {student.lastName}</div>
                  <div className="text-sm text-muted-foreground">ID: {student.admissionNumber}</div>
                </TableCell>
                <TableCell>
                  <Select
                    value={attendanceData[student.id] || AttendanceStatus.PRESENT}
                    onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                    disabled={!canModify}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(
                            attendanceData[student.id] || AttendanceStatus.PRESENT
                          )} whitespace-nowrap`}
                        >
                          {getStatusName(attendanceData[student.id] || AttendanceStatus.PRESENT)}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AttendanceStatus.PRESENT}>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Present
                        </Badge>
                      </SelectItem>
                      <SelectItem value={AttendanceStatus.ABSENT}>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Absent
                        </Badge>
                      </SelectItem>
                      <SelectItem value={AttendanceStatus.LEAVE}>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                      Leave
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    placeholder="Reason (optional)"
                    value={reasonData[student.id] || ""}
                    onChange={(e) => handleReasonChange(student.id, e.target.value)}
                    className="max-w-[200px]"
                    disabled={!canModify}
                  />
                </TableCell>
                <TableCell>
                  {canModify && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkPresent(student.id)}
                        className="h-8 w-8 rounded-full bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAbsent(student.id)}
                        className="h-8 w-8 rounded-full bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkOnLeave(student.id)}
                        className="h-8 w-8 rounded-full bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Students Cards - Mobile */}
      <div className="md:hidden space-y-2">
        {filteredStudents.map(({ student }, index) => (
          <Card key={student.id} className="border shadow-sm">
            <CardContent className="p-2">
              <div className="space-y-2">
                {/* Student Info Header */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Roll: {student.rollNumber || index + 1}</span>
                      <span>•</span>
                      <span>ID: {student.admissionNumber}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(
                      attendanceData[student.id] || AttendanceStatus.PRESENT
                    )} whitespace-nowrap ml-1 flex-shrink-0 text-xs px-2 py-0.5`}
                  >
                    {getStatusName(attendanceData[student.id] || AttendanceStatus.PRESENT)}
                  </Badge>
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Attendance Status</Label>
                  <Select
                    value={attendanceData[student.id] || AttendanceStatus.PRESENT}
                    onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                    disabled={!canModify}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(
                            attendanceData[student.id] || AttendanceStatus.PRESENT
                          )} whitespace-nowrap`}
                        >
                          {getStatusName(attendanceData[student.id] || AttendanceStatus.PRESENT)}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AttendanceStatus.PRESENT}>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Present
                        </Badge>
                      </SelectItem>
                      <SelectItem value={AttendanceStatus.ABSENT}>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Absent
                        </Badge>
                      </SelectItem>
                      <SelectItem value={AttendanceStatus.LEAVE}>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                      Leave
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason Input */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Reason (Optional)</Label>
                  <Input
                    type="text"
                    placeholder="Enter reason for absence/leave..."
                    value={reasonData[student.id] || ""}
                    onChange={(e) => handleReasonChange(student.id, e.target.value)}
                    disabled={!canModify}
                  />
                </div>

                {/* Quick Action Buttons */}
                {canModify && (
                  <div className="flex gap-1 pt-0.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkPresent(student.id)}
                      className="flex-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 h-7 px-1 text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Present
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAbsent(student.id)}
                      className="flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 h-7 px-1 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Absent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkOnLeave(student.id)}
                      className="flex-1 bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:text-yellow-800 h-7 px-1 text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Leave
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No matching students message */}
      {filteredStudents.length === 0 && (searchQuery || showAbsentOnly) && (
        <div className="py-12 text-center text-muted-foreground">
          <Search className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
          <h3 className="text-lg font-medium">No matching students</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}