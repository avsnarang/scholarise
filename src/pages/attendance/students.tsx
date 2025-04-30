import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ClipboardCheck, 
  UserX, 
  UserCheck, 
  AlertTriangle,
  Info
} from "lucide-react";
import { AttendanceStatus } from "@prisma/client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { type NextPageWithLayout } from "../_app";

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useClassAttendanceByDate,
  useBulkMarkStudentAttendance,
  getStatusColor,
  getStatusName
} from "@/utils/student-attendance-api";

const StudentAttendancePage: NextPageWithLayout = () => {
  const { currentBranchId } = useBranchContext();
  const { isTeacher, isEmployee, teacherId } = useUserRole();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [reasonData, setReasonData] = useState<Record<string, string>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Fetch classes
  const { data: classes, isLoading: isLoadingClasses } = api.class.getAll.useQuery(
    { branchId: currentBranchId || "" },
    { enabled: !!currentBranchId }
  );
  
  // Get teacher's class if they're a teacher
  const { data: teacherData } = api.teacher.getById.useQuery(
    { id: teacherId || "" },
    { enabled: !!teacherId }
  );
  
  // Fetch attendance data for selected class and date
  const { 
    attendanceData: classAttendance, 
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance
  } = useClassAttendanceByDate(selectedClassId, selectedDate);
  
  // Bulk mark attendance mutation
  const { 
    bulkMarkAttendance, 
    isLoading: isMarkingAttendance 
  } = useBulkMarkStudentAttendance();
  
  // Set teacher's class as default if they're a class teacher
  useEffect(() => {
    if (teacherData?.classes?.length > 0 && !selectedClassId) {
      setSelectedClassId(teacherData.classes[0].id);
    }
  }, [teacherData, selectedClassId]);
  
  // Initialize attendance data when class attendance data is loaded
  useEffect(() => {
    if (classAttendance) {
      const initialAttendanceData: Record<string, AttendanceStatus> = {};
      const initialReasonData: Record<string, string> = {};
      
      classAttendance.students.forEach(student => {
        initialAttendanceData[student.student.id] = student.attendance.status;
        initialReasonData[student.student.id] = student.attendance.reason || '';
      });
      
      setAttendanceData(initialAttendanceData);
      setReasonData(initialReasonData);
      setIsSaved(true);
    }
  }, [classAttendance]);
  
  // Handle class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setAttendanceData({});
    setReasonData({});
    setIsSaved(false);
  };
  
  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setAttendanceData({});
      setReasonData({});
      setIsSaved(false);
    }
  };
  
  // Handle status change for a student
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
    setIsSaved(false);
  };
  
  // Handle reason change for a student
  const handleReasonChange = (studentId: string, reason: string) => {
    setReasonData(prev => ({
      ...prev,
      [studentId]: reason
    }));
    setIsSaved(false);
  };
  
  // Handle bulk status change
  const handleBulkStatusChange = (status: AttendanceStatus) => {
    if (!classAttendance) return;
    
    const newAttendanceData = { ...attendanceData };
    
    classAttendance.students.forEach(student => {
      newAttendanceData[student.student.id] = status;
    });
    
    setAttendanceData(newAttendanceData);
    setIsSaved(false);
  };
  
  // Handle save attendance
  const handleSaveAttendance = () => {
    if (!selectedClassId || !classAttendance) return;
    
    const attendanceRecords = classAttendance.students.map(student => ({
      studentId: student.student.id,
      status: attendanceData[student.student.id] || AttendanceStatus.PRESENT,
      reason: reasonData[student.student.id] || null,
      notes: null
    }));
    
    bulkMarkAttendance(
      {
        classId: selectedClassId,
        date: selectedDate,
        attendance: attendanceRecords,
        markedById: teacherId
      },
      {
        onSuccess: () => {
          toast.success("Attendance saved successfully");
          setIsSaved(true);
          setSaveDialogOpen(false);
          void refetchAttendance();
        },
        onError: (error) => {
          toast.error(`Failed to save attendance: ${error.message}`);
        }
      }
    );
  };
  
  // Render loading state
  if (isLoadingClasses) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
            <h1 className="text-2xl font-bold">Student Attendance</h1>
          </div>
          
          <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex space-x-4">
                  <Skeleton className="h-10 w-1/3" />
                  <Skeleton className="h-10 w-1/3" />
                </div>
                <Skeleton className="h-96 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }
  
  // Render access denied
  if (!isTeacher && !isEmployee) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
            <h1 className="text-2xl font-bold">Student Attendance</h1>
          </div>
          
          <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access student attendance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                This feature is only available for teachers and employees.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }
  
  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center">
          <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
          <h1 className="text-2xl font-bold">Student Attendance</h1>
        </div>
        
        <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-[#00501B]/5 to-transparent dark:from-[#7aad8c]/10 dark:to-transparent">
            <CardTitle className="flex items-center">
              <ClipboardCheck className="mr-2 h-5 w-5 text-[#00501B] dark:text-[#7aad8c]" />
              Mark Student Attendance
            </CardTitle>
            <CardDescription>
              Record attendance for students by class
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full md:w-64">
                  <Label htmlFor="class-select" className="mb-1.5 block">Class</Label>
                  <Select value={selectedClassId} onValueChange={handleClassChange}>
                    <SelectTrigger id="class-select" className="border-[#00501B]/20 dark:border-[#7aad8c]/20">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.items?.map(classItem => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name} {classItem.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-auto">
                  <Label htmlFor="date-picker" className="mb-1.5 block">Date</Label>
                  <DatePicker
                    id="date-picker"
                    date={selectedDate}
                    setDate={handleDateChange}
                    className="border-[#00501B]/20 dark:border-[#7aad8c]/20"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex-1 md:flex-none"
                        onClick={() => handleBulkStatusChange(AttendanceStatus.PRESENT)}
                        disabled={!selectedClassId || !classAttendance}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        All Present
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark all students as present</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1 md:flex-none"
                        onClick={() => handleBulkStatusChange(AttendanceStatus.ABSENT)}
                        disabled={!selectedClassId || !classAttendance}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        All Absent
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark all students as absent</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button 
                  className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90 flex-1 md:flex-none"
                  disabled={!selectedClassId || !classAttendance || isSaved}
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
            
            {/* Attendance Table */}
            {isLoadingAttendance ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !selectedClassId ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-1">Select a Class</h3>
                <p>Choose a class to start marking attendance</p>
              </div>
            ) : !classAttendance?.students || classAttendance.students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-1">No Students Found</h3>
                <p>There are no students in this class</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="hidden md:flex items-center">
                    <Info className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Attendance summary:</span>
                  </div>
                  
                  <div className="flex gap-2 ml-auto">
                    {classAttendance.totalStudents > 0 && (
                      <Badge variant="outline" className="bg-[#00501B]/5 dark:bg-[#7aad8c]/10">
                        Total: {classAttendance.totalStudents}
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                      Present: {Object.values(attendanceData).filter(status => status === AttendanceStatus.PRESENT).length}
                    </Badge>
                    
                    <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                      Absent: {Object.values(attendanceData).filter(status => status === AttendanceStatus.ABSENT).length}
                    </Badge>
                    
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                      Late: {Object.values(attendanceData).filter(status => status === AttendanceStatus.LATE).length}
                    </Badge>
                  </div>
                </div>
                
                <div className="rounded-md border border-[#00501B]/10 dark:border-[#7aad8c]/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#00501B]/5 dark:bg-[#7aad8c]/10">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="w-32 md:w-40">Roll Number</TableHead>
                        <TableHead className="w-40 md:w-48">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Reason (for absence/late)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classAttendance.students.map((student, index) => (
                        <TableRow key={student.student.id} className="hover:bg-[#00501B]/5 dark:hover:bg-[#7aad8c]/5">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{student.student.firstName} {student.student.lastName}</TableCell>
                          <TableCell>{student.student.rollNumber || "-"}</TableCell>
                          <TableCell>
                            <Select 
                              value={attendanceData[student.student.id] || AttendanceStatus.PRESENT} 
                              onValueChange={(value) => handleStatusChange(student.student.id, value as AttendanceStatus)}
                            >
                              <SelectTrigger className={`
                                ${getStatusColor(attendanceData[student.student.id] || AttendanceStatus.PRESENT).bg}
                                ${getStatusColor(attendanceData[student.student.id] || AttendanceStatus.PRESENT).text}
                                border-none focus:ring-1 focus:ring-offset-0 focus:ring-[#00501B]/30 dark:focus:ring-[#7aad8c]/30
                              `}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={AttendanceStatus.PRESENT}>Present</SelectItem>
                                <SelectItem value={AttendanceStatus.ABSENT}>Absent</SelectItem>
                                <SelectItem value={AttendanceStatus.LATE}>Late</SelectItem>
                                <SelectItem value={AttendanceStatus.HALF_DAY}>Half Day</SelectItem>
                                <SelectItem value={AttendanceStatus.EXCUSED}>Excused</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Input 
                              placeholder="Reason (optional)"
                              value={reasonData[student.student.id] || ""}
                              onChange={(e) => handleReasonChange(student.student.id, e.target.value)}
                              className="h-9 border-[#00501B]/20 dark:border-[#7aad8c]/20"
                              disabled={attendanceData[student.student.id] === AttendanceStatus.PRESENT}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
          {classAttendance?.students && classAttendance.students.length > 0 && (
            <CardFooter className="bg-[#00501B]/5 dark:bg-[#7aad8c]/10 flex items-center justify-between px-6 py-3">
              <p className="text-sm text-muted-foreground flex items-center">
                <Calendar className="h-4 w-4 mr-1.5" />
                <span className="font-medium mr-1">Date:</span> 
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
              
              <Button 
                className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
                disabled={!selectedClassId || !classAttendance || isSaved}
                onClick={() => setSaveDialogOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Save Attendance
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
      
      {/* Save Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Attendance</DialogTitle>
            <DialogDescription>
              Are you sure you want to save the attendance records?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Class:</span>
                <span>{classAttendance?.class.name} {classAttendance?.class.section}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Date:</span>
                <span>{format(selectedDate, "MMMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Total Students:</span>
                <span>{classAttendance?.totalStudents}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status Summary:</span>
                <div className="flex gap-1.5">
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                    P: {Object.values(attendanceData).filter(status => status === AttendanceStatus.PRESENT).length}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                    A: {Object.values(attendanceData).filter(status => status === AttendanceStatus.ABSENT).length}
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                    L: {Object.values(attendanceData).filter(status => status === AttendanceStatus.LATE).length}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSaveDialogOpen(false)}
              className="border-[#00501B]/20 dark:border-[#7aad8c]/20 text-[#00501B] dark:text-[#7aad8c] hover:bg-[#00501B]/10 dark:hover:bg-[#7aad8c]/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAttendance}
              disabled={isMarkingAttendance}
              className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
            >
              {isMarkingAttendance ? "Saving..." : "Save Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
};

StudentAttendancePage.getLayout = (page) => {
  return <AppLayout title="Student Attendance" description="Manage student attendance records">{page}</AppLayout>
};

export default StudentAttendancePage; 