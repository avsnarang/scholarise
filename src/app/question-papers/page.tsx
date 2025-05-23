import Link from "next/link";
import type { Metadata } from "next";
import { PlusCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";
import { formatDate } from "@/lib/utils";
import { RecentQuestionPapers } from "@/components/question-paper/recent-question-papers";

export const metadata: Metadata = {
  title: "Question Papers",
  description: "Manage and create question papers",
};

export default function QuestionPapersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        heading="Question Papers"
        description="Create and manage question papers for exams"
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Blueprint Creator</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create a blueprint for generating question papers by specifying class, board, chapters, and sections.
            </p>
            <div className="mt-4 flex justify-end">
              <Button asChild>
                <Link href="/question-papers/blueprints/create">Create Blueprint</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Question Bank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage questions organized by subjects, chapters, and subtopics for use in question papers.
            </p>
            <div className="mt-4 flex justify-end">
              <Button asChild>
                <Link href="/question-papers/questions">View Questions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Generated Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View and manage all generated question papers. Print or export papers for exams.
            </p>
            <div className="mt-4 flex justify-end">
              <Button asChild>
                <Link href="/question-papers/list">View All Papers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Question Papers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Question Papers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <RecentQuestionPapers />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 