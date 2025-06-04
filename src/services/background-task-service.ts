import { db } from '@/server/db';
import { emailService } from '@/utils/email';
import { type BackgroundTaskStatus } from '@prisma/client';
import { 
  createStudentUser,
  createTeacherUser,
  createEmployeeUser 
} from '@/utils/clerk';

// Import startup to trigger auto-initialization
import '@/lib/startup';

interface TaskProgress {
  processed: number;
  total: number;
  failed: number;
  percentage: number;
}

interface BulkTaskData {
  type: 'student' | 'teacher' | 'employee';
  items: any[];
  branchId?: string;
  createdBy?: string;
}

export class BackgroundTaskService {
  private isProcessing = false;
  private currentTaskId: string | null = null;

  async createTask(
    taskType: string,
    title: string,
    description: string | null,
    inputData: any,
    branchId?: string,
    createdBy?: string,
    priority: number = 5
  ): Promise<string> {
    const task = await db.backgroundTask.create({
      data: {
        taskType,
        title,
        description,
        inputData,
        branchId,
        createdBy,
        priority,
        totalItems: inputData?.items?.length || 0,
        status: 'PENDING'
      }
    });

    console.log(`Created background task: ${task.id} - ${title}`);
    
    // Log task creation
    await this.logTaskExecution(task.id, 'INFO', `Task created: ${title}`);
    
    // Start processing immediately if not already processing
    if (!this.isProcessing) {
      this.startProcessing();
    }
    
    return task.id;
  }

