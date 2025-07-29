"use client";

import { RegistrationForm } from "@/components/admissions/registration-form"
import { AdmissionsPageGuard } from "@/components/auth/page-guard";

function RegisterPageContent() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <RegistrationForm />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AdmissionsPageGuard>
      <RegisterPageContent />
    </AdmissionsPageGuard>
  );
} 