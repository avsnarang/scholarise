"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranchContext } from "@/hooks/useBranchContext";

export default function SettingsPage() {
  const { currentBranchId } = useBranchContext();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admissions Settings</CardTitle>
          <CardDescription>
            Configure admissions process settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Settings content will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
} 