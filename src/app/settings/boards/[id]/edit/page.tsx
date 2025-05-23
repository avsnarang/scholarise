"use client";

import { useParams } from "next/navigation";
import { BoardForm } from "@/components/settings/boards/board-form";
import { PageHeader } from "@/components/page-header";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditBoardPage() {
  const params = useParams();
  const boardId = params?.id as string;

  return (
    <PageWrapper className="max-w-full">
      <PageHeader
        heading="Edit Education Board"
        description="Update an existing education board"
        backPath="/settings/boards"
      />

      <Card className="border-t-4 border-t-[#00501B] w-full">
        <CardHeader className="pb-0">
          <CardTitle>Board Information</CardTitle>
          <CardDescription>
            Update the board details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BoardForm boardId={boardId} />
        </CardContent>
      </Card>
    </PageWrapper>
  );
} 