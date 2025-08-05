"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RotateCcw,
  CreditCard,
  Zap
} from 'lucide-react';
import type { PaymentStatusIndicatorProps } from '@/types/payment-gateway';
import { PaymentStatus, PaymentGateway } from '@/types/payment-gateway';

const statusConfig = {
  [PaymentStatus.PENDING]: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700',
    description: 'Payment is pending processing',
  },
  [PaymentStatus.INITIATED]: {
    label: 'Initiated',
    icon: Zap,
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700',
    description: 'Payment link created and sent',
  },
  [PaymentStatus.SUCCESS]: {
    label: 'Success',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700',
    description: 'Payment completed successfully',
  },
  [PaymentStatus.FAILED]: {
    label: 'Failed',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700',
    description: 'Payment failed or was declined',
  },
  [PaymentStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700',
    description: 'Payment was cancelled',
  },
  [PaymentStatus.REFUNDED]: {
    label: 'Refunded',
    icon: RotateCcw,
    color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700',
    description: 'Payment has been refunded',
  },
  [PaymentStatus.EXPIRED]: {
    label: 'Expired',
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700',
    description: 'Payment link has expired',
  },
};

const gatewayLabels = {
  [PaymentGateway.RAZORPAY]: 'Razorpay',
  [PaymentGateway.PAYTM]: 'Paytm',
  [PaymentGateway.STRIPE]: 'Stripe',
  [PaymentGateway.EASEBUZZ]: 'Easebuzz',
  [PaymentGateway.MANUAL]: 'Manual',
};

export function PaymentStatusIndicator({
  status,
  gateway,
  failureReason,
  showDetails = false,
}: PaymentStatusIndicatorProps) {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  if (!config) {
    // Handle unknown status (probably manual payment)
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
        <CreditCard className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`flex items-center gap-1 ${config.color}`}
        >
          <IconComponent className="w-3 h-3" />
          {config.label}
        </Badge>
        
        {gateway && (
          <Badge 
            variant="secondary" 
            className="text-xs bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600"
          >
            {gatewayLabels[gateway]}
          </Badge>
        )}
      </div>

      {showDetails && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {config.description}
          {failureReason && status === PaymentStatus.FAILED && (
            <div className="text-red-600 dark:text-red-400 mt-1">
              Reason: {failureReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for quick status display in tables
export function PaymentStatusBadge({
  status,
  gateway,
}: {
  status: PaymentStatus;
  gateway?: PaymentGateway;
}) {
  const config = statusConfig[status];
  const IconComponent = config?.icon || CreditCard;

  if (!config) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600">
        <CreditCard className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={config.color}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
      {gateway && (
        <span className="ml-1 text-xs opacity-75">
          ({gatewayLabels[gateway]})
        </span>
      )}
    </Badge>
  );
} 