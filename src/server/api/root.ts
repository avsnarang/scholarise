import { postRouter } from "@/server/api/routers/post";
import { branchRouter } from "@/server/api/routers/branch";
import { userRouter } from "@/server/api/routers/user";
import { roleRouter } from "@/server/api/routers/role";
import { groupRouter } from "@/server/api/routers/group";
import { permissionRouter } from "@/server/api/routers/permission";
import { studentRouter } from "@/server/api/routers/student";
import { parentRouter } from "@/server/api/routers/parent";
import { classRouter } from "@/server/api/routers/class";
import { teacherRouter } from "@/server/api/routers/teacher";
import { employeeRouter } from "@/server/api/routers/employee";
import { authRouter } from "@/server/api/routers/auth";
import { academicSessionRouter } from "@/server/api/routers/academicSession";
import { attendanceRouter } from "@/server/api/routers/attendance";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  branch: branchRouter,
  user: userRouter,
  role: roleRouter,
  group: groupRouter,
  permission: permissionRouter,
  student: studentRouter,
  parent: parentRouter,
  class: classRouter,
  teacher: teacherRouter,
  employee: employeeRouter,
  auth: authRouter,
  academicSession: academicSessionRouter,
  attendance: attendanceRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
