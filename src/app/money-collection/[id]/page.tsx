import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createCaller } from "@/server/api/root";
import { db } from "@/server/db";
import { PageTitle } from "@/components/page-title";
import { MoneyCollectionDetails } from "@/components/money-collection/money-collection-details";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MoneyCollectionDetailPage({ params }: PageProps) {
  try {
    const { id } = await params;
    const caller = createCaller({ 
      db, 
      auth: {}, 
      userId: null 
    });
    
    const moneyCollection = await caller.moneyCollection.getById({
      id,
    });

    return (
      <div className="flex flex-col gap-6">
        <Suspense fallback={<div>Loading money collection details...</div>}>
          <MoneyCollectionDetails moneyCollection={moneyCollection} />
        </Suspense>
      </div>
    );
  } catch (error) {
    return notFound();
  }
} 