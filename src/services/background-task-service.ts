import { db } from '@/server/db';
import { emailService } from '@/utils/email';
import { type BackgroundTaskStatus } from '@prisma/client';
import { 
  createStudentUser,
  createTeacherUser,
  createEmployeeUser,
  createParentUser
} from '@/utils/clerk';

interface TaskProgress {
  processed: number;
  total: number;
  failed: number;
  percentage: number;
}

interface BulkTaskData {
  type: 'student' | 'teacher' | 'employee' | 'parent';
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
    // Calculate total items based on task type and input data structure
    let totalItems = 0;
    if (taskType === 'BULK_CLERK_CREATION' && inputData?.items) {
      totalItems = inputData.items.length;
    } else if (taskType === 'BULK_CLERK_RETRY' && inputData?.userIds) {
      totalItems = inputData.userIds.length;
    } else if (inputData?.items) {
      totalItems = inputData.items.length;
    } else if (inputData?.userIds) {
      totalItems = inputData.userIds.length;
    }

    const task = await db.backgroundTask.create({
      data: {
        taskType,
        title,
        description,
        inputData,
        branchId,
        createdBy,
        priority,
        totalItems,
        status: 'PENDING'
      }
    });

    console.log(`Created background task: ${task.id} - ${title} (${totalItems} items)`);
    
    // Log task creation
    await this.logTaskExecution(task.id, 'INFO', `Task created: ${title} with ${totalItems} items`);
    
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
      while (this.isProcessing) {
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
          // No tasks found, wait before checking again
          await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
          continue;
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
        
        case 'BULK_CLERK_RETRY':
          results = await this.processBulkClerkRetry(taskId, task.inputData as unknown as any);
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
    
    // Ensure branchId is defined
    if (!branchId) {
      throw new Error('branchId is required for bulk clerk creation');
    }
    
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
              // Use the full original student import logic
              const studentData = item;
              
              // Parse dates
              const parseDate = (dateStr: string) => {
                if (!dateStr) return null;
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  const day = parseInt(parts[0]!, 10);
                  const month = parseInt(parts[1]!, 10) - 1;
                  const year = parseInt(parts[2]!, 10);
                  return new Date(year, month, day);
                }
                return null;
              };

              const dateOfBirth = parseDate(studentData.dateOfBirth);
              const dateOfAdmission = parseDate(studentData.dateOfAdmission) || new Date();

              if (!dateOfBirth) {
                throw new Error('Invalid date of birth format');
              }

              // Check for duplicate admission number
              const existingStudent = await db.student.findFirst({
                where: {
                  admissionNumber: studentData.admissionNumber,
                  branchId: branchId,
                },
              });

              if (existingStudent) {
                throw new Error(`Student with admission number '${studentData.admissionNumber}' already exists`);
              }

              // Get branch info
              const branch = await db.branch.findUnique({
                where: { id: branchId },
                select: { code: true }
              });

              if (!branch) {
                throw new Error(`Branch not found for ID: ${branchId}`);
              }

              // Determine sectionId for the student
              let assignedSectionId: string | undefined = undefined;

              if (studentData.sectionId) {
                const section = await db.section.findFirst({
                  where: { 
                    id: studentData.sectionId, 
                    class: { branchId: branchId, isActive: true },
                    isActive: true 
                  }
                });
                if (section) {
                  assignedSectionId = section.id;
                }
              } else if (studentData.classId) {
                // Check if classId is actually a sectionId
                const section = await db.section.findFirst({
                  where: { 
                    id: studentData.classId, 
                    class: { branchId: branchId, isActive: true },
                    isActive: true 
                  }
                });
                if (section) {
                  assignedSectionId = section.id;
                } else {
                  // Try as actual classId
                  const sectionByClass = await db.section.findFirst({
                    where: { classId: studentData.classId, class: { branchId: branchId, isActive: true } }
                  });
                  if (sectionByClass) {
                    assignedSectionId = sectionByClass.id;
                  }
                }
              }

              if (!assignedSectionId && studentData.className && studentData.sectionName) {
                const section = await db.section.findFirst({
                  where: {
                    name: studentData.sectionName,
                    class: {
                      name: studentData.className,
                      branchId: branchId,
                      isActive: true,
                    },
                    isActive: true,
                  },
                });
                if (section) {
                  assignedSectionId = section.id;
                }
              }

