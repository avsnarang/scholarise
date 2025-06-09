import { SubjectForm } from "@/components/settings/subjects/subject-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Add Subject",
  description: "Create a new subject for your school",
};

export default function CreateSubjectPage() {
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Add New Subject
            </h1>
            <p className="text-muted-foreground">Create a new subject for your school curriculum</p>
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
          <SubjectForm />
        </CardContent>
      </Card>
    </div>
  );
} 