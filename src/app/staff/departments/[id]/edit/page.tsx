// @ts-ignore - Next.js page params type error workaround
// export const runtime = 'edge'; // Removed this line

import { PageWrapper } from "@/components/layout/page-wrapper";
import { DepartmentForm } from "@/components/departments/department-form";
// import { createCaller } from "@/server/api/root"; // Removed
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server"; // For error handling consistency

// @ts-expect-error - Next.js params typing issue
export default async function EditDepartmentPage({ params }) {
  const id = params?.id || '';
  
  try {
    // Server-side data fetching directly using Prisma client
    const department = await db.department.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        // Assuming employees are not strictly needed for the form, 
        // but include if they were part of the original caller logic and used.
        // employees: {
        //   select: {
        //     id: true,
        //     firstName: true,
        //     lastName: true,
        //     designation: true,
        //   },
        //   where: {
        //     isActive: true,
        //   },
        // },
      },
    });

    if (!department) {
      // Consistent error with how tRPC might throw
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Department not found",
      });
    }

    const branches = await db.branch.findMany({
      orderBy: [
        { order: "asc" },
        { name: "asc" }
      ],
    });
    
    // Extract the form data from department
    const formData = {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description || "",
      type: department.type,
      isActive: department.isActive,
      branchId: department.branchId,
      headId: department.headId || "",
    };
    
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#00501B]">Edit Department</h1>
            <p className="mt-2 text-gray-500">
              Update department information
            </p>
          </div>
          
          <DepartmentForm initialData={formData} branches={branches || []} />
        </div>
      </PageWrapper>
    );
  } catch (error) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#00501B]">Edit Department</h1>
            <p className="mt-2 text-gray-500">
              Update department information
            </p>
          </div>
          <div>Department not found</div>
        </div>
      </PageWrapper>
    );
  }
} 