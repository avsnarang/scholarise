import { postRouter } from "@/server/api/routers/post";
import { branchRouter } from "@/server/api/routers/branch";
import { userRouter } from "@/server/api/routers/user";
import { roleRouter } from "@/server/api/routers/role";
import { permissionRouter } from "@/server/api/routers/permission";
import { groupRouter } from "@/server/api/routers/group";
import { studentRouter } from "@/server/api/routers/student";
import { parentRouter } from "@/server/api/routers/parent";
import { classRouter } from "@/server/api/routers/class";
import { sectionRouter } from "@/server/api/routers/section";
import { teacherRouter } from "@/server/api/routers/teacher";
import { employeeRouter } from "./routers/employee";
import { authRouter } from "@/server/api/routers/auth";
import { usersRouter } from "@/server/api/routers/users";
import { academicSessionRouter } from "@/server/api/routers/academicSession";
import { attendanceRouter } from "@/server/api/routers/attendance";
import { attendanceLocationRouter } from "@/server/api/routers/attendanceLocation";
import { attendanceDeviceRouter } from "@/server/api/routers/attendanceDevice";
import { attendanceWindowRouter } from "@/server/api/routers/attendanceWindow";
import { subjectRouter } from "@/server/api/routers/subject";
import { subjectTeacherRouter } from "@/server/api/routers/subjectTeacher";
import { studentSubjectRouter } from "@/server/api/routers/studentSubject";
import { classSubjectRouter } from "@/server/api/routers/classSubject";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { leaveRouter } from "./routers/leave";
import { dashboardRouter } from "@/server/api/routers/dashboard";
import { salaryRouter } from "./routers/salary";
import { departmentRouter } from "./routers/department";
import { designationRouter } from "./routers/designation";
import { admissionsRouter } from "./routers/admissions";
import { questionPaperRouter } from "./routers/questionPaper";
import { moneyCollectionRouter } from "./routers/money-collection";
import { transferCertificateRouter } from "./routers/transferCertificate";
import { financeRouter } from "./routers/finance";
import { backgroundTasksRouter } from "./routers/background-tasks";
import { examinationRouter } from "./routers/examination";
import { courtesyCallsRouter } from "./routers/courtesy-calls";
import { actionItemsRouter } from "./routers/action-items";
import { communicationRouter } from "./routers/communication";
import { chatRouter } from "./routers/chat";
import { mediaRouter } from "./routers/media";
import { transportationRouter } from "./routers/transportation";
import { staffMoveRouter } from "@/server/api/routers/staffMove";
import { paymentGatewayRouter } from "./routers/payment-gateway";

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
  permission: permissionRouter,
  group: groupRouter,
  student: studentRouter,
  parent: parentRouter,
  class: classRouter,
  section: sectionRouter,
  teacher: teacherRouter,
  employee: employeeRouter,
  auth: authRouter,
  users: usersRouter,
  academicSession: academicSessionRouter,
  attendance: attendanceRouter,
  attendanceLocation: attendanceLocationRouter,
  attendanceDevice: attendanceDeviceRouter,
  attendanceWindow: attendanceWindowRouter,
  subject: subjectRouter,
  subjectTeacher: subjectTeacherRouter,
  studentSubject: studentSubjectRouter,
  classSubject: classSubjectRouter,
  leave: leaveRouter,
  dashboard: dashboardRouter,
  salary: salaryRouter,
  department: departmentRouter,
  designation: designationRouter,
  admissions: admissionsRouter,
  questionPaper: questionPaperRouter,
  moneyCollection: moneyCollectionRouter,
  transferCertificate: transferCertificateRouter,
  finance: financeRouter,
  backgroundTasks: backgroundTasksRouter,
  examination: examinationRouter,
  courtesyCalls: courtesyCallsRouter,
  actionItems: actionItemsRouter,
  communication: communicationRouter,
  chat: chatRouter,
  media: mediaRouter,
  transportation: transportationRouter,
  staffMove: staffMoveRouter,
  paymentGateway: paymentGatewayRouter,
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
