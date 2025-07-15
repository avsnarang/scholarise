import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  GraduationCap, 
  Users, 
  UserCheck,
  UserX,
  BookOpen,
  Loader2
} from "lucide-react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/utils/api"
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"

interface StudentStatsProps {
  totalStudents: number;
  totalStudentsChange: number;
  activeStudents: number;
  activeStudentsChange: number;
  inactiveStudents: number;
  inactiveStudentsChange: number;
  attendanceRate: number;
  attendanceRateChange: number;
  sessionId?: string;
}

export function StudentStatsCards({
  totalStudents = 0,
  totalStudentsChange = 0,
  activeStudents = 0,
  activeStudentsChange = 0,
  inactiveStudents = 0,
  inactiveStudentsChange = 0,
  attendanceRate = 0,
  attendanceRateChange = 0,
  sessionId
}: Partial<StudentStatsProps>) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const branchId = getBranchFilterParam();
  
  // Fetch real stats from API
  const { data: stats, isLoading, error } = api.student.getStats.useQuery({
    branchId,
    sessionId
  });

  // Log for debugging
  // console.log('Branch ID:', branchId);
  // console.log('Session ID:', sessionId);
  // console.log('Stats:', stats);
  // console.log('Error:', error);

  // Use API stats if available
  const displayStats = {
    totalStudents: stats?.totalStudents ?? totalStudents,
    activeStudents: stats?.activeStudents ?? activeStudents,
    inactiveStudents: stats?.inactiveStudents ?? inactiveStudents,
    attendanceRate: attendanceRate // We'll keep this one static for now
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-[#7AAD8B]" />
        <span className="sr-only">Loading stats...</span>
      </div>
    );
  }

  if (error) {
    console.error('Error fetching student stats:', error);
  }

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Students</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.totalStudents.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalStudentsChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {totalStudentsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalStudentsChange >= 0 ? "+" : ""}{totalStudentsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <GraduationCap className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            {sessionId ? "Current academic session" : "All academic sessions"}
          </div>
          <div className="text-muted-foreground">
            {sessionId ? "Showing students for selected session" : "Showing all students"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Students</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.activeStudents.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={activeStudentsChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {activeStudentsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {activeStudentsChange >= 0 ? "+" : ""}{activeStudentsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <UserCheck className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Active Students
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalStudents > 0
              ? `${Math.round((displayStats.activeStudents / displayStats.totalStudents) * 100)}% of total student body`
              : "No students found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Inactive Students</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.inactiveStudents.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={inactiveStudentsChange <= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {inactiveStudentsChange <= 0 ? (
                <IconTrendingDown className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingUp className="text-[#A65A20]" />
              )}
              {inactiveStudentsChange >= 0 ? "+" : ""}{inactiveStudentsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <UserX className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Inactive Students
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalStudents > 0
              ? `${Math.round((displayStats.inactiveStudents / displayStats.totalStudents) * 100)}% of total student body`
              : "No students found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Attendance Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.attendanceRate}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={attendanceRateChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {attendanceRateChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {attendanceRateChange >= 0 ? "+" : ""}{attendanceRateChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <BookOpen className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Average Attendance
          </div>
          <div className="text-muted-foreground">
            Estimated attendance rate
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
