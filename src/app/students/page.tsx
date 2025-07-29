"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PageTitle } from "@/components/page-title";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { StudentsDataTable } from "@/components/students-data-table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardAction,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart, BarChart, AreaChart } from "@/components/ui/shadcn-charts";
import { Badge } from "@/components/ui/badge";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { 
  GraduationCap, 
  Users, 
  UserPlus,
  BookOpen, 
  School, 
  CalendarClock, 
  BarChart3, 
  UserCheck, 
  UserX,
  Award,
  Target,
  MapPin,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { StudentManagementPageGuard } from "@/components/auth/page-guard";

// Type definitions for API responses
interface AcademicSession {
  id: string;
  name: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
}

function StudentsDashboardContent() {
  const { currentBranchId } = useBranchContext();
  const { isSuperAdmin } = usePermissions();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [selectedAcademicSessionId, setSelectedAcademicSessionId] = useState<string | undefined>(undefined);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  
  // Fetch student data with optional branch filter
  const { data: studentData, isLoading: isLoadingStudentData } = api.student.getAll.useQuery(
    { 
      branchId: currentBranchId || "",
      limit: 10,
      filters: {
        isActive: "true"
      }
    },
    { 
      enabled: !!currentBranchId,
    }
  );
  
  // Get student statistics
  const { data: studentStats, isLoading: isLoadingStats } = api.student.getStats.useQuery(
    { 
      branchId: currentBranchId || undefined,
      sessionId: selectedAcademicSessionId
    },
    { 
      enabled: !!currentBranchId,
      refetchOnWindowFocus: false
    }
  );

  // Get academic sessions
  const { data: academicSessions } = api.dashboard.getAcademicSessions.useQuery(
    undefined
  );

  // Set initial academic session when data is loaded
  useEffect(() => {
    if (academicSessions && academicSessions.length > 0 && !selectedAcademicSessionId) {
      // Find active session or use the most recent one
      const activeSession = academicSessions.find((session: AcademicSession) => session.isActive);
      setSelectedAcademicSessionId(activeSession?.id || academicSessions[0]?.id);
    }
  }, [academicSessions, selectedAcademicSessionId]);
  
  // Process the student data when it's available
  useEffect(() => {
    setIsLoadingStudents(true);
    
    if (studentData) {
      try {
        // Transform the response into the format expected by StudentsDataTable
        const students = studentData.items || [];
        const formattedData = students.map((student: any) => ({
          id: student.id,
          header: `${student.firstName} ${student.lastName}`,
          type: student.class?.name || "N/A",
          status: student.isActive ? "Active" : "Inactive",
          target: `${student.academicPerformance || 90}%`,
          limit: `${student.attendanceRate || 95}%`,
          reviewer: student.class?.teacher?.firstName 
            ? `${student.class.teacher.firstName} ${student.class.teacher.lastName}`
            : "N/A" 
        }));
        
        setTopStudents(formattedData);
      } catch (error) {
        console.error("Error processing student data:", error);
      }
      
      setIsLoadingStudents(false);
    }
  }, [studentData]);

  // Prepare data for charts
  const genderDistribution = studentStats?.genderDistribution 
    ? Object.entries(studentStats.genderDistribution).map(([gender, count]) => ({
        name: gender,
        value: count
      }))
    : [
        { name: "Male", value: 65 },
        { name: "Female", value: 35 }
      ];

  // Use real data if available, otherwise fallback to sample data
  const attendanceData = [
    { name: "Present", value: 85 },
    { name: "Absent", value: 10 },
    { name: "Late", value: 5 }
  ];
  
  // Class distribution data from student stats
  const classDistribution = studentStats?.classCounts 
    ? Object.entries(studentStats.classCounts).map(([name, count]) => ({
        name,
        value: count
      }))
    : [];

  // Sample change percentages (to be replaced with real data)
  const totalStudentsChange = 3.2;
  const activeStudentsChange = 2.8;
  const inactiveStudentsChange = -1.5;
  const attendanceChange = 0.7;

  // Sample data for enrollment trends
  const enrollmentTrends = [
    { month: "Jan", students: 420 },
    { month: "Feb", students: 430 },
    { month: "Mar", students: 448 },
    { month: "Apr", students: 470 },
    { month: "May", students: 480 },
    { month: "Jun", students: 460 },
    { month: "Jul", students: 475 },
    { month: "Aug", students: 490 },
    { month: "Sep", students: 520 },
    { month: "Oct", students: 535 },
    { month: "Nov", students: 542 },
    { month: "Dec", students: 547 }
  ];

  // Sample data for academic performance
  const academicPerformance = [
    { subject: "Math", average: 78, name: "Math", value: 78 },
    { subject: "Science", average: 82, name: "Science", value: 82 },
    { subject: "English", average: 74, name: "English", value: 74 },
    { subject: "History", average: 85, name: "History", value: 85 },
    { subject: "Arts", average: 92, name: "Arts", value: 92 },
    { subject: "P.E.", average: 88, name: "P.E.", value: 88 }
  ];

  // Sample data for monthly attendance tracking
  const monthlyAttendance = [
    { month: "Jan", present: 92, absent: 8 },
    { month: "Feb", present: 94, absent: 6 },
    { month: "Mar", present: 91, absent: 9 },
    { month: "Apr", present: 88, absent: 12 },
    { month: "May", present: 93, absent: 7 },
    { month: "Jun", present: 95, absent: 5 },
    { month: "Jul", present: 97, absent: 3 },
    { month: "Aug", present: 96, absent: 4 },
    { month: "Sep", present: 92, absent: 8 },
    { month: "Oct", present: 90, absent: 10 },
    { month: "Nov", present: 89, absent: 11 },
    { month: "Dec", present: 93, absent: 7 }
  ];

  // Sample key insights
  const keyInsights = [
    { icon: <TrendingUp className="text-green-500" />, text: "Overall attendance rate has improved by 3.2% this semester" },
    { icon: <Award className="text-amber-500" />, text: "Science subjects seeing highest student engagement" },
    { icon: <AlertTriangle className="text-red-500" />, text: "7% of students have attendance below 80% threshold" },
    { icon: <UserPlus className="text-blue-500" />, text: "New student admissions increased by 12% this year" }
  ];

  return (
    <PageWrapper title="Students Dashboard" subtitle="Overview of student metrics, attendance, and performance">
      {/* Academic Session Selector and Highlights */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-auto">
          <div className="bg-[#00501B]/5 rounded-lg px-4 py-3 border border-[#00501B]/10">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#00501B]" />
              <h2 className="text-lg font-semibold">Student Analytics Dashboard</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              {!isLoadingStats && studentStats?.totalStudents ? 
                `Showing data for ${studentStats.totalStudents.toLocaleString()} students` : 
                "Loading student data..."}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center space-x-2 bg-white/50 rounded-md px-3 py-2 border shadow-sm">
            <span className="text-sm font-medium">Academic Session:</span>
            <select 
              className="px-2 py-1 border rounded-md text-sm bg-white"
              value={selectedAcademicSessionId}
              onChange={(e) => setSelectedAcademicSessionId(e.target.value)}
              disabled={!academicSessions || academicSessions.length === 0}
            >
              {academicSessions?.map((session: AcademicSession) => (
                <option key={session.id} value={session.id}>
                  {session.name} {session.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white/50 rounded-lg border border-[#00501B]/10 p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-[#00501B]" />
          <h3 className="font-medium">Key Insights</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {keyInsights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 bg-white rounded-md p-3 shadow-sm">
              <div className="mt-0.5">{insight.icon}</div>
              <p className="text-sm">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-0 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-sm lg:px-0 @xl/main:grid-cols-2 @3xl/main:grid-cols-4">
        <Card className="@container/card border border-[#00501B]/10">
          <CardHeader>
            <CardDescription>Total Students</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (studentStats?.totalStudents || 0).toLocaleString()
              )}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className={totalStudentsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
                {totalStudentsChange >= 0 ? (
                  <IconTrendingUp className="text-[#00501B]" />
                ) : (
                  <IconTrendingDown className="text-[#A65A20]" />
                )}
                {totalStudentsChange >= 0 ? "+" : ""}{totalStudentsChange}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <GraduationCap className="size-4 text-[#00501B]" /> 
              {selectedAcademicSessionId ? "Current Academic Session" : "All Academic Sessions"}
            </div>
            <div className="text-muted-foreground">
              Total enrolled students
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card border border-[#00501B]/10">
          <CardHeader>
            <CardDescription>Active Students</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (studentStats?.activeStudents || 0).toLocaleString()
              )}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className={activeStudentsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
                {activeStudentsChange >= 0 ? (
                  <IconTrendingUp className="text-[#00501B]" />
                ) : (
                  <IconTrendingDown className="text-[#A65A20]" />
                )}
                {activeStudentsChange >= 0 ? "+" : ""}{activeStudentsChange}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <UserCheck className="size-4 text-[#00501B]" /> 
              Currently Active
            </div>
            <div className="text-muted-foreground">
              {studentStats?.totalStudents ? 
                `${Math.round((studentStats.activeStudents / studentStats.totalStudents) * 100)}% of total student body` :
                "No students found"
              }
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card border border-[#00501B]/10">
          <CardHeader>
            <CardDescription>Inactive Students</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (studentStats?.inactiveStudents || 0).toLocaleString()
              )}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className={inactiveStudentsChange <= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
                {inactiveStudentsChange <= 0 ? (
                  <IconTrendingDown className="text-[#00501B]" />
                ) : (
                  <IconTrendingUp className="text-[#A65A20]" />
                )}
                {inactiveStudentsChange >= 0 ? "+" : ""}{inactiveStudentsChange}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <UserX className="size-4 text-[#00501B]" /> 
              Currently Inactive
            </div>
            <div className="text-muted-foreground">
              {studentStats?.totalStudents ? 
                `${Math.round((studentStats.inactiveStudents / studentStats.totalStudents) * 100)}% of total student body` :
                "No students found"
              }
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card border border-[#00501B]/10">
          <CardHeader>
            <CardDescription>Attendance Rate</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                "85%"
              )}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className={attendanceChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
                {attendanceChange >= 0 ? (
                  <IconTrendingUp className="text-[#00501B]" />
                ) : (
                  <IconTrendingDown className="text-[#A65A20]" />
                )}
                {attendanceChange >= 0 ? "+" : ""}{attendanceChange}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <CalendarClock className="size-4 text-[#00501B]" /> 
              Average Attendance
            </div>
            <div className="text-muted-foreground">
              In the current academic session
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {/* Analytics Tabs */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-md h-12 grid grid-cols-3 bg-muted/30 p-1 rounded-lg gap-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#00501B] data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-muted/80 rounded-md text-sm flex items-center justify-center transition-all duration-200"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="attendance" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#00501B] data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-muted/80 rounded-md text-sm flex items-center justify-center transition-all duration-200"
            >
              <CalendarClock className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#00501B] data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-muted/80 rounded-md text-sm flex items-center justify-center transition-all duration-200"
            >
              <Award className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              {/* Enrollment Trends */}
              <Card className="shadow-sm border border-[#00501B]/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-[#00501B]" />
                    Student Enrollment Trends
                  </CardTitle>
                  <CardDescription>
                    Historical enrollment data over the past year
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <AreaChart 
                      data={enrollmentTrends}
                      index="month"
                      categories={["students"]}
                      colors={["#00501B"]}
                      valueFormatter={(value: number) => `${value} students`}
                      showAnimation={true}
                      title="Enrollment Trends"
                      subtitle="Student enrollment over time"
                      containerClassName="h-[300px]"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Gender Distribution */}
                <Card className="shadow-sm border border-[#00501B]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Users className="h-4 w-4 mr-2 text-[#00501B]" />
                      Gender Distribution
                    </CardTitle>
                    <CardDescription>
                      {!studentStats?.genderDistribution && "Sample data - "}
                      Student body demographics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-4">
                      <DonutChart 
                        data={genderDistribution} 
                        colors={["#00501B", "#A65A20"]} 
                        valueFormatter={(value: number) => `${value} students`}
                        showAnimation={true}
                        containerClassName="h-[280px]"
                        title="Gender Distribution"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {genderDistribution.map((item, index) => (
                        <div key={index} className="flex flex-col items-center border rounded p-2">
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-2xl font-bold">{item.value}%</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Class Distribution */}
                <Card className="shadow-sm border border-[#00501B]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <School className="h-4 w-4 mr-2 text-[#00501B]" />
                      Class Distribution
                    </CardTitle>
                    <CardDescription>
                      Students by class section
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <div className="flex items-center justify-center h-[220px]">
                        <Skeleton className="h-[180px] w-full" />
                      </div>
                    ) : classDistribution.length > 0 ? (
                      <div className="h-[220px]">
                        <BarChart 
                          data={classDistribution} 
                          xAxisKey="name"
                          yAxisKey="value"
                          color="#00501B"
                          showAnimation={true}
                          valueFormatter={(value: number) => `${value} students`}
                          title="Student Distribution by Class"
                          subtitle="Number of students in each class"
                          containerClassName="h-[300px]"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                        <div className="text-center">
                          <School className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                          <p>No class distribution data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Geographic Distribution */}
                <Card className="shadow-sm border border-[#00501B]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-[#00501B]" />
                      Geographic Distribution
                    </CardTitle>
                    <CardDescription>
                      Students by location (Sample)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 pt-2">
                      {[
                        { location: "City Area", percentage: 45 },
                        { location: "Suburban Area", percentage: 30 },
                        { location: "Rural District", percentage: 15 },
                        { location: "Other Regions", percentage: 10 }
                      ].map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{item.location}</span>
                            <span className="font-medium">{item.percentage}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded overflow-hidden">
                            <div 
                              className="h-full bg-[#00501B]" 
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="attendance" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Overview */}
                <Card className="shadow-sm border border-[#00501B]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <CalendarClock className="h-4 w-4 mr-2 text-[#00501B]" />
                      Attendance Overview
                    </CardTitle>
                    <CardDescription>
                      Current academic session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-4">
                      <DonutChart 
                        data={attendanceData} 
                        colors={["#00501B", "#A65A20", "#0747A1"]}
                        valueFormatter={(value: number) => `${value}%`}
                        showAnimation={true}
                        containerClassName="h-[280px]"
                        title="Attendance Overview"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {attendanceData.map((item, index) => (
                        <div key={index} className="flex flex-col items-center border rounded p-2">
                          <div className="text-xs font-medium">{item.name}</div>
                          <div className="text-xl font-bold">{item.value}%</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Attendance Trends */}
                <Card className="shadow-sm border border-[#00501B]/10 lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-[#00501B]" />
                      Monthly Attendance Trends
                    </CardTitle>
                    <CardDescription>
                      Yearly attendance patterns (Sample data)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <AreaChart 
                        data={monthlyAttendance}
                        index="month"
                        categories={["present", "absent"]}
                        colors={["#00501B", "#A65A20"]}
                        valueFormatter={(value: number) => `${value}%`}
                        showAnimation={true}
                        title="Monthly Attendance Patterns"
                        subtitle="Present vs. absent rates throughout the year"
                        containerClassName="h-[300px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Perfect Attendance", value: "23%", icon: <Award className="h-8 w-8 text-[#00501B]/30" />, description: "Students with 100% attendance" },
                  { title: "Average Absences", value: "2.3", icon: <UserX className="h-8 w-8 text-[#A65A20]/30" />, description: "Per student per month" },
                  { title: "Tardy Rate", value: "5%", icon: <CalendarClock className="h-8 w-8 text-[#0747A1]/30" />, description: "Students arriving late" },
                  { title: "Attendance Alerts", value: "7%", icon: <AlertTriangle className="h-8 w-8 text-red-500/30" />, description: "Below 80% threshold" }
                ].map((metric, index) => (
                  <Card key={index} className="shadow-sm border border-[#00501B]/10">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                          <div className="text-2xl font-bold mt-1">{metric.value}</div>
                          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                        </div>
                        <div className="mt-1">{metric.icon}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Academic Performance by Subject */}
                <Card className="shadow-sm border border-[#00501B]/10 lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-[#00501B]" />
                      Academic Performance by Subject
                    </CardTitle>
                    <CardDescription>
                      Average performance across subjects (Sample data)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <BarChart 
                        data={academicPerformance} 
                        xAxisKey="subject"
                        yAxisKey="average"
                        color="#00501B"
                        showAnimation={true}
                        valueFormatter={(value: number) => `${value}%`}
                        title="Academic Performance"
                        subtitle="Average scores by subject"
                        containerClassName="h-[300px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Overall Academic Status */}
                <Card className="shadow-sm border border-[#00501B]/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Award className="h-4 w-4 mr-2 text-[#00501B]" />
                      Overall Academic Status
                    </CardTitle>
                    <CardDescription>
                      Performance distribution (Sample)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="relative w-56 h-56 flex items-center justify-center mb-4">
                        <ProgressCircle value={82} size="large" color="#00501B" showAnimation />
                        <div className="absolute flex flex-col items-center">
                          <span className="text-4xl font-bold">82%</span>
                          <span className="text-sm text-muted-foreground">Avg. Score</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 w-full mt-2">
                        {[
                          { label: "Above 90%", value: "24%" },
                          { label: "75% - 90%", value: "42%" },
                          { label: "60% - 75%", value: "28%" },
                          { label: "Below 60%", value: "6%" }
                        ].map((item, index) => (
                          <div key={index} className="text-center p-2 border rounded">
                            <div className="text-xs text-muted-foreground">{item.label}</div>
                            <div className="text-base font-medium">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Honor Roll", value: "18%", icon: <Award className="h-8 w-8 text-[#00501B]/30" />, description: "Top performing students" },
                  { title: "Improvement", value: "+3.2%", icon: <TrendingUp className="h-8 w-8 text-[#00501B]/30" />, description: "From previous term" },
                  { title: "Avg. GPA", value: "3.4", icon: <BookOpen className="h-8 w-8 text-[#0747A1]/30" />, description: "On a 4.0 scale" },
                  { title: "Academic Alerts", value: "5%", icon: <AlertTriangle className="h-8 w-8 text-red-500/30" />, description: "Below passing threshold" }
                ].map((metric, index) => (
                  <Card key={index} className="shadow-sm border border-[#00501B]/10">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                          <div className="text-2xl font-bold mt-1">{metric.value}</div>
                          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                        </div>
                        <div className="mt-1">{metric.icon}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

export default function StudentsDashboard() {
  return (
    <StudentManagementPageGuard>
      <StudentsDashboardContent />
    </StudentManagementPageGuard>
  );
} 