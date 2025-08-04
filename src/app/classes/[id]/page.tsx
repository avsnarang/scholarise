"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, 
  Users, 
  Edit, 
  Calendar, 
  Book, 
  Award,
  TrendingUp
} from "lucide-react";
import { api } from "@/utils/api";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { StudentDataTable } from "@/components/classes/student-data-table";

function ClassDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { currentSessionId } = useAcademicSessionContext();
  const [pageSize, setPageSize] = useState(10);
  
  // Get class details
  const { 
    data: classData, 
    isLoading 
  } = api.class.getById.useQuery(
    { id: id, includeSections: true },
    { enabled: !!id }
  );
  
  // Get students for this class using the section API
  const {
    data: studentCount,
    isLoading: isLoadingStudentCount
  } = api.student.getAll.useQuery(
    { 
      sectionId: classData?.sections?.[0]?.id,
      limit: 500 // Set a high limit to get all students in the class
    },
    { 
      enabled: !!classData?.sections?.[0]?.id
    }
  );
  
  // Log student data when it loads
  useEffect(() => {
    if (studentCount) {
      console.log("Student data loaded:", studentCount);
      console.log("Number of students:", studentCount.items?.length || studentCount.totalCount || 0);
    }
  }, [studentCount]);

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
  };
  
  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 p-0"
              asChild
            >
              <Link href="/classes">
                <ChevronLeft className="h-4 w-4" />
                Back to Classes
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }
  
  if (!classData) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <h1 className="text-2xl font-bold">Class Not Found</h1>
          <p className="text-gray-500">The class you are looking for does not exist.</p>
          <Button asChild>
            <Link href="/classes">Back to Classes</Link>
          </Button>
        </div>
      </PageWrapper>
    );
  }

  // Convert the students for the data table
  const students = studentCount?.items?.map((student: any) => ({
    id: student.id,
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    admissionNumber: student.admissionNumber || '',
    isActive: student.isActive
  })) || [];

  // Get student count from either items length or totalCount
  const totalStudents = studentCount?.items?.length || studentCount?.totalCount || 0;
  
  // Calculate paginated students based on current page size
  const paginatedStudents = pageSize >= students.length 
    ? students 
    : students.slice(0, pageSize);

  // Get the first section for display purposes
  const primarySection = classData.sections?.[0];
  
  return (
    <PageWrapper
      title={`${classData.name}${primarySection ? ` - ${primarySection.name}` : ''}`}
      subtitle="View and manage class information"
      action={
        <Button
          onClick={() => router.push(`/settings/classes/${id}/edit`)}
          variant="outline"
          size="sm"
          className="clickable"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Class
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Class details */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {primarySection?.teacherId ? (
                <>Class Teacher: Assigned (ID: {primarySection.teacherId})</>
              ) : (
                <>No class teacher assigned</>
              )}
              {" • "}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {totalStudents}/{primarySection?.capacity || 'N/A'} students
                {primarySection?.capacity && totalStudents && (
                  <span className="inline-flex items-center ml-1">
                    <span className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <span 
                        className={`h-full ${
                          totalStudents / primarySection.capacity > 0.9 ? 'bg-red-500' : 
                          totalStudents / primarySection.capacity > 0.75 ? 'bg-amber-500' : 'bg-green-500'
                        }`} 
                        style={{ 
                          width: `${Math.min(Math.round((totalStudents / primarySection.capacity) * 100), 100)}%` 
                        }}
                      />
                    </span>
                  </span>
                )}
              </span>
              {" • "}
              Session: {classData.session.name || "Unknown"}
              {" • "}
              {classData.isActive ? (
                <span className="text-green-600 dark:text-green-400">Active</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">Inactive</span>
              )}
            </p>
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-[#7aad8c]/10 dark:*:data-[slot=card]:to-[#252525] dark:*:data-[slot=card]:bg-[#252525] grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mb-6">
          <Card className="@container/card dark:border-[#303030]">
            <CardHeader>
              <CardDescription className="dark:text-[#c0c0c0]">Total Students</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
                {isLoadingStudentCount ? <Skeleton className="h-6 w-10 dark:bg-[#303030]" /> : totalStudents}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                  <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                  Students
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
                <Users className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
                {primarySection?.capacity && totalStudents !== undefined ? (
                  <span className="flex items-center gap-2">
                    <span>{totalStudents}/{primarySection.capacity} students ({Math.round((totalStudents / primarySection.capacity) * 100)}%)</span>
                    <span className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <span 
                        className={`h-full ${
                          (totalStudents / primarySection.capacity) > 0.9 ? 'bg-red-500' : 
                          (totalStudents / primarySection.capacity) > 0.75 ? 'bg-amber-500' : 'bg-green-500'
                        }`} 
                        style={{ 
                          width: `${Math.min(Math.round((totalStudents / primarySection.capacity) * 100), 100)}%` 
                        }}
                      />
                    </span>
                  </span>
                ) : (
                  'Capacity not set'
                )}
              </div>
              <div className="text-muted-foreground dark:text-[#c0c0c0]">
                Current enrollment status
              </div>
            </CardFooter>
          </Card>
          
          <Card className="@container/card dark:border-[#303030]">
            <CardHeader>
              <CardDescription className="dark:text-[#c0c0c0]">Subjects</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
                0
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                  <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                  Curriculum
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
                <Book className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
                Subjects assigned to this class
              </div>
              <div className="text-muted-foreground dark:text-[#c0c0c0]">
                Academic curriculum
              </div>
            </CardFooter>
          </Card>
          
          <Card className="@container/card dark:border-[#303030]">
            <CardHeader>
              <CardDescription className="dark:text-[#c0c0c0]">Attendance</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
                --
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                  <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                  Tracking
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
                <Calendar className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
                Average attendance rate
              </div>
              <div className="text-muted-foreground dark:text-[#c0c0c0]">
                Daily attendance records
              </div>
            </CardFooter>
          </Card>
          
          <Card className="@container/card dark:border-[#303030]">
            <CardHeader>
              <CardDescription className="dark:text-[#c0c0c0]">Performance</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
                --
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30">
                  <TrendingUp className="text-[#00501B] dark:text-[#7aad8c]" />
                  Metrics
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
                <Award className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
                Average class performance
              </div>
              <div className="text-muted-foreground dark:text-[#c0c0c0]">
                Academic achievements
              </div>
            </CardFooter>
          </Card>
        </div>
        
        {/* Tabs for class information */}
        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="students" className="mt-4">
            <Card className="dark:bg-[#252525] dark:border-[#303030]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="dark:text-[#e6e6e6]">Students</CardTitle>
                  <CardDescription className="dark:text-[#c0c0c0]">
                    Students enrolled in this class.
                  </CardDescription>
                </div>
                <Button className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90 text-white clickable" onClick={() => router.push(`/classes/${id}/students`)}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Students
                </Button>
              </CardHeader>
              <CardContent>
                {studentCount?.items?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <Users className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No students enrolled</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      There are no students in this class for the selected academic session.
                    </p>
                    <Button 
                      onClick={() => router.push(`/classes/${id}/students`)}
                      variant="outline"
                      className="mt-4"
                    >
                      Manage Students
                    </Button>
                  </div>
                ) : (
                  <StudentDataTable 
                    data={students} 
                    initialPageSize={pageSize}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="subjects" className="mt-4">
            <Card className="dark:bg-[#252525] dark:border-[#303030]">
              <CardHeader>
                <CardTitle className="dark:text-[#e6e6e6]">Subjects</CardTitle>
                <CardDescription className="dark:text-[#c0c0c0]">
                  Subjects taught in this class.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400">Subject information is not available yet.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedule" className="mt-4">
            <Card className="dark:bg-[#252525] dark:border-[#303030]">
              <CardHeader>
                <CardTitle className="dark:text-[#e6e6e6]">Class Schedule</CardTitle>
                <CardDescription className="dark:text-[#c0c0c0]">
                  Weekly schedule for this class.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schedule information is not available yet.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports" className="mt-4">
            <Card className="dark:bg-[#252525] dark:border-[#303030]">
              <CardHeader>
                <CardTitle className="dark:text-[#e6e6e6]">Reports</CardTitle>
                <CardDescription className="dark:text-[#c0c0c0]">
                  Academic reports and performance analytics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400">Report information is not available yet.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicClassDetailPageContent = dynamic(() => Promise.resolve(ClassDetailPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function ClassDetailPage() {
  return <DynamicClassDetailPageContent />;
}
