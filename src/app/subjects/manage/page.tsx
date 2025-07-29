"use client";

import { Suspense } from "react";
import { SubjectsDataTable } from "@/components/settings/subjects/subjects-data-table";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { FileDown, BookOpen, PlusCircle } from "lucide-react";
import { SubjectStatsCards } from "@/components/settings/subjects/subject-stats-cards";
import { PageGuard } from "@/components/auth/page-guard";
import { Permission } from "@/types/permissions";

function ManageSubjectsPageContent() {
  return (
    <PageWrapper
      title="Manage Subjects"
      subtitle="Create and manage all subjects in your institution"
    >
      <SubjectStatsCards />

      <div className="mt-6">
        <Suspense fallback={
          <div className="py-8 text-center text-gray-500">
            Loading subjects...
          </div>
        }>
          <SubjectsDataTable />
        </Suspense>
      </div>
    </PageWrapper>
  );
}

export default function ManageSubjectsPage() {
  return (
    <PageGuard
      permissions={[Permission.MANAGE_SUBJECTS]}
      title="Subject Management Access Required"
      message="You need subject management permissions to access this page. This section allows creating, editing, and managing school subjects."
    >
      <ManageSubjectsPageContent />
    </PageGuard>
  );
} 