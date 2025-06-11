import { PageWrapper } from "@/components/layout/page-wrapper";
import { RouteGuard } from "@/components/route-guard";
import { Permission } from "@/types/permissions";
import { TeacherSubjectAssignments } from "./assignments-client";

export default function TeacherSubjectAssignmentsPage() {
  return (
    <RouteGuard requiredPermissions={[Permission.VIEW_TEACHERS]}>
      <PageWrapper>
        <TeacherSubjectAssignments />
      </PageWrapper>
    </RouteGuard>
  );
} 