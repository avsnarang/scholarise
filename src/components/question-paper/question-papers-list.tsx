"use client";

import Link from "next/link";
import { Eye, FileDown, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/utils/api";
import { formatDate } from "@/lib/utils";

interface QuestionPaper {
  id: string;
  title: string;
  createdAt: Date | string;
  isPublished: boolean;
  totalMarks?: number;
  duration?: number;
  blueprint: {
    class: { name: string; section: string };
    board?: { name: string } | null;
  };
}

export default function QuestionPapersList() {
  const { data: papers, isLoading } = api.questionPaper.getQuestionPapers.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Question Papers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-64" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!papers || papers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Question Papers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-8 text-center">
            <p className="text-muted-foreground">No question papers created yet.</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/question-papers/create">Create Your First Question Paper</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Papers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {papers.map((paper: QuestionPaper) => (
            <div key={paper.id} className="rounded-md border p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{paper.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      Class: {paper.blueprint.class.name} {paper.blueprint.class.section}
                    </span>
                    <span>Board: {paper.blueprint.board?.name || "N/A"}</span>
                    <span>Created: {formatDate(paper.createdAt)}</span>
                    {paper.totalMarks && <span>Marks: {paper.totalMarks}</span>}
                    {paper.duration && <span>Duration: {paper.duration} mins</span>}
                    <span>
                      Status:{" "}
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          paper.isPublished
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {paper.isPublished ? "Published" : "Draft"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/question-papers/view/${paper.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 