import { Suspense } from "react";
import { SubjectsDataTable } from "@/components/settings/subjects/subjects-data-table";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import { FileDown, BookOpen, PlusCircle } from "lucide-react";
import { SubjectStatsCards } from "@/components/settings/subjects/subject-stats-cards";

export const metadata = {
  title: "Manage Subjects",
  description: "Manage school subjects and their CBSE codes",
};

export default function ManageSubjectsPage() {
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