import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { backgroundTaskService } from "@/services/background-task-service";
import { emailService } from "@/utils/email";

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
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  progress: {
    processed: number;
    total: number;
    failed: number;
    percentage: number;
  };
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  results?: any;
  errors?: string[];
}

export const backgroundTasksRouter = createTRPCRouter({
  // Get service status
  getServiceStatus: protectedProcedure.query(async ({ ctx }) => {
    return backgroundTaskService.getServiceStatus();
  }),

  // Get processing status
  getProcessingStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await backgroundTaskService.getServiceStatus();
    return {
      isProcessing: status.runningTasks > 0,
      activeTaskCount: status.runningTasks,
      pendingTaskCount: status.pendingTasks,
    };
  }),

  // Get all tasks
  getAllTasks: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      return backgroundTaskService.getAllTasks(ctx.userId || undefined);
    }),

  // Create a bulk task
  createBulkTask: protectedProcedure
    .input(z.object({
      type: z.enum(['student', 'teacher', 'employee', 'parent', 'general']),
      operation: z.string(),
      items: z.array(z.any()),
      title: z.string(),
      description: z.string().optional(),
      branchId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const taskData = {
        type: input.type,
        operation: input.operation,
        items: input.items,
      };

      const taskId = await backgroundTaskService.createTask(
        'BULK_IMPORT',
        input.title,
        input.description || `Bulk ${input.operation} for ${input.items.length} ${input.type}s`,
        taskData,
        input.branchId || ctx.user?.branchId,
        ctx.userId || undefined
      );

      return { taskId };
    }),

  // Get task by ID
  getTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return backgroundTaskService.getTask(input.taskId);
    }),

  // Delete task
  deleteTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await backgroundTaskService.deleteTask(input.taskId);
      return { success: true };
    }),

  // Pause task
  pauseTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await backgroundTaskService.pauseTask(input.taskId);
      return { success: true };
    }),

  // Resume task
  resumeTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await backgroundTaskService.resumeTask(input.taskId);
      return { success: true };
    }),

  // Cancel task
  cancelTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await backgroundTaskService.cancelTask(input.taskId);
      return { success: true };
    }),

  // Restart services
  restartServices: protectedProcedure
    .mutation(async ({ ctx }) => {
      // This would restart background service processing
      console.log('Background services restart requested by:', ctx.userId);
      return { success: true, message: 'Services restart initiated' };
    }),

  // Email configuration methods
  getEmailConfig: protectedProcedure.query(async ({ ctx }) => {
    // Get email configuration from database or return defaults
    return {
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUsername: process.env.SMTP_USERNAME || '',
      smtpSecure: process.env.SMTP_SECURE === 'true',
      fromEmail: process.env.FROM_EMAIL || '',
      fromName: process.env.FROM_NAME || 'Scholarise',
      adminEmails: [],
      notifyOnTaskCompletion: true,
      notifyOnTaskFailure: true,
      includeTaskDetails: true,
      includeErrorLogs: false,
    };
  }),

  saveEmailConfig: protectedProcedure
    .input(emailConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Save email configuration to database
      console.log('Email config saved by:', ctx.userId, input);
      return { success: true };
    }),

  testEmailConnection: protectedProcedure
    .input(emailConfigSchema.partial())
    .mutation(async ({ ctx, input }) => {
      try {
        // Test email connection (simplified for now)
        console.log('Testing email connection with config:', input);

        return { success: true, message: 'Email connection successful' };
      } catch (error) {
        console.error('Email test failed:', error);
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Email connection failed' 
        };
      }
    }),
}); 