              if (!assignedSectionId && studentData.className) {
                const section = await db.section.findFirst({
                  where: {
                    class: {
                      name: studentData.className,
                      branchId: branchId,
                      isActive: true,
                    },
                    isActive: true,
                  },
                  orderBy: { name: 'asc' },
                });
                if (section) {
                  assignedSectionId = section.id;
                }
              }

              if (!assignedSectionId) {
                throw new Error(`Could not determine section for student ${studentData.firstName} ${studentData.lastName}`);
              }

              // Generate credentials
              const emailDomain = branch.code === 'PS' ? 'ps.tsh.edu.in' :
                                 branch.code === 'JUN' ? 'jun.tsh.edu.in' :
                                 branch.code === 'MAJ' ? 'majra.tsh.edu.in' : 'tsh.edu.in';
              
              const studentUsername = studentData.username || `${studentData.admissionNumber}@${emailDomain}`;
              const studentPassword = studentData.password || (branch.code === 'PS' ? 'TSHPS@12345' :
                            branch.code === 'JUN' ? 'TSHJ@12345' :
                            branch.code === 'MAJ' ? 'TSHM@12345' : 'TSH@12345');

              const parentUsername = studentData.parentUsername || `P${studentData.admissionNumber}`;
              const parentPassword = studentData.parentPassword || studentPassword;

              // Create Clerk users
              let clerkStudentId: string | null = null;
              let clerkParentId: string | null = null;

              if (!studentData.firstName || !studentData.lastName) {
                throw new Error('Student first name and last name are required');
              }

              try {
                const studentUser = await createStudentUser({
                  firstName: studentData.firstName,
                  lastName: studentData.lastName,
                  username: studentUsername,
                  password: studentPassword,
                  branchCode: branch.code,
                  branchId: branchId,
                });
                clerkStudentId = studentUser.id;
              } catch (error) {
                await this.logTaskExecution(taskId, 'WARN', `Failed to create Clerk user for student ${studentData.firstName} ${studentData.lastName}: ${String(error)}`);
              }

              try {
                // Extract parent name with proper first/last name splitting
                let parentFirstName = '';
                let parentLastName = studentData.lastName;
                
                if (studentData.fatherName) {
                  const fatherNameParts = studentData.fatherName.trim().split(/\s+/);
                  parentFirstName = fatherNameParts[0] || studentData.fatherName;
                  if (fatherNameParts.length > 1) {
                    parentLastName = fatherNameParts.slice(1).join(' ');
                  }
                } else if (studentData.motherName) {
                  const motherNameParts = studentData.motherName.trim().split(/\s+/);
                  parentFirstName = motherNameParts[0] || studentData.motherName;
                  if (motherNameParts.length > 1) {
                    parentLastName = motherNameParts.slice(1).join(' ');
                  }
                } else if (studentData.guardianName) {
                  const guardianNameParts = studentData.guardianName.trim().split(/\s+/);
                  parentFirstName = guardianNameParts[0] || studentData.guardianName;
                  if (guardianNameParts.length > 1) {
                    parentLastName = guardianNameParts.slice(1).join(' ');
                  }
                } else {
                  parentFirstName = studentData.firstName;
                  parentLastName = studentData.lastName;
                }
                
                const parentEmail = studentData.fatherEmail || studentData.motherEmail || studentData.guardianEmail;
                
                const parentUser = await createParentUser({
                  firstName: parentFirstName,
                  lastName: parentLastName,
                  username: parentUsername,
                  password: parentPassword,
                  email: parentEmail || undefined,
                  branchId: branchId,
                });
                clerkParentId = parentUser.id;
              } catch (error) {
                await this.logTaskExecution(taskId, 'WARN', `Failed to create Clerk user for parent of ${studentData.firstName} ${studentData.lastName}: ${String(error)}`);
              }

