import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  Award, 
  Users, 
  CheckCircle,
  Clock,
  IndianRupee,
  Loader2,
  TrendingUp,
  Calendar,
  Target,
  AlertCircle,
  Info
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
  rejectedConcessions?: number;
  expiredConcessions?: number;
  averageValue?: number;
  mostUsedType?: string;
}

interface ConcessionStatsCardsProps {
  sessionId?: string;
}

export function ConcessionStatsCards({
  sessionId
}: ConcessionStatsCardsProps) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const branchId = getBranchFilterParam();
  
  // Fetch real stats from API
  const { data: stats, isLoading, error } = api.finance.getConcessionStats.useQuery({
    branchId,
    sessionId
  });

  // Enhanced stats calculation
  const displayStats = {
    totalConcessions: stats?.totalConcessions ?? 0,
    approvedConcessions: stats?.approvedConcessions ?? 0,
    pendingConcessions: stats?.pendingConcessions ?? 0,
    totalConcessionAmount: stats?.totalConcessionAmount ?? 0,
    rejectedConcessions: 0, // TODO: Add to API response
    expiredConcessions: 0, // TODO: Add to API response
    averageValue: 0, // TODO: Add to API response
    approvalRate: (stats?.totalConcessions ?? 0) > 0 
      ? Math.round(((stats?.approvedConcessions ?? 0) / (stats?.totalConcessions ?? 0)) * 100) 
      : 0,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Total Concessions */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">Total Concessions</CardDescription>
          <CardTitle className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {displayStats.totalConcessions.toLocaleString()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {sessionId ? "Current session" : "All sessions"}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Approved Concessions */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardDescription className="text-green-600 dark:text-green-400 font-medium">Approved</CardDescription>
          <CardTitle className="text-3xl font-bold text-green-900 dark:text-green-100">
            {displayStats.approvedConcessions.toLocaleString()}
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">Active</span>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
              {displayStats.approvalRate}%
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Pending Concessions */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardDescription className="text-orange-600 dark:text-orange-400 font-medium">Pending Review</CardDescription>
          <CardTitle className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {displayStats.pendingConcessions.toLocaleString()}
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700 dark:text-orange-300">Awaiting</span>
            </div>
            {displayStats.pendingConcessions > 0 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Action needed
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Total Amount */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <CardDescription className="text-emerald-600 dark:text-emerald-400 font-medium">Total Value</CardDescription>
          <CardTitle className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {formatIndianCurrency(displayStats.totalConcessionAmount)}
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">Approved value</span>
            </div>
            {displayStats.approvedConcessions > 0 && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                {displayStats.approvedConcessions} approved
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Additional insights cards for larger screens */}
      {displayStats.totalConcessions > 0 && (
        <>
          {/* Approval Rate Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 lg:col-span-1 xl:col-span-1">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-600 dark:text-purple-400 font-medium">Approval Rate</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {displayStats.approvalRate}%
              </CardTitle>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  Success rate
                </span>
              </div>
            </CardHeader>
          </Card>

          {/* Processing Status */}
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 border-gray-200 dark:border-gray-800 lg:col-span-1 xl:col-span-1">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-600 dark:text-gray-400 font-medium">Processing</CardDescription>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {displayStats.totalConcessions - displayStats.approvedConcessions - displayStats.pendingConcessions} Others
              </CardTitle>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Rejected/Expired
                </span>
              </div>
            </CardHeader>
          </Card>
        </>
      )}
    </div>
  )
}