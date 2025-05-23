"use client";

import { PageHeader } from "@/components/page-header";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectForm } from "@/components/settings/subjects/subject-form";
import { useParams } from "next/navigation";

function SubjectEditContent() {
  const params = useParams();
  const id = params?.id as string || "";
  
  return (
    <PageWrapper className="max-w-full">
      <PageHeader
        heading="Edit Subject"
        description="Update subject information"
        backPath="/settings/subjects"
      />

      <Card className="border-t-4 border-t-[#00501B] w-full">
        <CardHeader className="pb-0">
          <CardTitle>Edit Subject</CardTitle>
          <CardDescription>
            Update the subject details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectForm subjectId={id} />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

// Simple page component that renders the client component
export default function EditSubjectPage() {
  return <SubjectEditContent />;
} 