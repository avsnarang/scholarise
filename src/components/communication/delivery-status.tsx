"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Clock, 
  Send, 
  CheckCircle, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';

export type DeliveryStatus = 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

interface DeliveryStatusProps {
  status: DeliveryStatus;
  sentAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  readAt?: Date | string | null;
  errorMessage?: string | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  detailed?: boolean;
}

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  description: string;
}

const statusConfigs: Record<DeliveryStatus, StatusConfig> = {
  PENDING: {
    icon: Clock,
    label: 'Pending',
    color: 'text-gray-500',
    badgeVariant: 'secondary',
    description: 'Message is queued for sending'
  },
  SENDING: {
    icon: Send,
    label: 'Sending',
    color: 'text-blue-500',
    badgeVariant: 'outline',
    description: 'Message is being sent'
  },
  SENT: {
    icon: CheckCircle,
    label: 'Sent',
    color: 'text-green-500',
    badgeVariant: 'default',
    description: 'Message sent to WhatsApp servers'
  },
  DELIVERED: {
    icon: CheckCircle2,
    label: 'Delivered',
    color: 'text-green-600',
    badgeVariant: 'default',
    description: 'Message delivered to recipient\'s device'
  },
  READ: {
    icon: CheckCircle2,
    label: 'Read',
    color: 'text-blue-600',
    badgeVariant: 'default',
    description: 'Message read by recipient'
  },
  FAILED: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-500',
    badgeVariant: 'destructive',
    description: 'Message delivery failed'
  }
};

export function DeliveryStatus({ 
  status, 
  sentAt, 
  deliveredAt, 
  readAt, 
  errorMessage,
  showLabel = true,
  size = 'md',
  detailed = false
}: DeliveryStatusProps) {
  const config = statusConfigs[status];
  const Icon = config.icon;
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const formatTimestamp = (timestamp: Date | string | null | undefined) => {
    if (!timestamp) return null;
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  };

  const getDetailedInfo = () => {
    const timestamps = [];
    if (sentAt) timestamps.push(`Sent: ${formatTimestamp(sentAt)}`);
    if (deliveredAt) timestamps.push(`Delivered: ${formatTimestamp(deliveredAt)}`);
    if (readAt) timestamps.push(`Read: ${formatTimestamp(readAt)}`);
    if (errorMessage) timestamps.push(`Error: ${errorMessage}`);
    
    return timestamps.length > 0 ? timestamps.join('\n') : config.description;
  };

  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center">
              <Icon className={`${iconSizes[size]} ${config.color}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">{config.label}</p>
              <p className="text-xs whitespace-pre-line">{getDetailedInfo()}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (detailed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className={`${iconSizes[size]} ${config.color}`} />
          <Badge variant={config.badgeVariant} className="text-xs">
            {config.label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          {sentAt && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Sent: {formatTimestamp(sentAt)}</span>
            </div>
          )}
          {deliveredAt && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Delivered: {formatTimestamp(deliveredAt)}</span>
            </div>
          )}
          {readAt && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-blue-600" />
              <span>Read: {formatTimestamp(readAt)}</span>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span>Error: {errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.badgeVariant} className="inline-flex items-center gap-1 text-xs">
            <Icon className={iconSizes[size]} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs whitespace-pre-line">{getDetailedInfo()}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DeliveryStatusList({ 
  recipients 
}: { 
  recipients: Array<{
    id: string;
    recipientName: string;
    recipientPhone: string;
    status: DeliveryStatus;
    sentAt?: Date | string | null;
    deliveredAt?: Date | string | null;
    readAt?: Date | string | null;
    errorMessage?: string | null;
  }> 
}) {
  const statusCounts = recipients.reduce((acc, recipient) => {
    acc[recipient.status] = (acc[recipient.status] || 0) + 1;
    return acc;
  }, {} as Record<DeliveryStatus, number>);

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-1">
            <DeliveryStatus 
              status={status as DeliveryStatus} 
              showLabel={false} 
              size="sm" 
            />
            <span className="text-xs text-muted-foreground">{count}</span>
          </div>
        ))}
      </div>

      {/* Detailed List */}
      <div className="space-y-2">
        {recipients.map((recipient) => (
          <div key={recipient.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-sm">{recipient.recipientName}</div>
              <div className="text-xs text-muted-foreground">{recipient.recipientPhone}</div>
            </div>
            <DeliveryStatus
              status={recipient.status}
              sentAt={recipient.sentAt}
              deliveredAt={recipient.deliveredAt}
              readAt={recipient.readAt}
              errorMessage={recipient.errorMessage}
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeliveryStatusProgress({ recipients }: { recipients: Array<{ status: DeliveryStatus }> }) {
  const total = recipients.length;
  const delivered = recipients.filter(r => ['DELIVERED', 'READ'].includes(r.status)).length;
  const failed = recipients.filter(r => r.status === 'FAILED').length;
  const pending = recipients.filter(r => ['PENDING', 'SENDING'].includes(r.status)).length;
  
  const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
  const failureRate = total > 0 ? (failed / total) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Delivery Progress</span>
        <span>{delivered}/{total} delivered ({deliveryRate.toFixed(1)}%)</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="flex h-2 rounded-full overflow-hidden">
          <div 
            className="bg-green-500" 
            style={{ width: `${deliveryRate}%` }}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${failureRate}%` }}
          />
          <div 
            className="bg-yellow-500" 
            style={{ width: `${(pending / total) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          Delivered: {delivered}
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          Failed: {failed}
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          Pending: {pending}
        </span>
      </div>
    </div>
  );
} 