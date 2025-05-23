"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";
import { formatDate } from "@/lib/utils";

export function RecentQuestionPapers() {
  const { data: papers, isLoading } = api.questionPaper.getQuestionPapers.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading recent papers...</p>
      </div>
    );
  }

  if (!papers || papers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No question papers created yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50 text-sm font-medium">
            <th className="p-3 text-left">Title</th>
            <th className="p-3 text-left">Class</th>
            <th className="p-3 text-left">Board</th>
            <th className="p-3 text-left">Created</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {papers.slice(0, 5).map((paper: { 
            id: string; 
            title: string; 
            blueprint: { 
              class: { name: string; section: string }; 
              board?: { name: string } | null; 
            }; 
            createdAt: Date; 
            isPublished: boolean; 
          }) => (
            <tr key={paper.id} className="border-b">
              <td className="p-3">{paper.title}</td>
              <td className="p-3">{paper.blueprint.class.name} {paper.blueprint.class.section}</td>
              <td className="p-3">{paper.blueprint.board?.name || "N/A"}</td>
              <td className="p-3">{formatDate(paper.createdAt)}</td>
              <td className="p-3">
                {paper.isPublished ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Published
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    Draft
                  </span>
                )}
              </td>
              <td className="p-3">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/question-papers/view/${paper.id}`}>View</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 