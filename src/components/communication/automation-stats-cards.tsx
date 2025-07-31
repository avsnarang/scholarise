import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { 
  Send, 
  CheckCircle, 
  Eye,
  XCircle,
  Activity,
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

interface AutomationStatsProps {
  totalMessages: number;
  totalMessagesChange: number;
  sentMessages: number;
  sentMessagesChange: number;
  deliveredMessages: number;
  deliveredMessagesChange: number;
  readMessages: number;
  readMessagesChange: number;
  failedMessages: number;
  failedMessagesChange: number;
  isLoading?: boolean;
}

export function AutomationStatsCards({
  totalMessages = 0,
  totalMessagesChange = 0,
  sentMessages = 0,
  sentMessagesChange = 0,
  deliveredMessages = 0,
  deliveredMessagesChange = 0,
  readMessages = 0,
  readMessagesChange = 0,
  failedMessages = 0,
  failedMessagesChange = 0,
  isLoading = false
}: Partial<AutomationStatsProps>) {

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#00501B] dark:text-[#7AAD8B]" />
        <span className="sr-only">Loading stats...</span>
      </div>
    );
  }

  const deliveryRate = totalMessages > 0 ? Math.round((deliveredMessages / totalMessages) * 100) : 0;
  const readRate = deliveredMessages > 0 ? Math.round((readMessages / deliveredMessages) * 100) : 0;
  const failureRate = totalMessages > 0 ? Math.round((failedMessages / totalMessages) * 100) : 0;

  return (
    <div className="*:data-[slot=card]:from-[#00501B]/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalMessages.toLocaleString()}
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
            <Activity className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            All Automated Messages
          </div>
          <div className="text-muted-foreground">
            Total automation executions
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Sent Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {sentMessages.toLocaleString()}
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
            <Send className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Successfully Sent
          </div>
          <div className="text-muted-foreground">
            {totalMessages > 0
              ? `${Math.round((sentMessages / totalMessages) * 100)}% of total messages`
              : "No messages found"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Delivered Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {deliveredMessages.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={deliveredMessagesChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {deliveredMessagesChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {deliveredMessagesChange >= 0 ? "+" : ""}{deliveredMessagesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <CheckCircle className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Delivery Rate: {deliveryRate}%
          </div>
          <div className="text-muted-foreground">
            Successfully delivered messages
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Read Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {readMessages.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={readMessagesChange >= 0 ? "text-[#00501B] dark:text-[#7AAD8B]" : "text-[#A65A20]"}>
              {readMessagesChange >= 0 ? (
                <IconTrendingUp className="text-[#00501B] dark:text-[#7AAD8B]" />
              ) : (
                <IconTrendingDown className="text-[#A65A20]" />
              )}
              {readMessagesChange >= 0 ? "+" : ""}{readMessagesChange}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Eye className="size-4 text-[#00501B] dark:text-[#7AAD8B]" /> 
            Read Rate: {readRate}%
          </div>
          <div className="text-muted-foreground">
            Messages opened by recipients
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Failed Messages</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {failedMessages.toLocaleString()}
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
            <XCircle className="size-4 text-red-500" /> 
            Failure Rate: {failureRate}%
          </div>
          <div className="text-muted-foreground">
            Messages that failed to send
          </div>
        </CardFooter>
      </Card>
    </div>
  )
} 