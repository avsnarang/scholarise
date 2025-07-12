import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { backgroundTaskService } from "@/services/background-task-service";
import { emailService } from "@/utils/email";
import { getBackgroundServiceStatus, forceRestartBackgroundServices } from "@/lib/startup";
import type { BackgroundTask } from "@prisma/client";

const emailConfigSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  adminEmails: z.array(z.string().email()).optional(),
  notifyOnTaskCompletion: z.boolean().optional(),
  notifyOnTaskFailure: z.boolean().optional(),
  includeTaskDetails: z.boolean().optional(),
  includeErrorLogs: z.boolean().optional(),
  branchId: z.string().optional(),
  isGlobal: z.boolean().optional(),
});

interface TaskResponse {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    processed: number;
    total: number;
    percentage: number;
  };
  results?: any;
  startTime: Date;
  endTime?: Date;
  description?: string;
}

export const backgroundTasksRouter = createTRPCRouter({
  // Get service status
  getServiceStatus: protectedProcedure
    .query(async () => {
      return getBackgroundServiceStatus();
    }),

  // Force restart services
  restartServices: protectedProcedure
    .mutation(async () => {
      await forceRestartBackgroundServices();
      return { success: true, status: getBackgroundServiceStatus() };
    }),

  // Get all background tasks
  getAllTasks: protectedProcedure
    .input(z.object({
      branchId: z.string().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      const tasks = await backgroundTaskService.getAllTasks(input?.branchId);
      
      // Transform to match the existing interface with proper status mapping
      return tasks.map((task: BackgroundTask): TaskResponse => {
        let uiStatus: 'pending' | 'processing' | 'completed' | 'failed';
        
        // Map database enum values to UI expected values
        switch (task.status) {
          case 'PENDING':
          case 'QUEUED':
            uiStatus = 'pending';
            break;
          case 'RUNNING':
            uiStatus = 'processing';
            break;
          case 'COMPLETED':
            uiStatus = 'completed';
            break;
          case 'FAILED':
          case 'CANCELLED':
            uiStatus = 'failed';
            break;
          case 'RETRY':
            uiStatus = 'pending';
            break;
          default:
            uiStatus = 'pending';
        }
        
        return {
          id: task.id,
          type: task.title,
          status: uiStatus,
          progress: {
            processed: task.processedItems,
            total: task.totalItems,
            percentage: task.percentage
          },
          results: task.results,
          startTime: task.startedAt || task.createdAt,
          endTime: task.completedAt || undefined,
          description: task.description || undefined
        };
      });
    }),

  // Get task details with logs
  getTaskDetails: protectedProcedure
    .input(z.object({
      taskId: z.string()
    }))
    .query(async ({ input }) => {
      return await backgroundTaskService.getTaskStatus(input.taskId);
    }),

  // Create a new background task (for bulk operations)
  createBulkTask: protectedProcedure
    .input(z.object({
      type: z.enum(['student', 'teacher', 'employee']),
      title: z.string(),
      description: z.string().optional(),
      items: z.array(z.any()),
      branchId: z.string().optional(),
      priority: z.number().min(1).max(10).default(5)
    }))
    .mutation(async ({ input, ctx }) => {
      const taskId = await backgroundTaskService.createTask(
        'BULK_CLERK_CREATION',
        input.title,
        input.description || null,
        {
          type: input.type,
          items: input.items,
          branchId: input.branchId
        },
        input.branchId,
        ctx.userId,
        input.priority
      );

      return { taskId };
    }),

  // Delete a completed task
  deleteTask: protectedProcedure
    .input(z.object({
      taskId: z.string()
    }))
    .mutation(async ({ input }) => {
      await backgroundTaskService.deleteTask(input.taskId);
      return { success: true };
    }),

  // Cancel a running task
  cancelTask: protectedProcedure
    .input(z.object({
      taskId: z.string()
    }))
    .mutation(async ({ input }) => {
      await backgroundTaskService.cancelTask(input.taskId);
      return { success: true };
    }),

  // Get processing status
  getProcessingStatus: protectedProcedure
    .query(async () => {
      return {
        isProcessing: backgroundTaskService.isCurrentlyProcessing(),
        currentTaskId: backgroundTaskService.getCurrentTaskId()
      };
    }),

  // Restart task processing
  restartProcessing: protectedProcedure
    .mutation(async () => {
      await backgroundTaskService.restartProcessing();
      return { success: true };
    }),

  // Email Configuration Management
  getEmailConfig: protectedProcedure
    .input(z.object({
      branchId: z.string().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      const config = await ctx.db.emailConfiguration.findFirst({
        where: {
          OR: [
            { branchId: input?.branchId, isActive: true },
            { isGlobal: true, isActive: true }
          ]
        },
        orderBy: [
          { branchId: 'desc' }, // Prefer branch-specific config
          { isGlobal: 'desc' }
        ]
      });

      if (!config) {
        // Return default configuration
        return {
          id: null,
          smtpHost: '',
          smtpPort: 587,
          smtpUsername: '',
          smtpPassword: '',
          smtpSecure: false,
          fromEmail: '',
          fromName: 'Scholarise System',
          adminEmails: [],
          notifyOnTaskCompletion: true,
          notifyOnTaskFailure: true,
          includeTaskDetails: true,
          includeErrorLogs: false,
          branchId: input?.branchId || null,
          isGlobal: !input?.branchId,
          isActive: true
        };
      }

      // Don't return the password for security
      return {
        ...config,
        smtpPassword: config.smtpPassword ? '********' : ''
      };
    }),

  saveEmailConfig: protectedProcedure
    .input(emailConfigSchema)
    .mutation(async ({ input, ctx }) => {
      const { smtpPassword, ...configData } = input;
      
      // Find existing config
      const existingConfig = await ctx.db.emailConfiguration.findFirst({
        where: {
          OR: [
            { branchId: input.branchId, isActive: true },
            { isGlobal: input.isGlobal === true, isActive: true }
          ]
        }
      });

      let finalData: any = { ...configData };

      // Handle password updates
      if (smtpPassword && smtpPassword !== '********') {
        // TODO: Encrypt password in production
        finalData.smtpPassword = smtpPassword;
      } else if (existingConfig) {
        // Keep existing password if not changed
        finalData.smtpPassword = existingConfig.smtpPassword;
      }

      if (existingConfig) {
        // Update existing config
        const updated = await ctx.db.emailConfiguration.update({
          where: { id: existingConfig.id },
          data: finalData
        });
        return { success: true, id: updated.id };
      } else {
        // Create new config
        const created = await ctx.db.emailConfiguration.create({
          data: {
            ...finalData,
            isActive: true
          }
        });
        return { success: true, id: created.id };
      }
    }),

  testEmailConnection: protectedProcedure
    .input(z.object({
      branchId: z.string().optional()
    }).optional())
    .mutation(async ({ input }) => {
      const isWorking = await emailService.testConnection(input?.branchId);
      return { success: isWorking };
    }),

  sendTestEmail: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      testEmail: z.string().email()
    }))
    .mutation(async ({ input }) => {
      // Send a test notification
      const success = await emailService.sendTaskNotification({
        taskId: 'test-task-id',
        taskType: 'EMAIL_TEST',
        title: 'Email Configuration Test',
        status: 'COMPLETED',
        processedItems: 1,
        totalItems: 1,
        failedItems: 0,
        results: { message: 'This is a test email to verify your email configuration is working correctly.' },
        branchId: input.branchId
      });

      return { success };
    }),
}); 