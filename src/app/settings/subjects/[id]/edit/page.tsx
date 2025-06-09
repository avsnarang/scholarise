"use client";

import { SubjectForm } from "@/components/settings/subjects/subject-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { api } from "@/utils/api";

function SubjectEditContent() {
  const params = useParams();
  const id = params?.id as string || "";
  
  // Fetch subject data to show current status
  const { data: subjectData, isLoading: isLoadingSubject } = api.subject.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isLoadingSubject) {
    return (
      <div className="px-4 lg:px-6 w-full">
        <div className="flex items-center justify-center py-16">
          <div className="space-y-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#00501B] mx-auto" />
            <p className="text-muted-foreground">Loading subject data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!subjectData) {
    return (
      <div className="px-4 lg:px-6 w-full">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Subject not found</p>
          <Link href="/settings/subjects">
            <Button variant="outline" className="mt-4">
              Back to Subjects
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-4 lg:px-6 w-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/settings/subjects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Edit Subject
              </h1>
              <Badge variant={subjectData.isActive ? "default" : "secondary"}>
                {subjectData.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">Update "{subjectData.name}" information</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Subject Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <SubjectForm subjectId={id} />
        </CardContent>
      </Card>
    </div>
  );
}

// Simple page component that renders the client component
export default function EditSubjectPage() {
  return <SubjectEditContent />;
} 