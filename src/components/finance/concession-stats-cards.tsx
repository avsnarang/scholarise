import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  Award, 
  Users, 
  CheckCircle,
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
import { useGlobalBranchFilter } from "@/hooks/useGlobalBranchFilter"
import { formatIndianCurrency } from "@/lib/utils"

interface ConcessionStatsProps {
  totalConcessions: number;
  totalConcessionsChange: number;
  approvedConcessions: number;
  approvedConcessionsChange: number;
  pendingConcessions: number;
  pendingConcessionsChange: number;
  totalConcessionAmount: number;
  totalConcessionAmountChange: number;
  sessionId?: string;
}

export function ConcessionStatsCards({
  totalConcessions = 0,
  totalConcessionsChange = 0,
  approvedConcessions = 0,
  approvedConcessionsChange = 0,
  pendingConcessions = 0,
  pendingConcessionsChange = 0,
  totalConcessionAmount = 0,
  totalConcessionAmountChange = 0,
  sessionId
}: Partial<ConcessionStatsProps>) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const branchId = getBranchFilterParam();
  
  // Fetch real stats from API
  const { data: stats, isLoading, error } = api.finance.getConcessionStats.useQuery({
    branchId,
    sessionId
  });

  // Use API stats if available
  const displayStats = {
    totalConcessions: stats?.totalConcessions ?? totalConcessions,
    approvedConcessions: stats?.approvedConcessions ?? approvedConcessions,
    pendingConcessions: stats?.pendingConcessions ?? pendingConcessions,
    totalConcessionAmount: stats?.totalConcessionAmount ?? totalConcessionAmount,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-[#7AAD8B]" />
        <span className="sr-only">Loading concession stats...</span>
      </div>
    );
  }

  if (error) {
    console.error('Error fetching concession stats:', error);
  }

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Concessions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.totalConcessions.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalConcessionsChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {totalConcessionsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalConcessionsChange >= 0 ? "+" : ""}{totalConcessionsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Award className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            {sessionId ? "Current academic session" : "All academic sessions"}
          </div>
          <div className="text-muted-foreground">
            {sessionId ? "Showing concessions for selected session" : "Showing all concessions"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Approved Concessions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.approvedConcessions.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={approvedConcessionsChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {approvedConcessionsChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {approvedConcessionsChange >= 0 ? "+" : ""}{approvedConcessionsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <CheckCircle className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Active Concessions
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalConcessions > 0
              ? `${Math.round((displayStats.approvedConcessions / displayStats.totalConcessions) * 100)}% of total concessions`
              : "No concessions found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending Concessions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.pendingConcessions.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={pendingConcessionsChange <= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {pendingConcessionsChange <= 0 ? (
                <IconTrendingDown className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingUp className="text-[#A65A20]" />
              )}
              {pendingConcessionsChange >= 0 ? "+" : ""}{pendingConcessionsChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Clock className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Awaiting Approval
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalConcessions > 0
              ? `${Math.round((displayStats.pendingConcessions / displayStats.totalConcessions) * 100)}% of total concessions`
              : "No concessions found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Concession Amount</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatIndianCurrency(displayStats.totalConcessionAmount)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalConcessionAmountChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {totalConcessionAmountChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalConcessionAmountChange >= 0 ? "+" : ""}{totalConcessionAmountChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <IndianRupee className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Total Value
          </div>
          <div className="text-muted-foreground">
            Value of all approved concessions
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}