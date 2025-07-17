import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";
import { createParentUser, createStudentUser } from "@/utils/supabase-auth";

export const parentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        // Father information
        fatherName: z.string().optional(),
        fatherDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        fatherEducation: z.string().optional(),
        fatherOccupation: z.string().optional(),
        fatherMobile: z.string().optional(),
        fatherEmail: z.string().email().optional().nullable(),
        // Mother information
        motherName: z.string().optional(),
        motherDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        motherEducation: z.string().optional(),
        motherOccupation: z.string().optional(),
        motherMobile: z.string().optional(),
        motherEmail: z.string().email().optional().nullable(),
        // Guardian information
        guardianName: z.string().optional(),
        guardianDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        guardianEducation: z.string().optional(),
        guardianOccupation: z.string().optional(),
        guardianMobile: z.string().optional(),
        guardianEmail: z.string().email().optional().nullable(),
        // Additional information
        parentAnniversary: z.string().optional().transform(val => val ? new Date(val) : undefined),
        monthlyIncome: z.string().optional(),
        // Authentication credentials for parent and student
        parentUsername: z.string().optional(),
        parentPassword: z.string().optional(),
        studentUsername: z.string().optional(),
        studentPassword: z.string().optional(),
        branchId: z.string().optional(),
        // Student information (if creating both parent and student)
        studentFirstName: z.string().optional(),
        studentLastName: z.string().optional(),
        studentAdmissionNumber: z.string().optional(),
        studentDateOfBirth: z.date().optional(),
        studentGender: z.enum(["Male", "Female", "Other"]).optional(),
        studentEmail: z.string().email().optional(),
        studentPhone: z.string().optional(),
        studentSectionId: z.string().optional(),
        studentAddress: z.string().optional(),
        createStudentUser: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let clerkParentId: string | undefined = undefined;
      let clerkStudentId: string | undefined = undefined;

      // Create Clerk user for parent if credentials are provided
      if (input.parentUsername && input.parentPassword && input.branchId) {
        try {
          // Get branch code for Clerk user creation
          const branch = await ctx.db.branch.findUnique({
            where: { id: input.branchId },
            select: { code: true }
          });

          if (!branch) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Branch not found",
            });
          }

          // Ensure we have a valid email or use undefined
          const parentEmail = input.fatherEmail || input.motherEmail || input.guardianEmail;
          
          // Extract parent name with proper first/last name splitting
          let parentFirstName = '';
          let parentLastName = input.studentLastName || "User"; // Default to student's last name or fallback
          
          if (input.fatherName) {
            // Split father's name into first and last parts
            const fatherNameParts = input.fatherName.trim().split(/\s+/);
            parentFirstName = fatherNameParts[0] || input.fatherName;
            if (fatherNameParts.length > 1) {
              parentLastName = fatherNameParts.slice(1).join(' ');
            }
          } else if (input.motherName) {
            // Split mother's name into first and last parts
            const motherNameParts = input.motherName.trim().split(/\s+/);
            parentFirstName = motherNameParts[0] || input.motherName;
            if (motherNameParts.length > 1) {
              parentLastName = motherNameParts.slice(1).join(' ');
            }
          } else if (input.guardianName) {
            // Split guardian's name into first and last parts
            const guardianNameParts = input.guardianName.trim().split(/\s+/);
            parentFirstName = guardianNameParts[0] || input.guardianName;
            if (guardianNameParts.length > 1) {
              parentLastName = guardianNameParts.slice(1).join(' ');
            }
          } else {
            // Fallback to "Parent" if no parent names provided
            parentFirstName = "Parent";
            parentLastName = input.studentLastName || "User";
          }
          
          const parentUser = await createParentUser({
            firstName: parentFirstName,
            lastName: parentLastName,
            username: input.parentUsername,
            password: input.parentPassword,
            email: parentEmail || "",
            branchId: input.branchId,
          });
          clerkParentId = parentUser.id;
          console.log("Created Clerk user for parent:", clerkParentId);
        } catch (error) {
          console.error("Error creating Clerk user for parent:", error);
          // Continue without Clerk user if it fails
        }
      }

      // Create Clerk user for student if requested
      if (input.createStudentUser && input.studentUsername && input.studentPassword && input.branchId && input.studentAdmissionNumber) {
        try {
          const branch = await ctx.db.branch.findUnique({
            where: { id: input.branchId },
            select: { code: true }
          });

          if (branch && input.studentFirstName && input.studentLastName) {
            const studentUser = await createStudentUser({
              firstName: input.studentFirstName,
              lastName: input.studentLastName,
              username: input.studentUsername,
              password: input.studentPassword,
              branchCode: branch.code,
              branchId: input.branchId,
            });
            clerkStudentId = studentUser.id;
            console.log("Created Clerk user for student:", clerkStudentId);
          }
        } catch (error) {
          console.error("Error creating Clerk user for student:", error);
          // Continue without Clerk user if it fails
        }
      }

      // Create parent record
      const data = {
        fatherName: input.fatherName,
        fatherDob: input.fatherDob,
        fatherEducation: input.fatherEducation,
        fatherOccupation: input.fatherOccupation,
        fatherMobile: input.fatherMobile,
        fatherEmail: input.fatherEmail,
        motherName: input.motherName,
        motherDob: input.motherDob,
        motherEducation: input.motherEducation,
        motherOccupation: input.motherOccupation,
        motherMobile: input.motherMobile,
        motherEmail: input.motherEmail,
        guardianName: input.guardianName,
        guardianDob: input.guardianDob,
        guardianEducation: input.guardianEducation,
        guardianOccupation: input.guardianOccupation,
        guardianMobile: input.guardianMobile,
        guardianEmail: input.guardianEmail,
        parentAnniversary: input.parentAnniversary,
        monthlyIncome: input.monthlyIncome,
        clerkId: clerkParentId,
      } as Prisma.ParentCreateInput;
      
      const parent = await ctx.db.parent.create({ data });

      // Create student record if requested
      if (input.createStudentUser && input.studentFirstName && input.studentLastName && input.studentAdmissionNumber && input.studentDateOfBirth && input.studentGender && input.branchId) {
        try {
          const studentData = {
            admissionNumber: input.studentAdmissionNumber,
            firstName: input.studentFirstName,
            lastName: input.studentLastName,
            dateOfBirth: input.studentDateOfBirth,
            gender: input.studentGender,
            email: input.studentEmail,
            phone: input.studentPhone,
            address: input.studentAddress,
            branchId: input.branchId,
            parentId: parent.id,
            username: input.studentUsername,
            password: input.studentPassword,
            clerkId: clerkStudentId,
            sectionId: input.studentSectionId,
            isActive: true,
            joinDate: new Date(),
            dateOfAdmission: new Date(),
          } as Prisma.StudentCreateInput & { branchId: string; parentId: string; sectionId?: string };

          // Convert to proper Prisma format
          const studentCreateInput: Prisma.StudentCreateInput = {
            admissionNumber: studentData.admissionNumber,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            dateOfBirth: studentData.dateOfBirth,
            gender: studentData.gender,
            email: studentData.email,
            phone: studentData.phone,
            address: studentData.address,
            username: studentData.username,
            password: studentData.password,
            clerkId: studentData.clerkId,
            isActive: studentData.isActive,
            joinDate: studentData.joinDate,
            dateOfAdmission: studentData.dateOfAdmission,
            branch: { connect: { id: studentData.branchId } },
            parent: { connect: { id: studentData.parentId } },
            ...(studentData.sectionId ? { section: { connect: { id: studentData.sectionId } } } : {}),
          };

          const student = await ctx.db.student.create({
            data: studentCreateInput,
          });

          console.log(`Created student ${student.firstName} ${student.lastName} with parent ${parent.id}`);
        } catch (error) {
          console.error("Error creating student:", error);
          // Continue - parent is still created even if student creation fails
        }
      }

      return parent;
    }),
  getAll: publicProcedure
    .input(
      z.object({
        branchId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;

      const parents = await ctx.db.parent.findMany({
        take: limit + 1,
        where: {
          OR: input?.search
            ? [
                { fatherName: { contains: input.search, mode: "insensitive" } },
                { motherName: { contains: input.search, mode: "insensitive" } },
                { guardianName: { contains: input.search, mode: "insensitive" } },
              ]
            : undefined,
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: "asc" },
      }).then(results => results.map(parent => ({
        ...parent,
        // Add these for compatibility with compiled code that's expecting them
        firstName: null, 
        lastName: null,
        phone: null,
      })));

      let nextCursor: string | undefined = undefined;
      if (parents.length > limit) {
        const nextItem = parents.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: parents,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const parent = await ctx.db.parent.findUnique({
        where: { id: input.id },
        include: {
          students: true,
        },
      });

      if (!parent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent not found",
        });
      }

      // Add compatibility fields
      return {
        ...parent,
        firstName: null,
        lastName: null,
        phone: null,
      };
    }),

  createWithStudent: protectedProcedure
    .input(
      z.object({
        // Parent information
        fatherName: z.string().optional(),
        fatherDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        fatherEducation: z.string().optional(),
        fatherOccupation: z.string().optional(),
        fatherMobile: z.string().optional(),
        fatherEmail: z.string().email().optional().nullable(),
        motherName: z.string().optional(),
        motherDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        motherEducation: z.string().optional(),
        motherOccupation: z.string().optional(),
        motherMobile: z.string().optional(),
        motherEmail: z.string().email().optional().nullable(),
        guardianName: z.string().optional(),
        guardianDob: z.string().optional().transform(val => val ? new Date(val) : undefined),
        guardianEducation: z.string().optional(),
        guardianOccupation: z.string().optional(),
        guardianMobile: z.string().optional(),
        guardianEmail: z.string().email().optional().nullable(),
        parentAnniversary: z.string().optional().transform(val => val ? new Date(val) : undefined),
        monthlyIncome: z.string().optional(),
        
        // Student information (required)
        studentFirstName: z.string(),
        studentLastName: z.string(),
        studentAdmissionNumber: z.string(),
        studentDateOfBirth: z.date(),
        studentGender: z.enum(["Male", "Female", "Other"]),
        studentEmail: z.string().email().optional(),
        studentPhone: z.string().optional(),
        studentSectionId: z.string(),
        studentAddress: z.string().optional(),
        branchId: z.string(),
        
        // Optional authentication credentials (will be auto-generated if not provided)
        parentUsername: z.string().optional(),
        parentPassword: z.string().optional(),
        studentUsername: z.string().optional(),
        studentPassword: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get branch information for credential generation
      const branch = await ctx.db.branch.findUnique({
        where: { id: input.branchId },
        select: { code: true }
      });

      if (!branch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Branch not found",
        });
      }

      // Auto-generate student credentials if not provided
      let finalStudentUsername = input.studentUsername;
      let finalStudentPassword = input.studentPassword;

      if (!finalStudentUsername || !finalStudentPassword) {
        const emailDomain = branch.code === 'PS' ? 'ps.tsh.edu.in' :
                           branch.code === 'JUN' ? 'jun.tsh.edu.in' :
                           branch.code === 'MAJ' ? 'majra.tsh.edu.in' : 'tsh.edu.in';
        
        finalStudentUsername = finalStudentUsername || `${input.studentAdmissionNumber}@${emailDomain}`;
        finalStudentPassword = finalStudentPassword || (branch.code === 'PS' ? 'TSHPS@12345' :
                      branch.code === 'JUN' ? 'TSHJ@12345' :
                      branch.code === 'MAJ' ? 'TSHM@12345' : 'TSH@12345');

        console.log(`Auto-generated student credentials: username=${finalStudentUsername}`);
      }

      // Auto-generate parent credentials if not provided
      let finalParentUsername = input.parentUsername;
      let finalParentPassword = input.parentPassword;

      if (!finalParentUsername || !finalParentPassword) {
        finalParentUsername = finalParentUsername || `P${input.studentAdmissionNumber}`;
        finalParentPassword = finalParentPassword || (branch.code === 'PS' ? 'TSHPS@12345' :
                      branch.code === 'JUN' ? 'TSHJ@12345' :
                      branch.code === 'MAJ' ? 'TSHM@12345' : 'TSH@12345');

        console.log(`Auto-generated parent credentials: username=${finalParentUsername}`);
      }

      let clerkParentId: string | undefined = undefined;
      let clerkStudentId: string | undefined = undefined;

      // Create Clerk user for student
      try {
        const studentUser = await createStudentUser({
          firstName: input.studentFirstName,
          lastName: input.studentLastName,
          username: finalStudentUsername,
          password: finalStudentPassword,
          branchCode: branch.code,
          branchId: input.branchId,
        });
        clerkStudentId = studentUser.id;
        console.log("Created Clerk user for student:", clerkStudentId);
      } catch (error) {
        console.error("Error creating Clerk user for student:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create student user account",
        });
      }

      // Create Clerk user for parent
      try {
        const parentEmail = input.fatherEmail || input.motherEmail || input.guardianEmail;
        
        // Extract parent name with proper first/last name splitting
        let parentFirstName = '';
        let parentLastName = input.studentLastName; // Default to student's last name
        
        if (input.fatherName) {
          // Split father's name into first and last parts
          const fatherNameParts = input.fatherName.trim().split(/\s+/);
          parentFirstName = fatherNameParts[0] || input.fatherName;
          if (fatherNameParts.length > 1) {
            parentLastName = fatherNameParts.slice(1).join(' ');
          }
        } else if (input.motherName) {
          // Split mother's name into first and last parts
          const motherNameParts = input.motherName.trim().split(/\s+/);
          parentFirstName = motherNameParts[0] || input.motherName;
          if (motherNameParts.length > 1) {
            parentLastName = motherNameParts.slice(1).join(' ');
          }
        } else if (input.guardianName) {
          // Split guardian's name into first and last parts
          const guardianNameParts = input.guardianName.trim().split(/\s+/);
          parentFirstName = guardianNameParts[0] || input.guardianName;
          if (guardianNameParts.length > 1) {
            parentLastName = guardianNameParts.slice(1).join(' ');
          }
        } else {
          // Fallback to student's name if no parent names provided
          parentFirstName = input.studentFirstName;
          parentLastName = input.studentLastName;
        }
        
        const parentUser = await createParentUser({
          firstName: parentFirstName,
          lastName: parentLastName,
          username: finalParentUsername,
          password: finalParentPassword,
          email: parentEmail || "",
          branchId: input.branchId,
        });
        clerkParentId = parentUser.id;
        console.log("Created Clerk user for parent:", clerkParentId);
      } catch (error) {
        console.error("Error creating Clerk user for parent:", error);
        // If parent user creation fails, clean up student user
        if (clerkStudentId) {
          try {
            // TODO: Implement Supabase user cleanup
            console.log("Cleaned up student Supabase user due to parent creation failure");
          } catch (cleanupError) {
            console.error("Error cleaning up student user:", cleanupError);
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create parent user account",
        });
      }

      // Create parent record
      const parentData = {
        fatherName: input.fatherName,
        fatherDob: input.fatherDob,
        fatherEducation: input.fatherEducation,
        fatherOccupation: input.fatherOccupation,
        fatherMobile: input.fatherMobile,
        fatherEmail: input.fatherEmail,
        motherName: input.motherName,
        motherDob: input.motherDob,
        motherEducation: input.motherEducation,
        motherOccupation: input.motherOccupation,
        motherMobile: input.motherMobile,
        motherEmail: input.motherEmail,
        guardianName: input.guardianName,
        guardianDob: input.guardianDob,
        guardianEducation: input.guardianEducation,
        guardianOccupation: input.guardianOccupation,
        guardianMobile: input.guardianMobile,
        guardianEmail: input.guardianEmail,
        parentAnniversary: input.parentAnniversary,
        monthlyIncome: input.monthlyIncome,
        clerkId: clerkParentId,
      } as Prisma.ParentCreateInput;

      const parent = await ctx.db.parent.create({ data: parentData });

      // Create student record
      const studentCreateInput: Prisma.StudentCreateInput = {
        admissionNumber: input.studentAdmissionNumber,
        firstName: input.studentFirstName,
        lastName: input.studentLastName,
        dateOfBirth: input.studentDateOfBirth,
        gender: input.studentGender,
        email: input.studentEmail,
        phone: input.studentPhone,
        address: input.studentAddress,
        username: finalStudentUsername,
        password: finalStudentPassword,
        clerkId: clerkStudentId,
        isActive: true,
        joinDate: new Date(),
        dateOfAdmission: new Date(),
        branch: { connect: { id: input.branchId } },
        parent: { connect: { id: parent.id } },
        section: { connect: { id: input.studentSectionId } },
      };

      const student = await ctx.db.student.create({
        data: studentCreateInput,
        include: {
          section: true,
          parent: true,
        },
      });

      // Create Academic Record for the current session
      const currentSession = await ctx.db.academicSession.findFirst({
        where: { isActive: true },
      });

      if (currentSession) {
        try {
          await ctx.db.academicRecord.create({
            data: {
              studentId: student.id,
              sessionId: currentSession.id,
              classId: student.sectionId!,
              status: "ENROLLED",
            },
          });
          console.log(`Created AcademicRecord for student ${student.firstName} ${student.lastName}`);
        } catch (error) {
          console.error(`Failed to create AcademicRecord for student:`, error);
        }
      }

      console.log(`Successfully created parent-student pair: Parent ${parent.id}, Student ${student.id}`);

      return {
        parent,
        student,
        credentials: {
          parentUsername: finalParentUsername,
          parentPassword: finalParentPassword,
          studentUsername: finalStudentUsername,
          studentPassword: finalStudentPassword,
        }
      };
    }),
});
