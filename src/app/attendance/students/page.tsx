"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, subDays, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameMonth, isSameDay } from "date-fns";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  UserX,
  UserCheck,
  AlertTriangle,
  Info,
  Search,
  ArrowLeft,
  ArrowRight,
  FileDown,
  Calendar as CalendarIcon,
  BarChart4,
  ListFilter,
  CheckCheck,
  Hash,
  Edit,
  Download,
  Save,
  Check, // Added Check import
  X // Added X import
} from "lucide-react";

// Import AttendanceStatus from Prisma rather than defining locally
import { AttendanceStatus } from "@prisma/client";

import { PageWrapper } from "@/components/layout/page-wrapper";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter";
import { useGlobalSessionFilter } from "@/hooks/useGlobalSessionFilter";
import {
  useClassAttendanceByDate,
  useBulkMarkStudentAttendance,
  getStatusColor,
  getStatusName
} from "@/utils/student-attendance-api";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/types/permissions";

// Helper components
interface AttendanceSummaryCardProps {
  title: string;
  count: number;
  total: number;
  color: string;
}

const AttendanceSummaryCard = ({ title, count, total, color }: AttendanceSummaryCardProps) => (
  <Card className="border shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold">
            {count} <span className="text-sm font-normal text-muted-foreground">/ {total}</span>
          </h3>
        </div>
        <div className={`p-2 rounded-full ${color}`}>
          {title === "Present" && <UserCheck className="h-5 w-5" />}
          {title === "Absent" && <UserX className="h-5 w-5" />}
          {title === "Late" && <Clock className="h-5 w-5" />}
          {title === "Total" && <CheckCheck className="h-5 w-5" />}
        </div>
      </div>
      <Progress 
        className="h-1 mt-3" 
        value={total > 0 ? (count / total) * 100 : 0} 
        color={color}
      />
    </CardContent>
  </Card>
);

interface DateNavigationProps {
  date: Date;
  onChange: (date: Date) => void;
}

const DateNavigation = ({ date, onChange }: DateNavigationProps) => {
  const handlePrevDay = () => {
    onChange(subDays(date, 1));
  };
  
  const handleNextDay = () => {
    onChange(subDays(date, -1));
  };
  
  const handleToday = () => {
    onChange(new Date());
  };
  
  const dateLabel = isToday(date) 
    ? "Today" 
    : isYesterday(date) 
    ? "Yesterday" 
    : format(date, "EEE, MMM d, yyyy");
    
  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handlePrevDay}
        className="h-8 w-8"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        onClick={handleToday} 
        className={`h-8 ${isToday(date) ? 'bg-primary/10' : ''}`}
      >
        {dateLabel}
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleNextDay}
        className="h-8 w-8"
        disabled={isToday(date)}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface QuickDateSelectProps {
  onChange: (date: Date) => void;
}

const QuickDateSelect = ({ onChange }: QuickDateSelectProps) => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <CalendarIcon className="mr-2 h-4 w-4" />
          Quick Select
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onChange(today)}>
          Today
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(yesterday)}>
          Yesterday
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(weekStart)}>
          Start of Week
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange(weekEnd)}>
          End of Week
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Define the extended student type to include section
interface ExtendedStudent {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  admissionNumber: string;
  section?: string;
}

