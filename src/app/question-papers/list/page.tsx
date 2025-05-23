import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import QuestionPapersList from "@/components/question-paper/question-papers-list";

export const metadata: Metadata = {
  title: "Question Papers List",
  description: "View all generated question papers",
};

export default function QuestionPapersListPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        heading="Question Papers"
        description="View and manage all generated question papers"
      >
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/question-papers/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Question Paper
            </Link>
          </Button>
        </div>
      </PageHeader>
      
      <QuestionPapersList />
    </div>
  );
} 