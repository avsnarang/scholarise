"use client";

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  BookOpen, 
  Users, 
  CheckCircle,
  XCircle,
  GraduationCap,
  Loader2
} from "lucide-react"
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
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"

interface SubjectStatsProps {
  totalSubjects: number;
  totalSubjectsChange: number;
  activeSubjects: number;
  activeSubjectsChange: number;
  inactiveSubjects: number;
  inactiveSubjectsChange: number;
  assignedToClasses: number;
  assignedToClassesChange: number;
}

export function SubjectStatsCards({
  totalSubjects = 0,
  totalSubjectsChange = 0,
  activeSubjects = 0,
  activeSubjectsChange = 0,
  inactiveSubjects = 0,
  inactiveSubjectsChange = 0,
  assignedToClasses = 0,
  assignedToClassesChange = 0,
}: Partial<SubjectStatsProps>) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const { currentSessionId } = useAcademicSessionContext();
  const branchId = getBranchFilterParam();
  
  // Fetch real stats from API
  const { data: subjectsData, isLoading, error } = api.subject.getAll.useQuery({
    branchId,
  });

  const subjects = subjectsData?.items || [];

  // Calculate stats from the data
  const displayStats = {
    totalSubjects: subjects.length,
    activeSubjects: subjects.filter(s => s.isActive).length,
    inactiveSubjects: subjects.filter(s => !s.isActive).length,
    assignedToClasses: 0 // Classes relationship not included in API response
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B]" />
        <span className="sr-only">Loading stats...</span>
      </div>
    );
  }

  if (error) {
    console.error('Error fetching subject stats:', error);
  }

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Subjects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.totalSubjects.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalSubjectsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {totalSubjectsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalSubjectsChange >= 0 ? "+" : ""}{totalSubjectsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <BookOpen className="size-4 text-[#00501B]" /> 
            All Subjects
          </div>
          <div className="text-muted-foreground">
            Total subjects in the curriculum
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Subjects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.activeSubjects.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={activeSubjectsChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {activeSubjectsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {activeSubjectsChange >= 0 ? "+" : ""}{activeSubjectsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <CheckCircle className="size-4 text-[#00501B]" /> 
            Active Subjects
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalSubjects > 0
              ? `${Math.round((displayStats.activeSubjects / displayStats.totalSubjects) * 100)}% of total subjects`
              : "No subjects found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Inactive Subjects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.inactiveSubjects.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={inactiveSubjectsChange <= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {inactiveSubjectsChange <= 0 ? (
                <IconTrendingDown className="text-[#00501B]" />
              ) : (
                <IconTrendingUp className="text-[#A65A20]" />
              )}
              {inactiveSubjectsChange >= 0 ? "+" : ""}{inactiveSubjectsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <XCircle className="size-4 text-[#00501B]" /> 
            Inactive Subjects
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalSubjects > 0
              ? `${Math.round((displayStats.inactiveSubjects / displayStats.totalSubjects) * 100)}% of total subjects`
              : "No subjects found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Assigned to Classes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.assignedToClasses.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={assignedToClassesChange >= 0 ? "text-[#00501B]" : "text-[#A65A20]"}>
              {assignedToClassesChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {assignedToClassesChange >= 0 ? "+" : ""}{assignedToClassesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <GraduationCap className="size-4 text-[#00501B]" /> 
            Class Assignments
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalSubjects > 0
              ? `${Math.round((displayStats.assignedToClasses / displayStats.totalSubjects) * 100)}% subjects assigned`
              : "No subjects found"}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
} 