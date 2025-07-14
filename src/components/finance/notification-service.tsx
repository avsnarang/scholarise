"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Phone, MessageSquare, CheckCircle, AlertTriangle, Clock, Send } from 'lucide-react';

interface Notification {
  id: string;
  type: 'reminder' | 'payment_received' | 'overdue' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  studentId?: string;
  studentName?: string;
  amount?: number;
  actionRequired: boolean;
}

interface NotificationServiceProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (notificationId: string) => void;
  onTakeAction: (notificationId: string, action: string) => void;
}

export function NotificationService({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onTakeAction,
}: NotificationServiceProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      case 'payment_received':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'system':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(notification.priority)}`}
                          >
                            {notification.priority}
                          </Badge>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      {notification.studentName && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Student: {notification.studentName}
                          {notification.amount && (
                            <span className="ml-2">
                              Amount: ₹{notification.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {notification.actionRequired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => onTakeAction(notification.id, 'primary')}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send Reminder
                            </Button>
                          )}
                          
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => onMarkAsRead(notification.id)}
                            >
                              Mark read
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => onDismiss(notification.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Notification generator utilities
export const createNotifications = {
  feeReminder: (studentName: string, amount: number, daysOverdue: number): Notification => ({
    id: `reminder-${Date.now()}`,
    type: 'reminder',
    title: 'Fee Payment Reminder',
    message: `Payment reminder for ${studentName}. Amount: ₹${amount.toLocaleString()}, overdue by ${daysOverdue} days.`,
    timestamp: new Date(),
    isRead: false,
    priority: daysOverdue > 14 ? 'high' : daysOverdue > 7 ? 'medium' : 'low',
    studentName,
    amount,
    actionRequired: true,
  }),

  paymentReceived: (studentName: string, amount: number): Notification => ({
    id: `payment-${Date.now()}`,
    type: 'payment_received',
    title: 'Payment Received',
    message: `Fee payment of ₹${amount.toLocaleString()} received from ${studentName}.`,
    timestamp: new Date(),
    isRead: false,
    priority: 'low',
    studentName,
    amount,
    actionRequired: false,
  }),

  overdueAlert: (studentName: string, amount: number, daysOverdue: number): Notification => ({
    id: `overdue-${Date.now()}`,
    type: 'overdue',
    title: 'Overdue Fee Alert',
    message: `Critical: ${studentName}'s fee payment is ${daysOverdue} days overdue. Immediate action required.`,
    timestamp: new Date(),
    isRead: false,
    priority: 'high',
    studentName,
    amount,
    actionRequired: true,
  }),

  systemUpdate: (message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Notification => ({
    id: `system-${Date.now()}`,
    type: 'system',
    title: 'System Update',
    message,
    timestamp: new Date(),
    isRead: false,
    priority,
    actionRequired: false,
  }),
};

// Mock notification data for demo
export const generateMockNotifications = (): Notification[] => [
  createNotifications.feeReminder('Aarav Sharma', 5000, 15),
  createNotifications.paymentReceived('Priya Singh', 3500),
  createNotifications.overdueAlert('Rohan Mehta', 7500, 21),
  createNotifications.feeReminder('Ananya Patel', 2500, 8),
  createNotifications.systemUpdate('Monthly fee collection report is ready for download.'),
  createNotifications.paymentReceived('Kavya Reddy', 4200),
  createNotifications.feeReminder('Arjun Kumar', 6000, 3),
]; 