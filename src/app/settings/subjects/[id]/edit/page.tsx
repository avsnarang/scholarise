import { PageHeader } from "@/components/page-header";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectForm } from "@/components/settings/subjects/subject-form";
import { api } from "@/utils/api";

interface EditSubjectPageProps {
  params: {
    id: string;
  };
}

export default async function EditSubjectPage({ params }: EditSubjectPageProps) {
  const { id } = params;
  
  // Fetch subject data (this will be done client-side)
  
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