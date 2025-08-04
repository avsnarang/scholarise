"use client";

import { BoardForm } from "@/components/settings/boards/board-form";
import { PageHeader } from "@/components/page-header";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

function CreateBoardPageContent() {
  return (
    <PageWrapper className="max-w-full">
      <PageHeader
        heading="Add Education Board"
        description="Create a new education board for blueprints and question papers"
        backPath="/settings/boards"
      />

      <Card className="border-t-4 border-t-[#00501B] w-full">
        <CardHeader className="pb-0">
          <CardTitle>Board Information</CardTitle>
          <CardDescription>
            Enter the board details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BoardForm />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
// Dynamically import to disable SSR completely
const DynamicCreateBoardPageContent = dynamic(() => Promise.resolve(CreateBoardPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function CreateBoardPage() {
  return <DynamicCreateBoardPageContent />;
} 