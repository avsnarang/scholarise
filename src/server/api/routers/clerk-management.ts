import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createStudentUser, createParentUser, createTeacherUser, createEmployeeUser } from "@/utils/clerk";
import { backgroundTaskService } from "@/services/background-task-service";

// In-memory task storage (in production, use Redis or database)
const activeTasks = new Map<string, {
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
  estimatedTimeRemaining?: number;
}>();

// Helper function to update task progress
async function updateTaskProgress(taskId: string, update: {
  processed: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: any;
}) {
  const task = activeTasks.get(taskId);
  if (!task) return;

  const now = new Date();
  const percentage = Math.round((update.processed / update.total) * 100);
  
  // Calculate estimated time remaining
  let estimatedTimeRemaining: number | undefined;
  if (update.status === 'processing' && update.processed > 0) {
    const elapsedMs = now.getTime() - task.startTime.getTime();
    const avgTimePerItem = elapsedMs / update.processed;
    const remainingItems = update.total - update.processed;
    estimatedTimeRemaining = Math.round((avgTimePerItem * remainingItems) / 1000); // in seconds
  }

  activeTasks.set(taskId, {
    ...task,
    status: update.status,
    progress: {
      processed: update.processed,
      total: update.total,
      percentage
    },
    results: update.results,
    endTime: update.status === 'completed' || update.status === 'failed' ? now : undefined,
    estimatedTimeRemaining
  });
}