  async startProcessing() {
    if (this.isProcessing) {
      console.log('Task processing already in progress');
      return;
    }

    this.isProcessing = true;
    console.log('Starting background task processing...');

    try {
      while (true) {
        // Get the next pending task with highest priority
        const task = await db.backgroundTask.findFirst({
          where: {
            status: { in: ['PENDING', 'RETRY'] }
          },
          orderBy: [
            { priority: 'asc' }, // Lower number = higher priority
            { createdAt: 'asc' }  // FIFO for same priority
          ]
        });

        if (!task) {
          console.log('No pending tasks found. Stopping processor.');
          break;
        }

        await this.processTask(task.id);
        
        // Small delay between tasks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in task processing loop:', error);
    } finally {
      this.isProcessing = false;
      this.currentTaskId = null;
      console.log('Background task processing stopped');
    }
  }

  async processTask(taskId: string) {
    this.currentTaskId = taskId;
    const startTime = Date.now();

    try {
      // Mark task as running
      await db.backgroundTask.update({
        where: { id: taskId },
        data: {
          status: 'RUNNING',
          startedAt: new Date()
        }
      });

      const task = await db.backgroundTask.findUnique({
        where: { id: taskId }
      });

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      await this.logTaskExecution(taskId, 'INFO', `Starting task processing: ${task.title}`);

      let results: any = {};
      
      switch (task.taskType) {
        case 'BULK_CLERK_CREATION':
          results = await this.processBulkClerkCreation(taskId, task.inputData as unknown as BulkTaskData);
          break;
        
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      // Calculate duration
      const duration = Date.now() - startTime;
      const durationStr = this.formatDuration(duration);

      // Mark task as completed
      await db.backgroundTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          results: results
        }
      });

      await this.logTaskExecution(taskId, 'INFO', `Task completed successfully in ${durationStr}`);

      // Send completion email
      await this.sendTaskNotification(taskId, 'COMPLETED', duration);

    } catch (error) {
      console.error(`Task ${taskId} failed:`, error);
      
      // Mark task as failed
      await db.backgroundTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errors: {
            push: String(error)
          }
        }
      });

      await this.logTaskExecution(taskId, 'ERROR', `Task failed: ${String(error)}`);

      // Send failure email
      await this.sendTaskNotification(taskId, 'FAILED');
    }
  }

  private async processBulkClerkCreation(taskId: string, data: BulkTaskData): Promise<any> {
    const { type, items, branchId } = data;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      processedItems: [] as any[]
    };

    const batchSize = 10; // Process in batches to avoid overwhelming Clerk API
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      await this.logTaskExecution(taskId, 'INFO', `Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)}`);
      
      for (const item of batch) {
        try {
          let clerkUser;
          let dbRecord;
          
          switch (type) {
            case 'student':
              clerkUser = await createStudentUser(item);
              dbRecord = await db.student.create({
                data: {
                  ...item,
                  clerkId: clerkUser.id,
                  branchId: branchId || item.branchId
                }
              });
              break;
              
            case 'teacher':
              clerkUser = await createTeacherUser(item);
              dbRecord = await db.teacher.create({
                data: {
                  ...item,
                  clerkId: clerkUser.id,
                  branchId: branchId || item.branchId
                }
              });
              break;
              
            case 'employee':
              clerkUser = await createEmployeeUser(item);
              dbRecord = await db.employee.create({
                data: {
                  ...item,
                  clerkId: clerkUser.id,
                  branchId: branchId || item.branchId
                }
              });
              break;
              
            default:
              throw new Error(`Unknown user type: ${type}`);
          }

          results.success++;
          results.processedItems.push({
            id: dbRecord.id,
            clerkId: clerkUser.id,
            email: item.email || item.officialEmail || item.personalEmail
          });

          await this.logTaskExecution(taskId, 'INFO', `Successfully created ${type}: ${item.firstName} ${item.lastName}`);

        } catch (error) {
          results.failed++;
          const errorMsg = `Failed to create ${type} ${item.firstName} ${item.lastName}: ${String(error)}`;
          results.errors.push(errorMsg);
          
          await this.logTaskExecution(taskId, 'ERROR', errorMsg);
        }

        // Update progress
        const processed = results.success + results.failed;
        const percentage = Math.round((processed / items.length) * 100);
        
        await db.backgroundTask.update({
          where: { id: taskId },
          data: {
            processedItems: processed,
            failedItems: results.failed,
            percentage: percentage
          }
        });

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  private async sendTaskNotification(taskId: string, status: 'COMPLETED' | 'FAILED', duration?: number) {
    try {
      const task = await db.backgroundTask.findUnique({
        where: { id: taskId }
      });

      if (!task) return;

      const durationStr = duration ? this.formatDuration(duration) : undefined;

      await emailService.sendTaskNotification({
        taskId: task.id,
        taskType: task.taskType,
        title: task.title,
        status: status,
        processedItems: task.processedItems,
        totalItems: task.totalItems,
        failedItems: task.failedItems || 0,
        results: task.results,
        errors: task.errors,
        duration: durationStr,
        branchId: task.branchId || undefined
      });
    } catch (error) {
      console.error('Failed to send task notification:', error);
    }
  }

  private async logTaskExecution(taskId: string, level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL', message: string, details?: any) {
    try {
      await db.taskExecutionLog.create({
        data: {
          taskId,
          level,
          message,
          details: details || null
        }
      });
    } catch (error) {
      console.error('Failed to log task execution:', error);
    }
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async getTaskStatus(taskId: string) {
    return await db.backgroundTask.findUnique({
      where: { id: taskId },
      include: {
        executionLogs: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });
  }

  async getAllTasks(branchId?: string) {
    return await db.backgroundTask.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50 tasks
    });
  }

  async deleteTask(taskId: string) {
    // Can only delete completed or failed tasks
    const task = await db.backgroundTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)) {
      throw new Error('Cannot delete active task');
    }

    await db.backgroundTask.delete({
      where: { id: taskId }
    });
  }

  async cancelTask(taskId: string) {
    const task = await db.backgroundTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status)) {
      throw new Error('Cannot cancel completed task');
    }

    await db.backgroundTask.update({
      where: { id: taskId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date()
      }
    });

    await this.logTaskExecution(taskId, 'INFO', 'Task cancelled by user');
  }

  // Method to restart the processing (useful for cron jobs or startup)
  async restartProcessing() {
    if (!this.isProcessing) {
      console.log('Restarting background task processing...');
      this.startProcessing();
    }
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }
}

// Create singleton instance
export const backgroundTaskService = new BackgroundTaskService(); 