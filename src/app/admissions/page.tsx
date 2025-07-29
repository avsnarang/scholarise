"use client";

import { AdmissionsDashboard } from "@/components/admissions/admissions-dashboard"
import { AdmissionsPageGuard } from "@/components/auth/page-guard";

function AdmissionsDashboardPageContent() {
  return (
    <div className="flex-1">
      <AdmissionsDashboard />
    </div>
  );
}

export default function AdmissionsDashboardPage() {
  return (
    <AdmissionsPageGuard>
      <AdmissionsDashboardPageContent />
    </AdmissionsPageGuard>
  );
} 