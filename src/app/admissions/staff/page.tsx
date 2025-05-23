"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranchContext } from "@/hooks/useBranchContext";

export default function StaffPage() {
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