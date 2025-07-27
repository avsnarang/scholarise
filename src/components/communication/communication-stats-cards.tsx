import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  MessageSquare, 
  Send, 
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
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

interface CommunicationStatsProps {
  totalMessages: number;
  totalMessagesChange: number;
  sentMessages: number;
  sentMessagesChange: number;
  failedMessages: number;
  failedMessagesChange: number;
  deliveryRate: number;
  deliveryRateChange: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export function CommunicationStatsCards({
  totalMessages = 0,
  totalMessagesChange = 0,
  sentMessages = 0,
  sentMessagesChange = 0,
  failedMessages = 0,
  failedMessagesChange = 0,
  deliveryRate = 0,
  deliveryRateChange = 0,
  dateFrom,
  dateTo
}: Partial<CommunicationStatsProps>) {
  const { getBranchFilterParam } = useGlobalBranchFilter();
  const branchId = getBranchFilterParam();
  
  // Fetch real stats from API
  const { data: stats, isLoading, error } = api.communication.getStats.useQuery({
    branchId,
    dateFrom: dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of month
    dateTo: dateTo || new Date(), // Today
  });

  // Use API stats if available
  const displayStats = {
    totalMessages: stats?.totalMessages ?? totalMessages,
    sentMessages: stats?.sentMessages ?? sentMessages,
    failedMessages: stats?.failedMessages ?? failedMessages,
    deliveryRate: stats?.deliveryRate ?? deliveryRate,
    scheduledMessages: stats?.scheduledMessages ?? 0,
    totalRecipients: stats?.totalRecipients ?? 0,
    successfulDeliveries: stats?.successfulDeliveries ?? 0
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-[#7AAD8B]" />
        <span className="sr-only">Loading communication stats...</span>
      </div>
    );
  }

  if (error) {
    console.error('Error fetching communication stats:', error);
  }

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.totalMessages.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={totalMessagesChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {totalMessagesChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {totalMessagesChange >= 0 ? "+" : ""}{totalMessagesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <MessageSquare className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            All Messages
          </div>
          <div className="text-muted-foreground">
            {displayStats.scheduledMessages > 0 && `${displayStats.scheduledMessages} scheduled`}
            {displayStats.scheduledMessages === 0 && "No scheduled messages"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Successfully Sent</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.sentMessages.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={sentMessagesChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {sentMessagesChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {sentMessagesChange >= 0 ? "+" : ""}{sentMessagesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <CheckCircle className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Successful Messages
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalMessages > 0
              ? `${Math.round((displayStats.sentMessages / displayStats.totalMessages) * 100)}% of total messages`
              : "No messages sent"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Failed Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.failedMessages.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={failedMessagesChange <= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {failedMessagesChange <= 0 ? (
                <IconTrendingDown className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingUp className="text-[#A65A20]" />
              )}
              {failedMessagesChange >= 0 ? "+" : ""}{failedMessagesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <XCircle className="size-4 text-[#A65A20]" /> 
            Failed Messages
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalMessages > 0
              ? `${Math.round((displayStats.failedMessages / displayStats.totalMessages) * 100)}% of total messages`
              : "No failed messages"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Delivery Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {displayStats.deliveryRate.toFixed(1)}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={deliveryRateChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {deliveryRateChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {deliveryRateChange >= 0 ? "+" : ""}{deliveryRateChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <TrendingUp className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Success Rate
          </div>
          <div className="text-muted-foreground">
            {displayStats.totalRecipients > 0
              ? `${displayStats.successfulDeliveries.toLocaleString()} of ${displayStats.totalRecipients.toLocaleString()} recipients`
              : "No delivery data"}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
} 