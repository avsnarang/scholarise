import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Question Bank",
  description: "Manage questions for your question papers",
};

export default function QuestionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        heading="Question Bank"
        description="Manage questions organized by subjects, chapters, and subtopics"
      />
      
      <div className="rounded-md border p-8 text-center">
        <h2 className="text-lg font-semibold">Question Bank Coming Soon</h2>
        <p className="text-muted-foreground mt-2">
          This feature is under development. You'll soon be able to create and manage questions here.
        </p>
      </div>
    </div>
  );
} 