              // Create parent record
              const parentData = await db.parent.create({
                data: {
                  fatherName: studentData.fatherName || null,
                  fatherDob: studentData.fatherDob ? dateOfBirth : null,
                  fatherOccupation: studentData.fatherOccupation || null,
                  fatherMobile: studentData.fatherMobile || null,
                  fatherEmail: studentData.fatherEmail || null,
                  fatherAadharNumber: studentData.fatherAadharNumber ?? null,
                  motherName: studentData.motherName || null,
                  motherDob: studentData.motherDob ? dateOfBirth : null,
                  motherOccupation: studentData.motherOccupation || null,
                  motherMobile: studentData.motherMobile || null,
                  motherEmail: studentData.motherEmail || null,
                  motherAadharNumber: studentData.motherAadharNumber ?? null,
                  guardianName: studentData.guardianName || null,
                  guardianDob: studentData.guardianDob ? dateOfBirth : null,
                  guardianOccupation: studentData.guardianOccupation || null,
                  guardianMobile: studentData.guardianMobile || null,
                  guardianEmail: studentData.guardianEmail || null,
                  guardianAadharNumber: studentData.guardianAadharNumber ?? null,
                  parentAnniversary: null,
                  monthlyIncome: null,
                  clerkId: clerkParentId,
                },
              });

              // Create student record
              dbRecord = await db.student.create({
                data: {
                  admissionNumber: studentData.admissionNumber,
                  firstName: studentData.firstName,
                  lastName: studentData.lastName,
                  dateOfBirth: dateOfBirth,
                  dateOfAdmission: dateOfAdmission,
                  gender: studentData.gender,
                  email: studentData.email || null,
                  personalEmail: studentData.personalEmail || null,
                  phone: studentData.phone || null,
                  address: studentData.address || null,
                  permanentAddress: studentData.permanentAddress || null,
                  permanentCity: studentData.permanentCity || null,
                  permanentState: studentData.permanentState || null,
                  permanentCountry: studentData.permanentCountry || null,
                  permanentZipCode: studentData.permanentZipCode || null,
                  correspondenceAddress: studentData.correspondenceAddress || null,
                  correspondenceCity: studentData.correspondenceCity || null,
                  correspondenceState: studentData.correspondenceState || null,
                  correspondenceCountry: studentData.correspondenceCountry || null,
                  correspondenceZipCode: studentData.correspondenceZipCode || null,
                  previousSchool: studentData.previousSchool || null,
                  lastClassAttended: studentData.lastClassAttended || null,
                  mediumOfInstruction: studentData.mediumOfInstruction || null,
                  recognisedByStateBoard: studentData.recognisedByStateBoard || false,
                  schoolCity: studentData.schoolCity || null,
                  schoolState: studentData.schoolState || null,
                  reasonForLeaving: studentData.reasonForLeaving || null,
                  bloodGroup: studentData.bloodGroup || null,
                  branchId: branchId,
                  sectionId: assignedSectionId,
                  parentId: parentData.id,
                  username: studentUsername,
                  password: studentPassword,
                  clerkId: clerkStudentId,
                  isActive: true,
                  religion: studentData.religion || null,
                  nationality: studentData.nationality || null,
                  caste: studentData.caste || null,
                  aadharNumber: studentData.aadharNumber || null,
                  udiseId: studentData.udiseId || null,
                  cbse10RollNumber: studentData.cbse10RollNumber || null,
                  cbse12RollNumber: studentData.cbse12RollNumber || null,
                },
                include: {
                  section: {
                    include: {
                      class: true,
                    },
                  },
                },
              });

              // Create Academic Record for the current session
              if (dbRecord.section?.class?.id && studentData.sessionId) {
                await db.academicRecord.create({
                  data: {
                    studentId: dbRecord.id,
                    sessionId: studentData.sessionId,
                    classId: dbRecord.section.class.id,
                    status: "ENROLLED",
                  },
                });
              }
              
              clerkUser = { id: clerkStudentId || 'no-clerk-id' };
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
              
