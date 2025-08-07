import { type PrismaClient } from "@prisma/client";

export interface AutomationLogEntry {
  automationType: 
    | 'ADMISSION_REGISTRATION'
    | 'FEE_REMINDER'
    | 'FEE_RECEIPT'
    | 'ATTENDANCE_ALERT'
    | 'EXAM_REMINDER'
    | 'TRANSPORT_NOTIFICATION'
    | 'SALARY_NOTIFICATION'
    | 'LEAVE_STATUS'
    | 'SYSTEM_NOTIFICATION';
  automationTrigger: string; // e.g., 'admission_inquiry_created', 'fee_due_reminder'
  messageTitle: string;
  messageContent?: string;
  templateId?: string;
  templateName?: string;
  recipientId: string; // ID of student, parent, teacher, etc.
  recipientName: string;
  recipientPhone: string;
  recipientType: string; // STUDENT, PARENT, TEACHER, EMPLOYEE
  automationContext?: Record<string, any>;
  branchId: string;
  createdBy?: string;
  platformUsed?: string; // WHATSAPP, SMS, EMAIL
}

export interface AutomationLoggerService {
  createLog(entry: AutomationLogEntry): Promise<string>; // Returns the log ID
  
  updateDeliveryStatus(params: {
    logId: string;
    status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    deliveryDetails?: {
      sentAt?: Date;
      deliveredAt?: Date;
      readAt?: Date;
      errorMessage?: string;
      externalMessageId?: string; // WhatsApp message ID, etc.
    };
  }): Promise<void>;

  updateDeliveryStatusByExternalId(params: {
    externalMessageId: string;
    status: 'DELIVERED' | 'READ';
    deliveryDetails?: {
      deliveredAt?: Date;
      readAt?: Date;
    };
  }): Promise<void>;
}

export function createAutomationLogger(db: PrismaClient): AutomationLoggerService {
  return {
    async createLog(entry: AutomationLogEntry): Promise<string> {
      const log = await db.automationLog.create({
        data: {
          automationType: entry.automationType,
          automationTrigger: entry.automationTrigger,
          messageTitle: entry.messageTitle,
          messageContent: entry.messageContent,
          templateId: entry.templateId,
          templateName: entry.templateName,
          recipientId: entry.recipientId,
          recipientName: entry.recipientName,
          recipientPhone: entry.recipientPhone,
          recipientType: entry.recipientType,
          status: 'PENDING',
          automationContext: entry.automationContext || {},
          branchId: entry.branchId,
          createdBy: entry.createdBy || 'system',
          platformUsed: entry.platformUsed,
        }
      });

      return log.id;
    },

    async updateDeliveryStatus(params) {
      const { logId, status, deliveryDetails } = params;
      
      await db.automationLog.update({
        where: { id: logId },
        data: {
          status,
          sentAt: deliveryDetails?.sentAt,
          deliveredAt: deliveryDetails?.deliveredAt,
          readAt: deliveryDetails?.readAt,
          errorMessage: deliveryDetails?.errorMessage,
          externalMessageId: deliveryDetails?.externalMessageId,
          updatedAt: new Date(),
        }
      });
    },

    async updateDeliveryStatusByExternalId(params) {
      const { externalMessageId, status, deliveryDetails } = params;
      
      await db.automationLog.updateMany({
        where: { externalMessageId },
        data: {
          status,
          deliveredAt: deliveryDetails?.deliveredAt,
          readAt: deliveryDetails?.readAt,
          updatedAt: new Date(),
        }
      });
    }
  };
} 