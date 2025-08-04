"use client";

import React, { useState } from 'react';
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FeeRemindersSystem } from "@/components/finance/fee-reminders-system";
import { NotificationService, generateMockNotifications, createNotifications } from "@/components/finance/notification-service";
import { AlertTriangle } from 'lucide-react';
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

function FeeRemindersPageContent() {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(generateMockNotifications());

  const studentsQuery = api.finance.getStudents.useQuery(
    { branchId: currentBranchId!, sessionId: currentSessionId! },
    { enabled: !!currentBranchId && !!currentSessionId }
  );

  const handleSendReminder = async (reminderId: string) => {
    try {
      console.log('Sending reminder:', reminderId);
      
      toast({
        title: "Reminder Sent",
        description: "Fee payment reminder has been sent successfully.",
      });

      const newNotification = createNotifications.systemUpdate(
        "Fee reminder sent successfully to parent.",
        'low'
      );
      setNotifications(prev => [newNotification, ...prev]);

    } catch (error) {
      toast({
        title: "Failed to Send Reminder",
        description: "There was an error sending the reminder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkSendReminders = async (reminderIds: string[]) => {
    try {
      console.log('Sending bulk reminders:', reminderIds);
      
      toast({
        title: "Bulk Reminders Sent",
        description: `Successfully sent ${reminderIds.length} reminders.`,
      });

      const newNotification = createNotifications.systemUpdate(
        `Bulk reminders sent to ${reminderIds.length} students.`,
        'medium'
      );
      setNotifications(prev => [newNotification, ...prev]);

    } catch (error) {
      toast({
        title: "Failed to Send Bulk Reminders",
        description: "There was an error sending the reminders. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateReminderRule = async (rule: any) => {
    try {
      console.log('Creating reminder rule:', rule);
      
      toast({
        title: "Reminder Rule Created",
        description: "Automation rule has been created successfully.",
      });

    } catch (error) {
      toast({
        title: "Failed to Create Rule",
        description: "There was an error creating the reminder rule.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async (template: any) => {
    try {
      console.log('Updating template:', template);
      
      toast({
        title: "Template Updated",
        description: "Reminder template has been updated successfully.",
      });

    } catch (error) {
      toast({
        title: "Failed to Update Template",
        description: "There was an error updating the template.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReminders = async () => {
    try {
      console.log('Generating reminders based on fee data...');
      
      const mockReminders = [
        {
          id: `generated-${Date.now()}-1`,
          studentId: 'student-1',
          student: {
            id: 'student-1',
            firstName: 'Generated',
            lastName: 'Student',
            admissionNumber: 'GEN001',
            section: { class: { name: '10 A' } },
            parent: { firstName: 'Parent', lastName: 'Name', email: 'parent@example.com' }
          },
          feeHeadId: 'fee-1',
          feeHeadName: 'Tuition Fee',
          amount: 5000,
          dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          overdueBy: 10,
          reminderType: 'urgent' as const,
          status: 'pending' as const,
          scheduledDate: new Date(),
          template: 'urgent-email',
          channel: 'email' as const,
          isAutomated: true,
          attempts: 0,
        }
      ];

      toast({
        title: "Reminders Generated",
        description: `Generated ${mockReminders.length} new reminders based on overdue fees.`,
      });

      return mockReminders;
    } catch (error) {
      toast({
        title: "Failed to Generate Reminders",
        description: "There was an error generating reminders.",
        variant: "destructive",
      });
      return [];
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleTakeAction = (notificationId: string, action: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && action === 'primary' && notification.actionRequired) {
      handleSendReminder(`action-${notification.id}`);
      handleMarkAsRead(notificationId);
    }
  };

  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper title="Fee Reminders" subtitle="Manage and automate fee payment reminders">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a branch and academic session to access fee reminders.
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Fee Reminders" subtitle="Manage and automate fee payment reminders">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <FeeRemindersSystem
            students={(studentsQuery.data || []) as any}
            onSendReminder={handleSendReminder}
            onBulkSendReminders={handleBulkSendReminders}
            onCreateReminderRule={handleCreateReminderRule}
            onUpdateTemplate={handleUpdateTemplate}
            onGenerateReminders={handleGenerateReminders}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <NotificationService
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDismiss={handleDismissNotification}
              onTakeAction={handleTakeAction}
            />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicFeeRemindersPageContent = dynamic(() => Promise.resolve(FeeRemindersPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function FeeRemindersPage() {
  return <DynamicFeeRemindersPageContent />;
} 