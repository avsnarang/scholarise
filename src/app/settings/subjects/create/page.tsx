import { PageHeader } from "@/components/page-header";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectForm } from "@/components/settings/subjects/subject-form";

export const metadata = {
  title: "Add Subject",
  description: "Create a new subject for your school",
};

export default function CreateSubjectPage() {
  return (
    <PageWrapper className="max-w-full">
      <PageHeader
        heading="Add Subject"
        description="Create a new subject for your school"
        backPath="/settings/subjects"
      />

      <Card className="border-t-4 border-t-[#00501B] w-full">
        <CardHeader className="pb-0">
          <CardTitle>Subject Information</CardTitle>
          <CardDescription>
            Enter the subject details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectForm />
        </CardContent>
      </Card>
    </PageWrapper>
  );
} 