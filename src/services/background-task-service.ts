import { db } from '@/server/db';
import { emailService } from '@/utils/email';
import { type BackgroundTaskStatus } from '@prisma/client';

interface TaskProgress {
  processed: number;
  total: number;
  failed: number;
  percentage: number;
}

interface BulkTaskData {
  type: 'student' | 'teacher' | 'employee' | 'parent' | 'general';
  items: any[];
  operation: string;
}

class BackgroundTaskService {
  private static instance: BackgroundTaskService;
  private processingTasks = new Map<string, boolean>();

  private constructor() {}

  public static getInstance(): BackgroundTaskService {
    if (!BackgroundTaskService.instance) {
      BackgroundTaskService.instance = new BackgroundTaskService();
    }
    return BackgroundTaskService.instance;
  }

  async createTask(
    taskType: string,
    title: string,
    description: string,
    data: any,
    branchId?: string,
    createdBy?: string
  ): Promise<string> {
    const task = await db.backgroundTask.create({
      data: {
        taskType,
        title,
        description,
        status: 'PENDING',
        percentage: 0,
        inputData: data,
        branchId,
        createdBy,
      },
    });

    // Start processing the task asynchronously
    this.processTask(task.id).catch(console.error);

    return task.id;
  }

  async getTask(taskId: string) {
    return db.backgroundTask.findUnique({
      where: { id: taskId },
    });
  }

  async getAllTasks(userId?: string, branchId?: string) {
    const where: any = {};
    if (userId) where.createdBy = userId;
    if (branchId) where.branchId = branchId;

    return db.backgroundTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent tasks
    });
  }

  async updateTaskProgress(taskId: string, percentage: number, status?: BackgroundTaskStatus) {
    return db.backgroundTask.update({
      where: { id: taskId },
      data: {
        percentage,
        ...(status && { status }),
        updatedAt: new Date(),
      },
    });
  }

  async markTaskCompleted(taskId: string, results?: any) {
    return db.backgroundTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        percentage: 100,
        results,
        completedAt: new Date(),
      },
    });
  }

  async markTaskFailed(taskId: string, error: string) {
    return db.backgroundTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        errors: [error],
        completedAt: new Date(),
      },
    });
  }

  async deleteTask(taskId: string) {
    return db.backgroundTask.delete({
      where: { id: taskId },
    });
  }

  async pauseTask(taskId: string) {
    return db.backgroundTask.update({
      where: { id: taskId },
      data: { status: 'PAUSED' },
    });
  }

  async resumeTask(taskId: string) {
    const task = await db.backgroundTask.update({
      where: { id: taskId },
      data: { status: 'RUNNING' },
    });

    // Resume processing
    this.processTask(task.id).catch(console.error);

    return task;
  }

  async cancelTask(taskId: string) {
    return db.backgroundTask.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' },
    });
  }

  private async processTask(taskId: string) {
    if (this.processingTasks.has(taskId)) {
      return; // Already processing
    }

    this.processingTasks.set(taskId, true);

    try {
      const task = await this.getTask(taskId);
      if (!task || task.status !== 'PENDING') {
        return;
      }

      await this.updateTaskProgress(taskId, 0, 'RUNNING');

      // Process based on task type
      switch (task.taskType) {
        case 'BULK_IMPORT':
          if (task.inputData) {
            await this.processBulkImport(taskId, task.inputData as unknown as BulkTaskData);
          }
          break;
        case 'DATA_EXPORT':
          if (task.inputData) {
            await this.processDataExport(taskId, task.inputData as unknown as BulkTaskData);
          }
          break;
        case 'BULK_UPDATE':
          if (task.inputData) {
            await this.processBulkUpdate(taskId, task.inputData as unknown as BulkTaskData);
          }
          break;
        default:
          console.warn(`Unknown task type: ${task.taskType}`);
          await this.markTaskFailed(taskId, `Unknown task type: ${task.taskType}`);
      }
    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error);
      await this.markTaskFailed(taskId, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.processingTasks.delete(taskId);
    }
  }

  private async processBulkImport(taskId: string, data: BulkTaskData) {
    const { items, type, operation } = data;
    const total = items.length;
    let processed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Process each item based on type and operation
        await this.processItem(type, operation, item);
        processed++;
      } catch (error) {
        console.error(`Error processing item:`, error);
        failed++;
      }

      // Update progress
      const progress = Math.round((processed / total) * 100);
      await this.updateTaskProgress(taskId, progress);

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.markTaskCompleted(taskId, {
      total,
      processed,
      failed,
      successRate: Math.round(((processed - failed) / total) * 100)
    });
  }

  private async processDataExport(taskId: string, data: any) {
    // Implement data export logic
    await this.updateTaskProgress(taskId, 50);
    // ... export logic ...
    await this.markTaskCompleted(taskId, { exportPath: '/exports/data.csv' });
  }

  private async processBulkUpdate(taskId: string, data: any) {
    // Implement bulk update logic
    await this.updateTaskProgress(taskId, 50);
    // ... update logic ...
    await this.markTaskCompleted(taskId, { updated: data.items?.length || 0 });
  }

  private async processItem(type: string, operation: string, item: any) {
    // Process individual items based on type and operation
    // This would contain the actual business logic for each operation
    switch (type) {
      case 'student':
        await this.processStudentItem(operation, item);
        break;
      case 'teacher':
        await this.processTeacherItem(operation, item);
        break;
      case 'employee':
        await this.processEmployeeItem(operation, item);
        break;
      default:
        throw new Error(`Unknown item type: ${type}`);
    }
  }

  private async processStudentItem(operation: string, item: any) {
    switch (operation) {
      case 'import':
        // Import student logic
        break;
      case 'update':
        // Update student logic
        break;
      default:
        throw new Error(`Unknown student operation: ${operation}`);
    }
  }

  private async processTeacherItem(operation: string, item: any) {
    switch (operation) {
      case 'import':
        // Import teacher logic
        break;
      case 'update':
        // Update teacher logic
        break;
      default:
        throw new Error(`Unknown teacher operation: ${operation}`);
    }
  }

  private async processEmployeeItem(operation: string, item: any) {
    switch (operation) {
      case 'import':
        // Import employee logic
        break;
      case 'update':
        // Update employee logic
        break;
      default:
        throw new Error(`Unknown employee operation: ${operation}`);
    }
  }

  async getServiceStatus() {
    const [pendingCount, runningCount, completedCount, failedCount] = await Promise.all([
      db.backgroundTask.count({ where: { status: 'PENDING' } }),
      db.backgroundTask.count({ where: { status: 'RUNNING' } }),
      db.backgroundTask.count({ where: { status: 'COMPLETED' } }),
      db.backgroundTask.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      isRunning: this.processingTasks.size > 0,
      pendingTasks: pendingCount,
      runningTasks: runningCount,
      completedTasks: completedCount,
      failedTasks: failedCount,
      activeTasks: this.processingTasks.size,
    };
  }
}

export const backgroundTaskService = BackgroundTaskService.getInstance(); 