export const clerkManagementRouter = createTRPCRouter({
  // Get all users without Clerk IDs
  getUsersWithoutClerkIds: protectedProcedure
    .input(z.object({
      userType: z.enum(["students", "parents", "teachers", "employees", "all"]).optional().default("all"),
      branchId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause = {
        OR: [
          { clerkId: null },
          { clerkId: "" }
        ],
        isActive: true,
        ...(input.branchId && { branchId: input.branchId })
      };

      const results = {
        students: [] as any[],
        parents: [] as any[],
        teachers: [] as any[],
        employees: [] as any[],
      };

      // Get students without Clerk IDs
      if (input.userType === "all" || input.userType === "students") {
        results.students = await ctx.db.student.findMany({
          where: whereClause,
          include: {
            branch: {
              select: { code: true, name: true }
            },
            section: {
              include: {
                class: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        });
      }

      // Get parents without Clerk IDs
      if (input.userType === "all" || input.userType === "parents") {
        const parentWhere = {
          OR: [
            { clerkId: null },
            { clerkId: "" }
          ]
        };

        results.parents = await ctx.db.parent.findMany({
          where: parentWhere,
          include: {
            students: {
              where: { isActive: true },
              select: {
                firstName: true,
                lastName: true,
                admissionNumber: true,
                branchId: true,
                branch: {
                  select: { code: true, name: true }
                }
              },
              take: 1 // Just get one child to show branch info
            }
          },
          orderBy: { createdAt: "desc" }
        });
      }

      // Get teachers without Clerk IDs
      if (input.userType === "all" || input.userType === "teachers") {
        results.teachers = await ctx.db.teacher.findMany({
          where: whereClause,
          include: {
            branch: {
              select: { code: true, name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        });
      }

      // Get employees without Clerk IDs
      if (input.userType === "all" || input.userType === "employees") {
        results.employees = await ctx.db.employee.findMany({
          where: whereClause,
          include: {
            branch: {
              select: { code: true, name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        });
      }

      return results;
    }),

  // Retry Clerk account creation for selected users
  retryClerkAccountCreation: protectedProcedure
    .input(z.object({
      userType: z.enum(["student", "parent", "teacher", "employee"]),
      userIds: z.array(z.string()),
      taskId: z.string().optional(), // For progress tracking
    }))
    .mutation(async ({ ctx, input }) => {
      const BATCH_SIZE = 10; // Process in smaller batches
      const DELAY_BETWEEN_USERS = 500; // 500ms delay between each user
      const DELAY_BETWEEN_BATCHES = 2000; // 2s delay between batches
      const MAX_RETRIES = 3; // Retry failed operations
      
      const results = {
        success: [] as string[],
        errors: [] as { id: string; name: string; error: string }[],
        total: input.userIds.length,
        processed: 0,
      };

      // Process in batches to avoid overwhelming Clerk API
      const batches = [];
      for (let i = 0; i < input.userIds.length; i += BATCH_SIZE) {
        batches.push(input.userIds.slice(i, i + BATCH_SIZE));
      }

      console.log(`Processing ${input.userIds.length} ${input.userType}s in ${batches.length} batches`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]!;
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} users)`);

        // Process each user in the batch with delays
        for (const userId of batch) {
          let retryCount = 0;
          let success = false;

          while (retryCount < MAX_RETRIES && !success) {
            try {
              if (input.userType === "student") {
                await retryStudentClerkCreation(ctx, userId, results);
              } else if (input.userType === "parent") {
                await retryParentClerkCreation(ctx, userId, results);
              } else if (input.userType === "teacher") {
                await retryTeacherClerkCreation(ctx, userId, results);
              } else if (input.userType === "employee") {
                await retryEmployeeClerkCreation(ctx, userId, results);
              }

              success = true;
              results.processed++;
              
              // Update progress if taskId provided
              if (input.taskId) {
                await updateTaskProgress(input.taskId, {
                  processed: results.processed,
                  total: results.total,
                  status: 'processing'
                });
              }

            } catch (error) {
              retryCount++;
              console.error(`Error processing ${input.userType} ${userId} (attempt ${retryCount}/${MAX_RETRIES}):`, error);
              
              if (retryCount < MAX_RETRIES) {
                // Exponential backoff on retries
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
              } else {
                // Final failure, add to errors
                results.errors.push({
                  id: userId,
                  name: `Unknown ${input.userType}`,
                  error: error instanceof Error ? error.message : String(error)
                });
                results.processed++;
              }
            }
          }

          // Add delay between users to avoid rate limiting
          if (batch.indexOf(userId) < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_USERS));
          }
        }

        // Add longer delay between batches
        if (batchIndex < batches.length - 1) {
          console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      // Update final progress
      if (input.taskId) {
        await updateTaskProgress(input.taskId, {
          processed: results.processed,
          total: results.total,
          status: 'completed',
          results
        });
      }

      console.log(`Completed processing: ${results.success.length} successful, ${results.errors.length} failed`);
      return results;
    }),

  // Task Management Endpoints
  createTask: protectedProcedure
    .input(z.object({
      type: z.string(),
      total: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const task = {
        id: taskId,
        type: input.type,
        status: 'pending' as const,
        progress: {
          processed: 0,
          total: input.total,
          percentage: 0
        },
        startTime: new Date(),
        description: input.description
      };

      activeTasks.set(taskId, task);
      return { taskId, task };
    }),

  getTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const task = activeTasks.get(input.taskId);
      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found"
        });
      }
      return task;
    }),

  getAllActiveTasks: protectedProcedure
    .query(async () => {
      return Array.from(activeTasks.values())
        .filter(task => task.status !== 'completed' && task.status !== 'failed')
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    }),

  getAllTasks: protectedProcedure
    .query(async () => {
      return Array.from(activeTasks.values())
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    }),

  deleteTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = activeTasks.delete(input.taskId);
      return { deleted };
    }),

  // Start async bulk retry operation
  startBulkRetry: protectedProcedure
    .input(z.object({
      userType: z.enum(["student", "parent", "teacher", "employee"]),
      userIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate input
      if (!input.userIds || input.userIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No user IDs provided for retry operation"
        });
      }

      // Check for existing pending retry tasks for the same user type to prevent duplicates
      const existingTask = await ctx.db.backgroundTask.findFirst({
        where: {
          taskType: 'BULK_CLERK_RETRY',
          status: { in: ['PENDING', 'RUNNING'] },
          title: `Bulk Clerk Account Retry - ${input.userType}s`,
          createdBy: ctx.userId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
          }
        }
      });

      if (existingTask) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A bulk retry task for ${input.userType}s is already in progress. Please wait for it to complete.`
        });
      }

      // Create background task for clerk retry
      const taskId = await backgroundTaskService.createTask(
        'BULK_CLERK_RETRY',
        `Bulk Clerk Account Retry - ${input.userType}s`,
        `Retrying Clerk account creation for ${input.userIds.length} ${input.userType}s`,
        {
          type: input.userType,
          userIds: input.userIds,
          operation: 'retry'
        },
        undefined, // branchId will be determined per user
        ctx.userId
      );

      return { taskId, message: `Started bulk retry for ${input.userIds.length} ${input.userType}s` };
    }),

  // Get statistics
  getClerkAccountStats: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause = {
        isActive: true,
        ...(input.branchId && { branchId: input.branchId })
      };

      const [
        totalStudents,
        studentsWithClerk,
        totalTeachers,
        teachersWithClerk,
        totalEmployees,
        employeesWithClerk,
        totalParents,
        parentsWithClerk,
      ] = await Promise.all([
        ctx.db.student.count({ where: whereClause }),
        ctx.db.student.count({ 
          where: { 
            ...whereClause, 
            clerkId: { not: null },
            NOT: { clerkId: "" }
          } 
        }),
        ctx.db.teacher.count({ where: whereClause }),
        ctx.db.teacher.count({ 
          where: { 
            ...whereClause, 
            clerkId: { not: null },
            NOT: { clerkId: "" }
          } 
        }),
        ctx.db.employee.count({ where: whereClause }),
        ctx.db.employee.count({ 
          where: { 
            ...whereClause, 
            clerkId: { not: null },
            NOT: { clerkId: "" }
          } 
        }),
        ctx.db.parent.count(),
        ctx.db.parent.count({ 
          where: { 
            clerkId: { not: null },
            NOT: { clerkId: "" }
          } 
        }),
      ]);

      return {
        students: {
          total: totalStudents,
          withClerk: studentsWithClerk,
          withoutClerk: totalStudents - studentsWithClerk,
          percentage: totalStudents > 0 ? Math.round((studentsWithClerk / totalStudents) * 100) : 0
        },
        teachers: {
          total: totalTeachers,
          withClerk: teachersWithClerk,
          withoutClerk: totalTeachers - teachersWithClerk,
          percentage: totalTeachers > 0 ? Math.round((teachersWithClerk / totalTeachers) * 100) : 0
        },
        employees: {
          total: totalEmployees,
          withClerk: employeesWithClerk,
          withoutClerk: totalEmployees - employeesWithClerk,
          percentage: totalEmployees > 0 ? Math.round((employeesWithClerk / totalEmployees) * 100) : 0
        },
        parents: {
          total: totalParents,
          withClerk: parentsWithClerk,
          withoutClerk: totalParents - parentsWithClerk,
          percentage: totalParents > 0 ? Math.round((parentsWithClerk / totalParents) * 100) : 0
        }
      };
    }),
});

// Helper functions for retrying Clerk account creation
async function retryStudentClerkCreation(ctx: any, studentId: string, results: any) {
  const student = await ctx.db.student.findUnique({
    where: { id: studentId },
    include: {
      branch: { select: { code: true } }
    }
  });

  if (!student) {
    results.errors.push({
      id: studentId,
      name: "Unknown Student",
      error: "Student not found"
    });
    return;
  }

  try {
    // Generate credentials
    const emailDomain = student.branch?.code === 'PS' ? 'ps.tsh.edu.in' :
                       student.branch?.code === 'JUN' ? 'jun.tsh.edu.in' :
                       student.branch?.code === 'MAJ' ? 'majra.tsh.edu.in' : 'tsh.edu.in';
    
    const studentUsername = student.username || `${student.admissionNumber}@${emailDomain}`;
    const defaultPassword = student.branch?.code === 'PS' ? 'TSHPS@12345' :
                           student.branch?.code === 'JUN' ? 'TSHJ@12345' :
                           student.branch?.code === 'MAJ' ? 'TSHM@12345' : 'TSH@12345';
    const studentPassword = student.password || defaultPassword;

    // Create Clerk user
    const clerkUser = await createStudentUser({
      firstName: student.firstName,
      lastName: student.lastName,
      username: studentUsername,
      password: studentPassword,
      branchCode: student.branch?.code || '',
      branchId: student.branchId,
    });

    // Update database
    await ctx.db.student.update({
      where: { id: studentId },
      data: {
        clerkId: clerkUser.id,
        username: studentUsername,
        password: studentPassword,
      }
    });

    results.success.push(studentId);
  } catch (error) {
    results.errors.push({
      id: studentId,
      name: `${student.firstName} ${student.lastName}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function retryParentClerkCreation(ctx: any, parentId: string, results: any) {
  const parent = await ctx.db.parent.findUnique({
    where: { id: parentId },
    include: {
      students: {
        where: { isActive: true },
        select: {
          admissionNumber: true,
          branchId: true,
          branch: { select: { code: true } }
        },
        take: 1
      }
    }
  });

  if (!parent || !parent.students[0]) {
    results.errors.push({
      id: parentId,
      name: "Unknown Parent",
      error: "Parent or associated student not found"
    });
    return;
  }

  try {
    const student = parent.students[0]!;
    
    // Determine parent name
    let parentFirstName = '';
    let parentLastName = '';
    
    if (parent.fatherName) {
      const nameParts = parent.fatherName.trim().split(/\s+/);
      parentFirstName = nameParts[0] || parent.fatherName;
      parentLastName = nameParts.slice(1).join(' ') || 'TSH'; // Default lastName for single names
    } else if (parent.motherName) {
      const nameParts = parent.motherName.trim().split(/\s+/);
      parentFirstName = nameParts[0] || parent.motherName;
      parentLastName = nameParts.slice(1).join(' ') || 'TSH'; // Default lastName for single names
    } else if (parent.guardianName) {
      const nameParts = parent.guardianName.trim().split(/\s+/);
      parentFirstName = nameParts[0] || parent.guardianName;
      parentLastName = nameParts.slice(1).join(' ') || 'TSH'; // Default lastName for single names
    } else {
      parentFirstName = "Parent";
      parentLastName = "TSH";
    }

    const parentUsername = `P${student.admissionNumber}`;
    const defaultPassword = student.branch?.code === 'PS' ? 'TSHPS@12345' :
                           student.branch?.code === 'JUN' ? 'TSHJ@12345' :
                           student.branch?.code === 'MAJ' ? 'TSHM@12345' : 'TSH@12345';

    // Create Clerk user
    const clerkUser = await createParentUser({
      firstName: parentFirstName,
      lastName: parentLastName,
      username: parentUsername,
      password: defaultPassword,
      email: parent.fatherEmail || parent.motherEmail || parent.guardianEmail || undefined,
      branchId: student.branchId,
    });

    // Update database
    await ctx.db.parent.update({
      where: { id: parentId },
      data: { clerkId: clerkUser.id }
    });

    results.success.push(parentId);
  } catch (error) {
    const displayName = parent.fatherName || parent.motherName || parent.guardianName || "Unknown Parent";
    results.errors.push({
      id: parentId,
      name: displayName,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function retryTeacherClerkCreation(ctx: any, teacherId: string, results: any) {
  const teacher = await ctx.db.teacher.findUnique({
    where: { id: teacherId },
    include: {
      branch: { select: { code: true } }
    }
  });

  if (!teacher) {
    results.errors.push({
      id: teacherId,
      name: "Unknown Teacher",
      error: "Teacher not found"
    });
    return;
  }

  try {
    if (!teacher.email) {
      throw new Error("Email is required for teacher accounts");
    }

    const clerkUser = await createTeacherUser({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      password: "Teacher@12345", // Default password
      branchId: teacher.branchId,
      username: teacher.username || undefined,
    });

    await ctx.db.teacher.update({
      where: { id: teacherId },
      data: { clerkId: clerkUser.id }
    });

    results.success.push(teacherId);
  } catch (error) {
    results.errors.push({
      id: teacherId,
      name: `${teacher.firstName} ${teacher.lastName}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function retryEmployeeClerkCreation(ctx: any, employeeId: string, results: any) {
  const employee = await ctx.db.employee.findUnique({
    where: { id: employeeId },
    include: {
      branch: { select: { code: true } }
    }
  });

  if (!employee) {
    results.errors.push({
      id: employeeId,
      name: "Unknown Employee",
      error: "Employee not found"
    });
    return;
  }

  try {
    if (!employee.email) {
      throw new Error("Email is required for employee accounts");
    }

    const clerkUser = await createEmployeeUser({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      password: "Employee@12345", // Default password
      branchId: employee.branchId,
      username: employee.username || undefined,
    });

    await ctx.db.employee.update({
      where: { id: employeeId },
      data: { clerkId: clerkUser.id }
    });

    results.success.push(employeeId);
  } catch (error) {
    results.errors.push({
      id: employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 