// Create a custom date picker component to address the UI issues
const ImprovedDatePicker = ({ value, onChange }: { value: Date, onChange: (date: Date) => void }) => {
  const [monthView, setMonthView] = useState(new Date(value));
  const [isOpen, setIsOpen] = useState(false);

  // Generate days for the current month view including padding days
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(monthView);
    const monthEnd = endOfMonth(monthView);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [monthView]);

  // Navigate to previous month
  const prevMonth = () => {
    setMonthView(subMonths(monthView, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setMonthView(addMonths(monthView, 1));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
          onClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(value, "dd/MM/yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="flex items-center justify-between pb-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={prevMonth}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {format(monthView, "MMMM yyyy")}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={nextMonth}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs leading-6 text-muted-foreground mb-1">
            <div>S</div>
            <div>M</div>
            <div>T</div>
            <div>W</div>
            <div>T</div>
            <div>F</div>
            <div>S</div>
          </div>
          <div className="grid grid-cols-7 text-center">
            {daysInMonth.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, monthView);
              const isSelected = isSameDay(day, value);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toString() + i}
                  className={`aspect-square p-0 relative ${!isCurrentMonth ? "text-muted-foreground opacity-50" : ""}`}
                >
                  <Button
                    variant={isSelected ? "default" : isToday ? "outline" : "ghost"}
                    size="icon"
                    className={`h-8 w-8 p-0 font-normal ${
                      isSelected 
                        ? "text-primary-foreground" 
                        : isToday 
                        ? "border border-primary text-primary" 
                        : ""
                    }`}
                    onClick={() => {
                      onChange(day);
                      setIsOpen(false);
                    }}
                    disabled={!isCurrentMonth}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>
                      {format(day, "d")}
                    </time>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Main component
export default function StudentAttendancePage() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { withBranchFilter } = useGlobalBranchFilter();
  const { withSessionFilter } = useGlobalSessionFilter();
  const { isTeacher, isEmployee, isAdmin, isSuperAdmin, teacherId } = useUserRole();
  const { can } = usePermissions();

  // Check for granular permissions
  const canViewAttendance = isSuperAdmin || can(Permission.VIEW_ATTENDANCE);
  const canMarkAttendance = isSuperAdmin || can(Permission.MARK_ATTENDANCE) || 
                            can(Permission.MARK_SELF_ATTENDANCE) ||
                            can(Permission.MARK_ALL_STAFF_ATTENDANCE);
  
  // State declarations - move isAttendanceAlreadyMarked up here
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("all");
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [reasonData, setReasonData] = useState<Record<string, string>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("mark");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [isAttendanceAlreadyMarked, setIsAttendanceAlreadyMarked] = useState(false);
  
  // Determine if user can modify attendance based on permissions
  const canModifyAttendance = canMarkAttendance && !isAttendanceAlreadyMarked;

  // Add a state to track if save is in progress and verification status
  const [saveVerification, setSaveVerification] = useState<{
    inProgress: boolean;
    error: string | null;
    lastSaved: Date | null;
  }>({
    inProgress: false,
    error: null,
    lastSaved: null
  });

  // Add debug flag to track API responses
  const [debugMode, setDebugMode] = useState(false);

  // Fetch classes with both branch and session filters
  const { data: classes, isLoading: isLoadingClasses } = api.class.getAll.useQuery(
    withSessionFilter(withBranchFilter({ 
      includeSections: true 
    })),
    { 
      enabled: !!currentBranchId && !!currentSessionId 
    }
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

  // Set teacher's section as default if they're assigned to sections
  useEffect(() => {
    if (teacherData && teacherData.sections && teacherData.sections.length > 0 && !selectedClassId) {
      const firstSection = teacherData.sections[0];
      if (firstSection?.classId) {
        setSelectedClassId(firstSection.classId);
      }
    }
  }, [teacherData, selectedClassId]);

  // Initialize attendance data when class attendance data is loaded
  useEffect(() => {
    if (classAttendance) {
      const initialAttendanceData: Record<string, AttendanceStatus> = {};
      const initialReasonData: Record<string, string> = {};

      // Check if any student has attendance already marked
      const attendanceAlreadyMarked = classAttendance.students.some(student => 
        student.attendance?.id && typeof student.attendance.id === 'string'
      );
      
      setIsAttendanceAlreadyMarked(attendanceAlreadyMarked);

      classAttendance.students.forEach(student => {
        initialAttendanceData[student.student.id] = student.attendance.status;
        initialReasonData[student.student.id] = student.attendance.reason || '';
      });

      setAttendanceData(initialAttendanceData);
      setReasonData(initialReasonData);
      setIsSaved(true);
    }
  }, [classAttendance]);

  // Add an effect to extract sections from students when data is loaded
  useEffect(() => {
    if (classAttendance?.students) {
      // Extract sections using optional chaining and type assertions
      const sections = classAttendance.students
        .map(s => {
          // Try to access section property safely
          const student = s.student as any;
          return student?.section as string | undefined;
        })
        .filter((section): section is string => 
          !!section && typeof section === 'string'
        )
        .filter((value, index, self) => self.indexOf(value) === index);
      
      setAvailableSections(sections);
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

  // Mark a student as present
  const handleMarkPresent = (studentId: string) => {
    if (!canModifyAttendance) return; // Don't allow changes if no permission
    
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: AttendanceStatus.PRESENT
    }));
    setIsSaved(false);
  };

  // Mark a student as absent
  const handleMarkAbsent = (studentId: string) => {
    if (!canModifyAttendance) return; // Don't allow changes if no permission
    
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: AttendanceStatus.ABSENT
    }));
    // Show reason input for absent students
    setIsSaved(false);
  };

  // Mark a student as late
  const handleMarkLate = (studentId: string) => {
    if (!canModifyAttendance) return; // Don't allow changes if no permission
    
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: AttendanceStatus.LATE
    }));
    setIsSaved(false);
  };

  // Handle status change from dropdown
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!canModifyAttendance) return; // Don't allow changes if no permission
    
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
    setIsSaved(false);
  };

  // Handle reason change
  const handleReasonChange = (studentId: string, reason: string) => {
    if (!canModifyAttendance) return; // Don't allow changes if no permission
    
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

  // Enhance the save function for better database persistence and verification
  const handleSaveAttendance = async () => {
    if (!canModifyAttendance) {
      toast.error("You don't have permission to save attendance");
      return;
    }

    if (!selectedClassId || !classAttendance) {
      toast.error("Cannot save: Missing class or attendance data");
      return;
    }

    // Set saving state
    setSaveVerification(prev => ({ ...prev, inProgress: true, error: null }));

    try {
      // Format attendance records
      const attendanceRecords = classAttendance.students.map(student => ({
        studentId: student.student.id,
        status: attendanceData[student.student.id] || AttendanceStatus.PRESENT,
        reason: reasonData[student.student.id] || undefined,
        notes: undefined
      }));

      // Log data being sent if in debug mode
      if (debugMode) {
        console.log("Saving attendance data:", {
          classId: selectedClassId,
          date: selectedDate,
          attendanceCount: attendanceRecords.length,
          markedById: teacherId
        });
      }

      // Call the mutation with proper error handling
      await new Promise<void>((resolve, reject) => {
        bulkMarkAttendance(
          {
            classId: selectedClassId,
            date: selectedDate,
            attendance: attendanceRecords,
            markedById: teacherId
          },
          {
            onSuccess: () => {
              resolve();
            },
            onError: (error) => {
              reject(error);
            }
          }
        );
      });

      // If we got here, the save was successful
      toast.success(`Attendance saved successfully for ${filteredStudents.length} students`);
      setIsSaved(true);
      setSaveDialogOpen(false);
      setSaveVerification(prev => ({ 
        ...prev, 
        inProgress: false, 
        lastSaved: new Date() 
      }));

      // Verify the saved data by refetching
      await refetchAttendance();

      // Double-check that data was saved correctly
      if (debugMode) {
        console.log("Refetched attendance data:", classAttendance);
      }

    } catch (error) {
      // Handle errors with more detail
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to save attendance: ${errorMessage}`);
      setSaveVerification(prev => ({ 
        ...prev, 
        inProgress: false, 
        error: errorMessage 
      }));
      console.error("Error saving attendance:", error);
    }
  };

  // Export attendance data as CSV
  const handleExportData = () => {
    if (!classAttendance) return;

    // Create CSV content
    const csvContent = [
      // CSV Header
      ["Roll No", "Student Name", "Status", "Reason"],
      // CSV Data
      ...classAttendance.students.map(({ student }) => [
        student.rollNumber || "",
        `${student.firstName} ${student.lastName}`,
        getStatusName(attendanceData[student.id] || AttendanceStatus.PRESENT),
        reasonData[student.id] || ""
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const className = classes?.find(c => c.id === selectedClassId)?.name || "Class";
    link.setAttribute("href", url);
    link.setAttribute("download", `${className}_attendance_${format(selectedDate, "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate attendance summary
  const attendanceSummary = useMemo(() => {
    if (!classAttendance) {
      return {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        presentPercentage: 0
      };
    }

    const total = classAttendance.students.length;
    const present = Object.values(attendanceData).filter(status => status === AttendanceStatus.PRESENT).length;
    const absent = Object.values(attendanceData).filter(status => status === AttendanceStatus.ABSENT).length;
    const late = Object.values(attendanceData).filter(status => status === AttendanceStatus.LATE).length;
    const presentPercentage = total > 0 ? (present / total) * 100 : 0;

    return {
      total,
      present,
      absent,
      late,
      presentPercentage
    };
  }, [classAttendance, attendanceData]);

  // Filter and search students
  const filteredStudents = useMemo(() => {
    if (!classAttendance) return [];

    // First filter the students
    const filtered = classAttendance.students.filter(({ student }) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const rollNumber = student.rollNumber?.toLowerCase() || "";
      const searchMatch = searchQuery 
        ? fullName.includes(searchQuery.toLowerCase()) || rollNumber.includes(searchQuery.toLowerCase())
        : true;
      
      const statusMatch = showAbsentOnly 
        ? attendanceData[student.id] === AttendanceStatus.ABSENT
        : true;
      
      // Access section property safely using type assertion
      const studentSection = (student as any)?.section;
      const sectionMatch = selectedSectionFilter === "all" || studentSection === selectedSectionFilter;
      
      return searchMatch && statusMatch && sectionMatch;
    });

    // Then sort the filtered students by roll number
    return filtered.sort((a, b) => {
      // Get roll numbers, defaulting to empty string if undefined
      const rollA = a.student.rollNumber || "";
      const rollB = b.student.rollNumber || "";

      // Try numeric sorting first if both roll numbers are numeric
      const numA = parseInt(rollA, 10);
      const numB = parseInt(rollB, 10);

      // If both are valid numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // Otherwise sort lexicographically (alphabetically)
      return rollA.localeCompare(rollB);
    });
  }, [classAttendance, searchQuery, showAbsentOnly, attendanceData, selectedSectionFilter]);

  // Get current class name
  const currentClassName = useMemo(() => {
    if (!selectedClassId || !classes) return "";
    const currentClass = classes.find(c => c.id === selectedClassId);
    return currentClass ? currentClass.name : "";
  }, [selectedClassId, classes]);

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
                <Skeleton className="h-64 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center">
          <div className="bg-[#00501B] dark:bg-[#7aad8c] h-8 w-1.5 rounded-md mr-3"></div>
          <h1 className="text-2xl font-bold">Student Attendance</h1>
        </div>

        {/* Main Content */}
        <Card className="border border-[#00501B]/10 dark:border-[#7aad8c]/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Attendance Management</CardTitle>
                <CardDescription>
                  {selectedClassId ? 
                    `Mark and manage attendance for ${currentClassName}${selectedSectionFilter !== "all" ? ` - Section ${selectedSectionFilter}` : ""}` : 
                    "Select a class to manage attendance"}
                </CardDescription>
              </div>
              
              {/* Show controls only if the user has marking permissions */}
              {canMarkAttendance && (
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!isSaved || !selectedClassId}
                    onClick={() => setActiveTab("mark")}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Mark Attendance
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!classAttendance}
                    onClick={handleExportData}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button 
                    variant={!isSaved ? "default" : "outline"}
                    size="sm" 
                    onClick={() => setSaveDialogOpen(true)}
                    disabled={isSaved || !selectedClassId || isAttendanceAlreadyMarked || isLoadingAttendance || !classAttendance}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {selectedClassId ? (
            <>
              <Tabs defaultValue="mark" value={activeTab} onValueChange={setActiveTab} className="px-6">
                <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-2 mb-4 bg-muted p-1 rounded-lg">
                  <TabsTrigger value="mark" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-[#7aad8c] data-[state=active]:shadow-sm">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-[#00501B] dark:data-[state=active]:text-[#7aad8c] data-[state=active]:shadow-sm">
                    <BarChart4 className="h-4 w-4 mr-2" />
                    Class Overview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mark" className="mt-0">
                  {/* Attendance Controls */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6">
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      <DateNavigation 
                        date={selectedDate} 
                        onChange={handleDateChange}
                      />
                    
                      <div className="flex items-center gap-2 ml-auto md:ml-0">
                        <QuickDateSelect onChange={handleDateChange} />
                        <ImprovedDatePicker
                          value={selectedDate}
                          onChange={handleDateChange}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Select
                        value={selectedSectionFilter}
                        onValueChange={setSelectedSectionFilter}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="All Sections" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sections</SelectItem>
                          {availableSections.map(section => (
                            <SelectItem key={section} value={section}>
                              Section {section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="relative flex-1 md:flex-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          type="text"
                          placeholder="Search students..."
                          className="pl-8 h-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Label htmlFor="absent-only" className="text-sm whitespace-nowrap">
                          Absent Only
                        </Label>
                        <Switch
                          id="absent-only"
                          checked={showAbsentOnly}
                          onCheckedChange={setShowAbsentOnly}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Show notification if attendance already marked */}
                  {isAttendanceAlreadyMarked && (
                    <Alert className="mb-6 border-yellow-500">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertTitle>Attendance already marked</AlertTitle>
                      <AlertDescription>
                        Attendance records already exist for this class on {format(selectedDate, "MMMM d, yyyy")}.
                        Remarking attendance is not allowed. Please select a different date to mark new attendance.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Attendance Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <AttendanceSummaryCard
                      title="Present"
                      count={attendanceSummary.present}
                      total={attendanceSummary.total}
                      color="bg-green-50 text-green-700"
                    />
                    <AttendanceSummaryCard
                      title="Absent"
                      count={attendanceSummary.absent}
                      total={attendanceSummary.total}
                      color="bg-red-50 text-red-700"
                    />
                    <AttendanceSummaryCard
                      title="Late"
                      count={attendanceSummary.late}
                      total={attendanceSummary.total}
                      color="bg-orange-50 text-orange-700"
                    />
                    <AttendanceSummaryCard
                      title="Total"
                      count={attendanceSummary.total}
                      total={attendanceSummary.total}
                      color="bg-blue-50 text-blue-700"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkStatusChange(AttendanceStatus.PRESENT)}
                      className="flex items-center"
                      disabled={isAttendanceAlreadyMarked}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      All Present
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkStatusChange(AttendanceStatus.ABSENT)}
                      className="flex items-center"
                      disabled={isAttendanceAlreadyMarked}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      All Absent
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto" disabled={isAttendanceAlreadyMarked}>
                          <ListFilter className="h-4 w-4 mr-2" />
                          More Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleBulkStatusChange(AttendanceStatus.LATE)}>
                          Mark All Late
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusChange(AttendanceStatus.LEAVE)}>
                          Mark All Leave
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportData}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Export as CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Students Table */}
                  {isLoadingAttendance ? (
                    <div className="space-y-4 py-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]"><Hash className="h-4 w-4" /></TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="w-[100px]">Section</TableHead>
                            <TableHead className="w-[150px]">Status</TableHead>
                            <TableHead className="w-[250px]">Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map(({ student }, index) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.rollNumber || index + 1}</TableCell>
                              <TableCell>
                                <div className="font-medium">{student.firstName} {student.lastName}</div>
                              </TableCell>
                              <TableCell>
                                {((student as any)?.section) || "-"}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={attendanceData[student.id] || AttendanceStatus.PRESENT}
                                  onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                                  disabled={!canModifyAttendance}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={`${getStatusColor(
                                            attendanceData[student.id] || AttendanceStatus.PRESENT
                                          )} whitespace-nowrap`}
                                        >
                                          {getStatusName(attendanceData[student.id] || AttendanceStatus.PRESENT)}
                                        </Badge>
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={AttendanceStatus.PRESENT}>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-700 border-green-200"
                                        >
                                          Present
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value={AttendanceStatus.ABSENT}>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className="bg-red-50 text-red-700 border-red-200"
                                        >
                                          Absent
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value={AttendanceStatus.LATE}>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className="bg-orange-50 text-orange-700 border-orange-200"
                                        >
                                          Late
                                        </Badge>
                                      </div>
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
                                  disabled={!canModifyAttendance}
                                />
                              </TableCell>
                              <TableCell>
                                {canModifyAttendance && (
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
                                      onClick={() => handleMarkLate(student.id)}
                                      className="h-8 w-8 rounded-full bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
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
                  ) : searchQuery || showAbsentOnly ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
                      <h3 className="text-lg font-medium">No matching students</h3>
                      <p>Try adjusting your search or filters.</p>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
                      <h3 className="text-lg font-medium">No students found</h3>
                      <p>There are no students in this class.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Attendance Summary Card */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Attendance Summary</CardTitle>
                        <CardDescription>Overall class attendance statistics</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Present Rate</span>
                            <span className="text-sm text-[#00501B] dark:text-[#7aad8c] font-semibold">
                              {attendanceSummary.presentPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={attendanceSummary.presentPercentage} className="h-2 bg-gray-100" />
                          
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Present</span>
                              <span className="text-lg font-semibold text-green-600">{attendanceSummary.present}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Absent</span>
                              <span className="text-lg font-semibold text-red-600">{attendanceSummary.absent}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Late</span>
                              <span className="text-lg font-semibold text-orange-600">{attendanceSummary.late}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Total</span>
                              <span className="text-lg font-semibold">{attendanceSummary.total}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Recent Absences */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Recent Absences</CardTitle>
                        <CardDescription>Students who were absent today</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {filteredStudents.filter(s => 
                          attendanceData[s.student.id] === AttendanceStatus.ABSENT
                        ).length > 0 ? (
                          <div className="space-y-3">
                            {filteredStudents
                              .filter(s => attendanceData[s.student.id] === AttendanceStatus.ABSENT)
                              .slice(0, 5)
                              .map(({ student }) => (
                                <div key={student.id} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                                      <UserX className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                                      <p className="text-xs text-muted-foreground">Roll: {student.rollNumber || "N/A"}</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                    Absent
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            <CheckCheck className="mx-auto h-8 w-8 text-green-500 mb-2" />
                            <p className="text-sm">No absences recorded today</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Attendance Actions */}
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
                        <CardDescription>Common attendance tasks</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Export Current Data
                        </Button>
                        <Button variant="outline" className="w-full justify-start" 
                          onClick={() => setActiveTab("mark")}>
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Mark Today's Attendance
                        </Button>
                        <Separator />
                        <div className="rounded-md border p-3">
                          <h4 className="text-sm font-medium mb-2 flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-[#00501B] dark:text-[#7aad8c]" />
                            Select Date to View
                          </h4>
                          <ImprovedDatePicker
                            value={selectedDate}
                            onChange={handleDateChange}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Footer Actions */}
              {activeTab === "mark" && filteredStudents.length > 0 && (
                <CardFooter className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="flex items-center gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Attendance date</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {saveVerification.lastSaved && (
                      <div className="text-xs text-muted-foreground">
                        Last saved: {format(saveVerification.lastSaved, "h:mm:ss a")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <FileDown className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExportData}>
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportData}>
                          Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      onClick={() => { void refetchAttendance(); }}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={() => setSaveDialogOpen(true)}
                      disabled={isSaved || saveVerification.inProgress || isAttendanceAlreadyMarked}
                    >
                      {saveVerification.inProgress ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2">⟳</span> Saving...
                        </span>
                      ) : isSaved ? (
                        <span className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Saved
                        </span>
                      ) : (
                        "Save Attendance"
                      )}
                    </Button>
                  </div>
                </CardFooter>
              )}
            </>
          ) : (
            <CardContent>
              <div className="py-12 text-center text-muted-foreground">
                <Info className="mx-auto h-12 w-12 text-[#00501B] dark:text-[#7aad8c] mb-2" />
                <h3 className="text-lg font-medium">Select a class</h3>
                <p>Please select a class to view and mark attendance.</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Attendance</DialogTitle>
            <DialogDescription>
              Are you sure you want to save attendance for {currentClassName} on{' '}
              {format(selectedDate, 'PPP')}?
            </DialogDescription>
            <div className="mt-2 text-sm text-gray-500">
              <span className="block">Summary of changes:</span>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>{attendanceSummary.present} students marked present</li>
                <li>{attendanceSummary.absent} students marked absent</li>
                <li>{attendanceSummary.late} students marked late</li>
                <li>Total: {attendanceSummary.total} students</li>
              </ul>
              {saveVerification.error && (
                <div className="mt-2 p-2 bg-red-50 text-red-600 rounded-md text-sm">
                  <span className="block font-medium">Previous error:</span>
                  <span>{saveVerification.error}</span>
                </div>
              )}
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAttendance} 
              disabled={saveVerification.inProgress}
              className="relative"
            >
              {saveVerification.inProgress ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span> Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add debug toggle (only visible in development environments) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 right-2 opacity-50 hover:opacity-100 text-xs">
          <div className="flex items-center gap-1">
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
            <Label htmlFor="debug-mode">Debug Mode</Label>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
