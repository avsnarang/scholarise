import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  Users, 
  GraduationCap, 
  Building,
  CreditCard,
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
import { useBranchContext } from "@/hooks/useBranchContext"
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"

export function SectionCards() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // States for stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    feeCollectionRate: 0,
    studentGrowthRate: 0,
    teacherGrowthRate: 0,
    classGrowthRate: 0,
    feeCollectionChange: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch student stats
  const { data: studentStats } = api.student.getStats.useQuery(
    { branchId: currentBranchId || "" },
    { enabled: !!currentBranchId }
  );
  
  // Fetch teacher stats
  const { data: teacherStats } = api.teacher.getStats.useQuery(
    { branchId: currentBranchId || "" },
    { enabled: !!currentBranchId }
  );
  
  // Fetch class stats
  const { data: classStats } = api.class.getStats.useQuery(
    { 
      branchId: currentBranchId || "",
      sessionId: currentSessionId || ""
    },
    { enabled: !!currentBranchId && !!currentSessionId }
  );
  
  // Dummy fee stats since API doesn't exist yet
  const feeStats = {
    collectionRate: 85,
    collectionChange: 5
  };
  
  // Combine all stats
  useEffect(() => {
    if (studentStats && teacherStats && classStats) {
      setStats({
        totalStudents: studentStats.totalStudents || 0,
        totalTeachers: teacherStats.totalTeachers || 0,
        totalClasses: classStats.totalClasses || 0,
        feeCollectionRate: feeStats.collectionRate || 0,
        studentGrowthRate: studentStats.activeStudents - studentStats.inactiveStudents || 0,
        teacherGrowthRate: teacherStats.activeTeachers - teacherStats.inactiveTeachers || 0,
        classGrowthRate: classStats.activeClasses - classStats.inactiveClasses || 0,
        feeCollectionChange: feeStats.collectionChange || 0
      });
      setIsLoading(false);
    }
  }, [studentStats, teacherStats, classStats]);
  
  const { 
    totalStudents, 
    totalTeachers, 
    totalClasses, 
    feeCollectionRate,
    studentGrowthRate,
    teacherGrowthRate,
    classGrowthRate,
    feeCollectionChange
  } = stats;
  
  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:from-[#7aad8c]/10 dark:*:data-[slot=card]:to-[#252525] dark:*:data-[slot=card]:bg-[#252525] grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card dark:border-[#303030]">
        <CardHeader>
          <CardDescription className="dark:text-[#c0c0c0]">Total Students</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
            {isLoading ? (
              <Skeleton className="h-8 w-24 dark:bg-[#303030]" />
            ) : (
              totalStudents
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={studentGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30" : "text-[#A65A20] dark:text-[#e2bd8c] dark:border-[#e2bd8c]/30"}>
              {studentGrowthRate >= 0 ? (
                <IconTrendingUp className={studentGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              ) : (
                <IconTrendingDown className={studentGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              )}
              {studentGrowthRate >= 0 ? "+" : ""}{studentGrowthRate}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
            <GraduationCap className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
            {studentGrowthRate >= 0 ? "Active enrollment increasing" : "Enrollment decreased"}
          </div>
          <div className="text-muted-foreground dark:text-[#c0c0c0]">
            Compared to previous academic session
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card dark:border-[#303030]">
        <CardHeader>
          <CardDescription className="dark:text-[#c0c0c0]">Teaching Staff</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
            {isLoading ? (
              <Skeleton className="h-8 w-16 dark:bg-[#303030]" />
            ) : (
              totalTeachers
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={teacherGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30" : "text-[#A65A20] dark:text-[#e2bd8c] dark:border-[#e2bd8c]/30"}>
              {teacherGrowthRate >= 0 ? (
                <IconTrendingUp className={teacherGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              ) : (
                <IconTrendingDown className={teacherGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              )}
              {teacherGrowthRate >= 0 ? "+" : ""}{teacherGrowthRate}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
            <Users className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
            {teacherGrowthRate >= 0 ? "Faculty growth on track" : "Faculty reduced"}
          </div>
          <div className="text-muted-foreground dark:text-[#c0c0c0]">
            {teacherGrowthRate >= 0 ? "Improving student-teacher ratio" : "Review staffing needs"}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card dark:border-[#303030]">
        <CardHeader>
          <CardDescription className="dark:text-[#c0c0c0]">Active Classes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
            {isLoading ? (
              <Skeleton className="h-8 w-16 dark:bg-[#303030]" />
            ) : (
              totalClasses
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={classGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30" : "text-[#A65A20] dark:text-[#e2bd8c] dark:border-[#e2bd8c]/30"}>
              {classGrowthRate >= 0 ? (
                <IconTrendingUp className={classGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              ) : (
                <IconTrendingDown className={classGrowthRate >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              )}
              {classGrowthRate >= 0 ? "+" : ""}{classGrowthRate}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
            <Building className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
            {classGrowthRate >= 0 ? "Well-utilized facilities" : "Reduced class sections"}
          </div>
          <div className="text-muted-foreground dark:text-[#c0c0c0]">
            {classGrowthRate >= 0 ? "Optimal class distribution" : "Consolidating classes"}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card dark:border-[#303030]">
        <CardHeader>
          <CardDescription className="dark:text-[#c0c0c0]">Fee Collection</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl dark:text-[#e6e6e6]">
            {isLoading ? (
              <Skeleton className="h-8 w-20 dark:bg-[#303030]" />
            ) : (
              `${feeCollectionRate}%`
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={feeCollectionChange >= 0 ? "text-[#00501B] dark:text-[#7aad8c] dark:border-[#7aad8c]/30" : "text-[#A65A20] dark:text-[#e2bd8c] dark:border-[#e2bd8c]/30"}>
              {feeCollectionChange >= 0 ? (
                <IconTrendingUp className={feeCollectionChange >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              ) : (
                <IconTrendingDown className={feeCollectionChange >= 0 ? "text-[#00501B] dark:text-[#7aad8c]" : "text-[#A65A20] dark:text-[#e2bd8c]"} />
              )}
              {feeCollectionChange >= 0 ? "+" : ""}{feeCollectionChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium dark:text-[#e6e6e6]">
            <CreditCard className="size-4 text-[#00501B] dark:text-[#7aad8c]" /> 
            {feeCollectionChange >= 0 ? "Fee collection improved" : "Decrease in collection"}
          </div>
          <div className="text-muted-foreground dark:text-[#c0c0c0]">
            {feeCollectionChange >= 0 ? "Well-managed fee collection" : "Action required for pending fees"}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
