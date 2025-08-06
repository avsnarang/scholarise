import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  TrendingUp,
  Receipt, 
  Users, 
  Clock,
  IndianRupee,
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
import { formatIndianCurrency } from "@/lib/utils"

interface FeeCollectionStatsProps {
  todaysCollection?: number;
  todaysCollectionChange?: number;
  receiptsGenerated?: number;
  receiptsGeneratedChange?: number;
  studentsPaid?: number;
  studentsPaidChange?: number;
  pendingDues?: number;
  pendingDuesChange?: number;
}

export function FeeCollectionStatsCards({
  todaysCollection = 0,
  todaysCollectionChange = 0,
  receiptsGenerated = 0,
  receiptsGeneratedChange = 0,
  studentsPaid = 0,
  studentsPaidChange = 0,
  pendingDues = 0,
  pendingDuesChange = 0,
}: Partial<FeeCollectionStatsProps>) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  // Fetch real stats from API
  const { data: stats, isLoading, error } = api.finance.getFeeCollectionStats.useQuery({
    branchId: currentBranchId!,
    sessionId: currentSessionId!
  }, {
    enabled: !!currentBranchId && !!currentSessionId,
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time collection data
  });

  // Use API stats if available, otherwise use props
  const displayStats = {
    todaysCollection: stats?.todaysCollection ?? todaysCollection,
    receiptsGenerated: stats?.receiptsGenerated ?? receiptsGenerated,
    studentsPaid: stats?.studentsPaid ?? studentsPaid,
    pendingDues: stats?.pendingDues ?? pendingDues,
    // Changes - we'll calculate these later when we have historical data
    todaysCollectionChange: stats?.todaysCollectionChange ?? todaysCollectionChange,
    receiptsGeneratedChange: stats?.receiptsGeneratedChange ?? receiptsGeneratedChange,
    studentsPaidChange: stats?.studentsPaidChange ?? studentsPaidChange,
    pendingDuesChange: stats?.pendingDuesChange ?? pendingDuesChange,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading fee collection stats...</span>
      </div>
    );
  }

  if (error) {
    console.error('Error fetching fee collection stats:', error);
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
        <CardHeader>
          <CardDescription>Today's Collection</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatIndianCurrency(displayStats.todaysCollection)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={displayStats.todaysCollectionChange >= 0 ? "text-primary" : "text-destructive"}>
              {displayStats.todaysCollectionChange >= 0 ? (
                <IconTrendingUp className="text-primary" />
              ) : (
                <IconTrendingDown className="text-destructive" />
              )}
              {displayStats.todaysCollectionChange >= 0 ? "+" : ""}{displayStats.todaysCollectionChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <TrendingUp className="size-4 text-primary" /> 
            Total Collections Today
          </div>
          <div className="text-muted-foreground">
            Revenue collected from fee payments
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
        <CardHeader>
          <CardDescription>Receipts Generated</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.receiptsGenerated.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={displayStats.receiptsGeneratedChange >= 0 ? "text-primary" : "text-destructive"}>
              {displayStats.receiptsGeneratedChange >= 0 ? (
                <IconTrendingUp className="text-primary" />
              ) : (
                <IconTrendingDown className="text-destructive" />
              )}
              {displayStats.receiptsGeneratedChange >= 0 ? "+" : ""}{displayStats.receiptsGeneratedChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Receipt className="size-4 text-primary" /> 
            Payment Receipts
          </div>
          <div className="text-muted-foreground">
            Total receipts issued today
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
        <CardHeader>
          <CardDescription>Students Paid</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.studentsPaid.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={displayStats.studentsPaidChange >= 0 ? "text-primary" : "text-destructive"}>
              {displayStats.studentsPaidChange >= 0 ? (
                <IconTrendingUp className="text-primary" />
              ) : (
                <IconTrendingDown className="text-destructive" />
              )}
              {displayStats.studentsPaidChange >= 0 ? "+" : ""}{displayStats.studentsPaidChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Users className="size-4 text-primary" /> 
            Unique Students
          </div>
          <div className="text-muted-foreground">
            Students who made payments today
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-[#303030]">
        <CardHeader>
          <CardDescription>Pending Dues</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatIndianCurrency(displayStats.pendingDues)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={displayStats.pendingDuesChange <= 0 ? "text-primary" : "text-destructive"}>
              {displayStats.pendingDuesChange <= 0 ? (
                <IconTrendingDown className="text-primary" />
              ) : (
                <IconTrendingUp className="text-destructive" />
              )}
              {displayStats.pendingDuesChange >= 0 ? "+" : ""}{displayStats.pendingDuesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Clock className="size-4 text-primary" /> 
            Outstanding Amount
          </div>
          <div className="text-muted-foreground">
            Total pending fee collections
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}