"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassForm } from "@/components/classes/class-form";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { api } from "@/utils/api";
import { Loader2, ArrowLeft, Edit, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Create a separate client component that doesn't use params from props
function EditClassContent() {
  const params = useParams();
  const classId = params?.id as string || ""; // Handle potential null params
  const router = useRouter();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the class data
  const { data: classData, isLoading: isClassLoading, error } = api.class.getById.useQuery(
    { id: classId },
    { enabled: !!classId }
  );
  
  // Handle loading state and errors
  useEffect(() => {
    if (!isClassLoading) {
      setIsLoading(false);
    }
    
    if (error) {
      router.push("/classes");
    }
  }, [isClassLoading, error, router]);

  // Check if we have the required IDs and class data
  if (isLoading || isClassLoading || !currentBranchId || !currentSessionId) {
    return (
      <PageWrapper>
        <div className="container mx-auto py-10">
          <div className="flex h-[60vh] w-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#00501B] dark:text-[#7aad8c]" />
              <p className="mt-4 text-lg font-semibold dark:text-white">
                Loading class information...
              </p>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="container mx-auto py-6 lg:py-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 gap-1 pl-0 text-muted-foreground dark:text-gray-400 hover:text-[#00501B] dark:hover:text-[#7aad8c] hover:bg-[#00501B]/10 dark:hover:bg-[#7aad8c]/10"
          onClick={() => router.push("/classes")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </Button>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight dark:text-white">Edit Class</h1>
            <p className="text-muted-foreground dark:text-gray-400">
              {classData?.name} - {classData?.section}
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-8">
          <Card className="dark:bg-[#202020] dark:border-[#303030] border-l-4 border-l-[#00501B] dark:border-l-[#7aad8c] dark:ring-[#7aad8c]/10 ring-[#00501B]/10 focus-within:ring-[#00501B]/20 dark:focus-within:ring-[#7aad8c]/20 hover:shadow-[#00501B]/5 dark:hover:shadow-[#7aad8c]/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium dark:text-gray-200">
                Class Management
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-gray-400">
                Update the class details for this academic session. Changes will affect all students assigned to this class.
              </div>
            </CardContent>
          </Card>
          
          <Card className="dark:bg-[#202020] dark:border-[#303030] border-l-4 border-l-[#00501B] dark:border-l-[#7aad8c] dark:ring-[#7aad8c]/10 ring-[#00501B]/10 focus-within:ring-[#00501B]/20 dark:focus-within:ring-[#7aad8c]/20 hover:shadow-[#00501B]/5 dark:hover:shadow-[#7aad8c]/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium dark:text-gray-200">
                Teacher Assignment
              </CardTitle>
              <BookOpen className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-gray-400">
                You can change the assigned teacher for this class. The previous teacher will no longer have access to this class.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <Card className="dark:bg-[#202020] dark:border-[#303030] border-t-4 border-t-[#00501B] dark:border-t-[#7aad8c] dark:ring-[#7aad8c]/10 ring-[#00501B]/10 focus-within:ring-[#00501B]/20 dark:focus-within:ring-[#7aad8c]/20 hover:shadow-[#00501B]/5 dark:hover:shadow-[#7aad8c]/5">
          <CardHeader>
            <CardTitle className="text-xl dark:text-white">Class Information</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Update the information below for {classData?.name} - {classData?.section}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassForm
              classData={classData}
              branchId={currentBranchId}
              sessionId={currentSessionId}
              onSuccess={() => router.push("/classes")}
              onCancel={() => router.push("/classes")}
              isEditMode={true}
            />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

// Simple page component that renders the client component
export default function EditClassPage() {
  return <EditClassContent />;
} 