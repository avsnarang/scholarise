import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { cache } from "react";

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes

// Helper function to get cached data
const getCachedData = cache(async (key: string, fn: () => Promise<any>) => {
  return fn();
});

interface ClassDistributionItem {
  className: string;
  count: number; // Number of sections for that class name
  studentCount: number; // Total students in sections of that class name
}

interface GroupedClassValue {
  sections: number;
  students: number;
  displayOrder: number; // Ensured to be a number by nullish coalescing later
}

type GroupedClassesAccumulator = Record<string, GroupedClassValue>;

/**
 * Dashboard API router for analytics and statistics
 */
export const dashboardRouter = createTRPCRouter({
  // Get consolidated stats from all branches (superadmin only)
  getAllBranchesStats: protectedProcedure
    .input(z.object({
      academicSessionId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        // Check if user has access to multi-branch data
        // This endpoint requires either super admin access or multi-branch permissions
        const userId = ctx.userId;
        
        // Check if user is an employee with multi-branch access
        const employee = await ctx.db.employee.findFirst({
          where: { 
            OR: [
              { userId: userId },
              { clerkId: userId }
            ]
          },
          include: {
            branchAccessRecords: true,
          },
        });

        // Check if user is a super admin via user roles
        const userRoles = await ctx.db.userRole.findMany({
          where: { userId: userId },
          include: {
            role: true,
          },
        });
        
        const isSuperAdmin = userRoles.some(
          userRole => userRole.role.name === "Super Admin" || 
                     userRole.role.name === "SUPER_ADMIN" ||
                     userRole.role.name === "super_admin" ||
                     userRole.role.isSystem
        );
        
        const hasMultiBranchAccess = employee?.branchAccessRecords && employee.branchAccessRecords.length > 0;
        
        // Allow access if user is super admin or has multi-branch access
        if (!isSuperAdmin && !hasMultiBranchAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view all branch statistics. This feature requires super admin access or multi-branch permissions.",
          });
        }
        // Get current/active academic session if not provided
        let academicSessionId = input?.academicSessionId;
        if (!academicSessionId) {
          const activeSession = await ctx.db.academicSession.findFirst({
            where: {
              isActive: true
            },
            orderBy: {
              startDate: 'desc'
            }
          });
          
          if (activeSession) {
            academicSessionId = activeSession.id;
          }
        }

        // Get all branches with their stats in a single query
        const branchesWithStats = await ctx.db.branch.findMany({
          where: { 
            id: { not: "headquarters" } 
          },
          orderBy: {
            order: 'asc'
          },
          include: {
            _count: {
              select: {
                students: true,
                teachers: {
                  where: {
                    isActive: true
                  }
                },
                employees: {
                  where: {
                    isActive: true
                  }
                }
              }
            }
          }
        });

        // Get total counts in a single query
        const totalCounts = await ctx.db.$transaction([
          ctx.db.student.count(),
          ctx.db.student.count({ where: { isActive: true } }),
          ctx.db.teacher.count(),
          ctx.db.teacher.count({ where: { isActive: true } }),
          ctx.db.employee.count(),
          ctx.db.employee.count({ where: { isActive: true } })
        ]);

        const [
          totalStudents,
          activeStudents,
          totalTeachers,
          activeTeachers,
          totalEmployees,
          activeEmployees
        ] = totalCounts;

        // Get students in current academic year
        const academicYearStudents = academicSessionId ? 
          await ctx.db.student.count({
            where: {
              isActive: true,
              section: {
                class: {
                  sessionId: academicSessionId
                }
              }
            }
          }) : 0;

        // Get teachers in current session
        const teachersInCurrentSession = academicSessionId ?
          await ctx.db.teacher.count({
            where: {
              isActive: true,
              sections: {
                some: {
                  class: {
                    sessionId: academicSessionId,
                    isActive: true
                  }
                }
              }
            }
          }) : 0;

        // Transform branch data
        const studentsByBranch = await Promise.all(
          branchesWithStats.map(async (branch) => {
            const academicYearCount = academicSessionId ? 
              await ctx.db.student.count({
                where: {
                  branchId: branch.id,
                  isActive: true,
                  section: {
                    class: {
                      sessionId: academicSessionId
                    }
                  }
                }
              }) : 0;

            return {
              branchId: branch.id,
              branchName: branch.name,
              branchCode: branch.code,
              totalStudents: branch._count.students,
              activeStudents: branch._count.students, // This seems to be total, not active for the branch from _count
              academicYearStudents: academicYearCount,
              percentage: Math.round((branch._count.students / (totalStudents || 1)) * 100) || 0 
            };
          })
        );

        const staffByBranch = await Promise.all(
          branchesWithStats.map(async (branch) => {
            const teachersInSession = academicSessionId ?
              await ctx.db.teacher.count({
                where: {
                  branchId: branch.id,
                  isActive: true,
                  sections: {
                    some: {
                      class: {
                        sessionId: academicSessionId,
                        isActive: true
                      }
                    }
                  }
                }
              }) : 0;

            return {
              branchId: branch.id,
              branchName: branch.name,
              branchCode: branch.code,
              teacherCount: branch._count.teachers,
              teachersInCurrentSession: teachersInSession,
              employeeCount: branch._count.employees,
              totalStaff: branch._count.teachers + branch._count.employees,
              percentage: Math.round(((branch._count.teachers + branch._count.employees) / 
                ((totalTeachers + totalEmployees) || 1)) * 100) || 0
            };
          })
        );

        // Get enrollment trends
        const currentYear = new Date().getFullYear();
        const enrollmentTrends = await Promise.all(
          [0, 1, 2].map(async (yearOffset) => {
            const year = currentYear - yearOffset;
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            
            const count = await ctx.db.student.count({
              where: {
                joinDate: {
                  gte: startDate,
                  lte: endDate
                }
              }
            });
            
            return {
              year,
              count
            };
          })
        );

        // Get class distribution
        let classDistribution: ClassDistributionItem[] = [];
        if (academicSessionId) {
          const sections = await ctx.db.section.findMany({
            where: {
              class: {
                sessionId: academicSessionId,
                isActive: true
              }
            },
            include: {
              class: {
                select: {
                  name: true,
                  displayOrder: true
                }
              },
              _count: {
                select: {
                  students: {
                    where: {
                      isActive: true
                    }
                  }
                }
              }
            }
          });

          // Group sections by class name
          const groupedClasses = sections.reduce((acc, section) => {
            const className = section.class.name;
            if (!acc[className]) {
              acc[className] = {
                sections: 0,
                students: 0,
                displayOrder: section.class.displayOrder ?? 0 
              };
            }
            acc[className]!.sections++;
            acc[className]!.students += section._count.students;
            return acc;
          }, {} as GroupedClassesAccumulator);

          classDistribution = Object.entries(groupedClasses)
            .sort((a: [string, GroupedClassValue], b: [string, GroupedClassValue]) => {
              return a[1]!.displayOrder - b[1]!.displayOrder;
            })
            .map(([className, counts]) => ({
              className,
              count: counts.sections,
              studentCount: counts.students
            }));
        }

        // Get academic sessions
        const academicSessions = await ctx.db.academicSession.findMany({
          orderBy: { startDate: 'desc' },
          select: { id: true, name: true, isActive: true }
        });

        return {
          branchCount: branchesWithStats.length,
          branches: branchesWithStats.map(b => ({ id: b.id, name: b.name })),
          totalStudents,
          activeStudents,
          academicYearStudents,
          inactiveStudents: totalStudents - activeStudents,
          totalTeachers,
          activeTeachers,
          teachersInCurrentSession,
          totalEmployees,
          activeEmployees,
          inactiveEmployees: totalEmployees - activeEmployees,
          studentsByBranch,
          staffByBranch,
          enrollmentTrends,
          classDistribution,
          academicSessions
        };
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch dashboard statistics"
        });
      }
    }),
    
  // Get all academic sessions
  getAcademicSessions: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const academicSessions = await ctx.db.academicSession.findMany({
          orderBy: {
            startDate: 'desc'
          },
          select: {
            id: true,
            name: true,
            isActive: true,
            startDate: true,
            endDate: true
          }
        });
        
        return academicSessions;
      } catch (error) {
        console.error("Error fetching academic sessions:", error);
        return [];
      }
    }),
}); 