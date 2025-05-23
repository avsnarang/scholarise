import type { Metadata } from "next";
import QuestionPaperCreator from "@/components/question-paper/question-paper-creator";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Create Question Paper",
  description: "Create a new question paper from a blueprint",
};

export default function CreateQuestionPaperPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        heading="Create Question Paper"
        description="Create a new question paper by selecting questions for each section"
      />
      
      <QuestionPaperCreator />
    </div>
  );
} 