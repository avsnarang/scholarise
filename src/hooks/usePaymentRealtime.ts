"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from '@/components/ui/use-toast';
import type { 
  PaymentStatusUpdate, 
  PaymentSuccessNotification,
  PaymentStatus,
  PaymentGateway 
} from '@/types/payment-gateway';

interface PaymentRealtimeHookConfig {
  studentId?: string;
  branchId?: string;
  sessionId?: string;
  onPaymentSuccess?: (notification: PaymentSuccessNotification) => void;
  onPaymentStatusUpdate?: (update: PaymentStatusUpdate) => void;
  enableNotifications?: boolean;
}

interface PaymentRealtimeState {
  isConnected: boolean;
  lastUpdate: PaymentStatusUpdate | null;
  lastNotification: PaymentSuccessNotification | null;
  connectionError: string | null;
}

export function usePaymentRealtime({
  studentId,
  branchId,
  sessionId,
  onPaymentSuccess,
  onPaymentStatusUpdate,
  enableNotifications = true,
}: PaymentRealtimeHookConfig) {
  const [state, setState] = useState<PaymentRealtimeState>({
    isConnected: false,
    lastUpdate: null,
    lastNotification: null,
    connectionError: null,
  });

  const supabase = createClientComponentClient();

  // Handle payment status updates
  const handlePaymentStatusUpdate = useCallback((update: PaymentStatusUpdate) => {
    setState(prev => ({ ...prev, lastUpdate: update }));
    onPaymentStatusUpdate?.(update);

    // Show appropriate toast notifications
    if (enableNotifications) {
      const { data } = update;
      
      switch (data.status) {
        case 'SUCCESS':
          toast({
            title: "Payment Successful!",
            description: `Payment of ₹${data.amount.toLocaleString()} completed successfully.`,
            className: "bg-green-50 border-green-200 text-green-900",
          });
          break;
        
        case 'FAILED':
          toast({
            title: "Payment Failed",
            description: data.failureReason || "Payment could not be processed.",
            variant: "destructive",
          });
          break;
        
        case 'PENDING':
          toast({
            title: "Payment Pending",
            description: "Payment is being processed. Please wait.",
            className: "bg-yellow-50 border-yellow-200 text-yellow-900",
          });
          break;
          
        default:
          break;
      }
    }
  }, [onPaymentStatusUpdate, enableNotifications]);

  // Handle payment success notifications
  const handlePaymentSuccess = useCallback((notification: PaymentSuccessNotification) => {
    setState(prev => ({ ...prev, lastNotification: notification }));
    onPaymentSuccess?.(notification);

    if (enableNotifications) {
      const { data } = notification;
      toast({
        title: "🎉 Payment Received!",
        description: `${data.studentName} paid ₹${data.amount.toLocaleString()} for ${data.feeTermName}`,
        className: "bg-green-50 border-green-200 text-green-900",
        duration: 5000,
      });
    }
  }, [onPaymentSuccess, enableNotifications]);

  // Publish payment status update (for use in webhook processing)
  const publishPaymentUpdate = useCallback(async (update: PaymentStatusUpdate) => {
    try {
      const channel = `payment_updates_${update.data.studentId}`;
      await supabase
        .channel(channel)
        .send({
          type: 'broadcast',
          event: 'payment_status_update',
          payload: update,
        });
    } catch (error) {
      console.error('Error publishing payment update:', error);
    }
  }, [supabase]);

  // Publish payment success notification
  const publishPaymentSuccess = useCallback(async (notification: PaymentSuccessNotification) => {
    try {
      // Publish to student-specific channel
      const studentChannel = `payment_updates_${notification.data.studentId}`;
      await supabase
        .channel(studentChannel)
        .send({
          type: 'broadcast',
          event: 'payment_success',
          payload: notification,
        });

      // Publish to branch-wide channel for staff notifications
      if (branchId) {
        const branchChannel = `branch_payments_${branchId}`;
        await supabase
          .channel(branchChannel)
          .send({
            type: 'broadcast',
            event: 'payment_success',
            payload: notification,
          });
      }
    } catch (error) {
      console.error('Error publishing payment success:', error);
    }
  }, [supabase, branchId]);

  useEffect(() => {
    if (!studentId && !branchId) return;

    const channels: any[] = [];

    try {
      // Subscribe to student-specific payment updates
      if (studentId) {
        const studentChannel = supabase
          .channel(`payment_updates_${studentId}`)
          .on('broadcast', { event: 'payment_status_update' }, ({ payload }) => {
            handlePaymentStatusUpdate(payload as PaymentStatusUpdate);
          })
          .on('broadcast', { event: 'payment_success' }, ({ payload }) => {
            handlePaymentSuccess(payload as PaymentSuccessNotification);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setState(prev => ({ ...prev, isConnected: true, connectionError: null }));
            } else if (status === 'CHANNEL_ERROR') {
              setState(prev => ({ 
                ...prev, 
                isConnected: false, 
                connectionError: 'Failed to connect to real-time updates' 
              }));
            }
          });

        channels.push(studentChannel);
      }

      // Subscribe to branch-wide payment notifications (for staff)
      if (branchId && !studentId) {
        const branchChannel = supabase
          .channel(`branch_payments_${branchId}`)
          .on('broadcast', { event: 'payment_success' }, ({ payload }) => {
            handlePaymentSuccess(payload as PaymentSuccessNotification);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setState(prev => ({ ...prev, isConnected: true, connectionError: null }));
            } else if (status === 'CHANNEL_ERROR') {
              setState(prev => ({ 
                ...prev, 
                isConnected: false, 
                connectionError: 'Failed to connect to real-time updates' 
              }));
            }
          });

        channels.push(branchChannel);
      }

    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionError: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }

    // Cleanup function
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setState(prev => ({ ...prev, isConnected: false }));
    };
  }, [studentId, branchId, supabase, handlePaymentStatusUpdate, handlePaymentSuccess]);

  return {
    ...state,
    publishPaymentUpdate,
    publishPaymentSuccess,
  };
}

// Hook for payment collection staff to monitor all payments
export function usePaymentBranchMonitor(branchId: string) {
  return usePaymentRealtime({
    branchId,
    enableNotifications: true,
  });
}

// Hook for specific student payment monitoring
export function useStudentPaymentMonitor(studentId: string) {
  return usePaymentRealtime({
    studentId,
    enableNotifications: true,
  });
}

// Utility hook to trigger payment updates (for use in webhook processing)
export function usePaymentPublisher() {
  const { publishPaymentUpdate, publishPaymentSuccess } = usePaymentRealtime({});
  
  return {
    publishPaymentUpdate,
    publishPaymentSuccess,
  };
} 