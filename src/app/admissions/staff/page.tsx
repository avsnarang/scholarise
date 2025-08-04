"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranchContext } from "@/hooks/useBranchContext";
import { AdmissionsPageGuard } from "@/components/auth/page-guard";

function StaffPageContent() {
  const { currentBranchId } = useBranchContext();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admissions Staff</CardTitle>
          <CardDescription>
            Manage staff members involved in the admissions process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Staff management content will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
// Dynamically import to disable SSR completely
const DynamicStaffPageContent = dynamic(() => Promise.resolve(StaffPageContent), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading...</div>
});

export default function StaffPage() {
  return <DynamicStaffPageContent />;
}

 