"use client";

import { EnhancedStudentForm } from "@/components/students/enhanced-student-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function CreateStudentPage() {
  return (
    <PageWrapper
      title="Add New Student"
      subtitle="Register a new student in the ScholaRise system"
      action={
        <Link href="/students">
          <Button variant="outline" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Students</span>
          </Button>
        </Link>
      }
    >
      {/* Steps indicator */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="rounded-full bg-[#00501B]/10 border border-[#00501B]/30 px-4 py-1.5 text-sm text-[#00501B] flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00501B] text-xs font-bold text-white">1</span>
          <span>Fill in all required information</span>
        </div>
        <div className="rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-600 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-white">2</span>
          <span>Review student details</span>
        </div>
        <div className="rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-600 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-white">3</span>
          <span>Submit the form</span>
        </div>
      </div>

      {/* Form Container */}
      <Card className="border-t-4 border-t-[#00501B]">
        <CardHeader className="pb-0">
          <CardTitle>Student Information</CardTitle>
          <CardDescription>
            Enter the student's details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedStudentForm />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
