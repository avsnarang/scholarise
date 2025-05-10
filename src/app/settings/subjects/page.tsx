import { Suspense } from "react";
import { SubjectsDataTable } from "@/components/settings/subjects/subjects-data-table";
import { PageHeader } from "@/components/page-header";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon } from "@radix-ui/react-icons";

export const metadata = {
  title: "Subjects Management",
  description: "Manage school subjects and their CBSE codes",
};

export default function SubjectsPage() {
  return (
    <PageWrapper className="max-w-full">
      <PageHeader
        heading="Subjects Management"
        description="Manage school subjects and their CBSE codes"
      >
        <Link href="/settings/subjects/create">
          <Button className="bg-[#00501B] hover:bg-[#00501B]/90">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        </Link>
      </PageHeader>

      <Card className="border-t-4 border-t-[#00501B] w-full">
        <CardHeader className="pb-0">
          <CardTitle>School Subjects</CardTitle>
          <CardDescription>
            View, add, edit or delete subjects and assign them to classes or individual students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading subjects...</div>}>
            <SubjectsDataTable />
          </Suspense>
        </CardContent>
      </Card>
    </PageWrapper>
  );
} 