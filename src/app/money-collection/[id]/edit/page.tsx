import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { createCaller } from "@/server/api/root";
import { db } from "@/server/db";
import { PageTitle } from "@/components/page-title";
import { MoneyCollectionForm } from "@/components/money-collection/money-collection-form";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditMoneyCollectionPage({ params }: PageProps) {
  try {
    // Await params to get the actual values
    const { id } = await params;
    
    // Get current branch ID
    const cookieStore = await cookies();
    const branchIdCookie = cookieStore.get("currentBranchId");
    const branchId = branchIdCookie?.value || "";
    
    const caller = createCaller({ db, auth: {}, userId: null, user: null });
    const moneyCollection = await caller.moneyCollection.getById({
      id,
    });

    const branches = await caller.branch.getAll();
    
    // Apply branch filter to get only classes in the current branch
    const classes = await caller.class.getAll({
      branchId,
      isActive: true,
    });

    // Prepare data for multi-select if a class is assigned
    const formData = {
      ...moneyCollection,
      classIds: moneyCollection.classes?.map(c => c.classId) || [],
    };

    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-1">
          <PageTitle heading={`Edit ${moneyCollection.title}`} />
          <p className="text-muted-foreground text-sm">
            Update the money collection details
          </p>
        </div>

        <Suspense fallback={<div>Loading form...</div>}>
          <MoneyCollectionForm
            branches={branches}
            classes={classes}
            initialData={formData}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    return notFound();
  }
} 