import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const staffMoveRouter = createTRPCRouter({
  // Move teacher to employee
  moveTeacherToEmployee: protectedProcedure
    .input(z.object({
      teacherId: z.string(),
      reason: z.string().min(1, "Reason is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { teacherId, reason } = input;

      // Get the teacher record
      const teacher = await ctx.db.teacher.findUnique({
        where: { id: teacherId },
        include: {
          userRoles: true,
          user: true,
        }
      });

      if (!teacher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Teacher not found",
        });
      }

      try {
        return await ctx.db.$transaction(async (prisma) => {
          // Create employee record with teacher data
          const employee = await prisma.employee.create({
            data: {
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              designation: teacher.designation || "Staff",
              department: teacher.department,
              joinDate: teacher.joinDate,
              isActive: teacher.isActive,
              userId: teacher.userId,
              branchId: teacher.branchId,
              
              // Personal Info
              middleName: teacher.middleName,
              dateOfBirth: teacher.dateOfBirth,
              gender: teacher.gender,
              bloodGroup: teacher.bloodGroup,
              maritalStatus: teacher.maritalStatus,
              nationality: teacher.nationality,
              religion: teacher.religion,
              panNumber: teacher.panNumber,
              aadharNumber: teacher.aadharNumber,
              
              // Contact Information
              address: teacher.address,
              city: teacher.city,
              state: teacher.state,
              country: teacher.country,
              pincode: teacher.pincode,
              permanentAddress: teacher.permanentAddress,
              permanentCity: teacher.permanentCity,
              permanentState: teacher.permanentState,
              permanentCountry: teacher.permanentCountry,
              permanentPincode: teacher.permanentPincode,
              phone: teacher.phone,
              alternatePhone: teacher.alternatePhone,
              personalEmail: teacher.personalEmail,
              emergencyContactName: teacher.emergencyContactName,
              emergencyContactPhone: teacher.emergencyContactPhone,
              emergencyContactRelation: teacher.emergencyContactRelation,
              
              // Educational Qualifications
              qualification: teacher.qualification,
              specialization: teacher.specialization,
              professionalQualifications: teacher.professionalQualifications,
              specialCertifications: teacher.specialCertifications,
              yearOfCompletion: teacher.yearOfCompletion,
              institution: teacher.institution,
              experience: teacher.experience,
              certifications: teacher.certifications,
              subjects: teacher.subjects,
              bio: teacher.bio,
              
              // Employment Details
              employeeCode: teacher.employeeCode,
              reportingManager: teacher.reportingManager,
              employeeType: teacher.employeeType,
              previousExperience: teacher.previousExperience,
              previousEmployer: teacher.previousEmployer,
              confirmationDate: teacher.confirmationDate,
              
              // Salary & Banking Details
              salaryStructure: teacher.salaryStructure,
              pfNumber: teacher.pfNumber,
              esiNumber: teacher.esiNumber,
              uanNumber: teacher.uanNumber,
              bankName: teacher.bankName,
              accountNumber: teacher.accountNumber,
              ifscCode: teacher.ifscCode,
              
              // IT & Asset Allocation
              officialEmail: teacher.officialEmail,
              deviceIssued: teacher.deviceIssued,
              accessCardId: teacher.accessCardId,
              softwareLicenses: teacher.softwareLicenses,
              assetReturnStatus: teacher.assetReturnStatus,
              clerkId: teacher.clerkId,
            }
          });

          // Create default branch access for the employee (using teacher's branch)
          await prisma.employeeBranchAccess.create({
            data: {
              employeeId: employee.id,
              branchId: teacher.branchId,
            }
          });

          // Transfer user roles from teacher to employee
          if (teacher.userRoles.length > 0) {
            const userRoleUpdates = teacher.userRoles.map(role => 
              prisma.userRole.update({
                where: { id: role.id },
                data: { employeeId: employee.id, teacherId: null }
              })
            );
            await Promise.all(userRoleUpdates);
          }

          // Create move record
          await prisma.staffMove.create({
            data: {
              originalId: teacherId,
              newId: employee.id,
              fromType: "TEACHER",
              toType: "EMPLOYEE",
              reason,
              movedBy: ctx.userId,
              originalData: teacher,
              branchId: teacher.branchId,
            }
          });

          // Delete the teacher record (after successful move)
          await prisma.teacher.delete({
            where: { id: teacherId }
          });

          return employee;
        });
      } catch (error) {
        console.error("Error moving teacher to employee:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to move teacher to employee",
        });
      }
    }),

  // Move employee to teacher
  moveEmployeeToTeacher: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      reason: z.string().min(1, "Reason is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { employeeId, reason } = input;

      // Get the employee record
      const employee = await ctx.db.employee.findUnique({
        where: { id: employeeId },
        include: {
          userRoles: true,
          user: true,
        }
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      try {
        return await ctx.db.$transaction(async (prisma) => {
          // Create teacher record with employee data
          const teacher = await prisma.teacher.create({
            data: {
              firstName: employee.firstName,
              lastName: employee.lastName,
              qualification: employee.qualification,
              specialization: employee.specialization,
              joinDate: employee.joinDate,
              isActive: employee.isActive,
              userId: employee.userId,
              branchId: employee.branchId,
              
              // Personal Info
              middleName: employee.middleName,
              dateOfBirth: employee.dateOfBirth,
              gender: employee.gender,
              bloodGroup: employee.bloodGroup,
              maritalStatus: employee.maritalStatus,
              nationality: employee.nationality,
              religion: employee.religion,
              panNumber: employee.panNumber,
              aadharNumber: employee.aadharNumber,
              
              // Contact Information
              address: employee.address,
              city: employee.city,
              state: employee.state,
              country: employee.country,
              pincode: employee.pincode,
              permanentAddress: employee.permanentAddress,
              permanentCity: employee.permanentCity,
              permanentState: employee.permanentState,
              permanentCountry: employee.permanentCountry,
              permanentPincode: employee.permanentPincode,
              phone: employee.phone,
              alternatePhone: employee.alternatePhone,
              personalEmail: employee.personalEmail,
              emergencyContactName: employee.emergencyContactName,
              emergencyContactPhone: employee.emergencyContactPhone,
              emergencyContactRelation: employee.emergencyContactRelation,
              
              // Educational Qualifications
              professionalQualifications: employee.professionalQualifications,
              specialCertifications: employee.specialCertifications,
              yearOfCompletion: employee.yearOfCompletion,
              institution: employee.institution,
              experience: employee.experience,
              certifications: employee.certifications,
              subjects: employee.subjects,
              bio: employee.bio,
              
              // Employment Details
              employeeCode: employee.employeeCode,
              designation: employee.designation,
              department: employee.department,
              reportingManager: employee.reportingManager,
              employeeType: employee.employeeType,
              previousExperience: employee.previousExperience,
              previousEmployer: employee.previousEmployer,
              confirmationDate: employee.confirmationDate,
              
              // Salary & Banking Details
              salaryStructure: employee.salaryStructure,
              pfNumber: employee.pfNumber,
              esiNumber: employee.esiNumber,
              uanNumber: employee.uanNumber,
              bankName: employee.bankName,
              accountNumber: employee.accountNumber,
              ifscCode: employee.ifscCode,
              
              // IT & Asset Allocation
              officialEmail: employee.officialEmail,
              deviceIssued: employee.deviceIssued,
              accessCardId: employee.accessCardId,
              softwareLicenses: employee.softwareLicenses,
              assetReturnStatus: employee.assetReturnStatus,
              clerkId: employee.clerkId,
            }
          });

          // Transfer user roles from employee to teacher
          if (employee.userRoles.length > 0) {
            const userRoleUpdates = employee.userRoles.map(role => 
              prisma.userRole.update({
                where: { id: role.id },
                data: { teacherId: teacher.id, employeeId: null }
              })
            );
            await Promise.all(userRoleUpdates);
          }

          // Create move record
          await prisma.staffMove.create({
            data: {
              originalId: employeeId,
              newId: teacher.id,
              fromType: "EMPLOYEE",
              toType: "TEACHER",
              reason,
              movedBy: ctx.userId,
              originalData: employee,
              branchId: employee.branchId,
            }
          });

          // Delete employee branch access records
          await prisma.employeeBranchAccess.deleteMany({
            where: { employeeId }
          });

          // Delete the employee record (after successful move)
          await prisma.employee.delete({
            where: { id: employeeId }
          });

          return teacher;
        });
      } catch (error) {
        console.error("Error moving employee to teacher:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to move employee to teacher",
        });
      }
    }),

  // Get move history
  getMoveHistory: protectedProcedure
    .input(z.object({
      branchId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { branchId, limit, offset } = input;

      const moves = await ctx.db.staffMove.findMany({
        where: branchId ? { branchId } : undefined,
        include: {
          mover: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          branch: {
            select: {
              name: true,
              code: true,
            }
          }
        },
        orderBy: { movedAt: 'desc' },
        skip: offset,
        take: limit,
      });

      const totalCount = await ctx.db.staffMove.count({
        where: branchId ? { branchId } : undefined,
      });

      return {
        moves,
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    }),
}); 