            case 'parent':
              clerkUser = await createParentUser(item);
              dbRecord = await db.parent.create({
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

  private async processBulkClerkRetry(taskId: string, data: any): Promise<any> {
    const { type, userIds } = data;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      processedItems: [] as any[]
    };

    await this.logTaskExecution(taskId, 'INFO', `Starting bulk ${type} Clerk retry for ${userIds.length} users`);

    for (const userId of userIds) {
      try {
        // Retry logic for each user type
        if (type === 'student') {
          await this.retryStudentClerkCreation(userId);
        } else if (type === 'teacher') {
          await this.retryTeacherClerkCreation(userId);
        } else if (type === 'employee') {
          await this.retryEmployeeClerkCreation(userId);
        } else if (type === 'parent') {
          await this.retryParentClerkCreation(userId);
        } else {
          throw new Error(`Unknown user type for retry: ${type}`);
        }

        results.success++;
        results.processedItems.push({ id: userId, status: 'success' });
        await this.logTaskExecution(taskId, 'INFO', `Successfully retried ${type} ${userId}`);

      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to retry ${type} ${userId}: ${String(error)}`;
        results.errors.push(errorMsg);
        await this.logTaskExecution(taskId, 'ERROR', errorMsg);
      }

      // Update progress
      const processed = results.success + results.failed;
      const percentage = Math.round((processed / userIds.length) * 100);
      
      await db.backgroundTask.update({
        where: { id: taskId },
        data: {
          processedItems: processed,
          failedItems: results.failed,
          percentage: percentage
        }
      });

      // Small delay between retries
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  private async retryStudentClerkCreation(studentId: string) {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { branch: { select: { code: true } } }
    });

    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    if (student.clerkId) {
      // Already has clerk account
      return;
    }

    const studentUsername = student.username || `${student.admissionNumber}`;
    const defaultPassword = `${studentUsername}@${new Date().getFullYear()}`;

    const clerkUser = await createStudentUser({
      firstName: student.firstName,
      lastName: student.lastName,
      username: studentUsername,
      password: defaultPassword,
      branchCode: student.branch?.code || '',
      branchId: student.branchId,
    });

    await db.student.update({
      where: { id: studentId },
      data: { clerkId: clerkUser.id }
    });
  }

  private async retryTeacherClerkCreation(teacherId: string) {
    const teacher = await db.teacher.findUnique({
      where: { id: teacherId }
    });

    if (!teacher) {
      throw new Error(`Teacher not found: ${teacherId}`);
    }

    if (teacher.clerkId) {
      return; // Already has clerk account
    }

    const clerkUser = await createTeacherUser({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.officialEmail || teacher.personalEmail || `${teacher.firstName}.${teacher.lastName}@temp.com`,
      password: `Teacher@${new Date().getFullYear()}`,
      branchId: teacher.branchId,
    });

    await db.teacher.update({
      where: { id: teacherId },
      data: { clerkId: clerkUser.id }
    });
  }

  private async retryEmployeeClerkCreation(employeeId: string) {
    const employee = await db.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    if (employee.clerkId) {
      return; // Already has clerk account
    }

    const clerkUser = await createEmployeeUser({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.officialEmail || employee.personalEmail || `${employee.firstName}.${employee.lastName}@temp.com`,
      password: `Employee@${new Date().getFullYear()}`,
      branchId: employee.branchId,
    });

    await db.employee.update({
      where: { id: employeeId },
      data: { clerkId: clerkUser.id }
    });
  }

  private async retryParentClerkCreation(parentId: string) {
    const parent = await db.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          where: { isActive: true },
          select: { admissionNumber: true, branchId: true },
          take: 1
        }
      }
    });

    if (!parent) {
      throw new Error(`Parent not found: ${parentId}`);
    }

    if (parent.clerkId) {
      return; // Already has clerk account
    }

    const branchId = parent.students[0]?.branchId || '';
    const username = `parent_${parent.id}`;

    const clerkUser = await createParentUser({
      firstName: parent.fatherName || 'Parent',
      lastName: parent.motherName || 'Family',
      username: username,
      password: `Parent@${new Date().getFullYear()}`,
      email: parent.fatherEmail || parent.motherEmail || undefined,
      branchId: branchId,
    });

    await db.parent.update({
      where: { id: parentId },
      data: { clerkId: clerkUser.id }
    });
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

  async pauseTask(taskId: string) {
    const task = await db.backgroundTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (!['PENDING', 'RUNNING'].includes(task.status)) {
      throw new Error('Cannot pause task in current state');
    }

    await db.backgroundTask.update({
      where: { id: taskId },
      data: {
        status: 'PAUSED'
      }
    });

    await this.logTaskExecution(taskId, 'INFO', 'Task paused by user');
  }

  async resumeTask(taskId: string) {
    const task = await db.backgroundTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'PAUSED') {
      throw new Error('Cannot resume task that is not paused');
    }

    await db.backgroundTask.update({
      where: { id: taskId },
      data: {
        status: 'PENDING'
      }
    });

    await this.logTaskExecution(taskId, 'INFO', 'Task resumed by user');

    // Restart processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  // Method to stop the processing
  async stopProcessing() {
    if (this.isProcessing) {
      console.log('Stopping background task processing...');
      this.isProcessing = false;
    }
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