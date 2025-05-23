import type { Metadata } from "next";
import BlueprintCreator from "@/components/question-paper/blueprint-creator";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Create Blueprint",
  description: "Create a blueprint for your question papers",
};

export default function CreateBlueprintPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        heading="Create Blueprint"
        description="Define the structure and requirements for your question papers"
      />
      
      <BlueprintCreator />
    </div>
  );
} 