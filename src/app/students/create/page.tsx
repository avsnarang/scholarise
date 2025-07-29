"use client";

import { EnhancedStudentForm } from "@/components/students/enhanced-student-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Users, GraduationCap } from "lucide-react";
import Link from "next/link";
import { CreateStudentPageGuard } from "@/components/auth/page-guard";

function CreateStudentPageContent() {
  return (
    <div className="px-4 lg:px-6 w-full">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/students">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Add New Student
            </h1>
            <p className="text-muted-foreground">Register a new student in the system</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5" />
            Student Registration Form
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <EnhancedStudentForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateStudentPage() {
  return (
    <CreateStudentPageGuard>
      <CreateStudentPageContent />
    </CreateStudentPageGuard>
  );
}
