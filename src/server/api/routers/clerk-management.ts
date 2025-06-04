import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createStudentUser, createParentUser, createTeacherUser, createEmployeeUser } from "@/utils/clerk";

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
    }))
    .mutation(async ({ ctx, input }) => {
      const results = {
        success: [] as string[],
        errors: [] as { id: string; name: string; error: string }[],
      };

      for (const userId of input.userIds) {
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

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing ${input.userType} ${userId}:`, error);
        }
      }

      return results;
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