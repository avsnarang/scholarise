"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { DesignationForm } from "@/components/designations/designation-form";
import { api } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EditDesignationPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  // Fetch designation data
  const { data: designation, isLoading: isDesignationLoading, error } = api.designation.getById.useQuery(
    { id },
    { refetchOnWindowFocus: false }
  );

  // Fetch branches
  const { data: branches, isLoading: isBranchesLoading } = api.branch.getAll.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  // Check for error
  useEffect(() => {
    if (error) {
      toast.error("Designation not found");
      router.push("/staff/designations/list");
    }
  }, [error, router]);

  const isLoading = isDesignationLoading || isBranchesLoading;

  // Extract the form data from designation
  const formData = designation ? {
    id: designation.id,
    title: designation.title,
    code: designation.code,
    description: designation.description || "",
    category: designation.category,
    level: designation.level,
    isActive: designation.isActive,
    branchId: designation.branchId,
  } : undefined;

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Edit Designation</h1>
          <p className="mt-2 text-gray-500">
            Update staff position information
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : formData ? (
          <DesignationForm initialData={formData} branches={branches || []} />
        ) : (
          <div>Designation not found</div>
        )}
      </div>
    </PageWrapper>
  );
} 