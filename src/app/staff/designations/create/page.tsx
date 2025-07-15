"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { DesignationForm } from "@/components/designations/designation-form";
import { api } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function CreateDesignationPage() {
  const router = useRouter();
  const { data: branches, isLoading: branchesLoading } =
    api.branch.getAll.useQuery();

  const createDesignationMutation = api.designation.create.useMutation({
    // ... existing code ...
  });

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00501B]">Create Designation</h1>
          <p className="mt-2 text-gray-500">
            Add a new job title or position for staff members
          </p>
        </div>

        {branchesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <DesignationForm branches={branches} />
        )}
      </div>
    </PageWrapper>
  );
} 