import { Suspense } from "react";
import { cookies } from "next/headers";

import { createCaller } from "@/server/api/root";
import { db } from "@/server/db";
import { PageTitle } from "@/components/page-title";
import { MoneyCollectionForm } from "@/components/money-collection/money-collection-form";

export default async function NewMoneyCollectionPage() {
  // Get branch ID from cookies
  const cookieStore = await cookies();
  const branchId = cookieStore.get("currentBranchId")?.value || "";
  
  const caller = createCaller({ db, auth: {}, userId: null });
  const branches = await caller.branch.getAll();
  
  // Get active classes for the current branch
  const allClasses = await caller.class.getAll({
    isActive: true,
  });
  
  console.log("Cookie branchId:", branchId);
  console.log("Total classes found (all branches):", allClasses.length);
  
  // Log a sample to debug branch ID format issues
  const classSample = allClasses.slice(0, 5).map(c => ({id: c.id, branch: c.branchId}));
  console.log("Sample classes with branch IDs:", classSample);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <PageTitle heading="New Money Collection" />
        <p className="text-muted-foreground text-sm">
          Create a new money collection
        </p>
      </div>

      <Suspense fallback={<div>Loading form...</div>}>
        <MoneyCollectionForm 
          branches={branches} 
          classes={allClasses}
        />
      </Suspense>
    </div>
  );
} 