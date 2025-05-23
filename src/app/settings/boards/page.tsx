import { Suspense } from "react";
import { BoardsDataTable } from "@/components/settings/boards/boards-data-table";
import { PageHeader } from "@/components/page-header";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon } from "@radix-ui/react-icons";

export const metadata = {
  title: "Education Boards Management",
  description: "Manage education boards for question papers and blueprints",
};

export default function BoardsPage() {
  return (
    <PageWrapper className="max-w-full">
      <PageHeader
        heading="Education Boards Management"
        description="Manage education boards for question papers and blueprints"
      >
        <Link href="/settings/boards/create">
          <Button className="bg-[#00501B] hover:bg-[#00501B]/90">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Board
          </Button>
        </Link>
      </PageHeader>

      <Card className="border-t-4 border-t-[#00501B] w-full">
        <CardHeader className="pb-0">
          <CardTitle>Education Boards</CardTitle>
          <CardDescription>
            View, add, edit or delete education boards used in blueprints and question papers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading boards...</div>}>
            <BoardsDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </PageWrapper>
  );
} 