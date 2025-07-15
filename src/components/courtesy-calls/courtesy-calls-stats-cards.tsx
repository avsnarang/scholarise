import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  MessageSquare, 
  Users, 
  UserCheck,
  Phone,
  History,
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

interface CourtesyCallsStatsProps {
  branchId?: string;
  classId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export function CourtesyCallsStatsCards({
  branchId,
  classId,
  fromDate,
  toDate
}: CourtesyCallsStatsProps) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const fallbackBranchId = getBranchFilterParam();
  
  // Fetch real stats from API
  const { data: stats, isLoading, error } = api.courtesyCalls.getStats.useQuery({
    branchId: branchId || fallbackBranchId,
    classId,
    fromDate,
    toDate
  }, {
    enabled: !!(branchId || fallbackBranchId)
  });

  // Calculate derived stats
  const totalFeedback = stats?.totalFeedback || 0;
  const teacherFeedback = stats?.feedbackByType?.find((t: any) => t.type === "TEACHER")?.count || 0;
  const headFeedback = stats?.feedbackByType?.find((t: any) => t.type === "HEAD")?.count || 0;
  const recentFeedbackCount = stats?.recentFeedback?.length || 0;

  // Mock change percentages (in a real app, you'd calculate this from historical data)
  const totalChange = 12;
  const teacherChange = 8;
  const headChange = 15;
  const recentChange = 5;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-[#7AAD8B]" />
        <span className="sr-only">Loading courtesy calls stats...</span>
      </div>
    );
  }

  if (error) {
    console.error('Error fetching courtesy calls stats:', error);
  }

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Feedback</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalFeedback.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {totalChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalChange >= 0 ? "+" : ""}{totalChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <MessageSquare className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            All Feedback Records
          </div>
          <div className="text-muted-foreground">
            Total courtesy call feedback from all sources
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Teacher Feedback</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {teacherFeedback.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={teacherChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {teacherChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {teacherChange >= 0 ? "+" : ""}{teacherChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Users className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            From Teachers
          </div>
          <div className="text-muted-foreground">
            {totalFeedback > 0
              ? `${Math.round((teacherFeedback / totalFeedback) * 100)}% of total feedback`
              : "No feedback records found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Head Feedback</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {headFeedback.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={headChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {headChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {headChange >= 0 ? "+" : ""}{headChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <UserCheck className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            From Administrators
          </div>
          <div className="text-muted-foreground">
            {totalFeedback > 0
              ? `${Math.round((headFeedback / totalFeedback) * 100)}% of total feedback`
              : "No feedback records found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Recent Activity</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {recentFeedbackCount.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={recentChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {recentChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {recentChange >= 0 ? "+" : ""}{recentChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <History className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Latest Records
          </div>
          <div className="text-muted-foreground">
            Most recent courtesy call feedback entries
          </div>
        </CardFooter>
      </Card>
    </div>
  )
} 