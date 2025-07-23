import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";
import { TeacherSubjectAssignments } from "./teacher-assignments-client";

export default function TeacherSubjectAssignmentsPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.VIEW_TEACHERS]}>
      <TeacherSubjectAssignments />
    </RouteGuard>
  );
} 