import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuestionPaperView from "@/components/question-paper/question-paper-view";
import { api } from "@/utils/api";
import { PageHeader } from "@/components/page-header";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: "View Question Paper",
    description: "View and print a generated question paper",
  };
}

export default async function ViewQuestionPaperPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        heading="Question Paper"
        description="View and print your generated question paper"
      />
      
      <QuestionPaperView id={id} />
    </div>
  );
} 