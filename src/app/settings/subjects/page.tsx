import { Suspense } from "react";
import { SubjectsDataTable } from "@/components/settings/subjects/subjects-data-table";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, FileDown, BookOpen } from "lucide-react";
import { SubjectStatsCards } from "@/components/settings/subjects/subject-stats-cards";

export const metadata = {
  title: "Subjects Management",
  description: "Manage school subjects and their CBSE codes",
};

export default function SubjectsPage() {
  return (
    <PageWrapper
      title="Subjects"
      subtitle="Manage all subjects in your institution"
      action={
        <div className="flex gap-2">
          <Button variant="glowing-secondary" className="flex items-center gap-1">
            <FileDown className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Link href="/settings/subjects/create">
            <Button variant="glowing" className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" />
              <span>Add Subject</span>
            </Button>
          </Link>
        </div>
      }
    >
      <SubjectStatsCards />

      <div className="mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium">All Subjects</h2>
        </div>

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