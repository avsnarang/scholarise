"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateClassModal } from "@/components/classes/create-class-modal";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { Loader2, ArrowLeft, GraduationCap, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NewClassPage() {
  const router = useRouter();
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  // Check if we have the required IDs
  if (!currentBranchId || !currentSessionId) {
    return (
      <PageWrapper>
        <div className="container mx-auto py-10">
          <div className="flex h-[60vh] w-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#00501B] dark:text-[#7aad8c]" />
              <p className="mt-4 text-lg font-semibold dark:text-white">
                Loading your school data...
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
            <h1 className="text-2xl font-bold tracking-tight dark:text-white">Add New Class</h1>
            <p className="text-muted-foreground dark:text-gray-400">
              Create a new class for your school
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
          <Card className="dark:bg-[#202020] dark:border-[#303030] border-l-4 border-l-[#00501B] dark:border-l-[#7aad8c] dark:ring-[#7aad8c]/10 ring-[#00501B]/10 focus-within:ring-[#00501B]/20 dark:focus-within:ring-[#7aad8c]/20 hover:shadow-[#00501B]/5 dark:hover:shadow-[#7aad8c]/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium dark:text-gray-200">
                Class Management
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-gray-400">
                Classes allow you to organize students and assign teachers for each grade level and section.
              </div>
            </CardContent>
          </Card>
          
          <Card className="dark:bg-[#202020] dark:border-[#303030] border-l-4 border-l-[#00501B] dark:border-l-[#7aad8c] dark:ring-[#7aad8c]/10 ring-[#00501B]/10 focus-within:ring-[#00501B]/20 dark:focus-within:ring-[#7aad8c]/20 hover:shadow-[#00501B]/5 dark:hover:shadow-[#7aad8c]/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium dark:text-gray-200">
                Academic Structure
              </CardTitle>
              <BookOpen className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-gray-400">
                Each class can be assigned a specific capacity and teacher to manage the academic activities.
              </div>
            </CardContent>
          </Card>
          
          <Card className="dark:bg-[#202020] dark:border-[#303030] border-l-4 border-l-[#00501B] dark:border-l-[#7aad8c] dark:ring-[#7aad8c]/10 ring-[#00501B]/10 focus-within:ring-[#00501B]/20 dark:focus-within:ring-[#7aad8c]/20 hover:shadow-[#00501B]/5 dark:hover:shadow-[#7aad8c]/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium dark:text-gray-200">
                Student Assignment
              </CardTitle>
              <Users className="h-4 w-4 text-[#00501B] dark:text-[#7aad8c]" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground dark:text-gray-400">
                After creating a class, you can add students to it from the student management section.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal */}
        <CreateClassModal
          isOpen={isModalOpen}
          onClose={() => router.push("/classes")}
          branchId={currentBranchId}
          sessionId={currentSessionId}
          onSuccess={() => router.push("/classes")}
        />
      </div>
    </PageWrapper>
  );
} 